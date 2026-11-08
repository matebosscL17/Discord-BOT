const {
  EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const settings = require('../../settings');
const { ephemeral } = require('../utils');
const { readJson } = require('../store');
const { langOf, named, translator } = require('../i18n');

const tr = translator({
  hu: {
    commands: '📖 Parancsok',
    helpFooter: 'Csak azokat a parancsokat látod, amelyekhez jogod van.',
    pong: '🏓 Pong! Válaszidő: {ms} ms • Üzemidő: {uptime}',
    members: '👥 Tagok',
    online: '🟢 Elérhető',
    channels: '💬 Csatornák',
    roles: '🏷️ Rangok',
    boosts: '🚀 Boostok',
    owner: '👑 Tulajdonos',
    created: '📅 Létrehozva',
    textVoice: '{text} szöveges • {voice} hang',
    boostLevel: '{count} (szint: {level})',
    userTitle: '👤 {name}',
    account: '📅 Fiók létrehozva',
    joined: '🚪 Csatlakozott',
    topRoles: '🏷️ Rangok ({count})',
    noRoles: 'Nincs rangja',
    warnings: '⚠️ Figyelmeztetések',
    notMember: 'Ez a felhasználó nincs a szerveren.',
    uptimeFormat: '{d} nap {h} óra {m} perc',
  },
  en: {
    commands: '📖 Commands',
    helpFooter: 'You only see the commands you have permission for.',
    pong: '🏓 Pong! Latency: {ms} ms • Uptime: {uptime}',
    members: '👥 Members',
    online: '🟢 Online',
    channels: '💬 Channels',
    roles: '🏷️ Roles',
    boosts: '🚀 Boosts',
    owner: '👑 Owner',
    created: '📅 Created',
    textVoice: '{text} text • {voice} voice',
    boostLevel: '{count} (level {level})',
    userTitle: '👤 {name}',
    account: '📅 Account created',
    joined: '🚪 Joined',
    topRoles: '🏷️ Roles ({count})',
    noRoles: 'No roles',
    warnings: '⚠️ Warnings',
    notMember: 'This user is not on the server.',
    uptimeFormat: '{d} d {h} h {m} min',
  },
});

// A súgó csoportjai modulfájlonként.
const GROUP_NAMES = {
  hu: {
    'tickets.js': '🎫 Ticket', 'lfg.js': '🎮 Csapatkereső', 'voice.js': '🔊 Hangszobák', 'clips.js': '🎬 Klipfal',
    'suggestions.js': '💡 Javaslatdoboz', 'roles.js': '🏷️ Rangok', 'changelog.js': '📢 Bejelentések',
    'moderation.js': '🛡️ Moderáció', 'owner.js': '👑 Tulaj', 'utility.js': '🔧 Egyéb',
  },
  en: {
    'tickets.js': '🎫 Tickets', 'lfg.js': '🎮 Group finder', 'voice.js': '🔊 Voice rooms', 'clips.js': '🎬 Clip wall',
    'suggestions.js': '💡 Suggestion box', 'roles.js': '🏷️ Roles', 'changelog.js': '📢 Announcements',
    'moderation.js': '🛡️ Moderation', 'owner.js': '👑 Owner', 'utility.js': '🔧 Other',
  },
};

const timestamp = (ms, style = 'R') => `<t:${Math.floor(ms / 1000)}:${style}>`;

function canUse(interaction, command) {
  return !command.default_member_permissions
    || interaction.memberPermissions.has(BigInt(command.default_member_permissions));
}

// Súgó modulonként csoportosítva, a tag nyelvén.
async function help(interaction, _args, { commands, commandGroups }) {
  const t = tr.user(interaction);
  const lang = langOf(interaction.locale);
  const hu = lang === 'hu';
  const format = (command) => {
    const name = (hu && command.name_localizations?.hu) || command.name;
    const description = (hu && command.description_localizations?.hu) || command.description;
    return `**/${name}** – ${description}`;
  };
  const groups = commandGroups ?? [{ file: 'utility.js', commands }];

  const embed = new EmbedBuilder().setColor(settings.color).setTitle(t('commands')).setFooter({ text: t('helpFooter') });
  for (const group of groups) {
    const visible = group.commands.filter((command) => canUse(interaction, command));
    if (!visible.length) continue;
    const name = GROUP_NAMES[lang][group.file] ?? group.file.replace(/\.js$/, '');
    embed.addFields({ name, value: visible.map(format).join('\n').slice(0, 1024) });
  }
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

function formatUptime(ms, t) {
  const minutes = Math.floor(ms / 60000);
  return t('uptimeFormat', { d: Math.floor(minutes / 1440), h: Math.floor((minutes % 1440) / 60), m: minutes % 60 });
}

async function ping(interaction) {
  const t = tr.user(interaction);
  await interaction.reply(ephemeral(t('pong', {
    ms: Math.round(interaction.client.ws.ping),
    uptime: formatUptime(interaction.client.uptime ?? 0, t),
  })));
}

async function serverInfo(interaction) {
  const t = tr.user(interaction);
  const { guild } = interaction;
  const channels = guild.channels.cache;
  const text = channels.filter((channel) => channel.type === 0).size;
  const voice = channels.filter((channel) => channel.type === 2).size;
  const embed = new EmbedBuilder().setColor(settings.color).setTitle(guild.name)
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: t('members'), value: String(guild.memberCount), inline: true },
      { name: t('owner'), value: `<@${guild.ownerId}>`, inline: true },
      { name: t('created'), value: timestamp(guild.createdTimestamp, 'D'), inline: true },
      { name: t('channels'), value: t('textVoice', { text, voice }), inline: true },
      { name: t('roles'), value: String(guild.roles.cache.size), inline: true },
      { name: t('boosts'), value: t('boostLevel', { count: guild.premiumSubscriptionCount ?? 0, level: guild.premiumTier ?? 0 }), inline: true },
    );
  if (guild.bannerURL?.()) embed.setImage(guild.bannerURL({ size: 1024 }));
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

async function userInfo(interaction) {
  const t = tr.user(interaction);
  const user = interaction.options.getUser('member') ?? interaction.user;
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) return void (await interaction.reply(ephemeral(t('notMember'))));

  const roles = [...member.roles.cache.values()]
    .filter((role) => role.id !== interaction.guild.id)
    .sort((a, b) => b.position - a.position);
  const roleList = roles.slice(0, 15).map((role) => `<@&${role.id}>`).join(' ');
  const embed = new EmbedBuilder().setColor(member.displayColor || settings.color)
    .setTitle(t('userTitle', { name: member.displayName }))
    .setDescription(`<@${user.id}> • ${user.username}`)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: t('account'), value: timestamp(user.createdTimestamp), inline: true },
      { name: t('joined'), value: member.joinedTimestamp ? timestamp(member.joinedTimestamp) : '-', inline: true },
      { name: t('topRoles', { count: roles.length }), value: roleList || t('noRoles') },
    );
  // A figyelmeztetések számát csak a moderátorok látják.
  if (interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    const count = readJson('mod-cases', { cases: [] }).cases
      .filter((item) => item.type === 'warn' && item.userId === user.id && !item.cleared).length;
    embed.addFields({ name: t('warnings'), value: String(count), inline: true });
  }
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

module.exports = {
  commands: [
    named(new SlashCommandBuilder(), ['help', "The bot's commands"], ['help', 'A bot parancsai']),
    named(new SlashCommandBuilder(), ['ping', 'Checks whether the bot is alive'], ['ping', 'Megnézi, hogy él-e a bot']),
    named(new SlashCommandBuilder(), ['serverinfo', 'Information about the server'], ['szerverinfo', 'Adatok a szerverről']),
    named(new SlashCommandBuilder(), ['userinfo', 'Information about a member'], ['taginfo', 'Adatok egy tagról'])
      .addUserOption((option) => named(option, ['member', 'Which member? (default: you)'], ['tag', 'Melyik tag? (alapból te)'])),
  ],
  handlers: {
    help, ping, serverinfo: serverInfo, userinfo: userInfo,
  },
};
