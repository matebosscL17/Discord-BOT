const { EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('./config');
const settings = require('../settings');
const { langOf, translator } = require('./i18n');

const tr = translator({
  hu: {
    noPermission: 'A botnak nincs ehhez joga, vagy a rangja túl alacsonyan van a rangok listájában.',
    unknown: 'Valami hiba történt. A részletek a bot konzoljában vannak.',
  },
  en: {
    noPermission: 'The bot is missing a permission, or its role is too low in the role list.',
    unknown: 'Something went wrong. The details are in the bot console.',
  },
});

const ephemeral = (content) => ({ content, flags: MessageFlags.Ephemeral });

// A hibaüzenet a tag nyelvén. A userError hibák saját szöveget hoznak magukkal mindkét nyelven.
function errorMessage(error, locale) {
  const lang = langOf(locale);
  if (error?.userMessages) return error.userMessages[lang] ?? error.userMessages.hu;
  if (error?.userMessage) return error.userMessage;
  return tr.lang(lang, error?.code === 50013 ? 'noPermission' : 'unknown');
}

// A sor eleji + - ! jelek ikonra cserélése.
function formatChangelogLine(line) {
  const icon = settings.changelogLineIcons[line[0]];
  return icon ? `${icon} ${line.slice(1).trim()}` : `• ${line}`;
}

// Napló küldése. Ha nincs LOG_CHANNEL_ID, vagy hibázik, a bot akkor is fut tovább.
async function sendLog(guild, { title, description, color = settings.color, files }) {
  if (!config.logChannelId) return;
  try {
    const channel = await guild.channels.fetch(config.logChannelId);
    const embed = new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();
    if (description) embed.setDescription(description.slice(0, 4096));
    await channel.send({ embeds: [embed], files, allowedMentions: { parse: [] } });
  } catch (error) {
    console.error('Nem sikerült naplózni:', error.message);
  }
}

module.exports = {
  ephemeral, errorMessage, formatChangelogLine, sendLog,
};
