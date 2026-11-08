const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const settings = require('../../settings');
const { sendLog } = require('../utils');
const { named, translator } = require('../i18n');

const tr = translator({
  hu: {
    noReason: 'Nincs megadva',
    notMember: 'Ez a felhasználó nincs a szerveren.',
    self: 'Magadon ezt nem használhatod.',
    higher: 'Ez a tag azonos vagy magasabb rangú nálad.',
    botCannot: 'A bot ezt nem teheti meg ezzel a taggal: húzd feljebb a bot rangját, és ellenőrizd a jogait.',
    logBody: '**Tag:** <@{user}>\n**Moderátor:** <@{mod}>\n**Indok:** {reason}',
    dmKick: 'Ki lettél rúgva a(z) **{guild}** szerverről. Indok: {reason}',
    dmBan: 'Ki lettél tiltva a(z) **{guild}** szerverről. Indok: {reason}',
    kicked: '✅ {name} kirúgva.',
    banned: '✅ {name} kitiltva.',
    badId: 'Ez nem érvényes felhasználó-azonosító.',
    unbanned: '✅ A tiltás feloldva.',
    muted: '✅ {name} némítva {minutes} percre.',
    unmuted: '✅ {name} némítása feloldva.',
    purged: '🧹 {count} üzenet törölve. A 14 napnál régebbieket a Discord nem engedi tömegesen törölni.',
    logKick: 'Kirúgás',
    logBan: 'Kitiltás',
    logUnban: 'Tiltás feloldása',
    logMute: 'Némítás ({minutes} perc)',
    logUnmute: 'Némítás feloldása',
    logPurge: '🧹 Üzenetek törlése',
    logPurgeBody: '**Darab:** {count}\n**Csatorna:** <#{channel}>\n**Moderátor:** <@{mod}>',
  },
  en: {
    noReason: 'Not given',
    notMember: 'This user is not on the server.',
    self: 'You cannot use this on yourself.',
    higher: 'This member has the same or a higher role than you.',
    botCannot: "The bot cannot do this to that member: move the bot's role higher and check its permissions.",
    logBody: '**Member:** <@{user}>\n**Moderator:** <@{mod}>\n**Reason:** {reason}',
    dmKick: 'You were kicked from **{guild}**. Reason: {reason}',
    dmBan: 'You were banned from **{guild}**. Reason: {reason}',
    kicked: '✅ {name} was kicked.',
    banned: '✅ {name} was banned.',
    badId: 'This is not a valid user ID.',
    unbanned: '✅ The ban was lifted.',
    muted: '✅ {name} was timed out for {minutes} minutes.',
    unmuted: "✅ {name}'s timeout was removed.",
    purged: '🧹 {count} messages deleted. Discord does not allow bulk deleting messages older than 14 days.',
    logKick: 'Kick',
    logBan: 'Ban',
    logUnban: 'Unban',
    logMute: 'Timeout ({minutes} min)',
    logUnmute: 'Timeout removed',
    logPurge: '🧹 Messages deleted',
    logPurgeBody: '**Amount:** {count}\n**Channel:** <#{channel}>\n**Moderator:** <@{mod}>',
  },
});

const MAX_TIMEOUT_MINUTES = 40320; // A Discord legfeljebb 28 napot enged.

// Az indok a moderátor szövege, ha nincs, a szerver nyelvén "nincs megadva".
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

async function logAction(interaction, title, userId, reason, color = settings.warningColor) {
  await sendLog(interaction.guild, {
    title: `🛡️ ${title}`,
    description: tr.server('logBody', { user: userId, mod: interaction.user.id, reason }),
    color,
  });
}

// A célpont nyelvét nem ismerjük, ezért a szerver nyelvén kapja.
async function notify(user, text) {
  await user.send({ content: text, allowedMentions: { parse: [] } }).catch(() => {});
}

async function kick(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('member');
  const problem = blockReason(interaction, target, target?.kickable);
  if (problem) return void (await interaction.editReply(t(problem)));

  const reason = reasonOf(interaction);
  await notify(target, tr.server('dmKick', { guild: interaction.guild.name, reason }));
  await target.kick(`${interaction.user.username}: ${reason}`);
  await interaction.editReply(t('kicked', { name: target.user.username }));
  await logAction(interaction, tr.server('logKick'), target.id, reason, settings.errorColor);
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

  const reason = reasonOf(interaction);
  const days = interaction.options.getInteger('delete_days') ?? 0;
  if (target) await notify(target, tr.server('dmBan', { guild: interaction.guild.name, reason }));
  await interaction.guild.bans.create(user.id, {
    reason: `${interaction.user.username}: ${reason}`,
    deleteMessageSeconds: days * 86400,
  });
  await interaction.editReply(t('banned', { name: user.username }));
  await logAction(interaction, tr.server('logBan'), user.id, reason, settings.errorColor);
}

async function unban(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const id = interaction.options.getString('user_id', true).trim();
  if (!/^\d{15,22}$/.test(id)) return void (await interaction.editReply(t('badId')));

  const reason = reasonOf(interaction);
  await interaction.guild.bans.remove(id, `${interaction.user.username}: ${reason}`);
  await interaction.editReply(t('unbanned'));
  await logAction(interaction, tr.server('logUnban'), id, reason, settings.successColor);
}

async function timeout(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('member');
  const problem = blockReason(interaction, target, target?.moderatable);
  if (problem) return void (await interaction.editReply(t(problem)));

  const minutes = interaction.options.getInteger('minutes', true);
  const reason = reasonOf(interaction);
  await target.timeout(minutes * 60000, `${interaction.user.username}: ${reason}`);
  await interaction.editReply(t('muted', { name: target.user.username, minutes }));
  await logAction(interaction, tr.server('logMute', { minutes }), target.id, reason);
}

async function untimeout(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('member');
  const problem = blockReason(interaction, target, target?.moderatable);
  if (problem) return void (await interaction.editReply(t(problem)));

  await target.timeout(null, `${interaction.user.username}: ${tr.server('logUnmute')}`);
  await interaction.editReply(t('unmuted', { name: target.user.username }));
  await logAction(interaction, tr.server('logUnmute'), target.id, reasonOf(interaction), settings.successColor);
}

async function purge(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const amount = interaction.options.getInteger('amount', true);
  const deleted = await interaction.channel.bulkDelete(amount, true);
  await interaction.editReply(t('purged', { count: deleted.size }));
  await sendLog(interaction.guild, {
    title: tr.server('logPurge'),
    description: tr.server('logPurgeBody', { count: deleted.size, channel: interaction.channelId, mod: interaction.user.id }),
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
    named(new SlashCommandBuilder(), ['purge', 'Delete messages in this channel'], ['torles', 'Üzenetek törlése ebben a csatornában'])
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption((option) => named(option, ['amount', 'How many messages? (1-100)'], ['darab', 'Hány üzenet? (1-100)'])
        .setRequired(true).setMinValue(1).setMaxValue(100)),
  ],
  handlers: {
    kick, ban, unban, mute: timeout, unmute: untimeout, purge,
  },
};
