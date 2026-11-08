const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits,
  SlashCommandBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const settings = require('../../settings');
const { createRoom } = require('../voiceRooms');
const { ephemeral, errorMessage } = require('../utils');
const {
  choice, named, pick, serverLang, translator,
} = require('../i18n');

const tr = translator({
  hu: {
    author: '{emoji} {game} • Csapatkeresés',
    team: '👥 Csapat ({count}/{size})',
    reserves: '⏳ Tartalék ({count}/{max})',
    note: '📝 Megjegyzés',
    status: '📌 Állapot',
    freeSlot: '▫️ Szabad hely',
    noReserves: 'Még senki',
    recruiting: '🟢 Toborzás',
    recruitingFull: '🟡 Megtelt, tartaléknak még jelentkezhetsz',
    started: '✅ Elindult! Szoba: <#{room}>\nHa valaki kilép, a következő tartalék bekerül.',
    closed: '🔒 Lezárva',
    expired: '⌛ Lejárt',
    footer: 'A kártya {hours} óra után lejár • A 👑 a szervező',
    join: 'Csatlakozás',
    joinReserve: 'Tartaléknak',
    leave: 'Kilépés',
    startNow: 'Indítás most',
    kick: 'Tag kivétele',
    size: 'Létszám',
    close: 'Lezárás',
    needRole: 'Ehhez kell a(z) **{role}** rang.',
    alreadyOpen: 'Már van nyitott kártyád. Előbb zárd le.',
    cardExpired: 'Ez a kártya már lejárt.',
    cardDone: 'Ez a kártya már nem aktív.',
    gameGone: 'Ez a játék már nincs a listán.',
    alreadyIn: 'Már a csapatban vagy.',
    alreadyReserve: 'Már a tartaléklistán vagy.',
    addedReserve: 'A csapat tele van, felkerültél a tartaléklistára ({position}. hely). Ha valaki kilép, automatikusan bekerülsz.',
    reservesFull: 'A csapat és a tartaléklista is tele van.',
    roomName: '{emoji} • {game} csapat',
    ready: '{members} kész a csapat, gyertek: <#{room}>',
    promoted: '🎉 <@{user}>, felszabadult egy hely, bekerültél a csapatba!',
    promotedRoom: '🎉 <@{user}>, bekerültél a csapatba, gyere: <#{room}>',
    alreadyStarted: 'A csapat már elindult.',
    hostLeave: 'Te vagy a szervező, használd a Lezárás gombot.',
    notIn: 'Nem vagy a csapatban.',
    leftReserve: 'Lekerültél a tartaléklistáról.',
    hostOnly: 'Ezt csak a szervező teheti meg.',
    needTwo: 'Az indításhoz legalább 2 ember kell a csapatban.',
    kickPick: 'Kit veszel ki?',
    kickNone: 'Nincs kit kivenni.',
    kickReserveTag: 'tartalék',
    kicked: '{name} kikerült a csapatból.',
    notOnCard: 'Ő már nincs a kártyán.',
    sizeTitle: 'Létszám módosítása',
    sizeLabel: 'Hány fő legyen a csapatban? (2-10)',
    sizeInvalid: '2 és 10 közötti számot adj meg, ami nem kevesebb a csapat mostani létszámánál ({count}).',
    sizeSet: 'A létszám mostantól {size} fő.',
  },
  en: {
    author: '{emoji} {game} • Looking for group',
    team: '👥 Team ({count}/{size})',
    reserves: '⏳ Reserves ({count}/{max})',
    note: '📝 Note',
    status: '📌 Status',
    freeSlot: '▫️ Open slot',
    noReserves: 'Nobody yet',
    recruiting: '🟢 Recruiting',
    recruitingFull: '🟡 Full, you can still join as a reserve',
    started: '✅ Started! Room: <#{room}>\nIf someone leaves, the next reserve gets in.',
    closed: '🔒 Closed',
    expired: '⌛ Expired',
    footer: 'This card expires after {hours} hours • 👑 is the host',
    join: 'Join',
    joinReserve: 'Join as reserve',
    leave: 'Leave',
    startNow: 'Start now',
    kick: 'Remove member',
    size: 'Group size',
    close: 'Close',
    needRole: 'You need the **{role}** role for this.',
    alreadyOpen: 'You already have an open card. Close it first.',
    cardExpired: 'This card has expired.',
    cardDone: 'This card is no longer active.',
    gameGone: 'This game is no longer on the list.',
    alreadyIn: 'You are already in the group.',
    alreadyReserve: 'You are already on the reserve list.',
    addedReserve: 'The group is full, you are on the reserve list (position {position}). If someone leaves, you get in automatically.',
    reservesFull: 'Both the group and the reserve list are full.',
    roomName: '{emoji} • {game} group',
    ready: '{members} the group is ready, join here: <#{room}>',
    promoted: '🎉 <@{user}>, a spot opened up, you are now in the group!',
    promotedRoom: '🎉 <@{user}>, you are in the group, join here: <#{room}>',
    alreadyStarted: 'The group has already started.',
    hostLeave: 'You are the host, use the Close button.',
    notIn: 'You are not in the group.',
    leftReserve: 'You were removed from the reserve list.',
    hostOnly: 'Only the host can do this.',
    needTwo: 'You need at least 2 people in the group to start.',
    kickPick: 'Who do you want to remove?',
    kickNone: 'There is nobody to remove.',
    kickReserveTag: 'reserve',
    kicked: '{name} was removed from the group.',
    notOnCard: 'They are no longer on the card.',
    sizeTitle: 'Change group size',
    sizeLabel: 'How many people in the group? (2-10)',
    sizeInvalid: 'Enter a number from 2 to 10 that is not lower than the current team size ({count}).',
    sizeSet: 'The group size is now {size}.',
  },
});

