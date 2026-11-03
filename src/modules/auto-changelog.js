const { EmbedBuilder, Events } = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const updates = require('../../frissitesek');
const { formatChangelogLine } = require('../utils');

const FOOTER_PREFIX = 'Bot verzió: ';

// A csatorna üzeneteiből kiderül, mi ment már ki, így ehhez nem kell adatbázis.
async function postedVersions(channel, botId) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const versions = new Set();
  for (const message of messages.values()) {
    const footer = message.embeds[0]?.footer?.text;
    if (message.author.id === botId && footer?.startsWith(FOOTER_PREFIX)) {
      versions.add(footer.slice(FOOTER_PREFIX.length));
    }
  }
  return versions;
}

// Az első futáskor csak a legfrissebb megy ki, utána minden, ami az utolsó kitett után jött.
function pendingUpdates(posted) {
  if (!posted.size) return updates.slice(0, 1);
  const lastPosted = updates.findIndex((update) => posted.has(update.verzio));
  return lastPosted === -1 ? updates.slice(0, 1) : updates.slice(0, lastPosted);
}

async function announceUpdates(client) {
  try {
    const guild = await client.guilds.fetch(config.guildId);
    const channel = await guild.channels.fetch(config.changelogChannelId);
    const posted = await postedVersions(channel, client.user.id);

    for (const update of pendingUpdates(posted).reverse()) {
      const embed = new EmbedBuilder()
        .setColor(settings.color)
        .setAuthor({ name: '🤖 Bot frissítés' })
        .setTitle(update.cim)
        .setDescription(update.valtozasok.map(formatChangelogLine).join('\n').slice(0, 4096))
        .setFooter({ text: `${FOOTER_PREFIX}${update.verzio}` })
        .setTimestamp();
      await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
      console.log(`Changelog kirakva: ${update.verzio}`);
    }
  } catch (error) {
    // Ha nem olvasható a csatorna, inkább kimarad, mint hogy ismétlődjön.
    console.error('Nem sikerült a frissítést bejelenteni:', error.message);
  }
}

module.exports = {
  events: { [Events.ClientReady]: announceUpdates },
};
