const {
  ActionRowBuilder, Events, GatewayIntentBits, MessageFlags, ModalBuilder, PermissionFlagsBits,
  TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');
const {
  createRoom, deleteIfEmpty, ensureSetup, isTempRoom, roomPanel,
} = require('../voiceRooms');
const { ephemeral } = require('../utils');
const { translator } = require('../i18n');

const tr = translator({
  hu: {
    notTemp: 'Ez nem ideiglenes szoba.',
    ownerOnly: 'Ezt csak a szoba tulajdonosa teheti meg.',
    renameTitle: 'Szoba átnevezése',
    newName: 'Új név',
    renamed: '✅ Átnevezve.',
    renameSlow: 'A Discord korlátozza az átnevezést, ezért az új név pár percen belül jelenik meg.',
    limitTitle: 'Létszám',
    limitLabel: 'Hány fő? (0 = nincs korlát, max. 99)',
    limitInvalid: '0 és 99 közötti számot adj meg.',
    limitSet: '✅ A létszám: {limit} fő.',
    limitNone: '✅ Nincs létszámkorlát.',
    joinFirst: 'Előbb lépj be a szobába.',
    ownerHere: 'A tulajdonos még a szobában van.',
    cannotKick: 'Őt nem rúghatod ki.',
    kicked: '🚫 {name} kirúgva a szobából.',
    allowed: '✅ {name} beléphet a szobába.',
    roomName: '🔊 • {name} szobája',
  },
  en: {
    notTemp: 'This is not a temporary room.',
    ownerOnly: 'Only the room owner can do this.',
    renameTitle: 'Rename room',
    newName: 'New name',
    renamed: '✅ Renamed.',
    renameSlow: 'Discord limits renaming, so the new name will show up within a few minutes.',
    limitTitle: 'User limit',
    limitLabel: 'How many people? (0 = no limit, max 99)',
    limitInvalid: 'Enter a number between 0 and 99.',
    limitSet: '✅ Limit set to {limit} people.',
    limitNone: '✅ No user limit.',
    joinFirst: 'Join the room first.',
    ownerHere: 'The owner is still in the room.',
    cannotKick: 'You cannot kick them.',
    kicked: '🚫 {name} was kicked from the room.',
    allowed: '✅ {name} can now join the room.',
    roomName: "🔊 • {name}'s room",
  },
});


const COOLDOWN_MS = 30000;
const cooldowns = new Map();

const isStaff = (interaction) => interaction.member.roles.cache.has(config.supportRoleId)
  || interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels);

// A szoba tulajdonosa a gomb azonosítójában van, így újraindítás után is megmarad.
async function canManage(interaction, ownerId) {
  if (!(await isTempRoom(interaction.channel))) {
    await interaction.reply(ephemeral(tr.user(interaction)('notTemp')));
    return false;
  }
  if (interaction.user.id !== ownerId && !isStaff(interaction)) {
    await interaction.reply(ephemeral(tr.user(interaction)('ownerOnly')));
    return false;
  }
  return true;
}

function singleInputModal(id, title, label, style, max, value) {
  const input = new TextInputBuilder().setCustomId('value').setLabel(label).setStyle(style).setMaxLength(max);
  if (value) input.setValue(value);
  return new ModalBuilder().setCustomId(id).setTitle(title)
    .addComponents(new ActionRowBuilder().addComponents(input));
}

async function showRename(interaction, [ownerId]) {
  if (!(await canManage(interaction, ownerId))) return;
  await interaction.showModal(singleInputModal(
    `vc:rename-modal:${ownerId}`, tr.user(interaction)('renameTitle'), tr.user(interaction)('newName'), TextInputStyle.Short, 100, interaction.channel.name,
  ));
}

async function rename(interaction, [ownerId]) {
  if (!(await canManage(interaction, ownerId))) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  // A Discord 10 percenként kétszer enged átnevezni, utána a bot várakozna.
  const result = await Promise.race([
    interaction.channel.setName(interaction.fields.getTextInputValue('value')).then(() => 'done'),
    new Promise((resolve) => { setTimeout(() => resolve('slow'), 4000); }),
  ]);
  await interaction.editReply(result === 'done'
    ? tr.user(interaction)('renamed')
    : tr.user(interaction)('renameSlow'));
}

async function showLimit(interaction, [ownerId]) {
  if (!(await canManage(interaction, ownerId))) return;
  await interaction.showModal(singleInputModal(
    `vc:limit-modal:${ownerId}`, tr.user(interaction)('limitTitle'), tr.user(interaction)('limitLabel'), TextInputStyle.Short, 2,
  ));
}