const EXPIRY_MS = settings.lfgExpiryHours * 3600000;
const MAX_RESERVES = settings.lfgMaxReserves ?? 5;
const MIN_SIZE = 2;
const MAX_SIZE = 10;
const activeHosts = new Map(); // játékos -> a kártyája létrehozásának ideje
const locks = new Map();

const gameById = (id) => settings.lfgGames.find((game) => game.id === id);
const gameName = (game) => pick(game, 'label', serverLang());
const findRole = (guild, game) => guild.roles.cache
  .find((role) => role.name.toLowerCase().includes(game.roleName.toLowerCase()));
const hasGameRole = (member, role) => !role || member.roles.cache.has(role.id);
const mentions = (text = '') => [...text.matchAll(/<@!?(\d+)>/g)].map((match) => match[1]);
const isHost = (interaction, hostId) => interaction.user.id === hostId
  || interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);

// Egy kártyán egyszerre csak egy kattintás fut, így nem veszhet el jelentkező.
function withLock(key, task) {
  const next = (locks.get(key) ?? Promise.resolve()).catch(() => {}).then(task);
  locks.set(key, next);
  next.finally(() => { if (locks.get(key) === next) locks.delete(key); }).catch(() => {});
  return next;
}

// A kártya állapota magában az üzenetben van, ezért újraindítás után sem vész el.
// A mezőket az elejükön lévő ikon azonosítja, így nyelvváltás után is működik.
function readCard(embed, fallbackSize) {
  const fields = Array.isArray(embed?.fields) ? embed.fields : [];
  const field = (icon) => fields.find((item) => item.name.startsWith(icon));
  const team = field('👥');
  if (team) {
    return {
      members: mentions(team.value),
      size: Number(team.name.match(/\((\d+)\/(\d+)\)/)?.[2] ?? fallbackSize),
      reserves: mentions(field('⏳')?.value),
      note: field('📝')?.value,
      roomId: field('📌')?.value?.match(/<#(\d+)>/)?.[1] ?? null,
    };
  }
  // A 2.6.0 előtti kártyák: a tagok a leírásban, a megjegyzés külön mezőben.
  const legacyNote = fields.find((item) => ['Megjegyzés', 'Note'].includes(item.name))?.value;
  return {
    members: mentions(embed?.description),
    size: Number(embed?.description?.match(/\((\d+)\/(\d+)\)/)?.[2] ?? fallbackSize),
    reserves: [],
    note: legacyNote,
    roomId: null,
  };
}

const progressBar = (count, size) => '🟩'.repeat(count) + '⬛'.repeat(Math.max(size - count, 0));

function card(game, hostId, {
  members, reserves = [], size, note, roomId = null, status, done = false,
}) {
  const full = members.length >= size;
  const teamLines = members.map((id) => (id === hostId ? `👑 <@${id}>` : `• <@${id}>`));
  for (let slot = members.length; slot < size; slot += 1) teamLines.push(tr.server('freeSlot'));
  const reserveLines = reserves.map((id, index) => `${index + 1}. <@${id}>`);

  const embed = new EmbedBuilder()
    .setColor(done ? 0x4e5058 : (game.color ?? settings.color))
    .setAuthor({ name: tr.server('author', { emoji: game.emoji, game: gameName(game) }) })
    .setDescription(`${progressBar(members.length, size)}  **${members.length}/${size}**`)
    .addFields(
      { name: tr.server('team', { count: members.length, size }), value: teamLines.join('\n'), inline: true },
      {
        name: tr.server('reserves', { count: reserves.length, max: MAX_RESERVES }),
        value: reserveLines.join('\n') || tr.server('noReserves'),
        inline: true,
      },
    )
    .setFooter({ text: tr.server('footer', { hours: settings.lfgExpiryHours }) })
    .setTimestamp();
  if (note) embed.addFields({ name: tr.server('note'), value: note });
  const currentStatus = roomId ? tr.server('started', { room: roomId }) : tr.server(full ? 'recruitingFull' : 'recruiting');
  embed.addFields({ name: tr.server('status'), value: status ?? currentStatus });

  const args = `${game.id}:${hostId}`;
  const button = (id, key, emoji, style, disabled = false) => new ButtonBuilder().setCustomId(`lfg:${id}:${args}`)
    .setLabel(tr.server(key)).setEmoji({ name: emoji }).setStyle(style).setDisabled(done || disabled);
  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        full ? button('join', 'joinReserve', '⏳', ButtonStyle.Primary) : button('join', 'join', '✅', ButtonStyle.Success),
        button('leave', 'leave', '🚪', ButtonStyle.Secondary),
      ),
      new ActionRowBuilder().addComponents(
        button('start', 'startNow', '▶️', ButtonStyle.Success, Boolean(roomId)),
        button('kick', 'kick', '👢', ButtonStyle.Secondary),
        button('size', 'size', '🔢', ButtonStyle.Secondary),
        button('close', 'close', '🔒', ButtonStyle.Danger),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}

// A régi (2.6.0 előtti) gombok "játék:létszám:szervező" formában jönnek, az újak "játék:szervező" formában.
function parseArgs(args) {
  return args.length >= 3
    ? { gameId: args[0], fallbackSize: Number(args[1]), hostId: args[2] }
    : { gameId: args[0], fallbackSize: 5, hostId: args[1] };
}

async function start(interaction) {
  const t = tr.user(interaction);
  const { user, guild, member } = interaction;
  const game = gameById(interaction.options.getString('game', true));
  const size = interaction.options.getInteger('size', true);
  const role = findRole(guild, game);

  if (!hasGameRole(member, role)) return void (await interaction.reply(ephemeral(t('needRole', { role: role.name }))));
  if (Date.now() - (activeHosts.get(user.id) ?? 0) < EXPIRY_MS) {
    return void (await interaction.reply(ephemeral(t('alreadyOpen'))));
  }

  activeHosts.set(user.id, Date.now());
  const note = interaction.options.getString('note');
  const ping = interaction.options.getBoolean('ping') && role;
  try {
    await interaction.reply({
      ...card(game, user.id, { members: [user.id], size, note }),
      content: ping ? `<@&${role.id}>` : undefined,
      allowedMentions: { roles: ping ? [role.id] : [] },
    });
  } catch (error) {
    activeHosts.delete(user.id);
    throw error;
  }
}

// Az első tartalék bekerül a csapatba, amíg van hely. Visszaadja, kik kerültek be.
function promoteReserves(state) {
  const promoted = [];
  while (state.members.length < state.size && state.reserves.length) {
    const next = state.reserves.shift();
    state.members.push(next);
    promoted.push(next);
  }
  return promoted;
}

async function startRoom(message, game, hostId, state) {
  const room = await createRoom(message.guild, {
    name: tr.server('roomName', { emoji: game.emoji, game: gameName(game) }),
    ownerId: hostId,
    memberIds: state.members,
    isPrivate: true,
    userLimit: state.size,
  });
  state.roomId = room.id;
  activeHosts.delete(hostId);
  // A kártya aktív marad: a tartalékok kilépéskor bekerülhetnek.
  await message.edit(card(game, hostId, state));
  await message.channel.send({
    content: tr.server('ready', { members: state.members.map((id) => `<@${id}>`).join(' '), room: room.id }),
    allowedMentions: { users: state.members },
  });
}

const ROOM_ACCESS = {
  ViewChannel: true, Connect: true, Speak: true, SendMessages: true,
};

// Mentés a kártyára. Ha megtelt, elindítja a csapatot. Ha már elindult, a szoba jogait is igazítja:
// aki bekerült, belépési jogot kap, akit kivettek vagy kilépett, elveszíti.
async function save(message, game, hostId, state, { added = [], removed = [], sizeChanged = false } = {}) {
  const room = state.roomId ? await message.guild.channels.fetch(state.roomId).catch(() => null) : null;
  if (state.roomId && !room) state.roomId = null; // a szoba közben kiürült és törlődött

  if (!state.roomId) {
    // Ha megtelt (vagy a szoba közben törlődött, de a csapat teljes), új szoba nyílik, ez mindenkit pingel.
    if (state.members.length >= state.size) {
      await startRoom(message, game, hostId, state);
      return;
    }
    await message.edit(card(game, hostId, state));
    for (const id of added) {
      await message.channel.send({ content: tr.server('promoted', { user: id }), allowedMentions: { users: [id] } });
    }
    return;
  }

  for (const id of removed) {
    await room.permissionOverwrites.delete(id).catch(() => {});
    await room.members?.get(id)?.voice.disconnect().catch(() => {});
  }
  for (const id of added) {
    await room.permissionOverwrites.edit(id, ROOM_ACCESS);
    await message.channel.send({
      content: tr.server('promotedRoom', { user: id, room: room.id }), allowedMentions: { users: [id] },
    });
  }
  if (sizeChanged) await room.setUserLimit(state.size).catch(() => {});
  await message.edit(card(game, hostId, state));
}

// Közös keret: zárolja a kártyát, beolvassa, ellenőrzi, hogy aktív-e, majd lefuttatja a műveletet.
async function withCard(interaction, messageId, args, action) {
  const t = tr.user(interaction);
  const tell = (key, vars) => interaction.followUp(ephemeral(t(key, vars)));
  await interaction.deferUpdate();
  try {
    await withLock(messageId, async () => {
      const { gameId, fallbackSize, hostId } = parseArgs(args);
      const game = gameById(gameId);
      if (!game) return void (await tell('gameGone'));
      const message = await interaction.channel.messages.fetch({ message: messageId, force: true });
      if (Date.now() - message.createdTimestamp > EXPIRY_MS) return void (await tell('cardExpired'));
      if (message.components?.[0]?.components?.[0]?.disabled) return void (await tell('cardDone'));
      const state = readCard(message.embeds[0], fallbackSize);
      await action({
        message, game, hostId, state, tell,
      });
    });
  } catch (error) {
    console.error('Csapatkereső hiba:', error);
    await interaction.followUp(ephemeral(errorMessage(error, interaction.locale))).catch(console.error);
  }
}

async function join(interaction, args) {
  const t = tr.user(interaction);
  const game = gameById(parseArgs(args).gameId);
  if (!game) return void (await interaction.reply(ephemeral(t('gameGone'))));
  const role = findRole(interaction.guild, game);
  if (!hasGameRole(interaction.member, role)) return void (await interaction.reply(ephemeral(t('needRole', { role: role.name }))));

  await withCard(interaction, interaction.message.id, args, async ({
    message, hostId, state, tell,
  }) => {
    const userId = interaction.user.id;
    if (state.members.includes(userId)) return void (await tell('alreadyIn'));
    if (state.reserves.includes(userId)) return void (await tell('alreadyReserve'));

    if (state.members.length < state.size) {
      state.members.push(userId);
      await save(message, game, hostId, state, { added: state.roomId ? [userId] : [] });
      return;
    }
    if (state.reserves.length >= MAX_RESERVES) return void (await tell('reservesFull'));
    state.reserves.push(userId);
    await message.edit(card(game, hostId, state));
    await tell('addedReserve', { position: state.reserves.length });
  });
}

async function leave(interaction, args) {
  const { hostId } = parseArgs(args);
  if (interaction.user.id === hostId) return void (await interaction.reply(ephemeral(tr.user(interaction)('hostLeave'))));

  await withCard(interaction, interaction.message.id, args, async ({
    message, game, state, tell,
  }) => {
    const userId = interaction.user.id;
    if (state.reserves.includes(userId)) {
      state.reserves = state.reserves.filter((id) => id !== userId);
      await message.edit(card(game, hostId, state));
      return void (await tell('leftReserve'));
    }
    if (!state.members.includes(userId)) return void (await tell('notIn'));
    state.members = state.members.filter((id) => id !== userId);
    const promoted = promoteReserves(state);
    await save(message, game, hostId, state, { added: promoted, removed: [userId] });
  });
}

// A szervezői gombokat a szervező és a moderátorok használhatják.
function hostAction(action) {
  return async (interaction, args) => {
    if (!isHost(interaction, parseArgs(args).hostId)) {
      return void (await interaction.reply(ephemeral(tr.user(interaction)('hostOnly'))));
    }
    return action(interaction, args);
  };
}

const startNow = hostAction(async (interaction, args) => {
  await withCard(interaction, interaction.message.id, args, async ({
    message, game, hostId, state, tell,
  }) => {
    if (state.roomId) return void (await tell('alreadyStarted'));
    if (state.members.length < MIN_SIZE) return void (await tell('needTwo'));
    await startRoom(message, game, hostId, state);
  });
});

const close = hostAction(async (interaction, args) => {
  await withCard(interaction, interaction.message.id, args, async ({
    message, game, hostId, state,
  }) => {
    activeHosts.delete(hostId);
    await message.edit(card(game, hostId, { ...state, status: tr.server('closed'), done: true }));
  });
});

// Kivétel: a szervező egy listából választ. A lista csak neki látszik.
const showKick = hostAction(async (interaction, args) => {
  const t = tr.user(interaction);
  const { hostId } = parseArgs(args);
  const state = readCard(interaction.message.embeds[0], 5);
  const candidates = [
    ...state.members.filter((id) => id !== hostId).map((id) => ({ id, reserve: false })),
    ...state.reserves.map((id) => ({ id, reserve: true })),
  ];
  if (!candidates.length) return void (await interaction.reply(ephemeral(t('kickNone'))));

  const names = await Promise.all(candidates.map(({ id }) => interaction.guild.members.fetch(id)
    .then((member) => member.displayName).catch(() => id)));
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`lfg:kick-select:${interaction.message.id}:${args.join(':')}`)
    .setPlaceholder(t('kickPick'))
    .addOptions(candidates.map(({ id, reserve }, index) => ({
      label: `${names[index]}${reserve ? ` (${t('kickReserveTag')})` : ''}`.slice(0, 100),
      value: id,
    })));
  await interaction.reply({
    components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral,
  });
});

