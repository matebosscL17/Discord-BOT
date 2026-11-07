const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { getId, saveId } = require('./store');

const pending = new Map();

async function fetchChannel(guild, id) {
  if (!id) return null;
  return guild.channels.fetch(id).catch(() => null);
}

// Csatorna keresése ebben a sorrendben: megadott azonosító, megjegyzett azonosító, név.
// Ha egyik sincs meg, létrehozza a csatornát a megadott módon, és megjegyzi az azonosítóját.
async function resolveChannel(guild, key, { id, name, type, create }) {
  if (id) {
    const configured = await fetchChannel(guild, id);
    if (!configured) throw new Error(`Nem találom a(z) ${id} azonosítójú csatornát (${key}). Ellenőrizd a settings.js fájlt!`);
    return configured;
  }

  const remembered = await fetchChannel(guild, getId(key));
  if (remembered) return remembered;

  const channels = await guild.channels.fetch();
  const channel = channels.find((item) => item?.type === type && item.name === name) ?? await create();
  saveId(key, channel.id);
  return channel;
}

async function createBotChannel(guild, key, { channelId, channelName }) {
  return resolveChannel(guild, key, {
    id: channelId,
    name: channelName,
    type: ChannelType.GuildText,
    create: () => guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionFlagsBits.AddReactions],
          deny: [PermissionFlagsBits.SendMessages],
        },
        {
          id: guild.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AddReactions, PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    }),
  });
}

// Olyan csatorna, ahova csak a bot ír, a tagok reakciókkal szavaznak.
function ensureBotChannel(guild, key, options) {
  if (!pending.has(key)) {
    pending.set(key, createBotChannel(guild, key, options).catch((error) => {
      pending.delete(key);
      throw error;
    }));
  }
  return pending.get(key);
}

module.exports = { ensureBotChannel, resolveChannel };
