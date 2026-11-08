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
const {
  choice, langOf, named, pick, serverLang, translator,
} = require('../i18n');

const tr = translator({
  hu: {
    panelPosted: 'A ticket panel kikerült.',
    alreadyOpen: 'Már van nyitott ticketed: <#{channel}>',
    inProgress: 'A ticketed éppen készül.',
    created: 'Elkészült a ticketed: <#{channel}>',
    defaultQuestion: 'Miben segíthetünk?',
    openedBy: 'Nyitotta',
    welcome: 'Szia <@{user}>! Köszönjük, hogy írtál, a csapat hamarosan válaszol.\nAddig írd le ide a részleteket, vagy csatolj képet.',
    fieldOpener: '👤 Nyitotta',
    fieldType: '📂 Típus',
    status: '📌 Állapot',
    waiting: '🟢 Válaszra vár',
    inWork: '🟡 Folyamatban\nÁtvette: <@{user}>',
    claimedBy: 'Átvette',
    footer: 'Ha megoldódott, zárd le a 🔒 gombbal',
    claim: 'Átveszem',
    claimed: 'Átvéve',
    close: 'Lezárás',
    logNew: '🎫 Új ticket {ticket}',
    logNewBody: '**Nyitotta:** <@{user}>\n**Típus:** {type}\n**Csatorna:** <#{channel}>',
    notTicket: 'Ez nem ticket csatorna.',
    supportOnlyClaim: 'Csak a support csapat veheti át.',
    claimNotice: '🙋 <@{owner}>, a ticketedet átvette <@{staff}>, hamarosan válaszol.',
    cannotClose: 'Ezt a ticketet nem zárhatod le.',
    closeTitle: 'Ticket lezárása',
    reasonLabel: 'Indok (nem kötelező)',
    closingAlready: 'A lezárás már folyamatban van.',
    closedBy: '🔒 A ticketet lezárta: {name}. A csatorna 5 másodperc múlva törlődik.',
    autoClosed: '🔒 A ticketet a bot lezárta, mert sokáig nem érkezett válasz. A csatorna 5 másodperc múlva törlődik.',
    botInactive: 'a bot (inaktivitás)',
    inactivityReason: '{hours} óra inaktivitás',
    noReason: 'nincs megadva',
    logClosed: '🔒 Ticket lezárva {ticket}',
    logClosedBody: '**Nyitotta:** <@{owner}>\n**Átvette:** {claimer}\n**Lezárta:** {closer}\n**Időtartam:** {duration}\n**Indok:** {reason}',
    dmClosed: 'A(z) {ticket} ticketed lezárva a(z) **{guild}** szerveren.',
    dmReason: 'Indok: {reason}',
    tType: 'Típus',
    tOpener: 'Nyitotta',
    tClaimer: 'Átvette',
    tCloser: 'Lezárta',
    tDuration: 'Időtartam',
    tReason: 'Indok',
    keepOpenDenied: 'Ezt csak a ticket nyitója vagy a csapat jelezheti.',
    keptOpen: '✅ {name}: a ticket még aktuális, nyitva marad.',
    reminderTitle: '⏰ Még aktuális ez a ticket?',
    reminderBody: '{remind} órája nem írt ide senki. Ha {close} órán belül nem jön válasz, a bot lezárja a ticketet.',
    reminderFooter: 'Inaktivitás figyelmeztetés',
    stillNeeded: 'Igen, még kell',
    useInTicket: 'Ezt egy ticket csatornában használd.',
    supportOnly: 'Ez csak a support csapatnak érhető el.',
    memberAdded: '<@{user}> bekerült a ticketbe.',
    cannotRemoveOwner: 'A ticket nyitóját nem veheted ki.',
    memberRemoved: '<@{user}> kikerült a ticketből.',
    period7: 'Utolsó 7 nap',
    period30: 'Utolsó 30 nap',
    period0: 'Összes',
    statsTitle: '📊 Ticket statisztika: {period}',
    openNow: 'Nyitott most',
    newTickets: 'Új ticketek',
    closedCount: 'Lezárva',
    closedValue: '{count} (ebből automatikusan: {auto})',
    avgClaim: 'Átlagos átvételi idő',
    avgClose: 'Átlagos megoldási idő',
    categories: 'Kategóriák',
    topClaims: 'Legtöbb átvétel',
    topCloses: 'Legtöbb lezárás',
    statsFooter: 'A statisztika a 2.5.0-s verzió óta gyűlik',
    minutes: '{n} perc',
    hours: '{h} óra {m} perc',
    days: '{n} nap',
  },
  en: {
    panelPosted: 'The ticket panel has been posted.',
    alreadyOpen: 'You already have an open ticket: <#{channel}>',
    inProgress: 'Your ticket is being created.',
    created: 'Your ticket is ready: <#{channel}>',
    defaultQuestion: 'How can we help?',
    openedBy: 'Opened by',
    welcome: 'Hi <@{user}>! Thanks for reaching out, the team will reply soon.\nMeanwhile, add any details here or attach a picture.',
    fieldOpener: '👤 Opened by',
    fieldType: '📂 Type',
    status: '📌 Status',
    waiting: '🟢 Waiting for reply',
    inWork: '🟡 In progress\nClaimed by: <@{user}>',
    claimedBy: 'Claimed by',
    footer: 'When it is solved, close it with the 🔒 button',
    claim: 'Claim',
    claimed: 'Claimed',
    close: 'Close',
    logNew: '🎫 New ticket {ticket}',
    logNewBody: '**Opened by:** <@{user}>\n**Type:** {type}\n**Channel:** <#{channel}>',
    notTicket: 'This is not a ticket channel.',
    supportOnlyClaim: 'Only the support team can claim tickets.',
    claimNotice: '🙋 <@{owner}>, your ticket was claimed by <@{staff}>, they will reply soon.',
    cannotClose: 'You cannot close this ticket.',
    closeTitle: 'Close ticket',
    reasonLabel: 'Reason (optional)',
    closingAlready: 'The ticket is already being closed.',
    closedBy: '🔒 Ticket closed by {name}. This channel will be deleted in 5 seconds.',
    autoClosed: '🔒 The bot closed this ticket because there was no reply for a long time. This channel will be deleted in 5 seconds.',
    botInactive: 'the bot (inactivity)',
    inactivityReason: '{hours} hours of inactivity',
    noReason: 'not given',
    logClosed: '🔒 Ticket closed {ticket}',
    logClosedBody: '**Opened by:** <@{owner}>\n**Claimed by:** {claimer}\n**Closed by:** {closer}\n**Duration:** {duration}\n**Reason:** {reason}',
    dmClosed: 'Your ticket {ticket} on **{guild}** was closed.',
    dmReason: 'Reason: {reason}',
    tType: 'Type',
    tOpener: 'Opened by',
    tClaimer: 'Claimed by',
    tCloser: 'Closed by',
    tDuration: 'Duration',
    tReason: 'Reason',
    keepOpenDenied: 'Only the ticket owner or the team can do this.',
    keptOpen: '✅ {name}: this ticket is still needed, it stays open.',
    reminderTitle: '⏰ Is this ticket still needed?',
    reminderBody: 'Nobody has written here for {remind} hours. If there is no reply within {close} hours, the bot will close the ticket.',
    reminderFooter: 'Inactivity reminder',
    stillNeeded: 'Yes, still needed',
    useInTicket: 'Use this in a ticket channel.',
    supportOnly: 'This is only available to the support team.',
    memberAdded: '<@{user}> was added to the ticket.',
    cannotRemoveOwner: 'You cannot remove the ticket owner.',
    memberRemoved: '<@{user}> was removed from the ticket.',
    period7: 'Last 7 days',
    period30: 'Last 30 days',
    period0: 'All time',
    statsTitle: '📊 Ticket statistics: {period}',
    openNow: 'Open now',
    newTickets: 'New tickets',
    closedCount: 'Closed',
    closedValue: '{count} (automatically: {auto})',
    avgClaim: 'Average time to claim',
    avgClose: 'Average time to solve',
    categories: 'Categories',
    topClaims: 'Most claims',
    topCloses: 'Most closes',
    statsFooter: 'Statistics are collected since version 2.5.0',
    minutes: '{n} min',
    hours: '{h} h {m} min',
    days: '{n} days',
  },
});