const kickSelected = hostAction(async (interaction, [messageId, ...args]) => {
  const targetId = interaction.values[0];
  await withCard(interaction, messageId, args, async ({
    message, game, hostId, state, tell,
  }) => {
    if (targetId === hostId) return;
    const wasMember = state.members.includes(targetId);
    if (!wasMember && !state.reserves.includes(targetId)) return void (await tell('notOnCard'));
    state.members = state.members.filter((id) => id !== targetId);
    state.reserves = state.reserves.filter((id) => id !== targetId);
    const promoted = wasMember ? promoteReserves(state) : [];
    await save(message, game, hostId, state, { added: promoted, removed: wasMember ? [targetId] : [] });
    const name = await interaction.guild.members.fetch(targetId).then((member) => member.displayName).catch(() => targetId);
    await interaction.editReply({ content: tr.user(interaction)('kicked', { name }), components: [] });
  });
});

const showSize = hostAction(async (interaction, args) => {
  const t = tr.user(interaction);
  await interaction.showModal(new ModalBuilder()
    .setCustomId(`lfg:size-modal:${args.join(':')}`)
    .setTitle(t('sizeTitle'))
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('value').setLabel(t('sizeLabel'))
        .setStyle(TextInputStyle.Short).setMaxLength(2).setRequired(true),
    )));
});

