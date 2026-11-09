const http = require('node:http');
const crypto = require('node:crypto');
const { ChannelType, Events, GatewayIntentBits } = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const overrides = require('../overrides');
const schema = require('../dashboard/schema');
const { loginPage, appPage } = require('../dashboard/page');
const customCommands = require('./customcommands');
const schedules = require('./schedules');
const nowPlaying = require('./nowplaying');
const ticketStats = require('../ticketStats');
const { readJson } = require('../store');
const { version } = require('../../package.json');

// Webes vezérlőpult. Bekapcsolás: a .env fájlba (vagy a hosting panelre) írd be a DASHBOARD_PASSWORD sort.
// Telefonon a böngészőben: http://localhost:3000  (a port a DASHBOARD_PORT-tal állítható)
// Más eszközről a helyi hálózaton csak akkor érhető el, ha DASHBOARD_HOST=0.0.0.0 (pl. http://192.168.1.20:3000).
const PASSWORD = process.env.DASHBOARD_PASSWORD?.trim();
const PORT = Number(process.env.DASHBOARD_PORT) || 3000;
const HOST = process.env.DASHBOARD_HOST?.trim() || '127.0.0.1';
const SESSION_MS = 7 * 24 * 3600000;
const MAX_BODY = 200 * 1024;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 5 * 60000;

const LOG_LINES = 300;
const DAY_MS = 24 * 3600000;

// A bot naplójának utolsó sorai, hogy a vezérlőpulton is látszódjanak (ne kelljen a Termuxban keresgélni).
const logs = [];
for (const level of PASSWORD ? ['log', 'warn', 'error'] : []) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    original(...args);
    const text = args.map((arg) => (arg instanceof Error ? arg.stack ?? arg.message : typeof arg === 'string' ? arg : JSON.stringify(arg) ?? String(arg))).join(' ');
    logs.push({ time: Date.now(), level, text: text.slice(0, 2000) });
    if (logs.length > LOG_LINES) logs.shift();
  };
}

const sessions = new Map(); // token -> lejárat
const attempts = new Map(); // ip -> időbélyegek
let server = null;
let savedSinceStart = false;
let startupError = null;

const safeEqual = (a, b) => {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
};

function cookies(req) {
  return Object.fromEntries((req.headers.cookie ?? '').split(';').map((part) => part.trim().split('='))
    .filter(([key]) => key).map(([key, ...rest]) => [key, decodeURIComponent(rest.join('='))]));
}

function loggedIn(req) {
  const token = cookies(req).sid;
  const expires = token && sessions.get(token);
  if (!expires) return false;
  if (expires < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function send(res, status, body, type = 'text/html; charset=utf-8', headers = {}) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.discordapp.com",
    ...headers,
  });
  res.end(body);
}

const json = (res, status, data) => send(res, status, JSON.stringify(data), 'application/json; charset=utf-8');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((time) => now - time < ATTEMPT_WINDOW_MS);
  attempts.set(ip, list);
  return list.length >= MAX_ATTEMPTS;
}

// A jelenlegi értékek: a futó beállítások, rajta a még újraindítás előtt mentett módosításokkal.
function currentValues() {
  const merged = overrides.merge(settings, overrides.readOverrides());
  return Object.fromEntries(schema.fields.map((field) => [field.path, overrides.getValue(merged, field.path)]));
}

async function guildData(client) {
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) return { name: '?', channels: [], roles: [] };
  const channels = await guild.channels.fetch().catch(() => guild.channels.cache);
  const kinds = {
    [ChannelType.GuildText]: 'text', [ChannelType.GuildAnnouncement]: 'text', [ChannelType.GuildVoice]: 'voice', [ChannelType.GuildCategory]: 'category',
  };
  return {
    name: guild.name,
    icon: guild.iconURL?.({ size: 64 }) ?? null,
    channels: [...channels.values()].filter((channel) => channel && kinds[channel.type])
      .sort((a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0))
      .map((channel) => ({ id: channel.id, name: channel.name, kind: kinds[channel.type] })),
    roles: [...guild.roles.cache.values()].filter((role) => role.id !== guild.id && !role.managed)
      .sort((a, b) => b.position - a.position)
      .map((role) => ({ id: role.id, name: role.name, color: role.hexColor ?? '#99aab5' })),
  };
}