// Mindkét nyelvű szöveget felismeri, így nyelvváltás után a régi ticketek is működnek.
const both = (key) => [tr.lang('hu', key), tr.lang('en', key)];
const STATUS_FIELDS = both('status');
const CLAIMED_FIELDS = both('claimedBy');
const REMINDER_FOOTERS = both('reminderFooter');

// A ticket adatai a csatorna leírásában vannak, olvasható formában:
// "Ticket #0001 • Hibajelentés • Nyitotta: név (ID: 123)" vagy angolul "... • Opened by: név (ID: 123)"
// A régebbi verziók "ticket-owner:<tag>|n:<sorszám>|cat:<kategória>" formát használtak, az is működik.
const TOPIC_PREFIX = 'ticket-owner:';
const TOPIC_PATTERN = /^Ticket #(\d+) • (.+?) • (?:Nyitotta|Opened by): .* \(ID: (\d+)\)$/;
const CHECK_INTERVAL_MS = 30 * 60000;
const HOUR_MS = 3600000;
const MEMBER_ACCESS = [
  PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
];
const DEFAULT_QUESTIONS = [{ label: tr.lang('hu', 'defaultQuestion'), labelEn: tr.lang('en', 'defaultQuestion'), long: true }];
const openingTickets = new Set(); // dupla kattintás ellen
const closingChannels = new Set();