const setSize = hostAction(async (interaction, args) => {
  const size = Number(interaction.fields.getTextInputValue('value').trim());
  await withCard(interaction, interaction.message.id, args, async ({
    message, game, hostId, state, tell,
  }) => {
    if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE || size < state.members.length) {
      return void (await tell('sizeInvalid', { count: state.members.length }));
    }
    state.size = size;
    const promoted = promoteReserves(state);
    await save(message, game, hostId, state, { added: promoted, sizeChanged: true });
    await tell('sizeSet', { size });
  });
});

module.exports = {
  commands: [
    named(new SlashCommandBuilder(), ['lfg', 'Find teammates for a game'], ['lfg', 'Csapattársakat keres egy játékhoz'])
      .addStringOption((option) => named(option, ['game', 'Which game?'], ['jatek', 'Melyik játék?']).setRequired(true)
        .addChoices(...settings.lfgGames.map((game) => choice(game.id, game.labelEn ?? game.label, game.label))))
      .addIntegerOption((option) => named(option, ['size', 'Group size including you (2-10)'],
        ['letszam', 'Hány fő legyen veled együtt? (2-10)'])
        .setRequired(true).setMinValue(MIN_SIZE).setMaxValue(MAX_SIZE))
      .addStringOption((option) => named(option, ['note', 'E.g. rank, time, game mode'], ['megjegyzes', 'Pl. rang, időpont, játékmód'])
        .setMaxLength(200))
      .addBooleanOption((option) => named(option, ['ping', 'Ping the game role?'], ['ping', 'Pingelje a játékrangot?'])),
  ],
  handlers: {
    lfg: start,
    'lfg:join': join,
    'lfg:leave': leave,
    'lfg:start': startNow,
    'lfg:kick': showKick,
    'lfg:kick-select': kickSelected,
    'lfg:size': showSize,
    'lfg:size-modal': setSize,
    'lfg:close': close,
  },
  readCard,
};
