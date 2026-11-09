// A vezérlőpulton állítható beállítások. Minden mező: path (a settings.js-beli útvonal), type, label [hu, en].
// Típusok: text, textarea, number, bool, select, channel, role, roles, list, rewards, counters
const sections = [
  {
    id: 'general',
    label: ['⚙️ Általános', '⚙️ General'],
    fields: [
      { path: 'language', type: 'select', options: [['hu', 'Magyar'], ['en', 'English']], label: ['Közös üzenetek nyelve', 'Language of shared messages'] },
      { path: 'status', type: 'text', max: 100, label: ['A bot állapota („Nézi: …”)', 'Bot status ("Watching …")'] },
      { path: 'logChannelId', type: 'channel', kind: 'text', label: ['Napló csatorna', 'Log channel'] },
      { path: 'rulesChannelId', type: 'channel', kind: 'text', label: ['Szabályok csatorna (üdvözléshez)', 'Rules channel (for welcome)'] },
      { path: 'welcomeMessage', type: 'textarea', max: 1000, label: ['Üdvözlő szöveg ({user} = a tag)', 'Welcome text in Hungarian ({user} = member)'] },
      { path: 'welcomeMessageEn', type: 'textarea', max: 1000, label: ['Üdvözlő szöveg angolul', 'Welcome text in English'] },
      { path: 'goodbyeMessage', type: 'bool', label: ['Búcsúüzenet kilépéskor', 'Goodbye message when someone leaves'] },
    ],
  },
  {
    id: 'channels',
    label: ['📺 Csatornák és rangok', '📺 Channels and roles'],
    fields: [
      { path: 'clips.channelId', type: 'channel', kind: 'text', label: ['Klipfal csatorna', 'Clip wall channel'] },
      { path: 'suggestions.channelId', type: 'channel', kind: 'text', label: ['Ötletek csatorna', 'Suggestions channel'] },
      { path: 'tempVoice.categoryId', type: 'channel', kind: 'category', label: ['Ideiglenes szobák kategóriája', 'Temporary rooms category'] },
      { path: 'tempVoice.hubId', type: 'channel', kind: 'voice', label: ['Szoba létrehozása hangcsatorna', 'Create-a-room voice channel'] },
      { path: 'bump.channelId', type: 'channel', kind: 'text', label: ['Bump emlékeztető csatorna', 'Bump reminder channel'] },
      { path: 'bump.pingRoleId', type: 'role', label: ['Bump ping rang', 'Bump ping role'] },
      { path: 'invites.channelId', type: 'channel', kind: 'text', label: ['Meghívások csatorna', 'Invites channel'] },
      { path: 'partners.channelId', type: 'channel', kind: 'text', label: ['Partnerek csatorna', 'Partners channel'] },
      { path: 'partners.reviewChannelId', type: 'channel', kind: 'text', label: ['Partnerkérelmek csatorna', 'Partner requests channel'] },
      { path: 'partners.roleId', type: 'role', label: ['Partner rang', 'Partner role'] },
      { path: 'partners.minMembers', type: 'number', min: 0, max: 1000000, label: ['Partner szerver minimum taglétszám', 'Partner server minimum members'] },
      { path: 'ownerRoleIds', type: 'roles', label: ['Tulaj rangok', 'Owner roles'] },
    ],
  },
  {
    id: 'tickets',
    label: ['🎫 Ticket és csapatkereső', '🎫 Tickets and group finder'],
    fields: [
      { path: 'ticketPanel.title', type: 'text', max: 200, label: ['Ticket panel címe', 'Ticket panel title'] },
      { path: 'ticketPanel.description', type: 'textarea', max: 1000, label: ['Ticket panel szövege', 'Ticket panel text'] },
      { path: 'ticketInactivity.remindHours', type: 'number', min: 1, max: 720, label: ['Emlékeztető ennyi óra csend után', 'Reminder after this many silent hours'] },
      { path: 'ticketInactivity.closeHours', type: 'number', min: 1, max: 720, label: ['Lezárás az emlékeztető után ennyi órával', 'Close this many hours after the reminder'] },
      { path: 'lfgExpiryHours', type: 'number', min: 1, max: 48, label: ['Csapatkereső kártya lejárata (óra)', 'Group finder card expiry (hours)'] },
      { path: 'lfgMaxReserves', type: 'number', min: 0, max: 20, label: ['Tartalékok száma kártyánként', 'Reserves per card'] },
      { path: 'warnAutoMute.count', type: 'number', min: 1, max: 50, label: ['Automatikus némítás ennyi figyelmeztetés után', 'Automatic timeout after this many warnings'] },
      { path: 'warnAutoMute.minutes', type: 'number', min: 1, max: 40320, label: ['Automatikus némítás hossza (perc)', 'Automatic timeout length (minutes)'] },
    ],
  },
  {
    id: 'invites',
    label: ['📨 Meghívások', '📨 Invites'],
    fields: [
      { path: 'invites.enabled', type: 'bool', label: ['Meghívás-követő bekapcsolva', 'Invite tracker on'] },
      { path: 'invites.fakeAccountDays', type: 'number', min: 0, max: 365, label: ['Ennél fiatalabb fiók nem számít (nap)', 'Accounts younger than this do not count (days)'] },
      { path: 'invites.rewards', type: 'rewards', label: ['Jutalomrangok', 'Reward roles'] },
    ],
  },
  {
    id: 'security',
    label: ['🛡️ Védelem', '🛡️ Protection'],
    fields: [
      { path: 'security.enabled', type: 'bool', label: ['Védelem bekapcsolva', 'Protection on'] },
      { path: 'security.nuke.enabled', type: 'bool', label: ['Anti-nuke bekapcsolva', 'Anti-nuke on'] },
      { path: 'security.nuke.mode', type: 'select', options: [['strict', 'Szigorú / Strict'], ['limits', 'Határértékek / Limits']], label: ['Anti-nuke mód', 'Anti-nuke mode'] },
      { path: 'security.nuke.trustedRoles', type: 'roles', label: ['Megbízható rangok (és ami fölöttük van)', 'Trusted roles (and everything above)'] },
      { path: 'security.nuke.punishment', type: 'select', options: [['strip', 'Rangok elvétele / Remove roles'], ['kick', 'Kirúgás / Kick'], ['ban', 'Kitiltás / Ban']], label: ['Büntetés', 'Punishment'] },
      { path: 'security.nuke.blockBots', type: 'bool', label: ['Idegen botok kirúgása', 'Kick unapproved bots'] },
      { path: 'security.whitelist', type: 'list', label: ['Megbízható tagok, botok vagy rangok azonosítói', 'Trusted member, bot or role IDs'] },
      { path: 'security.raid.enabled', type: 'bool', label: ['Raidvédelem bekapcsolva', 'Raid protection on'] },
      { path: 'security.raid.joinThreshold', type: 'number', min: 2, max: 100, label: ['Raid: ennyi belépés…', 'Raid: this many joins…'] },
      { path: 'security.raid.joinWindowSeconds', type: 'number', min: 1, max: 300, label: ['…ennyi másodpercen belül', '…within this many seconds'] },
      { path: 'security.raid.action', type: 'select', options: [['timeout', 'Némítás / Timeout'], ['none', 'Csak riasztás / Alert only']], label: ['Raid módban az új belépők', 'New joiners in raid mode'] },
      { path: 'security.raid.durationMinutes', type: 'number', min: 1, max: 1440, label: ['Raid mód hossza (perc)', 'Raid mode length (minutes)'] },
      { path: 'security.raid.autoLockdown', type: 'bool', label: ['Raidnél automatikus zárolás', 'Automatic lockdown on raid'] },
      { path: 'security.spam.enabled', type: 'bool', label: ['Spamvédelem bekapcsolva', 'Spam protection on'] },
      { path: 'security.spam.messages', type: 'number', min: 2, max: 50, label: ['Spam: ennyi üzenet…', 'Spam: this many messages…'] },
      { path: 'security.spam.windowSeconds', type: 'number', min: 1, max: 60, label: ['…ennyi másodperc alatt', '…within this many seconds'] },
      { path: 'security.spam.mentions', type: 'number', min: 2, max: 50, label: ['Említések száma egy üzenetben', 'Mentions in one message'] },
      { path: 'security.spam.timeoutMinutes', type: 'number', min: 1, max: 40320, label: ['Spam némítás hossza (perc)', 'Spam timeout length (minutes)'] },
    ],
  },
  {
    id: 'extras',
    label: ['🎮 Most játszik és számlálók', '🎮 Now playing and counters'],
    fields: [
      { path: 'nowPlaying.enabled', type: 'bool', label: ['Most játszik panel (előbb kapcsold be a PRESENCE INTENT-et!)', 'Now playing panel (turn on PRESENCE INTENT first!)'] },
      { path: 'nowPlaying.channelId', type: 'channel', kind: 'text', label: ['Most játszik csatorna', 'Now playing channel'] },
      { path: 'counters', type: 'counters', label: ['Számláló csatornák', 'Counter channels'] },
    ],
  },
];