// Élő adatok az áttekintő oldalhoz. Minden rész külön hibatűrő: ha valami hiányzik, az helyen üres marad.
async function liveStats(client) {
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  const nameOf = (id) => guild?.members?.cache?.get(id)?.displayName ?? client.users?.cache?.get(id)?.username ?? null;
  const presenceOn = Boolean(client.options?.intents?.has?.(GatewayIntentBits.GuildPresences));
  const presences = presenceOn ? [...(guild?.presences?.cache?.values?.() ?? [])] : [];
  const players = presenceOn && guild ? nowPlaying._internal.playersByGame(guild) : {};
  const since = Date.now() - 7 * DAY_MS;

  const cases = readJson('mod-cases', { cases: [] }).cases;
  const bump = readJson('bump', { nextAt: 0, total: 0, lastUserId: null });
  const invites = readJson('invites', { inviters: {} });
  const security = readJson('security', { lockdown: null });

  return {
    version,
    bot: {
      tag: client.user?.tag ?? null,
      avatar: client.user?.displayAvatarURL?.({ size: 64 }) ?? null,
      online: Boolean(client.isReady?.()),
      ping: Math.max(0, Math.round(client.ws?.ping ?? 0)),
      uptime: client.uptime ?? 0,
      memoryMb: Math.round(process.memoryUsage().rss / 1048576),
    },
    guild: guild ? {
      name: guild.name,
      icon: guild.iconURL?.({ size: 128 }) ?? null,
      members: guild.memberCount ?? 0,
      boosts: guild.premiumSubscriptionCount ?? 0,
      online: presenceOn ? presences.filter((p) => !p.user?.bot && p.status && p.status !== 'offline').length : null,
    } : null,
    presenceOn,
    games: (settings.nowPlaying?.games ?? []).map((game) => ({
      id: game.id, label: game.label, emoji: game.emoji, players: (players[game.id] ?? []).length,
    })),
    tickets: ticketStats.summarize(since),
    cases: {
      week: cases.filter((item) => item.time >= since).length,
      recent: cases.slice(-5).reverse().map((item) => ({
        id: item.id, type: item.type, time: item.time, reason: item.reason ?? '', user: nameOf(item.userId) ?? item.userId, mod: nameOf(item.modId),
      })),
    },
    bump: { nextAt: bump.nextAt ?? 0, total: bump.total ?? 0, last: bump.lastUserId ? nameOf(bump.lastUserId) : null },
    invites: Object.entries(invites.inviters ?? {})
      .map(([id, item]) => ({ name: nameOf(id) ?? id, count: Math.max(0, (item.regular ?? 0) - (item.left ?? 0) - (item.fake ?? 0)) }))
      .filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 3),
    lockdown: Boolean(security.lockdown),
  };
}

// A rangokat a settings.js-ben névvel is meg lehet adni (pl. 'Founder'): a vezérlőpult ezeket azonosítóra váltja.
function resolveRoleNames(values, roles) {
  for (const field of schema.fields.filter((item) => item.type === 'roles')) {
    values[field.path] = (values[field.path] ?? []).map((entry) => {
      const text = String(entry);
      if (roles.some((role) => role.id === text)) return text;
      return roles.find((role) => role.name.toLowerCase() === text.toLowerCase())?.id ?? text;
    });
  }
  return values;
}

