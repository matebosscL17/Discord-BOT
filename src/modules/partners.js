const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits,
  SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { ephemeral, sendLog } = require('../utils');
const { readJson, writeJson } = require('../store');
const { langOf, named, translator } = require('../i18n');

const tr = translator({
  hu: {
    panelTitle: '🤝 Partnerség',
    panelBody: 'Szeretnéd, hogy a szervered a partnereink között legyen? Kattints a gombra, töltsd ki az űrlapot, és a csapat hamarosan elbírálja.',
    request: 'Partnerség kérése',
    panelPosted: 'A partner panel kikerült.',
    modalTitle: 'Partnerség kérése',
    invite: 'A szervered meghívó linkje',
    inviteHint: 'https://discord.gg/...',
    description: 'Mutasd be pár mondatban a szervered',
    reason: 'Miért szeretnél partner lenni?',
    badInvite: 'Ez nem érvényes vagy lejárt Discord meghívó. Adj meg egy lejárat nélküli meghívót (https://discord.gg/...).',
    tooSmall: 'A partnerséghez legalább {min} tag kell a szerveren (most kb. {count}).',
    ownServer: 'A saját szerverünkkel nem lehet partnerséget kötni. 😄',
    pending: 'Már van elbírálásra váró kérelmed.',
    already: 'Ez a szerver már a partnereink között van.',
    sent: '✅ Elküldtük a kérelmed, a csapat hamarosan elbírálja. Az eredményről privát üzenetet kapsz.',
    reviewTitle: '🤝 Új partnerkérelem: {name}',
    requester: '👤 Kérelmező',
    members: '👥 Tagok',
    online: '🟢 Online',
    inviteField: '🔗 Meghívó',
    about: '📝 Bemutatkozás',
    why: '💬 Miért',
    accept: 'Elfogadás',
    reject: 'Elutasítás',
    staffOnly: 'Ezt csak a csapat bírálhatja el.',
    rejectTitle: 'Elutasítás indoka',
    rejectReason: 'Indok (a kérelmező megkapja)',
    notSet: 'A partnerek csatornája nincs beállítva (settings.js: partners.channelId).',
    decidedAccepted: '✅ Elfogadta: <@{user}>',
    decidedRejected: '❌ Elutasította: <@{user}>',
    gone: 'Ez a kérelem már nem található.',
    partnerTitle: '🤝 {name}',
    join: 'Csatlakozás',
    partnerSince: 'Partner óta',
    dmAccepted: '🎉 A(z) **{name}** partnerkérelmedet elfogadtuk a(z) **{guild}** szerveren! Köszönjük!',
    dmRejected: 'A(z) **{name}** partnerkérelmedet sajnos elutasítottuk a(z) **{guild}** szerveren.',
    dmReason: 'Indok: {reason}',
    listTitle: '🤝 Partnereink ({count})',
    listEmpty: 'Még nincs partnerünk.',
    removed: '🗑️ {name} lekerült a partnerek közül.',
    notFound: 'Nincs ilyen nevű partner.',
    logAccepted: '🤝 Új partner: {name}',
    logRejected: '🤝 Elutasított partnerkérelem: {name}',
    logBody: '**Kérelmező:** <@{user}>\n**Elbírálta:** <@{staff}>',
    disabled: 'A partnerrendszer ki van kapcsolva a settings.js fájlban.',
  },
  en: {
    panelTitle: '🤝 Partnership',
    panelBody: 'Would you like your server to be one of our partners? Click the button, fill in the form, and the team will review it soon.',
    request: 'Request partnership',
    panelPosted: 'The partner panel has been posted.',
    modalTitle: 'Partnership request',
    invite: "Your server's invite link",
    inviteHint: 'https://discord.gg/...',
    description: 'Describe your server in a few sentences',
    reason: 'Why do you want to partner?',
    badInvite: 'This Discord invite is invalid or expired. Give an invite that never expires (https://discord.gg/...).',
    tooSmall: 'Partnership needs at least {min} members on the server (now about {count}).',
    ownServer: 'You cannot partner with our own server. 😄',
    pending: 'You already have a request waiting for review.',
    already: 'This server is already one of our partners.',
    sent: '✅ Your request was sent, the team will review it soon. You will get a DM about the result.',
    reviewTitle: '🤝 New partner request: {name}',
    requester: '👤 Requested by',
    members: '👥 Members',
    online: '🟢 Online',
    inviteField: '🔗 Invite',
    about: '📝 About',
    why: '💬 Why',
    accept: 'Accept',
    reject: 'Reject',
    staffOnly: 'Only the team can review this.',
    rejectTitle: 'Reason for rejection',
    rejectReason: 'Reason (sent to the requester)',
    notSet: 'The partners channel is not set (settings.js: partners.channelId).',
    decidedAccepted: '✅ Accepted by <@{user}>',
    decidedRejected: '❌ Rejected by <@{user}>',
    gone: 'This request can no longer be found.',
    partnerTitle: '🤝 {name}',
    join: 'Join',
    partnerSince: 'Partner since',
    dmAccepted: '🎉 Your partner request for **{name}** was accepted on **{guild}**! Thank you!',
    dmRejected: 'Unfortunately your partner request for **{name}** was rejected on **{guild}**.',
    dmReason: 'Reason: {reason}',
    listTitle: '🤝 Our partners ({count})',
    listEmpty: 'We have no partners yet.',
    removed: '🗑️ {name} was removed from the partners.',
    notFound: 'There is no partner with that name.',
    logAccepted: '🤝 New partner: {name}',
    logRejected: '🤝 Partner request rejected: {name}',
    logBody: '**Requested by:** <@{user}>\n**Reviewed by:** <@{staff}>',
    disabled: 'The partner system is turned off in settings.js.',
  },
});

