const { EmbedBuilder, Events } = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const updates = require('../../frissitesek');
const { formatChangelogLine } = require('../utils');

const FOOTER_PREFIX = 'Bot verzió: ';

// A csatorna üzeneteiből kiderül, mi ment már ki, így ehhez nem kell adatbázis.
async function postedVersions(channels, botId) {
  const versions = new Set();
  for (const channel of channels) {
    const messages = await channel.messages.fetch({ limit: 100 });
    for (const message of messages.values()) {
      const footer = message.embeds[0]?.footer?.text;
      if (message.author.id === botId && footer?.startsWith(FOOTER_PREFIX)) {
        versions.add(footer.slice(FOOTER_PREFIX.length));
      }
    }
  }
  return versions;
}

async function postUpdate(channel, update, lines, label) {
  if (!lines?.length) return;
  const embed = new EmbedBuilder()
    .setColor(settings.color)
    .setAuthor({ name: label })
    .setTitle(update.cim)
    .setDescription(lines.map(formatChangelogLine).join('\n').slice(0, 4096))
    .setFooter({ text: `${FOOTER_PREFIX}${update.verzio}` })
    .setTimestamp();
  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
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
    const publicChannel = await guild.channels.fetch(config.changelogChannelId);
    const privateChannel = await guild.channels.fetch(config.logChannelId);
    const posted = await postedVersions([publicChannel, privateChannel], client.user.id);

    for (const update of pendingUpdates(posted).reverse()) {
      await postUpdate(publicChannel, update, update.valtozasok, '🤖 Bot frissítés');
      await postUpdate(privateChannel, update, update.privatValtozasok, '🔒 Privát frissítés');
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
