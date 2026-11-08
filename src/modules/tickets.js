const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, Events,
  GatewayIntentBits, MessageFlags, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder,
  TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { ephemeral, sendLog } = require('../utils');
const { buildTranscript } = require('../ticketTranscript');
const { nextTicketNumber, record, summarize } = require('../ticketStats');

// A ticket adatai a csatorna témájában vannak: ticket-owner:<tag>|n:<sorszám>|cat:<kategória>
const TOPIC_PREFIX = 'ticket-owner:';
const REMINDER_FOOTER = 'Inaktivitás figyelmeztetés';
const CHECK_INTERVAL_MS = 30 * 60000;
const HOUR_MS = 3600000;
const MEMBER_ACCESS = [
  PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
];
const DEFAULT_QUESTIONS = [{ label: 'Miben segíthetünk?', long: true }];
const openingTickets = new Set(); // dupla kattintás ellen
const closingChannels = new Set();

function ticketInfo(channel) {
  if (!channel?.topic?.startsWith(TOPIC_PREFIX)) return null;
  const [owner, ...parts] = channel.topic.slice(TOPIC_PREFIX.length).split('|');
  const meta = Object.fromEntries(parts.map((part) => part.split(':')));
  return { ownerId: owner, number: meta.n ? Number(meta.n) : null, categoryId: meta.cat ?? null };
}
const ownerOf = (channel) => ticketInfo(channel)?.ownerId ?? null;
const findOpenTicket = (guild, userId) => guild.channels.cache.find((channel) => ownerOf(channel) === userId);
const categoryById = (id) => settings.ticketCategories.find((category) => category.id === id)
  ?? { id: 'ticket', label: 'Ticket', emoji: '🎫' };
const questionsOf = (category) => (category.questions?.length ? category.questions : DEFAULT_QUESTIONS).slice(0, 5);
const pad = (number) => String(number).padStart(4, '0');
const ticketLabel = (info) => (info?.number ? `#${pad(info.number)}` : 'ticket');

const isSupport = (interaction) => interaction.member.roles.cache.has(config.supportRoleId)
  || interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels);

function formatDuration(ms) {
  if (!ms) return '-';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} perc`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} óra ${minutes % 60} perc`;
  return `${Math.round(hours / 24)} nap`;
}

function ticketButtons(claimed = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:claim').setLabel(claimed ? 'Átvéve' : 'Átveszem')
      .setEmoji({ name: '🙋' }).setStyle(ButtonStyle.Success).setDisabled(claimed),
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Lezárás').setEmoji({ name: '🔒' }).setStyle(ButtonStyle.Danger),
  );
}

async function postPanel(interaction) {
  const embed = new EmbedBuilder().setColor(settings.color)
    .setTitle(settings.ticketPanel.title).setDescription(settings.ticketPanel.description);
  const row = new ActionRowBuilder().addComponents(settings.ticketCategories.slice(0, 5).map((category) => (
    new ButtonBuilder().setCustomId(`ticket:open:${category.id}`).setLabel(category.label)
      .setEmoji({ name: category.emoji }).setStyle(ButtonStyle.Secondary)
  )));
  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply(ephemeral('A ticket panel kikerült.'));
}

async function showOpenModal(interaction, [categoryId]) {
  const existing = findOpenTicket(interaction.guild, interaction.user.id);
  if (existing) {
    await interaction.reply(ephemeral(`Már van nyitott ticketed: <#${existing.id}>`));
    return;
  }
  const category = categoryById(categoryId);
  const rows = questionsOf(category).map((question, index) => new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(`q${index}`)
      .setLabel(question.label.slice(0, 45))
      .setStyle(question.long ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(!question.optional)
      .setMaxLength(question.long ? 1000 : 200),
  ));
  await interaction.showModal(new ModalBuilder()
    .setCustomId(`ticket:modal:${category.id}`)
    .setTitle(category.label.slice(0, 45))
    .addComponents(rows));
}

function readAnswer(interaction, id) {
  try {
    return interaction.fields.getTextInputValue(id).trim();
  } catch {
    return '';
  }
}

// A legnagyobb sorszám a még nyitott ticketek közül, ha a mentett számláló elveszne.
const highestOpenNumber = (guild) => Math.max(0, ...guild.channels.cache
  .map((channel) => ticketInfo(channel)?.number ?? 0));