const pad = (number) => String(number).padStart(4, '0');

function ticketInfo(channel) {
  const topic = channel?.topic;
  if (!topic) return null;
  if (topic.startsWith(TOPIC_PREFIX)) {
    const [owner, ...parts] = topic.slice(TOPIC_PREFIX.length).split('|');
    const meta = Object.fromEntries(parts.map((part) => part.split(':')));
    return { ownerId: owner, number: meta.n ? Number(meta.n) : null, categoryId: meta.cat ?? null };
  }
  const match = topic.match(TOPIC_PATTERN);
  if (!match) return null;
  const category = settings.ticketCategories.find((item) => item.label === match[2] || item.labelEn === match[2]);
  return { ownerId: match[3], number: Number(match[1]), categoryId: category?.id ?? null };
}

const topicFor = (number, category, user, lang) => `Ticket #${pad(number)} • ${pick(category, 'label', lang)} • `
  + `${tr.lang(lang, 'openedBy')}: ${user.username} (ID: ${user.id})`;
// A ticket nyelve: az, amelyiken a nyitója a Discordot használja. A csatorna leírásából derül ki.
const ticketLang = (channel) => {
  const topic = channel?.topic ?? '';
  if (topic.includes('• Opened by: ')) return 'en';
  if (topic.includes('• Nyitotta: ')) return 'hu';
  return serverLang();
};
const ownerOf = (channel) => ticketInfo(channel)?.ownerId ?? null;
const findOpenTicket = (guild, userId) => guild.channels.cache.find((channel) => ownerOf(channel) === userId);
const categoryById = (id) => settings.ticketCategories.find((category) => category.id === id)
  ?? { id: 'ticket', label: 'Ticket', emoji: '🎫' };
const categoryLabel = (category, lang = serverLang()) => pick(category, 'label', lang);
const questionsOf = (category) => (category.questions?.length ? category.questions : DEFAULT_QUESTIONS).slice(0, 5);
const ticketLabel = (info) => (info?.number ? `#${pad(info.number)}` : 'ticket');

const isSupport = (interaction) => interaction.member.roles.cache.has(config.supportRoleId)
  || interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels);

