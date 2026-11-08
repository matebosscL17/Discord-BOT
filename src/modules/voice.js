const {
  ActionRowBuilder, Events, GatewayIntentBits, MessageFlags, ModalBuilder, PermissionFlagsBits,
  TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');
const {
  createRoom, deleteIfEmpty, ensureSetup, isTempRoom, roomPanel,
} = require('../voiceRooms');
const { ephemeral } = require('../utils');

const COOLDOWN_MS = 30000;
const cooldowns = new Map();

const isStaff = (interaction) => interaction.member.roles.cache.has(config.supportRoleId)
  || interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels);

// A szoba tulajdonosa a gomb azonosítójában van, így újraindítás után is megmarad.
async function canManage(interaction, ownerId) {
  if (!(await isTempRoom(interaction.channel))) {
    await interaction.reply(ephemeral('Ez nem ideiglenes szoba.'));
    return false;
  }
  if (interaction.user.id !== ownerId && !isStaff(interaction)) {
    await interaction.reply(ephemeral('Ezt csak a szoba tulajdonosa teheti meg.'));
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
    `vc:rename-modal:${ownerId}`, 'Szoba átnevezése', 'Új név', TextInputStyle.Short, 100, interaction.channel.name,
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
    ? '✅ Átnevezve.'
    : 'A Discord korlátozza az átnevezést, ezért az új név pár percen belül jelenik meg.');
}

async function showLimit(interaction, [ownerId]) {
  if (!(await canManage(interaction, ownerId))) return;
  await interaction.showModal(singleInputModal(
    `vc:limit-modal:${ownerId}`, 'Létszám', 'Hány fő? (0 = nincs korlát, max. 99)', TextInputStyle.Short, 2,
  ));
}

async function setLimit(interaction, [ownerId]) {
  if (!(await canManage(interaction, ownerId))) return;
  const limit = Number(interaction.fields.getTextInputValue('value'));
  if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
    return void (await interaction.reply(ephemeral('0 és 99 közötti számot adj meg.')));
  }
  await interaction.channel.setUserLimit(limit);
  await interaction.reply(ephemeral(limit ? `✅ A létszám: ${limit} fő.` : '✅ Nincs létszámkorlát.'));
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
  if (!(await isTempRoom(channel))) return void (await interaction.reply(ephemeral('Ez nem ideiglenes szoba.')));
  if (!channel.members.has(user.id)) return void (await interaction.reply(ephemeral('Előbb lépj be a szobába.')));
  if (channel.members.has(ownerId)) return void (await interaction.reply(ephemeral('A tulajdonos még a szobában van.')));
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
  if (protectedTarget) return void (await interaction.reply(ephemeral('Őt nem rúghatod ki.')));

  await interaction.channel.permissionOverwrites.edit(user, { Connect: false });
  await interaction.channel.members.get(targetId)?.voice.disconnect();
  await interaction.reply(ephemeral(`🚫 ${user.username} kirúgva a szobából.`));
}

async function allow(interaction, [ownerId]) {
  if (!(await canManage(interaction, ownerId))) return;
  const user = interaction.users.get(interaction.values[0]);
  await interaction.channel.permissionOverwrites.edit(user, {
    ViewChannel: true, Connect: true, Speak: true, SendMessages: true,
  });
  await interaction.reply(ephemeral(`✅ ${user.username} beléphet a szobába.`));
}

async function createPersonalRoom(member, state) {
  const last = cooldowns.get(member.id) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    await state.disconnect().catch(() => {});
    return;
  }
  cooldowns.set(member.id, Date.now());

  const room = await createRoom(member.guild, {
    name: `🔊 • ${member.displayName} szobája`.slice(0, 100),
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
