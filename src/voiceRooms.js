const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder,
  PermissionFlagsBits, UserSelectMenuBuilder,
} = require('discord.js');
const settings = require('../settings');
const { findChannel, userError } = require('./channels');

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

const RETRY_MS = 60000;
let setupPromise = null;
let setupCheckedAt = 0;
let warned = false;

// A bot nem hoz létre semmit: a kategóriát és a létrehozó csatornát te készíted el.
async function findSetup(guild) {
  const category = await findChannel(guild, 'tempVoiceCategory', {
    id: categoryId, name: categoryName, oldNames: categoryOldNames, type: ChannelType.GuildCategory,
  });
  const hub = await findChannel(guild, 'tempVoiceHub', {
    id: hubId, name: hubName, type: ChannelType.GuildVoice,
  });
  if (category && hub) {
    warned = false;
    return { categoryId: category.id, hubId: hub.id };
  }
  if (!warned) {
    warned = true;
    console.warn(`Hangszobák kikapcsolva: nem találom ${category ? '' : `a(z) "${categoryName}" kategóriát`}`
      + `${!category && !hub ? ' és ' : ''}${hub ? '' : `a(z) "${hubName}" hangcsatornát`}. `
      + 'Hozd létre, vagy add meg az azonosítóját a settings.js fájlban.');
  }
  return null;
}

// Ha nincs meg, percenként újra megnézi, így a létrehozás után újraindítás nélkül is működik.
function ensureSetup(guild) {
  if (!setupPromise || Date.now() - setupCheckedAt > RETRY_MS) {
    setupCheckedAt = Date.now();
    setupPromise = findSetup(guild).then((setup) => {
      if (!setup) return null;
      setupCheckedAt = Infinity; // ha megvan, nem kell újra keresni
      return setup;
    }).catch((error) => {
      setupPromise = null;
      throw error;
    });
  }
  return setupPromise;
}

async function isTempRoom(channel) {
  if (channel?.type !== ChannelType.GuildVoice) return false;
  const setup = await ensureSetup(channel.guild);
  return Boolean(setup) && channel.parentId === setup.categoryId && channel.id !== setup.hubId;
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
  const setup = await ensureSetup(guild);
  if (!setup) throw userError('Az ideiglenes hangszobák nincsenek beállítva. Szólj egy adminnak!');
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
    name, type: ChannelType.GuildVoice, parent: setup.categoryId, userLimit, permissionOverwrites: overwrites,
  });
  await room.send(roomPanel(ownerId, isPrivate)).catch((error) => console.error('Nem sikerült a szoba panelje:', error.message));
  // Ha senki nem lép be, a szoba ne maradjon ott.
  setTimeout(() => deleteIfEmpty(room).catch(console.error), emptyTimeoutMinutes * 60000);
  return room;
}

module.exports = {
  createRoom, deleteIfEmpty, ensureSetup, isTempRoom, roomPanel,
};