async function createTicket(interaction, [categoryId]) {
  const { guild, user } = interaction;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const existing = findOpenTicket(guild, user.id);
  if (existing || openingTickets.has(user.id)) {
    await interaction.editReply(existing ? `Már van nyitott ticketed: <#${existing.id}>` : 'A ticketed éppen készül.');
    return;
  }

  openingTickets.add(user.id);
  try {
    const category = categoryById(categoryId);
    const number = nextTicketNumber(highestOpenNumber(guild));
    const channel = await guild.channels.create({
      name: `${category.emoji}•ticket-${pad(number)}`,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,
      topic: `${TOPIC_PREFIX}${user.id}|n:${number}|cat:${category.id}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: MEMBER_ACCESS },
        { id: config.supportRoleId, allow: MEMBER_ACCESS },
        {
          id: interaction.client.user.id,
          allow: [...MEMBER_ACCESS, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.EmbedLinks],
        },
      ],
    });

    const embed = new EmbedBuilder().setColor(settings.color)
      .setTitle(`${category.emoji} ${category.label} #${pad(number)}`)
      .setFooter({ text: user.username })
      .setTimestamp();
    // A régi panel gombjai még "reason" mezőt küldhetnek.
    const legacy = readAnswer(interaction, 'reason');
    if (legacy) embed.setDescription(legacy);
    questionsOf(category).forEach((question, index) => {
      const answer = readAnswer(interaction, `q${index}`);
      if (answer) embed.addFields({ name: question.label, value: answer.slice(0, 1024) });
    });

    await channel.send({
      content: `<@${user.id}> <@&${config.supportRoleId}>`,
      embeds: [embed],
      components: [ticketButtons()],
      allowedMentions: { users: [user.id], roles: [config.supportRoleId] },
    });
    await interaction.editReply(`Elkészült a ticketed: <#${channel.id}>`);
    record({
      type: 'open', ticket: number, category: category.id, userId: user.id,
    });
    await sendLog(guild, {
      title: `🎫 Új ticket #${pad(number)}`,
      description: `**Nyitotta:** <@${user.id}>\n**Típus:** ${category.label}\n**Csatorna:** <#${channel.id}>`,
    });
  } finally {
    openingTickets.delete(user.id);
  }
}

async function claimTicket(interaction) {
  const info = ticketInfo(interaction.channel);
  if (!info) return void (await interaction.reply(ephemeral('Ez nem ticket csatorna.')));
  if (!isSupport(interaction)) return void (await interaction.reply(ephemeral('Csak a support csapat veheti át.')));

  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .addFields({ name: 'Átvette', value: `<@${interaction.user.id}>` });
  await interaction.update({ embeds: [embed], components: [ticketButtons(true)] });
  record({
    type: 'claim', ticket: info.number, userId: interaction.user.id,
    waitMs: Date.now() - interaction.channel.createdTimestamp,
  });
}

const canClose = (interaction, ownerId) => interaction.user.id === ownerId || isSupport(interaction);

async function showCloseModal(interaction) {
  const ownerId = ownerOf(interaction.channel);
  if (!ownerId) return void (await interaction.reply(ephemeral('Ez nem ticket csatorna.')));
  if (!canClose(interaction, ownerId)) return void (await interaction.reply(ephemeral('Ezt a ticketet nem zárhatod le.')));

  await interaction.showModal(new ModalBuilder()
    .setCustomId('ticket:close-modal')
    .setTitle('Ticket lezárása')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('reason').setLabel('Indok (nem kötelező)')
        .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(300),
    )));
}

function claimedBy(message) {
  return message?.embeds[0]?.fields?.find((field) => field.name === 'Átvette')?.value?.match(/\d+/)?.[0];
}

// Lezárás: napló, mentés, statisztika, privát üzenet, majd a csatorna törlése.
async function finishClose(channel, { closedById, reason, auto = false }) {
  const { guild, client } = channel;
  const info = ticketInfo(channel);
  const category = categoryById(info.categoryId);
  const pinned = await channel.messages.fetch({ limit: 1, after: '0' }).catch(() => null);
  const claimerId = claimedBy(pinned?.first());
  const durationMs = Date.now() - channel.createdTimestamp;
  const closedBy = auto ? 'a bot (inaktivitás)' : `<@${closedById}>`;

  const files = [];
  if (config.transcriptEnabled && config.logChannelId) {
    try {
      files.push(await buildTranscript(channel, {
        Ticket: ticketLabel(info),
        Típus: category.label,
        Nyitotta: guild.members.cache.get(info.ownerId)?.user.username ?? info.ownerId,
        Átvette: claimerId ? (guild.members.cache.get(claimerId)?.user.username ?? claimerId) : '-',
        Lezárta: auto ? 'bot (inaktivitás)' : (guild.members.cache.get(closedById)?.user.username ?? closedById),
        Időtartam: formatDuration(durationMs),
        Indok: reason || '-',
      }));
    } catch (error) {
      console.error('Nem sikerült menteni a ticketet:', error.message);
    }
  }

  record({
    type: 'close', ticket: info.number, category: info.categoryId, userId: auto ? null : closedById,
    byOwner: !auto && closedById === info.ownerId, auto, durationMs,
  });
  await sendLog(guild, {
    title: `🔒 Ticket lezárva ${ticketLabel(info)}`,
    description: `**Nyitotta:** <@${info.ownerId}>\n**Átvette:** ${claimerId ? `<@${claimerId}>` : '-'}\n`
      + `**Lezárta:** ${closedBy}\n**Időtartam:** ${formatDuration(durationMs)}\n**Indok:** ${reason || 'nincs megadva'}`,
    color: settings.errorColor,
    files,
  });
  await client.users.send(info.ownerId, {
    content: `A(z) ${ticketLabel(info)} ticketed lezárva a(z) **${guild.name}** szerveren.${reason ? `\nIndok: ${reason}` : ''}`,
    allowedMentions: { parse: [] },
  }).catch(() => {}); // Sokaknál tiltva van a privát üzenet, ez nem hiba.

  setTimeout(() => {
    channel.delete().catch(console.error).finally(() => closingChannels.delete(channel.id));
  }, 5000);
}

