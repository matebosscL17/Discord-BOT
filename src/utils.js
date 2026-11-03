const { EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('./config');
const settings = require('../settings');

const ephemeral = (content) => ({ content, flags: MessageFlags.Ephemeral });

const errorMessage = (error) => (error?.code === 50013
  ? 'A botnak nincs ehhez joga, vagy a rangja túl alacsonyan van a rangok listájában.'
  : 'Valami hiba történt. A részletek a bot konzoljában vannak.');

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

module.exports = { ephemeral, errorMessage, sendLog };
