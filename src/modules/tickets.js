const {
  ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder,
  GatewayIntentBits, MessageFlags, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder,
  TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { ephemeral, sendLog } = require('../utils');

const TOPIC_PREFIX = 'ticket-owner:';
const MEMBER_ACCESS = [
  PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
];
const openingTickets = new Set(); // dupla kattintás ellen
const closingChannels = new Set();

const ownerOf = (channel) => (channel.topic?.startsWith(TOPIC_PREFIX) ? channel.topic.slice(TOPIC_PREFIX.length) : null);
const findOpenTicket = (guild, userId) => guild.channels.cache.find((channel) => channel.topic === `${TOPIC_PREFIX}${userId}`);
const categoryById = (id) => settings.ticketCategories.find((category) => category.id === id)
  ?? { id: 'ticket', label: 'Ticket', emoji: '🎫' };

const isSupport = (interaction) => interaction.member.roles.cache.has(config.supportRoleId)
  || interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels);

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
  await interaction.showModal(new ModalBuilder()
    .setCustomId(`ticket:modal:${category.id}`)
    .setTitle(category.label)
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('reason').setLabel('Miben segíthetünk?')
        .setStyle(TextInputStyle.Paragraph).setMaxLength(1000),
    )));
}

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
    const safeName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || user.id;
    const channel = await guild.channels.create({
      name: `${category.emoji}•${safeName}`,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,
      topic: `${TOPIC_PREFIX}${user.id}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: MEMBER_ACCESS },
        { id: config.supportRoleId, allow: MEMBER_ACCESS },
        {
          id: interaction.client.user.id,
          allow: [
            ...MEMBER_ACCESS, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.EmbedLinks,
          ],
        },
      ],
    });

    const embed = new EmbedBuilder().setColor(settings.color)
      .setTitle(`${category.emoji} ${category.label}`)
      .setDescription(interaction.fields.getTextInputValue('reason'))
      .setFooter({ text: user.username })
      .setTimestamp();

    await channel.send({
      content: `<@${user.id}> <@&${config.supportRoleId}>`,
      embeds: [embed],
      components: [ticketButtons()],
      allowedMentions: { users: [user.id], roles: [config.supportRoleId] },
    });
    await interaction.editReply(`Elkészült a ticketed: <#${channel.id}>`);
    await sendLog(guild, {
      title: '🎫 Új ticket',
      description: `**Nyitotta:** <@${user.id}>\n**Típus:** ${category.label}\n**Csatorna:** <#${channel.id}>`,
    });
  } finally {
    openingTickets.delete(user.id);
  }
}

async function claimTicket(interaction) {
  if (!ownerOf(interaction.channel)) return void (await interaction.reply(ephemeral('Ez nem ticket csatorna.')));
  if (!isSupport(interaction)) return void (await interaction.reply(ephemeral('Csak a support csapat veheti át.')));

  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .addFields({ name: 'Átvette', value: `<@${interaction.user.id}>` });
  await interaction.update({ embeds: [embed], components: [ticketButtons(true)] });
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

async function buildTranscript(channel) {
  const messages = [];
  let before;
  while (messages.length < 1000) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
  }
  const lines = messages.reverse().map((message) => {
    const time = message.createdAt.toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' });
    const files = [...message.attachments.values()].map((file) => ` [fájl: ${file.url}]`).join('');
    return `[${time}] ${message.author.username}: ${message.content}${files}`;
  });
  return new AttachmentBuilder(Buffer.from(lines.join('\n'), 'utf8'), { name: `${channel.id}.txt` });
}

async function closeTicket(interaction) {
  const { channel, user, guild } = interaction;
  const ownerId = ownerOf(channel);
  if (!ownerId) return void (await interaction.reply(ephemeral('Ez nem ticket csatorna.')));
  if (!canClose(interaction, ownerId)) return void (await interaction.reply(ephemeral('Ezt a ticketet nem zárhatod le.')));
  if (closingChannels.has(channel.id)) return void (await interaction.reply(ephemeral('A lezárás már folyamatban van.')));

  closingChannels.add(channel.id);
  try {
    const reason = interaction.isModalSubmit?.() ? interaction.fields.getTextInputValue('reason') : '';
    await interaction.reply(`🔒 A ticketet lezárta: ${user.username}. A csatorna 5 másodperc múlva törlődik.`);

    const files = [];
    if (config.transcriptEnabled && config.logChannelId) {
      try {
        files.push(await buildTranscript(channel));
      } catch (error) {
        console.error('Nem sikerült menteni a ticketet:', error.message);
      }
    }
    await sendLog(guild, {
      title: '🔒 Ticket lezárva',
      description: `**Nyitotta:** <@${ownerId}>\n**Lezárta:** <@${user.id}>\n**Indok:** ${reason || 'nincs megadva'}`,
      color: settings.errorColor,
      files,
    });
    await interaction.client.users.send(ownerId, {
      content: `A ticketed lezárva a(z) **${guild.name}** szerveren.${reason ? `\nIndok: ${reason}` : ''}`,
      allowedMentions: { parse: [] },
    }).catch(() => {}); // Sokaknál tiltva van a privát üzenet, ez nem hiba.

    setTimeout(() => {
      channel.delete().catch(console.error).finally(() => closingChannels.delete(channel.id));
    }, 5000);
  } catch (error) {
    closingChannels.delete(channel.id);
    throw error;
  }
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

module.exports = {
  intents: () => (config.transcriptEnabled ? [GatewayIntentBits.MessageContent] : []),
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
  ],
  handlers: {
    'ticket-panel': postPanel,
    ticket: manageTicketMember,
    'ticket:open': showOpenModal,
    'ticket:modal': createTicket,
    'ticket:claim': claimTicket,
    'ticket:close': showCloseModal,
    'ticket:close-modal': closeTicket,
    'ticket:confirm-close': closeTicket, // a régi verzió gombjaihoz
  },
};