async function closeTicket(interaction) {
  const { channel, user } = interaction;
  const ownerId = ownerOf(channel);
  if (!ownerId) return void (await interaction.reply(ephemeral('Ez nem ticket csatorna.')));
  if (!canClose(interaction, ownerId)) return void (await interaction.reply(ephemeral('Ezt a ticketet nem zárhatod le.')));
  if (closingChannels.has(channel.id)) return void (await interaction.reply(ephemeral('A lezárás már folyamatban van.')));

  closingChannels.add(channel.id);
  try {
    const reason = interaction.isModalSubmit?.() ? readAnswer(interaction, 'reason') : '';
    await interaction.reply(`🔒 A ticketet lezárta: ${user.username}. A csatorna 5 másodperc múlva törlődik.`);
    await finishClose(channel, { closedById: user.id, reason });
  } catch (error) {
    closingChannels.delete(channel.id);
    throw error;
  }
}

async function keepOpen(interaction) {
  const ownerId = ownerOf(interaction.channel);
  if (!ownerId) return void (await interaction.reply(ephemeral('Ez nem ticket csatorna.')));
  if (!canClose(interaction, ownerId)) return void (await interaction.reply(ephemeral('Ezt csak a ticket nyitója vagy a csapat jelezheti.')));
  await interaction.update({ components: [] });
  await interaction.channel.send({ content: `✅ ${interaction.user.username}: a ticket még aktuális, nyitva marad.`, allowedMentions: { parse: [] } });
}

async function checkInactive(channel) {
  const info = ticketInfo(channel);
  if (!info || closingChannels.has(channel.id)) return;
  const last = (await channel.messages.fetch({ limit: 1 })).first();
  const silentMs = Date.now() - (last?.createdTimestamp ?? channel.createdTimestamp);
  const { remindHours, closeHours } = settings.ticketInactivity;
  const isReminder = last?.author.id === channel.client.user.id
    && last.embeds[0]?.footer?.text === REMINDER_FOOTER;

  if (isReminder && silentMs >= closeHours * HOUR_MS) {
    closingChannels.add(channel.id);
    await channel.send('🔒 A ticketet a bot lezárta, mert sokáig nem érkezett válasz. A csatorna 5 másodperc múlva törlődik.');
    await finishClose(channel, { reason: `${remindHours + closeHours} óra inaktivitás`, auto: true })
      .catch((error) => { closingChannels.delete(channel.id); throw error; });
    return;
  }
  if (!isReminder && silentMs >= remindHours * HOUR_MS) {
    const embed = new EmbedBuilder().setColor(settings.warningColor)
      .setTitle('⏰ Még aktuális ez a ticket?')
      .setDescription(`${remindHours} órája nem írt ide senki. Ha ${closeHours} órán belül nem jön válasz, a bot lezárja a ticketet.`)
      .setFooter({ text: REMINDER_FOOTER });
    await channel.send({
      content: `<@${info.ownerId}>`,
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket:active').setLabel('Igen, még kell')
          .setEmoji({ name: '✅' }).setStyle(ButtonStyle.Success),
      )],
      allowedMentions: { users: [info.ownerId] },
    });
  }
}

async function checkAllInactive(client) {
  try {
    const guild = await client.guilds.fetch(config.guildId);
    const channels = await guild.channels.fetch();
    for (const channel of channels.values()) {
      if (!ticketInfo(channel)) continue;
      await checkInactive(channel).catch((error) => console.error(`Inaktivitás hiba (${channel.name}):`, error.message));
    }
  } catch (error) {
    console.error('Nem sikerült ellenőrizni a ticketeket:', error.message);
  }
}

