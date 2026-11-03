const { ChannelType, PermissionFlagsBits } = require('discord.js');

const pending = new Map();

// Olyan csatornát keres vagy hoz létre, ahova csak a bot ír, a tagok reakciókkal szavaznak.
async function createBotChannel(guild, name) {
  const channels = await guild.channels.fetch();
  const existing = channels.find((channel) => channel?.type === ChannelType.GuildText && channel.name === name);
  if (existing) return existing;
  return guild.channels.create({
    name,
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
  });
}

function ensureBotChannel(guild, name) {
  if (!pending.has(name)) {
    pending.set(name, createBotChannel(guild, name).catch((error) => {
      pending.delete(name);
      throw error;
    }));
  }
  return pending.get(name);
}

module.exports = { ensureBotChannel };