async function setLimit(interaction, [ownerId]) {
  if (!(await canManage(interaction, ownerId))) return;
  const limit = Number(interaction.fields.getTextInputValue('value'));
  if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
    return void (await interaction.reply(ephemeral(tr.user(interaction)('limitInvalid'))));
  }
  await interaction.channel.setUserLimit(limit);
  await interaction.reply(ephemeral(tr.user(interaction)(limit ? 'limitSet' : 'limitNone', { limit })));
}

async function toggleLock(interaction, [ownerId]) {
  if (!(await canManage(interaction, ownerId))) return;
  const { channel, guild } = interaction;
  const everyone = guild.roles.everyone;
  const locked = !channel.permissionsFor(everyone).has(PermissionFlagsBits.Connect);
  await channel.permissionOverwrites.edit(everyone, { Connect: locked ? null : false });
  await interaction.update(roomPanel(ownerId, !locked));
}

async function claim(interaction, [ownerId]) {
  const { channel, user, guild } = interaction;
  if (!(await isTempRoom(channel))) return void (await interaction.reply(ephemeral(tr.user(interaction)('notTemp'))));
  if (!channel.members.has(user.id)) return void (await interaction.reply(ephemeral(tr.user(interaction)('joinFirst'))));
  if (channel.members.has(ownerId)) return void (await interaction.reply(ephemeral(tr.user(interaction)('ownerHere'))));
  const locked = !channel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.Connect);
  await interaction.update(roomPanel(user.id, locked));
}

async function kick(interaction, [ownerId]) {
  if (!(await canManage(interaction, ownerId))) return;
  const targetId = interaction.values[0];
  const user = interaction.users.get(targetId);
  const member = interaction.members.get(targetId);
  const protectedTarget = targetId === interaction.client.user.id || targetId === ownerId
    || targetId === interaction.user.id
    || member?.permissions?.has?.(PermissionFlagsBits.ModerateMembers)
    || member?.roles?.cache?.has?.(config.supportRoleId);
  if (protectedTarget) return void (await interaction.reply(ephemeral(tr.user(interaction)('cannotKick'))));

  await interaction.channel.permissionOverwrites.edit(user, { Connect: false });
  await interaction.channel.members.get(targetId)?.voice.disconnect();
  await interaction.reply(ephemeral(tr.user(interaction)('kicked', { name: user.username })));
}

async function allow(interaction, [ownerId]) {
  if (!(await canManage(interaction, ownerId))) return;
  const user = interaction.users.get(interaction.values[0]);
  await interaction.channel.permissionOverwrites.edit(user, {
    ViewChannel: true, Connect: true, Speak: true, SendMessages: true,
  });
  await interaction.reply(ephemeral(tr.user(interaction)('allowed', { name: user.username })));
}

async function createPersonalRoom(member, state) {
  const last = cooldowns.get(member.id) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    await state.disconnect().catch(() => {});
    return;
  }
  cooldowns.set(member.id, Date.now());

  const room = await createRoom(member.guild, {
    name: tr.server('roomName', { name: member.displayName }).slice(0, 100),
    ownerId: member.id,
  });
  // Ha közben kilépett a hangcsatornából, a mozgatás hibát ad, és a szoba törlődik.
  await state.setChannel(room).catch(() => deleteIfEmpty(room));
}

async function onVoiceStateUpdate(oldState, newState) {
  if (newState.guild.id !== config.guildId) return;
  const setup = await ensureSetup(newState.guild);
  if (!setup) return;
  if (newState.channelId === setup.hubId && newState.member) {
    await createPersonalRoom(newState.member, newState);
  }
  if (oldState.channelId && oldState.channelId !== newState.channelId && oldState.channel) {
    await deleteIfEmpty(oldState.channel);
  }
}

// Induláskor rendet rak: ami leállás alatt kiürült, az törlődik.
async function onReady(client) {
  try {
    const guild = await client.guilds.fetch(config.guildId);
    const setup = await ensureSetup(guild);
    if (!setup) return;
    const channels = await guild.channels.fetch();
    await Promise.all(channels.filter((channel) => channel?.parentId === setup.categoryId).map(deleteIfEmpty));
  } catch (error) {
    console.error('Nem sikerült előkészíteni a hangszobákat:', error.message);
  }
}

module.exports = {
  intents: () => [GatewayIntentBits.GuildVoiceStates],
  events: { [Events.ClientReady]: onReady, [Events.VoiceStateUpdate]: onVoiceStateUpdate },
  handlers: {
    'vc:rename': showRename,
    'vc:rename-modal': rename,
    'vc:limit': showLimit,
    'vc:limit-modal': setLimit,
    'vc:lock': toggleLock,
    'vc:claim': claim,
    'vc:kick': kick,
    'vc:allow': allow,
  },
};
