const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder,
  PermissionFlagsBits, UserSelectMenuBuilder,
} = require('discord.js');
const settings = require('../settings');
const { resolveChannel } = require('./channels');

const {
  categoryId, hubId, categoryName, categoryOldNames, hubName, emptyTimeoutMinutes,
} = settings.tempVoice;
const MEMBER_ACCESS = [
  PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak, PermissionFlagsBits.SendMessages,
];
const BOT_ACCESS = [
  ...MEMBER_ACCESS, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory,
];

let setupPromise = null;

async function createSetup(guild) {
  const category = await resolveChannel(guild, 'tempVoiceCategory', {
    id: categoryId,
    name: categoryName,
    oldNames: categoryOldNames,
    type: ChannelType.GuildCategory,
    create: () => guild.channels.create({ name: categoryName, type: ChannelType.GuildCategory }),
  });
  const hub = await resolveChannel(guild, 'tempVoiceHub', {
    id: hubId,
    name: hubName,
    type: ChannelType.GuildVoice,
    create: () => guild.channels.create({ name: hubName, type: ChannelType.GuildVoice, parent: category.id }),
  });
  return { categoryId: category.id, hubId: hub.id };
}

// A kategória és a létrehozó csatorna megkeresése vagy létrehozása, egyszer futásonként.
function ensureSetup(guild) {
  setupPromise ??= createSetup(guild).catch((error) => {
    setupPromise = null;
    throw error;
  });
  return setupPromise;
}

async function isTempRoom(channel) {
  if (channel?.type !== ChannelType.GuildVoice) return false;
  const { categoryId, hubId } = await ensureSetup(channel.guild);
  return channel.parentId === categoryId && channel.id !== hubId;
}

async function deleteIfEmpty(channel) {
  if (!(await isTempRoom(channel)) || channel.members.size > 0) return;
  await channel.delete().catch((error) => {
    if (error.code !== 10003) console.error('Nem sikerült törölni a szobát:', error.message); // 10003: már törölve
  });
}

function roomPanel(ownerId, locked = false) {
  const embed = new EmbedBuilder().setColor(settings.color).setTitle('🎛️ Szoba kezelése')
    .setDescription(`**Tulajdonos:** <@${ownerId}>\nHa a tulajdonos kilép, bárki átveheti a szobát.`);
  const button = (id, label, emoji, style = ButtonStyle.Secondary) => new ButtonBuilder()
    .setCustomId(`vc:${id}:${ownerId}`).setLabel(label).setEmoji({ name: emoji }).setStyle(style);
  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        button('rename', 'Átnevezés', '✏️'),
        button('limit', 'Létszám', '👥'),
        button('lock', locked ? 'Nyitás' : 'Zárás', locked ? '🔓' : '🔒'),
        button('claim', 'Átvétel', '👑', ButtonStyle.Success),
      ),
      new ActionRowBuilder().addComponents(new UserSelectMenuBuilder()
        .setCustomId(`vc:kick:${ownerId}`).setPlaceholder('🚫 Tag kirúgása a szobából')),
      new ActionRowBuilder().addComponents(new UserSelectMenuBuilder()
        .setCustomId(`vc:allow:${ownerId}`).setPlaceholder('✅ Tag beengedése a szobába')),
    ],
    allowedMentions: { parse: [] },
  };
}

async function createRoom(guild, {
  name, ownerId, memberIds = [ownerId], isPrivate = false, userLimit = 0,
}) {
  const { categoryId } = await ensureSetup(guild);
  const overwrites = [
    ...memberIds.map((id) => ({ id, allow: MEMBER_ACCESS })),
    { id: guild.client.user.id, allow: BOT_ACCESS },
  ];
  if (isPrivate) {
    overwrites.push({
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
    });
  }
  const room = await guild.channels.create({
    name, type: ChannelType.GuildVoice, parent: categoryId, userLimit, permissionOverwrites: overwrites,
  });
  await room.send(roomPanel(ownerId, isPrivate)).catch((error) => console.error('Nem sikerült a szoba panelje:', error.message));
  // Ha senki nem lép be, a szoba ne maradjon ott.
  setTimeout(() => deleteIfEmpty(room).catch(console.error), emptyTimeoutMinutes * 60000);
  return room;
}

module.exports = {
  createRoom, deleteIfEmpty, ensureSetup, isTempRoom, roomPanel,
};