const partnerSettings = settings.partners ?? {};
const enabled = () => partnerSettings.enabled !== false;
const FILE = 'partners';
const load = () => readJson(FILE, { requests: {}, partners: [] });
const save = (data) => writeJson(FILE, data);

const isStaff = (interaction) => interaction.member.roles.cache.has(config.supportRoleId)
  || interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);

// Meghívókód kiolvasása: discord.gg/abc, discord.com/invite/abc vagy csak abc.
function inviteCode(text) {
  const value = String(text ?? '').trim();
  const match = value.match(/(?:discord(?:app)?\.com\/invite|discord\.gg)\/([\w-]{2,32})/i);
  if (match) return match[1];
  return /^[\w-]{2,32}$/.test(value) ? value : null;
}

function readField(interaction, id) {
  try {
    return interaction.fields.getTextInputValue(id).trim();
  } catch {
    return '';
  }
}

async function postPanel(interaction) {
  const t = tr.user(interaction);
  if (!enabled()) return void (await interaction.reply(ephemeral(t('disabled'))));
  // A panel a kirakó admin nyelvén jelenik meg.
  const embed = new EmbedBuilder().setColor(settings.color).setTitle(t('panelTitle')).setDescription(t('panelBody'));
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('partner:request').setLabel(t('request')).setEmoji({ name: '🤝' }).setStyle(ButtonStyle.Primary),
  );
  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply(ephemeral(t('panelPosted')));
}

async function showRequestModal(interaction) {
  const t = tr.user(interaction);
  if (!enabled()) return void (await interaction.reply(ephemeral(t('disabled'))));
  if (Object.values(load().requests).some((request) => request.userId === interaction.user.id)) {
    return void (await interaction.reply(ephemeral(t('pending'))));
  }
  const field = (id, label, style, max, placeholder) => {
    const input = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setMaxLength(max).setRequired(true);
    if (placeholder) input.setPlaceholder(placeholder);
    return new ActionRowBuilder().addComponents(input);
  };
  await interaction.showModal(new ModalBuilder().setCustomId('partner:modal').setTitle(t('modalTitle')).addComponents(
    field('invite', t('invite'), TextInputStyle.Short, 100, t('inviteHint')),
    field('description', t('description'), TextInputStyle.Paragraph, 1000),
    field('reason', t('reason'), TextInputStyle.Paragraph, 500),
  ));
}

