const { EmbedBuilder, Events, GatewayIntentBits } = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { sendLog } = require('../utils');
const { pick, serverLang, translator } = require('../i18n');

const tr = translator({
  hu: { memberCount: 'Te vagy a(z) {count}. tag', joined: '📥 Új tag', left: '📤 Kilépett' },
  en: { memberCount: 'You are member #{count}', joined: '📥 New member', left: '📤 Member left' },
});

async function onJoin(member) {
  if (config.autoRoleId) {
    await member.roles.add(config.autoRoleId)
      .catch((error) => console.error('Nem sikerült alaprangot adni:', error.message));
  }
  if (config.welcomeChannelId) {
    const channel = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
    const embed = new EmbedBuilder().setColor(settings.color)
      .setDescription(pick(settings, 'welcomeMessage', serverLang()).replace('{user}', `<@${member.id}>`))
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: tr.server('memberCount', { count: member.guild.memberCount }) });
    await channel?.send({ embeds: [embed], allowedMentions: { users: [member.id] } });
  }
  await sendLog(member.guild, {
    title: tr.server('joined'), description: `<@${member.id}> (${member.user.username})`, color: settings.successColor,
  });
}

async function onLeave(member) {
  await sendLog(member.guild, { title: tr.server('left'), description: member.user.username, color: settings.warningColor });
}

const enabled = () => Boolean(config.welcomeChannelId || config.autoRoleId);

module.exports = {
  intents: () => (enabled() ? [GatewayIntentBits.GuildMembers] : []),
  events: { [Events.GuildMemberAdd]: onJoin, [Events.GuildMemberRemove]: onLeave },
};