function formatDuration(ms, lang = serverLang()) {
  if (!ms) return '-';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return tr.lang(lang, 'minutes', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return tr.lang(lang, 'hours', { h: hours, m: minutes % 60 });
  return tr.lang(lang, 'days', { n: Math.round(hours / 24) });
}

function ticketButtons(lang, claimed = false) {
  const T = tr.as(lang);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:claim').setLabel(T(claimed ? 'claimed' : 'claim'))
      .setEmoji({ name: '🙋' }).setStyle(ButtonStyle.Success).setDisabled(claimed),
    new ButtonBuilder().setCustomId('ticket:close').setLabel(T('close'))
      .setEmoji({ name: '🔒' }).setStyle(ButtonStyle.Danger),
  );
}

async function postPanel(interaction) {
  const lang = langOf(interaction.locale); // a panelt kirakó admin nyelvén
  const embed = new EmbedBuilder().setColor(settings.color)
    .setTitle(pick(settings.ticketPanel, 'title', lang))
    .setDescription(pick(settings.ticketPanel, 'description', lang));
  const row = new ActionRowBuilder().addComponents(settings.ticketCategories.slice(0, 5).map((category) => (
    new ButtonBuilder().setCustomId(`ticket:open:${category.id}`).setLabel(categoryLabel(category, lang))
      .setEmoji({ name: category.emoji }).setStyle(ButtonStyle.Secondary)
  )));
  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply(ephemeral(tr.user(interaction)('panelPosted')));
}

// A kérdéseket a tag a saját nyelvén látja.
async function showOpenModal(interaction, [categoryId]) {
  const t = tr.user(interaction);
  const lang = langOf(interaction.locale);
  const existing = findOpenTicket(interaction.guild, interaction.user.id);
  if (existing) {
    await interaction.reply(ephemeral(t('alreadyOpen', { channel: existing.id })));
    return;
  }
  const category = categoryById(categoryId);
  const rows = questionsOf(category).map((question, index) => new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(`q${index}`)
      .setLabel(pick(question, 'label', lang).slice(0, 45))
      .setStyle(question.long ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(!question.optional)
      .setMaxLength(question.long ? 1000 : 200),
  ));
  await interaction.showModal(new ModalBuilder()
    .setCustomId(`ticket:modal:${category.id}`)
    .setTitle(categoryLabel(category, lang).slice(0, 45))
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
  const t = tr.user(interaction);
  const { guild, user } = interaction;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const existing = findOpenTicket(guild, user.id);
  if (existing || openingTickets.has(user.id)) {
    await interaction.editReply(existing ? t('alreadyOpen', { channel: existing.id }) : t('inProgress'));
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
      topic: topicFor(number, category, user, langOf(interaction.locale)),
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

    // A ticket a nyitója nyelvén jelenik meg, a napló a szerver nyelvén.
    const lang = langOf(interaction.locale);
    const T = tr.as(lang);
    const embed = new EmbedBuilder().setColor(settings.color)
      .setAuthor({ name: `${category.emoji} ${categoryLabel(category, lang)}` })
      .setTitle(`Ticket #${pad(number)}`)
      .setDescription(T('welcome', { user: user.id }))
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: T('fieldOpener'), value: `<@${user.id}>`, inline: true },
        { name: T('fieldType'), value: categoryLabel(category, lang), inline: true },
        { name: T('status'), value: T('waiting'), inline: true },
      )
      .setFooter({ text: T('footer') })
      .setTimestamp();
    // A régi panel gombjai még "reason" mezőt küldhetnek.
    const legacy = readAnswer(interaction, 'reason');
    if (legacy) embed.addFields({ name: `❔ ${T('defaultQuestion')}`, value: legacy.slice(0, 1024) });
    questionsOf(category).forEach((question, index) => {
      const answer = readAnswer(interaction, `q${index}`);
      if (answer) embed.addFields({ name: `❔ ${pick(question, 'label', lang)}`, value: answer.slice(0, 1024) });
    });

    await channel.send({
      content: `<@${user.id}> <@&${config.supportRoleId}>`,
      embeds: [embed],
      components: [ticketButtons(lang)],
      allowedMentions: { users: [user.id], roles: [config.supportRoleId] },
    });
    await interaction.editReply(t('created', { channel: channel.id }));
    record({
      type: 'open', ticket: number, category: category.id, userId: user.id,
    });
    await sendLog(guild, {
      title: tr.server('logNew', { ticket: `#${pad(number)}` }),
      description: tr.server('logNewBody', { user: user.id, type: categoryLabel(category), channel: channel.id }),
    });
  } finally {
    openingTickets.delete(user.id);
  }
}

