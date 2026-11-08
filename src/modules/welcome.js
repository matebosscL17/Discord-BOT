const { EmbedBuilder, Events, GatewayIntentBits } = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { sendLog } = require('../utils');
const { pick, serverLang, translator } = require('../i18n');

// Belépéskor a Discord nem árulja el a tag nyelvét, ezért ezek a szerver nyelvén jelennek meg.
const tr = translator({
  hu: {
    title: '👋 Üdv, {name}!',
    memberCount: 'Te vagy a(z) {count}. tag',
    rules: '📜 Mielőtt belevágsz, olvasd el a szabályokat: <#{channel}>',
    accountAge: '📅 Fiók létrehozva',
    joinedAt: '🚪 Csatlakozott',
    joined: '📥 Új tag',
    left: '📤 Kilépett',
    goodbye: '👋 **{name}** elhagyta a szervert. Most {count} tagunk van.',
    newAccount: '⚠️ Új fiók (kevesebb mint 7 napos)',
  },
  en: {
    title: '👋 Welcome, {name}!',
    memberCount: 'You are member #{count}',
    rules: '📜 Before you jump in, please read the rules: <#{channel}>',
    accountAge: '📅 Account created',
    joinedAt: '🚪 Joined',
    joined: '📥 New member',
    left: '📤 Member left',
    goodbye: '👋 **{name}** left the server. We now have {count} members.',
    newAccount: '⚠️ New account (less than 7 days old)',
  },
});

const DAY_MS = 24 * 3600000;
const timestamp = (ms, style = 'R') => `<t:${Math.floor(ms / 1000)}:${style}>`;

async function welcomeChannel(guild) {
  if (!config.welcomeChannelId) return null;
  return guild.channels.fetch(config.welcomeChannelId).catch(() => null);
}

async function onJoin(member) {
  if (config.autoRoleId) {
    await member.roles.add(config.autoRoleId)
      .catch((error) => console.error('Nem sikerült alaprangot adni:', error.message));
  }

  const channel = await welcomeChannel(member.guild);
  if (channel) {
    const T = tr.server;
    const lines = [pick(settings, 'welcomeMessage', serverLang()).replace('{user}', `<@${member.id}>`)];
    if (settings.rulesChannelId) lines.push('', T('rules', { channel: settings.rulesChannelId }));
    const embed = new EmbedBuilder().setColor(settings.color)
      .setAuthor({ name: member.guild.name, iconURL: member.guild.iconURL?.() ?? undefined })
      .setTitle(T('title', { name: member.displayName ?? member.user.username }))
      .setDescription(lines.join('\n'))
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: T('accountAge'), value: timestamp(member.user.createdTimestamp), inline: true },
        { name: T('joinedAt'), value: timestamp(member.joinedTimestamp ?? Date.now()), inline: true },
      )
      .setFooter({ text: T('memberCount', { count: member.guild.memberCount }) })
      .setTimestamp();
    await channel.send({ content: `<@${member.id}>`, embeds: [embed], allowedMentions: { users: [member.id] } });
  }

  // A naplóban a friss fiókok külön jelzést kapnak, mert gyakran ilyenek a spam-fiókok.
  const isNew = Date.now() - member.user.createdTimestamp < 7 * DAY_MS;
  await sendLog(member.guild, {
    title: tr.server('joined'),
    description: [
      `<@${member.id}> (${member.user.username})`,
      `${tr.server('accountAge')}: ${timestamp(member.user.createdTimestamp)}`,
      isNew ? tr.server('newAccount') : null,
    ].filter(Boolean).join('\n'),
    color: isNew ? settings.warningColor : settings.successColor,
  });
}

async function onLeave(member) {
  if (settings.goodbyeMessage) {
    const channel = await welcomeChannel(member.guild);
    await channel?.send({
      content: tr.server('goodbye', { name: member.user.username, count: member.guild.memberCount }),
      allowedMentions: { parse: [] },
    });
  }
  await sendLog(member.guild, {
    title: tr.server('left'),
    description: `${member.user.username}${member.joinedTimestamp ? ` • ${tr.server('joinedAt')}: ${timestamp(member.joinedTimestamp)}` : ''}`,
    color: settings.warningColor,
  });
}

const enabled = () => Boolean(config.welcomeChannelId || config.autoRoleId);

module.exports = {
  intents: () => (enabled() ? [GatewayIntentBits.GuildMembers] : []),
  events: { [Events.GuildMemberAdd]: onJoin, [Events.GuildMemberRemove]: onLeave },
};
