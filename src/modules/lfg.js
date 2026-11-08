const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const settings = require('../../settings');
const { createRoom } = require('../voiceRooms');
const { ephemeral, errorMessage } = require('../utils');
const {
  choice, named, pick, serverLang, translator,
} = require('../i18n');

const tr = translator({
  hu: {
    title: '{emoji} {game} csapatkeresés',
    members: '**Tagok ({count}/{size})**',
    expires: 'A kártya {hours} óra után lejár',
    note: 'Megjegyzés',
    status: 'Állapot',
    join: 'Csatlakozás',
    leave: 'Kilépés',
    close: 'Lezárás',
    needRole: 'Ehhez kell a(z) **{role}** rang.',
    alreadyOpen: 'Már van nyitott kártyád. Előbb zárd le.',
    expired: 'Ez a kártya már lejárt.',
    gameGone: 'Ez a játék már nincs a listán.',
    alreadyIn: 'Már a csapatban vagy.',
    full: 'Ez a csapat már megtelt.',
    roomName: '{emoji} • {game} csapat',
    filled: '✅ Megtelt! Szoba: <#{room}>',
    ready: '{members} kész a csapat, gyertek: <#{room}>',
    hostLeave: 'Te vagy a szervező, használd a Lezárás gombot.',
    notIn: 'Nem vagy a csapatban.',
    hostOnly: 'Ezt csak a szervező zárhatja le.',
    closed: '🔒 Lezárva',
  },
  en: {
    title: '{emoji} {game} looking for group',
    members: '**Members ({count}/{size})**',
    expires: 'This card expires after {hours} hours',
    note: 'Note',
    status: 'Status',
    join: 'Join',
    leave: 'Leave',
    close: 'Close',
    needRole: 'You need the **{role}** role for this.',
    alreadyOpen: 'You already have an open card. Close it first.',
    expired: 'This card has expired.',
    gameGone: 'This game is no longer on the list.',
    alreadyIn: 'You are already in the group.',
    full: 'This group is already full.',
    roomName: '{emoji} • {game} group',
    filled: '✅ Full! Room: <#{room}>',
    ready: '{members} the group is ready, join here: <#{room}>',
    hostLeave: 'You are the host, use the Close button.',
    notIn: 'You are not in the group.',
    hostOnly: 'Only the host can close this.',
    closed: '🔒 Closed',
  },
});
// A megjegyzés mezőt mindkét nyelven felismeri.
const NOTE_NAMES = [tr.lang('hu', 'note'), tr.lang('en', 'note')];

const EXPIRY_MS = settings.lfgExpiryHours * 3600000;
const activeHosts = new Map(); // játékos -> a kártyája létrehozásának ideje
const locks = new Map();

const gameById = (id) => settings.lfgGames.find((game) => game.id === id);
const findRole = (guild, game) => guild.roles.cache
  .find((role) => role.name.toLowerCase().includes(game.roleName.toLowerCase()));
const hasGameRole = (member, role) => !role || member.roles.cache.has(role.id);

// Egy kártyán egyszerre csak egy kattintás fut, így nem veszhet el jelentkező.
function withLock(key, task) {
  const next = (locks.get(key) ?? Promise.resolve()).catch(() => {}).then(task);
  locks.set(key, next);
  next.finally(() => { if (locks.get(key) === next) locks.delete(key); }).catch(() => {});
  return next;
}

// A tagok a kártyán vannak, ezért újraindítás után sem vesznek el.
const membersOf = (embed) => [...(embed.description ?? '').matchAll(/<@(\d+)>/g)].map((match) => match[1]);

