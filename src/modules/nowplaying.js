const {
  ActionRowBuilder, ActivityType, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, GatewayIntentBits, MessageFlags,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { readJson, writeJson } = require('../store');
const { ephemeral } = require('../utils');
const { langOf, translator } = require('../i18n');

// Most játszik panel: egy magától frissülő üzenet arról, ki játszik éppen a szerver játékaival.
// Ehhez a Discord fejlesztői oldalán be kell kapcsolni a PRESENCE INTENT-et.
const tr = translator({
  hu: {
    title: '🎮 Most játszik',
    nobody: 'Most senki',
    more: '…és még {count}',
    footer: 'Frissítve',
    empty: 'Most senki nem játszik a szerver játékaival. Indíts egy csapatkeresést a /lfg paranccsal!',
    join: 'Csatlakoznék: {game}',
    joinPost: '🎮 <@{user}> szívesen csatlakozna a(z) **{game}** játékhoz: {players}',
    joinSent: 'Szóltam nekik! 👍',
    nobodyNow: 'Ezzel a játékkal már senki nem játszik.',
    cooldown: 'Erre a játékra {minutes} perc múlva jelentkezhetsz újra.',
  },
  en: {
    title: '🎮 Now playing',
    nobody: 'Nobody right now',
    more: '…and {count} more',
    footer: 'Updated',
    empty: 'Nobody is playing the server games right now. Start a group search with /lfg!',
    join: 'I would join: {game}',
    joinPost: '🎮 <@{user}> would like to join **{game}**: {players}',
    joinSent: 'I let them know! 👍',
    nobodyNow: 'Nobody is playing this game anymore.',
    cooldown: 'You can ask for this game again in {minutes} minutes.',
  },
});

const nowSettings = settings.nowPlaying ?? {};
const enabled = () => nowSettings.enabled === true && Boolean(nowSettings.channelId);
const games = () => nowSettings.games ?? [];
const FILE = 'now-playing';
const UPDATE_DELAY_MS = 60000;
const COOLDOWN_MS = 5 * 60000;
const MAX_SHOWN = 15;
const cooldowns = new Map();
let pending = null;

// Játékonként a játszó tagok azonosítói.
function playersByGame(guild) {
  const result = Object.fromEntries(games().map((game) => [game.id, []]));
  for (const presence of guild.presences?.cache?.values?.() ?? []) {
    if (presence.user?.bot || !presence.userId) continue;
    for (const activity of presence.activities ?? []) {
      if (activity.type !== ActivityType.Playing) continue;
      const name = activity.name?.toLowerCase() ?? '';
      const game = games().find((item) => item.match.some((word) => name.includes(word)));
      if (game && !result[game.id].includes(presence.userId)) result[game.id].push(presence.userId);
    }
  }
  return result;
}

function panel(guild) {
  const T = tr.server;
  const players = playersByGame(guild);
  const embed = new EmbedBuilder().setColor(settings.color).setTitle(T('title'))
    .setFooter({ text: T('footer') }).setTimestamp();
  for (const game of games()) {
    const list = players[game.id];
    const shown = list.slice(0, MAX_SHOWN).map((id) => `<@${id}>`).join(' ');
    const extra = list.length > MAX_SHOWN ? `\n${T('more', { count: list.length - MAX_SHOWN })}` : '';
    embed.addFields({ name: `${game.emoji} ${game.label} (${list.length})`, value: (shown || T('nobody')) + extra });
  }
  const active = games().filter((game) => players[game.id].length).slice(0, 5);
  if (!active.length) embed.setDescription(T('empty'));
  const components = active.length ? [new ActionRowBuilder().addComponents(active.map((game) => new ButtonBuilder()
    .setCustomId(`np:join:${game.id}`).setLabel(T('join', { game: game.label }).slice(0, 80))
    .setEmoji({ name: game.emoji }).setStyle(ButtonStyle.Primary)))] : [];
  return { embeds: [embed], components, allowedMentions: { parse: [] } };
}

async function refresh(client) {
  pending = null;
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  const channel = guild ? await guild.channels.fetch(nowSettings.channelId).catch(() => null) : null;
  if (!channel) return;
  const state = readJson(FILE, {});
  const payload = panel(guild);
  const message = state.messageId && state.channelId === channel.id
    ? await channel.messages.fetch(state.messageId).catch(() => null) : null;
  if (message) {
    await message.edit(payload).catch((error) => console.error('Most játszik hiba:', error.message));
    return;
  }
  const sent = await channel.send(payload);
  writeJson(FILE, { channelId: channel.id, messageId: sent.id });
}

// Sok tevékenységváltozás jöhet egyszerre, ezért legfeljebb percenként frissít.
function scheduleRefresh(client) {
  if (pending) return;
  pending = setTimeout(() => refresh(client).catch((error) => console.error('Most játszik:', error.message)), UPDATE_DELAY_MS);
  pending.unref?.();
}

function onPresence(oldPresence, newPresence) {
  if (!enabled() || newPresence?.guild?.id !== config.guildId) return;
  scheduleRefresh(newPresence.client);
}

async function onReady(client) {
  if (!enabled()) return;
  await refresh(client).catch((error) => console.error('Most játszik:', error.message));
}

async function wantToJoin(interaction, [gameId]) {
  const t = tr.user(interaction);
  const game = games().find((item) => item.id === gameId);
  const key = `${interaction.user.id}:${gameId}`;
  const wait = (cooldowns.get(key) ?? 0) + COOLDOWN_MS - Date.now();
  if (wait > 0) return void (await interaction.reply(ephemeral(t('cooldown', { minutes: Math.ceil(wait / 60000) }))));
  const players = game ? playersByGame(interaction.guild)[game.id].filter((id) => id !== interaction.user.id) : [];
  if (!players.length) return void (await interaction.reply(ephemeral(t('nobodyNow'))));

  cooldowns.set(key, Date.now());
  // A felhívás annak a nyelvén megy ki, aki jelentkezett.
  const mentioned = players.slice(0, 10);
  await interaction.channel.send({
    content: tr.as(langOf(interaction.locale))('joinPost', {
      user: interaction.user.id, game: game.label, players: mentioned.map((id) => `<@${id}>`).join(' '),
    }),
    allowedMentions: { users: mentioned },
  });
  await interaction.reply({ content: t('joinSent'), flags: MessageFlags.Ephemeral });
}

module.exports = {
  intents: () => (enabled() ? [GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] : []),
  events: { [Events.ClientReady]: onReady, [Events.PresenceUpdate]: onPresence },
  handlers: { 'np:join': wantToJoin },
  _internal: { playersByGame, panel, refresh },
};
