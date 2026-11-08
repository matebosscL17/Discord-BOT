const {
  EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const settings = require('../../settings');
const { sendLog } = require('../utils');
const { readJson, writeJson } = require('../store');
const { named, translator } = require('../i18n');

const tr = translator({
  hu: {
    noReason: 'Nincs megadva',
    notMember: 'Ez a felhasználó nincs a szerveren.',
    self: 'Magadon ezt nem használhatod.',
    higher: 'Ez a tag azonos vagy magasabb rangú nálad.',
    botCannot: 'A bot ezt nem teheti meg ezzel a taggal: húzd feljebb a bot rangját, és ellenőrizd a jogait.',
    isBot: 'Botot nem lehet figyelmeztetni.',
    kick: 'Kirúgás',
    ban: 'Kitiltás',
    unban: 'Tiltás feloldása',
    mute: 'Némítás',
    unmute: 'Némítás feloldása',
    warn: 'Figyelmeztetés',
    autoMute: 'Automatikus némítás',
    member: 'Tag',
    moderator: 'Moderátor',
    reason: 'Indok',
    duration: 'Időtartam',
    caseLabel: 'Eset',
    minutes: '{n} perc',
    dmTitleKick: 'Ki lettél rúgva a(z) {guild} szerverről',
    dmTitleBan: 'Ki lettél tiltva a(z) {guild} szerverről',
    dmTitleMute: 'Némítást kaptál a(z) {guild} szerveren',
    dmTitleWarn: 'Figyelmeztetést kaptál a(z) {guild} szerveren',
    dmWarnCount: 'Ez a(z) {count}. figyelmeztetésed.',
    done: '✅ {action}: **{name}** (eset #{id})',
    badId: 'Ez nem érvényes felhasználó-azonosító.',
    warned: '⚠️ **{name}** figyelmeztetve (eset #{id}). Ez a(z) {count}. figyelmeztetése.',
    autoMuted: '🔇 Elérte a(z) {count} figyelmeztetést, ezért a bot {minutes} percre némította.',
    noWarnings: '**{name}** még nem kapott figyelmeztetést.',
    warningsTitle: '⚠️ {name} figyelmeztetései ({count})',
    warningsMore: 'A legutóbbi 10 látszik.',
    cleared: '🧹 {count} figyelmeztetés törölve: **{name}**.',
    clearedOne: '🧹 A(z) #{id} figyelmeztetés törölve.',
    caseNotFound: 'Nincs ilyen figyelmeztetés ennél a tagnál.',
    purged: '🧹 {count} üzenet törölve. A 14 napnál régebbieket a Discord nem engedi tömegesen törölni.',
    purgedUser: '🧹 {count} üzenet törölve **{name}** üzenetei közül (az utolsó 100 üzenetből).',
    logPurge: '🧹 Üzenetek törlése',
    logPurgeBody: '**Darab:** {count}\n**Csatorna:** <#{channel}>\n**Moderátor:** <@{mod}>{filter}',
    logPurgeFilter: '\n**Csak tőle:** <@{user}>',
    logClear: '🧹 Figyelmeztetések törlése',
    logClearBody: '**Tag:** <@{user}>\n**Moderátor:** <@{mod}>\n**Törölve:** {count}',
  },
  en: {
    noReason: 'Not given',
    notMember: 'This user is not on the server.',
    self: 'You cannot use this on yourself.',
    higher: 'This member has the same or a higher role than you.',
    botCannot: "The bot cannot do this to that member: move the bot's role higher and check its permissions.",
    isBot: 'Bots cannot be warned.',
    kick: 'Kick',
    ban: 'Ban',
    unban: 'Unban',
    mute: 'Timeout',
    unmute: 'Timeout removed',
    warn: 'Warning',
    autoMute: 'Automatic timeout',
    member: 'Member',
    moderator: 'Moderator',
    reason: 'Reason',
    duration: 'Duration',
    caseLabel: 'Case',
    minutes: '{n} min',
    dmTitleKick: 'You were kicked from {guild}',
    dmTitleBan: 'You were banned from {guild}',
    dmTitleMute: 'You were timed out on {guild}',
    dmTitleWarn: 'You received a warning on {guild}',
    dmWarnCount: 'This is your warning #{count}.',
    done: '✅ {action}: **{name}** (case #{id})',
    badId: 'This is not a valid user ID.',
    warned: '⚠️ **{name}** was warned (case #{id}). This is their warning #{count}.',
    autoMuted: '🔇 They reached {count} warnings, so the bot timed them out for {minutes} minutes.',
    noWarnings: '**{name}** has no warnings yet.',
    warningsTitle: "⚠️ {name}'s warnings ({count})",
    warningsMore: 'Showing the latest 10.',
    cleared: '🧹 {count} warnings removed: **{name}**.',
    clearedOne: '🧹 Warning #{id} removed.',
    caseNotFound: 'This member has no such warning.',
    purged: '🧹 {count} messages deleted. Discord does not allow bulk deleting messages older than 14 days.',
    purgedUser: "🧹 {count} of **{name}**'s messages deleted (from the last 100 messages).",
    logPurge: '🧹 Messages deleted',
    logPurgeBody: '**Amount:** {count}\n**Channel:** <#{channel}>\n**Moderator:** <@{mod}>{filter}',
    logPurgeFilter: '\n**Only from:** <@{user}>',
    logClear: '🧹 Warnings removed',
    logClearBody: '**Member:** <@{user}>\n**Moderator:** <@{mod}>\n**Removed:** {count}',
  },
});

const MAX_TIMEOUT_MINUTES = 40320; // A Discord legfeljebb 28 napot enged.
const MAX_CASES = 5000;
const CASES_FILE = 'mod-cases';
const COLORS = {
  kick: settings.errorColor,
  ban: settings.errorColor,
  unban: settings.successColor,
  mute: settings.warningColor,
  autoMute: settings.warningColor,
  unmute: settings.successColor,
  warn: settings.warningColor,
};
const ICONS = {
  kick: '👢', ban: '🔨', unban: '🕊️', mute: '🔇', autoMute: '🔇', unmute: '🔊', warn: '⚠️',
};

// Minden moderációs lépés sorszámot kap, és a data/mod-cases.json fájlba kerül.
function addCase(entry) {
  const data = readJson(CASES_FILE, { counter: 0, cases: [] });
  data.counter += 1;
  const record = { id: data.counter, time: Date.now(), ...entry };
  data.cases.push(record);
  if (data.cases.length > MAX_CASES) data.cases = data.cases.slice(-MAX_CASES);
  writeJson(CASES_FILE, data);
  return record;
}

const activeWarnings = (userId) => readJson(CASES_FILE, { cases: [] }).cases
  .filter((item) => item.type === 'warn' && item.userId === userId && !item.cleared);

function clearWarnings(userId, caseId) {
  const data = readJson(CASES_FILE, { counter: 0, cases: [] });
  let count = 0;
  for (const item of data.cases) {
    const match = item.type === 'warn' && item.userId === userId && !item.cleared && (!caseId || item.id === caseId);
    if (match) {
      item.cleared = true;
      count += 1;
    }
  }
  writeJson(CASES_FILE, data);
  return count;
}

const reasonOf = (interaction) => interaction.options.getString('reason') ?? tr.server('noReason');

// Megnézi, hogy a parancsot használó és a bot is erősebb-e a célpontnál. Az eredmény egy szövegkulcs.
function blockReason(interaction, target, botCan) {
  if (!target) return 'notMember';
  if (target.id === interaction.user.id) return 'self';
  const isOwner = interaction.guild.ownerId === interaction.user.id;
  if (!isOwner && interaction.member.roles.highest.comparePositionTo(target.roles.highest) <= 0) return 'higher';
  if (!botCan) return 'botCannot';
  return null;
}

// Napló a szerver nyelvén, esetszámmal.
async function logCase(guild, record, user) {
  const T = tr.server;
  const embed = {
    title: `${ICONS[record.type]} #${record.id} • ${T(record.type)}`,
    description: [
      `**${T('member')}:** <@${record.userId}>${user ? ` (${user.username})` : ''}`,
      `**${T('moderator')}:** ${record.modId ? `<@${record.modId}>` : 'bot'}`,
      `**${T('reason')}:** ${record.reason}`,
      record.minutes ? `**${T('duration')}:** ${T('minutes', { n: record.minutes })}` : null,
    ].filter(Boolean).join('\n'),
    color: COLORS[record.type],
  };
  await sendLog(guild, embed);
}

// A célpont nyelvét nem ismerjük, ezért a szerver nyelvén kapja, szép kártyán.
async function notify(user, titleKey, guild, record, extra) {
  const T = tr.server;
  const embed = new EmbedBuilder().setColor(COLORS[record.type])
    .setTitle(`${ICONS[record.type]} ${T(titleKey, { guild: guild.name })}`)
    .addFields(
      { name: T('reason'), value: record.reason },
      { name: T('caseLabel'), value: `#${record.id}`, inline: true },
    )
    .setTimestamp();
  if (record.minutes) embed.addFields({ name: T('duration'), value: T('minutes', { n: record.minutes }), inline: true });
  if (extra) embed.setFooter({ text: extra });
  await user.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

async function kick(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('member');
  const problem = blockReason(interaction, target, target?.kickable);
  if (problem) return void (await interaction.editReply(t(problem)));

  const record = addCase({
    type: 'kick', userId: target.id, modId: interaction.user.id, reason: reasonOf(interaction),
  });
  await notify(target, 'dmTitleKick', interaction.guild, record);
  await target.kick(`#${record.id} ${interaction.user.username}: ${record.reason}`);
  await interaction.editReply(t('done', { action: t('kick'), name: target.user.username, id: record.id }));
  await logCase(interaction.guild, record, target.user);
}

async function ban(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const user = interaction.options.getUser('member', true);
  const target = interaction.options.getMember('member');
  if (target) {
    const problem = blockReason(interaction, target, target.bannable);
    if (problem) return void (await interaction.editReply(t(problem)));
  }

  const record = addCase({
    type: 'ban', userId: user.id, modId: interaction.user.id, reason: reasonOf(interaction),
  });
  const days = interaction.options.getInteger('delete_days') ?? 0;
  if (target) await notify(target, 'dmTitleBan', interaction.guild, record);
  await interaction.guild.bans.create(user.id, {
    reason: `#${record.id} ${interaction.user.username}: ${record.reason}`,
    deleteMessageSeconds: days * 86400,
  });
  await interaction.editReply(t('done', { action: t('ban'), name: user.username, id: record.id }));
  await logCase(interaction.guild, record, user);
}

async function unban(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const id = interaction.options.getString('user_id', true).trim();
  if (!/^\d{15,22}$/.test(id)) return void (await interaction.editReply(t('badId')));

  const record = addCase({
    type: 'unban', userId: id, modId: interaction.user.id, reason: reasonOf(interaction),
  });
  await interaction.guild.bans.remove(id, `#${record.id} ${interaction.user.username}: ${record.reason}`);
  await interaction.editReply(t('done', { action: t('unban'), name: id, id: record.id }));
  await logCase(interaction.guild, record);
}

async function timeout(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('member');
  const problem = blockReason(interaction, target, target?.moderatable);
  if (problem) return void (await interaction.editReply(t(problem)));

  const minutes = interaction.options.getInteger('minutes', true);
  const record = addCase({
    type: 'mute', userId: target.id, modId: interaction.user.id, reason: reasonOf(interaction), minutes,
  });
  await target.timeout(minutes * 60000, `#${record.id} ${interaction.user.username}: ${record.reason}`);
  await notify(target, 'dmTitleMute', interaction.guild, record);
  await interaction.editReply(t('done', { action: t('mute'), name: target.user.username, id: record.id }));
  await logCase(interaction.guild, record, target.user);
}

async function untimeout(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('member');
  const problem = blockReason(interaction, target, target?.moderatable);
  if (problem) return void (await interaction.editReply(t(problem)));

  const record = addCase({
    type: 'unmute', userId: target.id, modId: interaction.user.id, reason: reasonOf(interaction),
  });
  await target.timeout(null, `#${record.id} ${interaction.user.username}: ${record.reason}`);
  await interaction.editReply(t('done', { action: t('unmute'), name: target.user.username, id: record.id }));
  await logCase(interaction.guild, record, target.user);
}

async function warn(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('member');
  if (target?.user?.bot) return void (await interaction.editReply(t('isBot')));
  const problem = blockReason(interaction, target, true);
  if (problem) return void (await interaction.editReply(t(problem)));

  const record = addCase({
    type: 'warn', userId: target.id, modId: interaction.user.id, reason: interaction.options.getString('reason', true),
  });
  const count = activeWarnings(target.id).length;
  await notify(target, 'dmTitleWarn', interaction.guild, record, tr.server('dmWarnCount', { count }));
  const lines = [t('warned', { name: target.user.username, id: record.id, count })];
  await logCase(interaction.guild, record, target.user);

  // Ha eléri a beállított számot, a bot automatikusan némítja.
  const { count: limit, minutes } = settings.warnAutoMute ?? {};
  if (limit && minutes && count >= limit && count % limit === 0 && target.moderatable) {
    const muteRecord = addCase({
      type: 'autoMute', userId: target.id, modId: null, reason: tr.server('dmWarnCount', { count }), minutes,
    });
    await target.timeout(minutes * 60000, `#${muteRecord.id} ${muteRecord.reason}`);
    await notify(target, 'dmTitleMute', interaction.guild, muteRecord);
    await logCase(interaction.guild, muteRecord, target.user);
    lines.push(t('autoMuted', { count, minutes }));
  }
  await interaction.editReply(lines.join('\n'));
}

async function warnings(interaction) {
  const t = tr.user(interaction);
  const user = interaction.options.getUser('member', true);
  const list = activeWarnings(user.id);
  if (!list.length) {
    return void (await interaction.reply({ content: t('noWarnings', { name: user.username }), flags: MessageFlags.Ephemeral }));
  }
  const lines = list.slice(-10).reverse().map((item) => (
    `**#${item.id}** • <t:${Math.floor(item.time / 1000)}:d> • <@${item.modId}>\n${item.reason}`
  ));
  const embed = new EmbedBuilder().setColor(settings.warningColor)
    .setTitle(t('warningsTitle', { name: user.username, count: list.length }))
    .setDescription(lines.join('\n\n').slice(0, 4096));
  if (list.length > 10) embed.setFooter({ text: t('warningsMore') });
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

async function clearWarns(interaction) {
  const t = tr.user(interaction);
  const user = interaction.options.getUser('member', true);
  const caseId = interaction.options.getInteger('case');
  const count = clearWarnings(user.id, caseId);
  if (caseId && !count) return void (await interaction.reply({ content: t('caseNotFound'), flags: MessageFlags.Ephemeral }));

  await interaction.reply({
    content: caseId ? t('clearedOne', { id: caseId }) : t('cleared', { count, name: user.username }),
    flags: MessageFlags.Ephemeral,
  });
  await sendLog(interaction.guild, {
    title: tr.server('logClear'),
    description: tr.server('logClearBody', { user: user.id, mod: interaction.user.id, count }),
    color: settings.successColor,
  });
}

async function purge(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const amount = interaction.options.getInteger('amount', true);
  const user = interaction.options.getUser('member');

  let deleted;
  if (user) {
    // Csak az adott tag üzenetei az utolsó 100 üzenetből.
    const recent = await interaction.channel.messages.fetch({ limit: 100 });
    const own = [...recent.values()].filter((message) => message.author.id === user.id).slice(0, amount);
    deleted = own.length ? await interaction.channel.bulkDelete(own, true) : { size: 0 };
  } else {
    deleted = await interaction.channel.bulkDelete(amount, true);
  }

  await interaction.editReply(user
    ? t('purgedUser', { count: deleted.size, name: user.username })
    : t('purged', { count: deleted.size }));
  await sendLog(interaction.guild, {
    title: tr.server('logPurge'),
    description: tr.server('logPurgeBody', {
      count: deleted.size,
      channel: interaction.channelId,
      mod: interaction.user.id,
      filter: user ? tr.server('logPurgeFilter', { user: user.id }) : '',
    }),
  });
}

const addReason = (option) => named(option, ['reason', 'What is the reason?'], ['indok', 'Mi az indok?']).setMaxLength(400);
const addMember = (option) => named(option, ['member', 'Which member?'], ['tag', 'Melyik tag?']).setRequired(true);

module.exports = {
  commands: [
    named(new SlashCommandBuilder(), ['kick', 'Kick a member'], ['kick', 'Tag kirúgása'])
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption(addMember).addStringOption(addReason),
    named(new SlashCommandBuilder(), ['ban', 'Ban a user'], ['ban', 'Felhasználó kitiltása'])
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption(addMember).addStringOption(addReason)
      .addIntegerOption((option) => named(option, ['delete_days', 'How many days of their messages to delete? (0-7)'],
        ['torles_nap', 'Hány napnyi üzenete törlődjön? (0-7)'])
        .setMinValue(0).setMaxValue(7)),
    named(new SlashCommandBuilder(), ['unban', 'Lift a ban'], ['unban', 'Tiltás feloldása'])
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addStringOption((option) => named(option, ['user_id', 'The user ID'], ['azonosito', 'A felhasználó azonosítója'])
        .setRequired(true))
      .addStringOption(addReason),
    named(new SlashCommandBuilder(), ['mute', 'Time out a member'], ['nemit', 'Tag némítása'])
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(addMember)
      .addIntegerOption((option) => named(option, ['minutes', 'For how many minutes?'], ['perc', 'Hány percre?'])
        .setRequired(true).setMinValue(1).setMaxValue(MAX_TIMEOUT_MINUTES))
      .addStringOption(addReason),
    named(new SlashCommandBuilder(), ['unmute', 'Remove a timeout'], ['nemitas-fel', 'Némítás feloldása'])
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(addMember).addStringOption(addReason),
    named(new SlashCommandBuilder(), ['warn', 'Warn a member'], ['figyelmeztet', 'Tag figyelmeztetése'])
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(addMember)
      .addStringOption((option) => named(option, ['reason', 'What is the reason?'], ['indok', 'Mi az indok?'])
        .setRequired(true).setMaxLength(400)),
    named(new SlashCommandBuilder(), ['warnings', "List a member's warnings"], ['figyelmeztetesek', 'Egy tag figyelmeztetései'])
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(addMember),
    named(new SlashCommandBuilder(), ['clearwarns', "Remove a member's warnings"],
      ['figyelmeztetes-torles', 'Egy tag figyelmeztetéseinek törlése'])
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(addMember)
      .addIntegerOption((option) => named(option, ['case', 'Only this case number'], ['eset', 'Csak ez az esetszám'])
        .setMinValue(1)),
    named(new SlashCommandBuilder(), ['purge', 'Delete messages in this channel'], ['torles', 'Üzenetek törlése ebben a csatornában'])
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption((option) => named(option, ['amount', 'How many messages? (1-100)'], ['darab', 'Hány üzenet? (1-100)'])
        .setRequired(true).setMinValue(1).setMaxValue(100))
      .addUserOption((option) => named(option, ['member', 'Only messages from this member'], ['tag', 'Csak ennek a tagnak az üzenetei'])),
  ],
  handlers: {
    kick, ban, unban, mute: timeout, unmute: untimeout, warn, warnings, clearwarns: clearWarns, purge,
  },
};