function startInactivityCheck(client) {
  checkAllInactive(client);
  setInterval(() => checkAllInactive(client), CHECK_INTERVAL_MS);
}

async function manageTicketMember(interaction) {
  const { channel } = interaction;
  const ownerId = ownerOf(channel);
  if (!ownerId) return void (await interaction.reply(ephemeral('Ezt egy ticket csatornában használd.')));
  if (!isSupport(interaction)) return void (await interaction.reply(ephemeral('Ez csak a support csapatnak érhető el.')));

  const user = interaction.options.getUser('tag', true);
  if (interaction.options.getSubcommand() === 'hozzaad') {
    await channel.permissionOverwrites.edit(user, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
    });
    await interaction.reply({ content: `<@${user.id}> bekerült a ticketbe.`, allowedMentions: { users: [user.id] } });
    return;
  }
  if (user.id === ownerId) return void (await interaction.reply(ephemeral('A ticket nyitóját nem veheted ki.')));
  await channel.permissionOverwrites.delete(user.id);
  await interaction.reply({ content: `<@${user.id}> kikerült a ticketből.`, allowedMentions: { parse: [] } });
}

const PERIODS = { 7: 'Utolsó 7 nap', 30: 'Utolsó 30 nap', 0: 'Összes' };

async function showStats(interaction) {
  if (!isSupport(interaction)) return void (await interaction.reply(ephemeral('Ez csak a support csapatnak érhető el.')));
  const days = Number(interaction.options.getString('idoszak') ?? '30');
  const stats = summarize(days ? Date.now() - days * 24 * HOUR_MS : 0);
  const openNow = interaction.guild.channels.cache.filter((channel) => ticketInfo(channel)).size;

  const top = (map) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([id, count], index) => `${index + 1}. <@${id}>: ${count}`).join('\n') || '-';
  const categories = Object.entries(stats.byCategory)
    .map(([id, count]) => `${categoryById(id).emoji} ${categoryById(id).label}: ${count}`).join('\n') || '-';

  const embed = new EmbedBuilder().setColor(settings.color)
    .setTitle(`📊 Ticket statisztika: ${PERIODS[days]}`)
    .addFields(
      { name: 'Nyitott most', value: String(openNow), inline: true },
      { name: 'Új ticketek', value: String(stats.opened), inline: true },
      { name: 'Lezárva', value: `${stats.closed} (ebből automatikusan: ${stats.autoClosed})`, inline: true },
      { name: 'Átlagos átvételi idő', value: formatDuration(stats.averageClaimMs), inline: true },
      { name: 'Átlagos megoldási idő', value: formatDuration(stats.averageCloseMs), inline: true },
      { name: 'Kategóriák', value: categories },
      { name: 'Legtöbb átvétel', value: top(stats.claimsByStaff), inline: true },
      { name: 'Legtöbb lezárás', value: top(stats.closesByStaff), inline: true },
    )
    .setFooter({ text: 'A statisztika a 2.5.0-s verzió óta gyűlik' });
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

module.exports = {
  intents: () => (config.transcriptEnabled ? [GatewayIntentBits.MessageContent] : []),
  events: { [Events.ClientReady]: startInactivityCheck },
  commands: [
    new SlashCommandBuilder()
      .setName('ticket-panel')
      .setDescription('Kirakja a ticket nyitó gombokat ebbe a csatornába')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName('ticket')
      .setDescription('Tagok kezelése a ticketben')
      .addSubcommand((sub) => sub.setName('hozzaad').setDescription('Tag hozzáadása a tickethez')
        .addUserOption((option) => option.setName('tag').setDescription('Melyik tag?').setRequired(true)))
      .addSubcommand((sub) => sub.setName('eltavolit').setDescription('Tag eltávolítása a ticketből')
        .addUserOption((option) => option.setName('tag').setDescription('Melyik tag?').setRequired(true))),
    new SlashCommandBuilder()
      .setName('ticket-statisztika')
      .setDescription('A ticketek és a support csapat statisztikája')
      .addStringOption((option) => option.setName('idoszak').setDescription('Melyik időszak?')
        .addChoices(...Object.entries(PERIODS).map(([value, name]) => ({ name, value })))),
  ],
  handlers: {
    'ticket-panel': postPanel,
    ticket: manageTicketMember,
    'ticket-statisztika': showStats,
    'ticket:open': showOpenModal,
    'ticket:modal': createTicket,
    'ticket:claim': claimTicket,
    'ticket:close': showCloseModal,
    'ticket:close-modal': closeTicket,
    'ticket:confirm-close': closeTicket, // a régi verzió gombjaihoz
    'ticket:active': keepOpen,
  },
  checkInactive,
  ticketInfo,
};
