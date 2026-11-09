const { EmbedBuilder, Events } = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { readJson, writeJson } = require('../store');

// Időzített üzenetek: a vezérlőpulton beállított napokon és időpontban a bot kiküld egy üzenetet.
// A lista minden ellenőrzésnél frissen töltődik be, így mentés után azonnal él.
const FILE = 'scheduled';
const STATE_FILE = 'scheduled-state';
const TIME_ZONE = 'Europe/Budapest';
const CHECK_MS = 30000;
const CATCH_UP_MINUTES = 10; // ha ennyi percen belül indul újra a bot, még pótolja
const SNOWFLAKE = /^\d{15,22}$/;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const load = () => readJson(FILE, []);

function validateList(list) {
  if (!Array.isArray(list)) return null;
  return list.slice(0, 50).map((item, index) => {
    const time = String(item?.time ?? '');
    const days = Array.isArray(item?.days) ? [...new Set(item.days.map(Number).filter((day) => day >= 0 && day <= 6))] : [];
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !days.length || !SNOWFLAKE.test(String(item?.channelId))) return null;
    const text = String(item?.text ?? '').trim().slice(0, 2000);
    if (!text) return null;
    return {
      id: /^[\w-]{1,40}$/.test(String(item?.id)) ? String(item.id) : `s${Date.now().toString(36)}${index}`,
      enabled: item?.enabled !== false,
      channelId: String(item.channelId),
      days: days.sort(),
      time,
      title: String(item?.title ?? '').trim().slice(0, 100),
      text,
      pingRoleId: SNOWFLAKE.test(String(item?.pingRoleId)) ? String(item.pingRoleId) : '',
    };
  }).filter(Boolean);
}

const save = (list) => writeJson(FILE, validateList(list) ?? []);

// Budapesti idő szerint: nap (0 = vasárnap), dátum és percek éjfél óta.
function localNow(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, hourCycle: 'h23', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return {
    weekday: WEEKDAYS.indexOf(parts.weekday),
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function dueItems(list, now, state) {
  return list.filter((item) => {
    if (!item.enabled || !item.days.includes(now.weekday)) return false;
    const [hour, minute] = item.time.split(':').map(Number);
    const target = hour * 60 + minute;
    const late = now.minutes - target;
    return late >= 0 && late <= CATCH_UP_MINUTES && state[item.id] !== now.date;
  });
}

async function check(client) {
  const list = load();
  if (!list.length) return;
  const now = localNow();
  const state = readJson(STATE_FILE, {});
  const due = dueItems(list, now, state);
  for (const item of due) {
    state[item.id] = now.date; // előbb jelöli, hogy hiba esetén se küldje kétszer
    writeJson(STATE_FILE, state);
    const channel = await client.channels.fetch(item.channelId).catch(() => null);
    if (!channel || channel.guildId !== config.guildId) continue;
    const embed = new EmbedBuilder().setColor(settings.color).setDescription(item.text);
    if (item.title) embed.setTitle(item.title);
    await channel.send({
      content: item.pingRoleId ? `<@&${item.pingRoleId}>` : undefined,
      embeds: [embed],
      allowedMentions: { roles: item.pingRoleId ? [item.pingRoleId] : [] },
    }).catch((error) => console.error('Időzített üzenet hiba:', error.message));
  }
}

function start(client) {
  const run = () => check(client).catch((error) => console.error('Időzített üzenetek:', error.message));
  run();
  setInterval(run, CHECK_MS).unref?.();
}

module.exports = {
  events: { [Events.ClientReady]: start },
  load,
  save,
  validateList,
  _internal: { localNow, dueItems, check },
};