async function claimTicket(interaction) {
  const t = tr.user(interaction);
  const info = ticketInfo(interaction.channel);
  if (!info) return void (await interaction.reply(ephemeral(t('notTicket'))));
  if (!isSupport(interaction)) return void (await interaction.reply(ephemeral(t('supportOnlyClaim'))));

  const T = tr.as(ticketLang(interaction.channel));
  const original = interaction.message.embeds[0];
  const status = T('inWork', { user: interaction.user.id });
  const embed = EmbedBuilder.from(original);
  const fields = Array.isArray(original?.fields) ? original.fields : [];
  if (fields.some((field) => STATUS_FIELDS.includes(field.name))) {
    embed.setFields(fields.map((field) => (STATUS_FIELDS.includes(field.name) ? { ...field, value: status } : field)));
  } else {
    embed.addFields({ name: T('claimedBy'), value: `<@${interaction.user.id}>` }); // régi ticket
  }
  await interaction.update({ embeds: [embed], components: [ticketButtons(ticketLang(interaction.channel), true)] });
  await interaction.channel.send({
    content: T('claimNotice', { owner: info.ownerId, staff: interaction.user.id }),
    allowedMentions: { users: [info.ownerId] },
  });
  record({
    type: 'claim', ticket: info.number, userId: interaction.user.id,
    waitMs: Date.now() - interaction.channel.createdTimestamp,
  });
}

const canClose = (interaction, ownerId) => interaction.user.id === ownerId || isSupport(interaction);

async function showCloseModal(interaction) {
  const t = tr.user(interaction);
  const ownerId = ownerOf(interaction.channel);
  if (!ownerId) return void (await interaction.reply(ephemeral(t('notTicket'))));
  if (!canClose(interaction, ownerId)) return void (await interaction.reply(ephemeral(t('cannotClose'))));

  await interaction.showModal(new ModalBuilder()
    .setCustomId('ticket:close-modal')
    .setTitle(t('closeTitle'))
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('reason').setLabel(t('reasonLabel'))
        .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(300),
    )));
}

function claimedBy(message) {
  const field = message?.embeds[0]?.fields
    ?.find((item) => CLAIMED_FIELDS.includes(item.name) || STATUS_FIELDS.includes(item.name));
  return field?.value?.match(/<@!?(\d+)>/)?.[1];
}