async function submitRequest(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const data = load();
  if (Object.values(data.requests).some((request) => request.userId === interaction.user.id)) {
    return void (await interaction.editReply(t('pending')));
  }

  // A meghívót a bot ellenőrzi: létezik-e, és melyik szerveré.
  const code = inviteCode(readField(interaction, 'invite'));
  const invite = code ? await interaction.client.fetchInvite(code).catch(() => null) : null;
  if (!invite?.guild) return void (await interaction.editReply(t('badInvite')));
  if (invite.guild.id === interaction.guild.id) return void (await interaction.editReply(t('ownServer')));
  if (data.partners.some((partner) => partner.guildId === invite.guild.id)) return void (await interaction.editReply(t('already')));
  const memberCount = invite.memberCount ?? invite.approximateMemberCount ?? 0;
  if (partnerSettings.minMembers && memberCount < partnerSettings.minMembers) {
    return void (await interaction.editReply(t('tooSmall', { min: partnerSettings.minMembers, count: memberCount })));
  }

  const reviewChannel = await interaction.guild.channels
    .fetch(partnerSettings.reviewChannelId || config.logChannelId).catch(() => null);
  if (!reviewChannel) return void (await interaction.editReply(t('notSet')));

  const request = {
    userId: interaction.user.id,
    guildId: invite.guild.id,
    name: invite.guild.name,
    icon: invite.guild.iconURL?.({ size: 256 }) ?? null,
    invite: `https://discord.gg/${invite.code}`,
    members: memberCount,
    online: invite.presenceCount ?? invite.approximatePresenceCount ?? 0,
    description: readField(interaction, 'description'),
    reason: readField(interaction, 'reason'),
    lang: langOf(interaction.locale),
    at: Date.now(),
  };

  // Az elbíráló kártya a szerver nyelvén, mert a csapatnak szól.
  const T = tr.server;
  const embed = new EmbedBuilder().setColor(settings.warningColor)
    .setTitle(T('reviewTitle', { name: request.name }))
    .setThumbnail(request.icon)
    .addFields(
      { name: T('requester'), value: `<@${request.userId}>`, inline: true },
      { name: T('members'), value: String(request.members), inline: true },
      { name: T('online'), value: String(request.online), inline: true },
      { name: T('inviteField'), value: request.invite },
      { name: T('about'), value: request.description.slice(0, 1024) },
      { name: T('why'), value: request.reason.slice(0, 1024) },
    )
    .setTimestamp();
  const id = `${Date.now().toString(36)}${interaction.user.id.slice(-4)}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`partner:accept:${id}`).setLabel(T('accept')).setEmoji({ name: '✅' }).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`partner:reject:${id}`).setLabel(T('reject')).setEmoji({ name: '❌' }).setStyle(ButtonStyle.Danger),
  );
  await reviewChannel.send({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });

  data.requests[id] = request;
  save(data);
  await interaction.editReply(t('sent'));
}

async function notifyRequester(client, request, lines) {
  await client.users.send(request.userId, { content: lines.join('\n'), allowedMentions: { parse: [] } }).catch(() => {});
}

async function closeReview(interaction, text) {
  const embed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(settings.color).setFooter({ text });
  await interaction.message.edit({ embeds: [embed], components: [] }).catch(() => {});
}

async function accept(interaction, [id]) {
  const t = tr.user(interaction);
  if (!isStaff(interaction)) return void (await interaction.reply(ephemeral(t('staffOnly'))));
  const data = load();
  const request = data.requests[id];
  if (!request) return void (await interaction.reply(ephemeral(t('gone'))));
  const channel = partnerSettings.channelId
    ? await interaction.guild.channels.fetch(partnerSettings.channelId).catch(() => null) : null;
  if (!channel) return void (await interaction.reply(ephemeral(t('notSet'))));
  await interaction.deferUpdate();

  // A partnerkártya a szerver nyelvén, mert mindenki látja.
  const T = tr.server;
  const card = new EmbedBuilder().setColor(settings.color)
    .setTitle(T('partnerTitle', { name: request.name }))
    .setDescription(request.description)
    .setThumbnail(request.icon)
    .addFields({ name: T('members'), value: String(request.members), inline: true })
    .setFooter({ text: T('partnerSince') })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel(T('join')).setEmoji({ name: '🔗' }).setStyle(ButtonStyle.Link).setURL(request.invite),
  );
  const message = await channel.send({ embeds: [card], components: [row], allowedMentions: { parse: [] } });

  if (partnerSettings.roleId) {
    const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
    await member?.roles.add(partnerSettings.roleId, 'Partner').catch(() => {});
  }
  data.partners.push({
    guildId: request.guildId, name: request.name, invite: request.invite, userId: request.userId,
    messageId: message.id, channelId: channel.id, at: Date.now(),
  });
  delete data.requests[id];
  save(data);

  await closeReview(interaction, tr.server('decidedAccepted', { user: interaction.user.id }).replace(/<@\d+>/, interaction.user.username));
  await notifyRequester(interaction.client, request, [tr.as(request.lang)('dmAccepted', { name: request.name, guild: interaction.guild.name })]);
  await sendLog(interaction.guild, {
    title: tr.server('logAccepted', { name: request.name }),
    description: tr.server('logBody', { user: request.userId, staff: interaction.user.id }),
    color: settings.successColor,
  });
}

async function showReject(interaction, [id]) {
  const t = tr.user(interaction);
  if (!isStaff(interaction)) return void (await interaction.reply(ephemeral(t('staffOnly'))));
  await interaction.showModal(new ModalBuilder().setCustomId(`partner:reject-modal:${id}`).setTitle(t('rejectTitle'))
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('reason').setLabel(t('rejectReason')).setStyle(TextInputStyle.Paragraph)
        .setRequired(false).setMaxLength(500),
    )));
}

async function reject(interaction, [id]) {
  const t = tr.user(interaction);
  if (!isStaff(interaction)) return void (await interaction.reply(ephemeral(t('staffOnly'))));
  const data = load();
  const request = data.requests[id];
  if (!request) return void (await interaction.reply(ephemeral(t('gone'))));
  await interaction.deferUpdate();
  const reason = readField(interaction, 'reason');
  delete data.requests[id];
  save(data);

  await closeReview(interaction, tr.server('decidedRejected', { user: interaction.user.id }).replace(/<@\d+>/, interaction.user.username));
  const T = tr.as(request.lang);
  const lines = [T('dmRejected', { name: request.name, guild: interaction.guild.name })];
  if (reason) lines.push(T('dmReason', { reason }));
  await notifyRequester(interaction.client, request, lines);
  await sendLog(interaction.guild, {
    title: tr.server('logRejected', { name: request.name }),
    description: tr.server('logBody', { user: request.userId, staff: interaction.user.id }),
    color: settings.errorColor,
  });
}

async function list(interaction) {
  const t = tr.user(interaction);
  const { partners } = load();
  const lines = partners.map((partner) => `🤝 **${partner.name}** • [${t('join')}](${partner.invite})`);
  const embed = new EmbedBuilder().setColor(settings.color)
    .setTitle(t('listTitle', { count: partners.length }))
    .setDescription(lines.join('\n').slice(0, 4096) || t('listEmpty'));
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function remove(interaction) {
  const t = tr.user(interaction);
  if (!isStaff(interaction)) return void (await interaction.reply(ephemeral(t('staffOnly'))));
  const name = interaction.options.getString('name', true).trim().toLowerCase();
  const data = load();
  const partner = data.partners.find((item) => item.name.toLowerCase() === name);
  if (!partner) return void (await interaction.reply(ephemeral(t('notFound'))));
  const channel = await interaction.guild.channels.fetch(partner.channelId).catch(() => null);
  await channel?.messages.delete(partner.messageId).catch(() => {});
  data.partners = data.partners.filter((item) => item !== partner);
  save(data);
  await interaction.reply(ephemeral(t('removed', { name: partner.name })));
}

module.exports = {
  commands: [
    named(new SlashCommandBuilder(), ['partner-panel', 'Post the partnership request panel'],
      ['partner-panel', 'Kirakja a partnerkérelem panelt'])
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    named(new SlashCommandBuilder(), ['partners', 'List of our partner servers'], ['partnerek', 'Partnerszervereink listája']),
    named(new SlashCommandBuilder(), ['partner-remove', 'Remove a partner'], ['partner-torles', 'Partner eltávolítása'])
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) => named(option, ['name', 'Name of the partner server'], ['nev', 'A partnerszerver neve'])
        .setRequired(true).setMaxLength(100)),
  ],
  handlers: {
    'partner-panel': postPanel,
    partners: list,
    'partner-remove': remove,
    'partner:request': showRequestModal,
    'partner:modal': submitRequest,
    'partner:accept': accept,
    'partner:reject': showReject,
    'partner:reject-modal': reject,
  },
  _internal: { inviteCode, load },
};
