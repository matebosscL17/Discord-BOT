const { EmbedBuilder, Events } = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const updates = require('../../frissitesek');
const { formatChangelogLine } = require('../utils');
const { serverLang, translator } = require('../i18n');

const tr = translator({
  hu: { footer: 'Bot verzió: ', public: '🤖 Bot frissítés', private: '🔒 Privát frissítés' },
  en: { footer: 'Bot version: ', public: '🤖 Bot update', private: '🔒 Private update' },
});
// Mindkét nyelvű láblécet felismeri, így nyelvváltás után sem ismétel.
const FOOTER_PREFIXES = ['Bot verzió: ', 'Bot version: '];


// A csatorna üzeneteiből kiderül, mi ment már ki, így ehhez nem kell adatbázis.
async function postedVersions(channels, botId) {
  const versions = new Set();
  for (const channel of channels) {
    const messages = await channel.messages.fetch({ limit: 100 });
    for (const message of messages.values()) {
      const footer = message.embeds[0]?.footer?.text;
      const prefix = FOOTER_PREFIXES.find((item) => footer?.startsWith(item));
      if (message.author.id === botId && prefix) versions.add(footer.slice(prefix.length));
    }
  }
  return versions;
}

// Ha a szerver angol, és a bejegyzésnek van "en" része, azt használja.
function localized(update) {
  return serverLang() === 'en' && update.en ? { ...update, ...update.en } : update;
}

async function postUpdate(channel, update, lines, label) {
  if (!lines?.length) return;
  const embed = new EmbedBuilder()
    .setColor(settings.color)
    .setAuthor({ name: label })
    .setTitle(update.cim)
    .setDescription(lines.map(formatChangelogLine).join('\n').slice(0, 4096))
    .setFooter({ text: `${tr.server('footer')}${update.verzio}` })
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

    for (const original of pendingUpdates(posted).reverse()) {
      const update = localized(original);
      await postUpdate(publicChannel, update, update.valtozasok, tr.server('public'));
      await postUpdate(privateChannel, update, update.privatValtozasok, tr.server('private'));
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