// Lezárás: napló, mentés, statisztika, privát üzenet, majd a csatorna törlése.
async function finishClose(channel, { closedById, reason, auto = false }) {
  const { guild, client } = channel;
  const info = ticketInfo(channel);
  const category = categoryById(info.categoryId);
  const first = await channel.messages.fetch({ limit: 1, after: '0' }).catch(() => null);
  const claimerId = claimedBy(first?.first());
  const durationMs = Date.now() - channel.createdTimestamp;
  const nameOf = (id) => guild.members.cache.get(id)?.user.username ?? id;

  const files = [];
  if (config.transcriptEnabled && config.logChannelId) {
    try {
      files.push(await buildTranscript(channel, {
        Ticket: ticketLabel(info),
        [tr.server('tType')]: categoryLabel(category),
        [tr.server('tOpener')]: nameOf(info.ownerId),
        [tr.server('tClaimer')]: claimerId ? nameOf(claimerId) : '-',
        [tr.server('tCloser')]: auto ? tr.server('botInactive') : nameOf(closedById),
        [tr.server('tDuration')]: formatDuration(durationMs),
        [tr.server('tReason')]: reason || '-',
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
    title: tr.server('logClosed', { ticket: ticketLabel(info) }),
    description: tr.server('logClosedBody', {
      owner: info.ownerId,
      claimer: claimerId ? `<@${claimerId}>` : '-',
      closer: auto ? tr.server('botInactive') : `<@${closedById}>`,
      duration: formatDuration(durationMs),
      reason: reason || tr.server('noReason'),
    }),
    color: settings.errorColor,
    files,
  });

  // A nyitó a saját nyelvén kapja az értesítést, a napló a szerver nyelvén készül.
  const T = tr.as(ticketLang(channel));
  const dm = [T('dmClosed', { ticket: ticketLabel(info), guild: guild.name })];
  if (reason) dm.push(T('dmReason', { reason }));
  await client.users.send(info.ownerId, { content: dm.join('\n'), allowedMentions: { parse: [] } })
    .catch(() => {}); // Sokaknál tiltva van a privát üzenet, ez nem hiba.

  setTimeout(() => {
    channel.delete().catch(console.error).finally(() => closingChannels.delete(channel.id));
  }, 5000);
}

async function closeTicket(interaction) {
  const t = tr.user(interaction);
  const { channel, user } = interaction;
  const ownerId = ownerOf(channel);
  if (!ownerId) return void (await interaction.reply(ephemeral(t('notTicket'))));
  if (!canClose(interaction, ownerId)) return void (await interaction.reply(ephemeral(t('cannotClose'))));
  if (closingChannels.has(channel.id)) return void (await interaction.reply(ephemeral(t('closingAlready'))));

  closingChannels.add(channel.id);
  try {
    const reason = interaction.isModalSubmit?.() ? readAnswer(interaction, 'reason') : '';
    await interaction.reply(tr.as(ticketLang(channel))('closedBy', { name: user.username }));
    await finishClose(channel, { closedById: user.id, reason });
  } catch (error) {
    closingChannels.delete(channel.id);
    throw error;
  }
}

async function keepOpen(interaction) {
  const t = tr.user(interaction);
  const ownerId = ownerOf(interaction.channel);
  if (!ownerId) return void (await interaction.reply(ephemeral(t('notTicket'))));
  if (!canClose(interaction, ownerId)) return void (await interaction.reply(ephemeral(t('keepOpenDenied'))));
  await interaction.update({ components: [] });
  await interaction.channel.send({
    content: tr.as(ticketLang(interaction.channel))('keptOpen', { name: interaction.user.username }), allowedMentions: { parse: [] },
  });
}

async function checkInactive(channel) {
  const info = ticketInfo(channel);
  if (!info || closingChannels.has(channel.id)) return;
  const last = (await channel.messages.fetch({ limit: 1 })).first();
  const silentMs = Date.now() - (last?.createdTimestamp ?? channel.createdTimestamp);
  const { remindHours, closeHours } = settings.ticketInactivity;
  const T = tr.as(ticketLang(channel));
  const isReminder = last?.author.id === channel.client.user.id
    && REMINDER_FOOTERS.includes(last.embeds[0]?.footer?.text);

  if (isReminder && silentMs >= closeHours * HOUR_MS) {
    closingChannels.add(channel.id);
    await channel.send(T('autoClosed'));
    await finishClose(channel, { reason: T('inactivityReason', { hours: remindHours + closeHours }), auto: true })
      .catch((error) => { closingChannels.delete(channel.id); throw error; });
    return;
  }
  if (!isReminder && silentMs >= remindHours * HOUR_MS) {
    const embed = new EmbedBuilder().setColor(settings.warningColor)
      .setTitle(T('reminderTitle'))
      .setDescription(T('reminderBody', { remind: remindHours, close: closeHours }))
      .setFooter({ text: T('reminderFooter') });
    await channel.send({
      content: `<@${info.ownerId}>`,
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket:active').setLabel(T('stillNeeded'))
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
  const t = tr.user(interaction);
  const { channel } = interaction;
  const ownerId = ownerOf(channel);
  if (!ownerId) return void (await interaction.reply(ephemeral(t('useInTicket'))));
  if (!isSupport(interaction)) return void (await interaction.reply(ephemeral(t('supportOnly'))));

  const user = interaction.options.getUser('member', true);
  if (interaction.options.getSubcommand() === 'add') {
    await channel.permissionOverwrites.edit(user, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true,
    });
    await interaction.reply({ content: tr.as(ticketLang(channel))('memberAdded', { user: user.id }), allowedMentions: { users: [user.id] } });
    return;
  }
  if (user.id === ownerId) return void (await interaction.reply(ephemeral(t('cannotRemoveOwner'))));
  await channel.permissionOverwrites.delete(user.id);
  await interaction.reply({ content: tr.as(ticketLang(channel))('memberRemoved', { user: user.id }), allowedMentions: { parse: [] } });
}

const PERIODS = ['7', '30', '0'];

async function showStats(interaction) {
  const t = tr.user(interaction);
  const lang = langOf(interaction.locale);
  if (!isSupport(interaction)) return void (await interaction.reply(ephemeral(t('supportOnly'))));
  const days = Number(interaction.options.getString('period') ?? '30');
  const stats = summarize(days ? Date.now() - days * 24 * HOUR_MS : 0);
  const openNow = interaction.guild.channels.cache.filter((channel) => ticketInfo(channel)).size;

  const top = (map) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([id, count], index) => `${index + 1}. <@${id}>: ${count}`).join('\n') || '-';
  const categories = Object.entries(stats.byCategory)
    .map(([id, count]) => `${categoryById(id).emoji} ${categoryLabel(categoryById(id), lang)}: ${count}`).join('\n') || '-';

  const embed = new EmbedBuilder().setColor(settings.color)
    .setTitle(t('statsTitle', { period: t(`period${days}`) }))
    .addFields(
      { name: t('openNow'), value: String(openNow), inline: true },
      { name: t('newTickets'), value: String(stats.opened), inline: true },
      { name: t('closedCount'), value: t('closedValue', { count: stats.closed, auto: stats.autoClosed }), inline: true },
      { name: t('avgClaim'), value: formatDuration(stats.averageClaimMs, lang), inline: true },
      { name: t('avgClose'), value: formatDuration(stats.averageCloseMs, lang), inline: true },
      { name: t('categories'), value: categories },
      { name: t('topClaims'), value: top(stats.claimsByStaff), inline: true },
      { name: t('topCloses'), value: top(stats.closesByStaff), inline: true },
    )
    .setFooter({ text: t('statsFooter') });
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

const memberOption = (option) => named(option, ['member', 'Which member?'], ['tag', 'Melyik tag?']).setRequired(true);

module.exports = {
  intents: () => (config.transcriptEnabled ? [GatewayIntentBits.MessageContent] : []),
  events: { [Events.ClientReady]: startInactivityCheck },
  commands: [
    named(new SlashCommandBuilder(), ['ticket-panel', 'Post the ticket buttons in this channel'],
      ['ticket-panel', 'Kirakja a ticket nyitó gombokat ebbe a csatornába'])
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    named(new SlashCommandBuilder(), ['ticket', 'Manage members in the ticket'], ['ticket', 'Tagok kezelése a ticketben'])
      .addSubcommand((sub) => named(sub, ['add', 'Add a member to the ticket'], ['hozzaad', 'Tag hozzáadása a tickethez'])
        .addUserOption(memberOption))
      .addSubcommand((sub) => named(sub, ['remove', 'Remove a member from the ticket'],
        ['eltavolit', 'Tag eltávolítása a ticketből'])
        .addUserOption(memberOption)),
    named(new SlashCommandBuilder(), ['ticket-stats', 'Statistics of tickets and the support team'],
      ['ticket-statisztika', 'A ticketek és a support csapat statisztikája'])
      .addStringOption((option) => named(option, ['period', 'Which period?'], ['idoszak', 'Melyik időszak?'])
        .addChoices(...PERIODS.map((value) => choice(value, tr.lang('en', `period${value}`), tr.lang('hu', `period${value}`))))),
  ],
  handlers: {
    'ticket-panel': postPanel,
    ticket: manageTicketMember,
    'ticket-stats': showStats,
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
