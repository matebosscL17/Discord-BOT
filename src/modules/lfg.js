const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const settings = require('../../settings');
const { createRoom } = require('../voiceRooms');
const { ephemeral, errorMessage } = require('../utils');

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
    .setTitle(`${game.emoji} ${game.label} csapatkeresés`)
    .setDescription(`**Tagok (${memberIds.length}/${size})**\n${memberIds.map((id) => `<@${id}>`).join('\n')}`)
    .setFooter({ text: `A kártya ${settings.lfgExpiryHours} óra után lejár` });
  if (note) embed.addFields({ name: 'Megjegyzés', value: note });
  if (status) embed.addFields({ name: 'Állapot', value: status });

  const args = `${game.id}:${size}:${hostId}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`lfg:join:${args}`).setLabel('Csatlakozás').setEmoji({ name: '✅' })
      .setStyle(ButtonStyle.Success).setDisabled(Boolean(status)),
    new ButtonBuilder().setCustomId(`lfg:leave:${args}`).setLabel('Kilépés').setEmoji({ name: '🚪' })
      .setStyle(ButtonStyle.Secondary).setDisabled(Boolean(status)),
    new ButtonBuilder().setCustomId(`lfg:close:${args}`).setLabel('Lezárás').setEmoji({ name: '🔒' })
      .setStyle(ButtonStyle.Danger).setDisabled(Boolean(status)),
  );
  return { embeds: [embed], components: [row], allowedMentions: { parse: [] } };
}

async function start(interaction) {
  const { user, guild, member } = interaction;
  const game = gameById(interaction.options.getString('jatek', true));
  const size = interaction.options.getInteger('letszam', true);
  const role = findRole(guild, game);

  if (!hasGameRole(member, role)) {
    return void (await interaction.reply(ephemeral(`Ehhez kell a(z) **${role.name}** rang.`)));
  }
  if (Date.now() - (activeHosts.get(user.id) ?? 0) < EXPIRY_MS) {
    return void (await interaction.reply(ephemeral('Már van nyitott kártyád. Előbb zárd le.')));
  }

  activeHosts.set(user.id, Date.now());
  const note = interaction.options.getString('megjegyzes');
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
  return embed.fields?.find((field) => field.name === 'Megjegyzés')?.value;
}

async function lobbyAction(interaction, action) {
  await interaction.deferUpdate();
  const tell = (content) => interaction.followUp(ephemeral(content));
  try {
    await withLock(interaction.message.id, async () => {
      const message = await interaction.channel.messages.fetch({ message: interaction.message.id, force: true });
      if (Date.now() - message.createdTimestamp > EXPIRY_MS) {
        await tell('Ez a kártya már lejárt.');
        return;
      }
      await action(message, tell);
    });
  } catch (error) {
    console.error('Csapatkereső hiba:', error);
    await tell(errorMessage(error)).catch(console.error);
  }
}

async function join(interaction, [gameId, sizeText, hostId]) {
  const game = gameById(gameId);
  if (!game) return void (await interaction.reply(ephemeral('Ez a játék már nincs a listán.')));
  const size = Number(sizeText);
  const role = findRole(interaction.guild, game);
  if (!hasGameRole(interaction.member, role)) {
    return void (await interaction.reply(ephemeral(`Ehhez kell a(z) **${role.name}** rang.`)));
  }

  await lobbyAction(interaction, async (message, tell) => {
    const [embed] = message.embeds;
    const members = membersOf(embed);
    if (members.includes(interaction.user.id)) return void (await tell('Már a csapatban vagy.'));
    if (members.length >= size) return void (await tell('Ez a csapat már megtelt.'));

    members.push(interaction.user.id);
    if (members.length < size) {
      await message.edit(card(game, size, hostId, members, noteOf(embed)));
      return;
    }

    const room = await createRoom(interaction.guild, {
      name: `${game.emoji} • ${game.label} csapat`,
      ownerId: hostId,
      memberIds: members,
      isPrivate: true,
      userLimit: size,
    });
    activeHosts.delete(hostId);
    await message.edit(card(game, size, hostId, members, noteOf(embed), `✅ Megtelt! Szoba: <#${room.id}>`));
    await message.channel.send({
      content: `${members.map((id) => `<@${id}>`).join(' ')} kész a csapat, gyertek: <#${room.id}>`,
      allowedMentions: { users: members },
    });
  });
}

async function leave(interaction, [gameId, sizeText, hostId]) {
  if (interaction.user.id === hostId) {
    return void (await interaction.reply(ephemeral('Te vagy a szervező, használd a Lezárás gombot.')));
  }
  await lobbyAction(interaction, async (message, tell) => {
    const [embed] = message.embeds;
    const members = membersOf(embed);
    if (!members.includes(interaction.user.id)) return void (await tell('Nem vagy a csapatban.'));
    const remaining = members.filter((id) => id !== interaction.user.id);
    await message.edit(card(gameById(gameId), Number(sizeText), hostId, remaining, noteOf(embed)));
  });
}

async function close(interaction, [gameId, sizeText, hostId]) {
  const allowed = interaction.user.id === hostId
    || interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages);
  if (!allowed) return void (await interaction.reply(ephemeral('Ezt csak a szervező zárhatja le.')));

  await lobbyAction(interaction, async (message) => {
    const [embed] = message.embeds;
    activeHosts.delete(hostId);
    await message.edit(card(gameById(gameId), Number(sizeText), hostId, membersOf(embed), noteOf(embed), '🔒 Lezárva'));
  });
}

module.exports = {
  commands: [
    new SlashCommandBuilder()
      .setName('lfg')
      .setDescription('Csapattársakat keres egy játékhoz')
      .addStringOption((option) => option.setName('jatek').setDescription('Melyik játék?').setRequired(true)
        .addChoices(...settings.lfgGames.map((game) => ({ name: game.label, value: game.id }))))
      .addIntegerOption((option) => option.setName('letszam').setDescription('Hány fő legyen veled együtt? (2-10)')
        .setRequired(true).setMinValue(2).setMaxValue(10))
      .addStringOption((option) => option.setName('megjegyzes').setDescription('Pl. rang, időpont, játékmód').setMaxLength(200))
      .addBooleanOption((option) => option.setName('ping').setDescription('Pingelje a játékrangot?')),
  ],
  handlers: {
    lfg: start, 'lfg:join': join, 'lfg:leave': leave, 'lfg:close': close,
  },
};