function card(game, size, hostId, memberIds, note, status) {
  const embed = new EmbedBuilder().setColor(status ? settings.successColor : settings.color)
    .setTitle(tr.server('title', { emoji: game.emoji, game: pick(game, 'label', serverLang()) }))
    .setDescription(`${tr.server('members', { count: memberIds.length, size })}\n${memberIds.map((id) => `<@${id}>`).join('\n')}`)
    .setFooter({ text: tr.server('expires', { hours: settings.lfgExpiryHours }) });
  if (note) embed.addFields({ name: tr.server('note'), value: note });
  if (status) embed.addFields({ name: tr.server('status'), value: status });

  const args = `${game.id}:${size}:${hostId}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`lfg:join:${args}`).setLabel(tr.server('join')).setEmoji({ name: '✅' })
      .setStyle(ButtonStyle.Success).setDisabled(Boolean(status)),
    new ButtonBuilder().setCustomId(`lfg:leave:${args}`).setLabel(tr.server('leave')).setEmoji({ name: '🚪' })
      .setStyle(ButtonStyle.Secondary).setDisabled(Boolean(status)),
    new ButtonBuilder().setCustomId(`lfg:close:${args}`).setLabel(tr.server('close')).setEmoji({ name: '🔒' })
      .setStyle(ButtonStyle.Danger).setDisabled(Boolean(status)),
  );
  return { embeds: [embed], components: [row], allowedMentions: { parse: [] } };
}

async function start(interaction) {
  const { user, guild, member } = interaction;
  const t = tr.user(interaction);
  const game = gameById(interaction.options.getString('game', true));
  const size = interaction.options.getInteger('size', true);
  const role = findRole(guild, game);

  if (!hasGameRole(member, role)) {
    return void (await interaction.reply(ephemeral(tr.user(interaction)('needRole', { role: role.name }))));
  }
  if (Date.now() - (activeHosts.get(user.id) ?? 0) < EXPIRY_MS) {
    return void (await interaction.reply(ephemeral(t('alreadyOpen'))));
  }

  activeHosts.set(user.id, Date.now());
  const note = interaction.options.getString('note');
  const ping = interaction.options.getBoolean('ping') && role;
  const payload = card(game, size, user.id, [user.id], note);
  try {
    await interaction.reply({
      ...payload,
      content: ping ? `<@&${role.id}>` : undefined,
      allowedMentions: { roles: ping ? [role.id] : [] },
    });
  } catch (error) {
    activeHosts.delete(user.id);
    throw error;
  }
}

function noteOf(embed) {
  return embed.fields?.find((field) => NOTE_NAMES.includes(field.name))?.value;
}

async function lobbyAction(interaction, action) {
  await interaction.deferUpdate();
  const t = tr.user(interaction);
  // A tag nyelvén válaszol: tell('kulcs') vagy tell('kulcs', { ... })
  const tell = (key, vars) => interaction.followUp(ephemeral(t(key, vars)));
  try {
    await withLock(interaction.message.id, async () => {
      const message = await interaction.channel.messages.fetch({ message: interaction.message.id, force: true });
      if (Date.now() - message.createdTimestamp > EXPIRY_MS) {
        await tell('expired');
        return;
      }
      await action(message, tell);
    });
  } catch (error) {
    console.error('Csapatkereső hiba:', error);
    await interaction.followUp(ephemeral(errorMessage(error, interaction.locale))).catch(console.error);
  }
}

async function join(interaction, [gameId, sizeText, hostId]) {
  const game = gameById(gameId);
  if (!game) return void (await interaction.reply(ephemeral(tr.user(interaction)('gameGone'))));
  const size = Number(sizeText);
  const role = findRole(interaction.guild, game);
  if (!hasGameRole(interaction.member, role)) {
    return void (await interaction.reply(ephemeral(tr.user(interaction)('needRole', { role: role.name }))));
  }

  await lobbyAction(interaction, async (message, tell) => {
    const [embed] = message.embeds;
    const members = membersOf(embed);
    if (members.includes(interaction.user.id)) return void (await tell('alreadyIn'));
    if (members.length >= size) return void (await tell('full'));

    members.push(interaction.user.id);
    if (members.length < size) {
      await message.edit(card(game, size, hostId, members, noteOf(embed)));
      return;
    }

    const room = await createRoom(interaction.guild, {
      name: tr.server('roomName', { emoji: game.emoji, game: pick(game, 'label', serverLang()) }),
      ownerId: hostId,
      memberIds: members,
      isPrivate: true,
      userLimit: size,
    });
    activeHosts.delete(hostId);
    await message.edit(card(game, size, hostId, members, noteOf(embed), tr.server('filled', { room: room.id })));
    await message.channel.send({
      content: tr.server('ready', { members: members.map((id) => `<@${id}>`).join(' '), room: room.id }),
      allowedMentions: { users: members },
    });
  });
}

async function leave(interaction, [gameId, sizeText, hostId]) {
  if (interaction.user.id === hostId) {
    return void (await interaction.reply(ephemeral(tr.user(interaction)('hostLeave'))));
  }
  await lobbyAction(interaction, async (message, tell) => {
    const [embed] = message.embeds;
    const members = membersOf(embed);
    if (!members.includes(interaction.user.id)) return void (await tell('notIn'));
    const remaining = members.filter((id) => id !== interaction.user.id);
    await message.edit(card(gameById(gameId), Number(sizeText), hostId, remaining, noteOf(embed)));
  });
}

async function close(interaction, [gameId, sizeText, hostId]) {
  const allowed = interaction.user.id === hostId
    || interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages);
  if (!allowed) return void (await interaction.reply(ephemeral(tr.user(interaction)('hostOnly'))));

  await lobbyAction(interaction, async (message) => {
    const [embed] = message.embeds;
    activeHosts.delete(hostId);
    await message.edit(card(gameById(gameId), Number(sizeText), hostId, membersOf(embed), noteOf(embed), tr.server('closed')));
  });
}

module.exports = {
  commands: [
    named(new SlashCommandBuilder(), ['lfg', 'Find teammates for a game'], ['lfg', 'Csapattársakat keres egy játékhoz'])
      .addStringOption((option) => named(option, ['game', 'Which game?'], ['jatek', 'Melyik játék?']).setRequired(true)
        .addChoices(...settings.lfgGames.map((game) => choice(game.id, game.labelEn ?? game.label, game.label))))
      .addIntegerOption((option) => named(option, ['size', 'Group size including you (2-10)'],
        ['letszam', 'Hány fő legyen veled együtt? (2-10)'])
        .setRequired(true).setMinValue(2).setMaxValue(10))
      .addStringOption((option) => named(option, ['note', 'E.g. rank, time, game mode'], ['megjegyzes', 'Pl. rang, időpont, játékmód'])
        .setMaxLength(200))
      .addBooleanOption((option) => named(option, ['ping', 'Ping the game role?'], ['ping', 'Pingelje a játékrangot?'])),
  ],
  handlers: {
    lfg: start, 'lfg:join': join, 'lfg:leave': leave, 'lfg:close': close,
  },
};