const fields = sections.flatMap((section) => section.fields);
const byPath = new Map(fields.map((field) => [field.path, field]));

const SNOWFLAKE = /^\d{15,22}$/;
const clean = (value, max = 2000) => String(value ?? '').slice(0, max);

// Egy beküldött érték ellenőrzése. Hibánál null-t ad vissza, egyébként a tisztított értéket.
function validate(field, value) {
  switch (field.type) {
    case 'text':
    case 'textarea':
      return typeof value === 'string' ? clean(value, field.max) : null;
    case 'number': {
      const number = Number(value);
      if (!Number.isFinite(number)) return null;
      return Math.min(field.max ?? Infinity, Math.max(field.min ?? -Infinity, Math.round(number)));
    }
    case 'bool':
      return typeof value === 'boolean' ? value : null;
    case 'select':
      return field.options.some(([option]) => option === value) ? value : null;
    case 'channel':
    case 'role':
      return value === '' || SNOWFLAKE.test(String(value)) ? String(value) : null;
    case 'roles':
      // Azonosító, vagy (a régi beállításokból megmaradt) rangnév.
      return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim() && item.length <= 100)
        ? value.map((item) => item.trim()).slice(0, 25) : null;
    case 'list':
      return Array.isArray(value) ? value.map((item) => clean(item, 100).trim()).filter(Boolean).slice(0, 50) : null;
    case 'rewards':
      if (!Array.isArray(value)) return null;
      return value.filter((item) => SNOWFLAKE.test(String(item?.roleId)) && Number(item?.count) > 0)
        .map((item) => ({ count: Math.min(100000, Math.round(Number(item.count))), roleId: String(item.roleId) })).slice(0, 20);
    case 'counters':
      if (!Array.isArray(value)) return null;
      return value.filter((item) => SNOWFLAKE.test(String(item?.channelId)) && typeof item?.template === 'string' && item.template.trim())
        .map((item) => ({ channelId: String(item.channelId), template: clean(item.template, 100) })).slice(0, 10);
    default:
      return null;
  }
}

module.exports = {
  byPath, fields, sections, validate,
};