async function handleApi(req, res, client, path) {
  if (req.method === 'GET' && path === '/api/meta') {
    const guild = await guildData(client);
    return json(res, 200, {
      sections: schema.sections,
      values: resolveRoleNames(currentValues(), guild.roles),
      guild,
      commands: customCommands.load(),
      schedules: schedules.load(),
      pm2: process.env.pm_id !== undefined,
      savedSinceStart,
      startupError,
      bot: { tag: client.user?.tag, ping: Math.round(client.ws?.ping ?? 0), uptime: client.uptime ?? 0 },
    });
  }
  if (req.method === 'GET' && path === '/api/stats') return json(res, 200, await liveStats(client));
  if (req.method === 'GET' && path === '/api/logs') return json(res, 200, { lines: logs });
  if (req.method !== 'POST') return json(res, 405, { error: 'method' });
  // Egyszerű védelem a más oldalakról érkező kérések ellen.
  if (req.headers['x-dashboard'] !== '1') return json(res, 403, { error: 'forbidden' });

  let body;
  try {
    body = JSON.parse(await readBody(req) || '{}');
  } catch {
    return json(res, 400, { error: 'bad json' });
  }

  if (path === '/api/settings') {
    const values = {};
    const errors = [];
    for (const [key, value] of Object.entries(body.values ?? {})) {
      const field = schema.byPath.get(key);
      const cleaned = field ? schema.validate(field, value) : null;
      if (cleaned === null) errors.push(key);
      else values[key] = cleaned;
    }
    if (errors.length) return json(res, 400, { error: 'invalid', fields: errors });
    overrides.setValues(values);
    savedSinceStart = true;
    json(res, 200, { ok: true, restarting: Boolean(body.restart) });
    if (body.restart) {
      console.log('Vezérlőpult: beállítások mentve, újraindítás...');
      setTimeout(() => process.exit(0), 800).unref?.();
    }
    return undefined;
  }
  if (path === '/api/commands') {
    const list = customCommands.validateList(body.list);
    if (!list) return json(res, 400, { error: 'invalid' });
    customCommands.save(list);
    return json(res, 200, { ok: true, list });
  }
  if (path === '/api/schedules') {
    const list = schedules.validateList(body.list);
    if (!list) return json(res, 400, { error: 'invalid' });
    schedules.save(list);
    return json(res, 200, { ok: true, list });
  }
  if (path === '/api/schedules/send') {
    const [item] = schedules.validateList([body.item]) ?? [];
    if (!item) return json(res, 400, { error: 'invalid' });
    try {
      await schedules.sendItem(client, item);
    } catch {
      return json(res, 400, { error: 'send' });
    }
    return json(res, 200, { ok: true });
  }
  if (path === '/api/restart') {
    json(res, 200, { ok: true });
    setTimeout(() => process.exit(0), 800).unref?.();
    return undefined;
  }
  return json(res, 404, { error: 'not found' });
}

function createServer(client) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      const ip = req.socket.remoteAddress ?? '?';

      if (path === '/login' && req.method === 'POST') {
        if (tooManyAttempts(ip)) return send(res, 429, loginPage('wait'));
        const form = new URLSearchParams(await readBody(req));
        if (!safeEqual(form.get('password') ?? '', PASSWORD)) {
          attempts.get(ip).push(Date.now());
          return send(res, 401, loginPage('wrong'));
        }
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, Date.now() + SESSION_MS);
        return send(res, 303, '', 'text/plain', {
          Location: '/',
          'Set-Cookie': `sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`,
        });
      }
      if (path === '/logout' && req.method === 'POST') {
        sessions.delete(cookies(req).sid);
        return send(res, 303, '', 'text/plain', { Location: '/', 'Set-Cookie': 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
      }
      if (!loggedIn(req)) {
        if (path.startsWith('/api/')) return json(res, 401, { error: 'login' });
        return send(res, 200, loginPage());
      }
      if (path.startsWith('/api/')) return await handleApi(req, res, client, path);
      if (path === '/' && req.method === 'GET') return send(res, 200, appPage());
      return send(res, 404, 'Not found', 'text/plain');
    } catch (error) {
      console.error('Vezérlőpult hiba:', error.message);
      if (!res.headersSent) json(res, 500, { error: 'server' });
      return undefined;
    }
  });
}

function start(client) {
  if (server) return;
  if (!PASSWORD) {
    console.log('Vezérlőpult kikapcsolva: írd be a .env fájlba a DASHBOARD_PASSWORD=... sort a bekapcsoláshoz.');
    return;
  }
  if (PASSWORD.length < 8) {
    console.warn('Vezérlőpult kikapcsolva: a DASHBOARD_PASSWORD legalább 8 karakter legyen.');
    return;
  }
  server = createServer(client);
  server.on('error', (error) => console.error(`Vezérlőpult: nem sikerült elindítani (${error.code ?? error.message}).`));
  server.listen(PORT, HOST, () => {
    const shown = HOST === '0.0.0.0' ? 'a telefon IP-címe' : HOST === '127.0.0.1' ? 'localhost' : HOST;
    console.log(`Vezérlőpult: http://${shown}:${PORT}`);
  });
}

// Mentőmód: ha a bot nem tud belépni (pl. a vezérlőpulton bekapcsolt funkcióhoz hiányzik egy intent),
// a vezérlőpult akkor is elindul, így ott vissza lehet állítani a beállítást.
function rescue(client, reason) {
  if (!PASSWORD || PASSWORD.length < 8) return false;
  startupError = reason;
  start(client);
  console.log('A vezérlőpult mentőmódban fut: javítsd a beállítást, majd mentsd újraindítással.');
  return true;
}

module.exports = {
  events: { [Events.ClientReady]: start },
  rescue,
  _internal: { createServer, sessions },
};
