const { Events, ActivityType } = require('discord.js');
const config = require('../config');
const settings = require('../../settings');

// Számláló csatornák: a csatorna neve magától frissül, pl. "👥 Tagok: 152".
// A Discord csatornánként 10 percenként csak kétszer enged átnevezni, ezért 10 percenként frissít.
const INTERVAL_MS = 10 * 60000;

function playingCount(guild) {
  const games = settings.nowPlaying?.games ?? [];
  let count = 0;
  for (const presence of guild.presences?.cache?.values?.() ?? []) {
    if (presence.user?.bot) continue;
    const playing = (presence.activities ?? []).some((activity) => activity.type === ActivityType.Playing
      && games.some((game) => game.match.some((word) => activity.name?.toLowerCase().includes(word))));
    if (playing) count += 1;
  }
  return count;
}

function values(guild) {
  const members = guild.members?.cache;
  const bots = members ? [...members.values()].filter((member) => member.user?.bot).length : 0;
  const online = [...(guild.presences?.cache?.values?.() ?? [])].filter((presence) => !presence.user?.bot && presence.status && presence.status !== 'offline').length;
  return {
    members: guild.memberCount ?? 0,
    humans: Math.max(0, (guild.memberCount ?? 0) - bots),
    bots,
    online,
    boosts: guild.premiumSubscriptionCount ?? 0,
    playing: playingCount(guild),
  };
}

const render = (template, data) => template.replace(/\{(\w+)\}/g, (match, key) => (key in data ? String(data[key]) : match)).slice(0, 100);

async function update(client) {
  const counters = settings.counters ?? [];
  if (!counters.length) return;
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) return;
  const data = values(guild);
  for (const counter of counters) {
    const channel = await guild.channels.fetch(counter.channelId).catch(() => null);
    if (!channel) continue;
    const name = render(counter.template, data);
    if (channel.name !== name) await channel.setName(name, 'Számláló frissítése').catch((error) => console.error('Számláló hiba:', error.message));
  }
}

async function start(client) {
  if (!(settings.counters ?? []).length) return;
  // A taglétszám pontos bontásához egyszer betölti a tagokat (ehhez SERVER MEMBERS INTENT kell, a védelem miatt már be van kapcsolva).
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  await guild?.members.fetch().catch(() => {});
  const run = () => update(client).catch((error) => console.error('Számlálók:', error.message));
  run();
  setInterval(run, INTERVAL_MS).unref?.();
}

module.exports = {
  events: { [Events.ClientReady]: start },
  _internal: { values, render, playingCount },
};
