// Itt szabadon átírhatod a bot színeit, szövegeit és kategóriáit.
// A tokent és az azonosítókat NE ide írd, azok a .env fájlba valók.
module.exports = {
  color: 0x5865f2,
  successColor: 0x57f287,
  warningColor: 0xfee75c,
  errorColor: 0xed4245,

  // Ide mennek a privát frissítések és a napló. A .env-ben a LOG_CHANNEL_ID felülírja.
  logChannelId: '1526919133227257926',

  // A szerver tulajdonosán kívül ezek a rangok használhatják a tulaj parancsokat.
  // Példa: ownerRoleIds: ['123456789012345678'],
  ownerRoleIds: [],

  // A bot neve alatt megjelenő szöveg: "Nézi: ..."
  status: 'a szervert',

  ticketPanel: {
    title: '🎫 Segítség kell?',
    description: 'Válaszd ki, miben segíthetünk, és nyílik egy privát csatorna a csapattal.',
  },
  // Legfeljebb 5 kategória. Az "id" csak angol kisbetű és szám legyen.
  ticketCategories: [
    { id: 'hiba', label: 'Hibajelentés', emoji: '🐞' },
    { id: 'kerdes', label: 'Kérdés', emoji: '❓' },
    { id: 'jelentes', label: 'Tag jelentése', emoji: '🚨' },
    { id: 'egyeb', label: 'Egyéb', emoji: '💬' },
  ],

  changelogTypes: [
    { id: 'frissites', label: 'Frissítés', emoji: '📢', color: 0x5865f2 },
    { id: 'ujdonsag', label: 'Újdonság', emoji: '✨', color: 0x57f287 },
    { id: 'javitas', label: 'Javítás', emoji: '🛠️', color: 0xfee75c },
    { id: 'esemeny', label: 'Esemény', emoji: '🎉', color: 0xeb459e },
  ],
  // A changelog sorok elején ezek a jelek ikonra cserélődnek
  changelogLineIcons: { '+': '🟢', '-': '🔴', '!': '🟡' },

  // Ha a rang neve tartalmazza a szót, ez az ikon kerül a gombjára
  roleEmojis: { minecraft: '⛏️', cs2: '🔫', valorant: '🎯', gta: '🚗', roblox: '🧱' },

  // /lfg játékok. Legfeljebb 25 sor. A "roleName" a játékrang neve: ha van ilyen rang,
  // csak a tagjai csatlakozhatnak. Ha nincs, bárki jöhet.
  lfgGames: [
    { id: 'minecraft', label: 'Minecraft', emoji: '⛏️', roleName: 'Minecraft' },
    { id: 'cs2', label: 'CS2', emoji: '🔫', roleName: 'CS2' },
    { id: 'valorant', label: 'Valorant', emoji: '🎯', roleName: 'Valorant' },
    { id: 'gta', label: 'GTA V', emoji: '🚗', roleName: 'GTA V' },
    { id: 'roblox', label: 'Roblox', emoji: '🧱', roleName: 'Roblox' },
  ],
  lfgExpiryHours: 3,

  // A bot az első induláskor megkeresi név alapján, vagy létrehozza a kategóriát és a csatornát,
  // utána megjegyzi az azonosítójukat. Ezután átnevezheted és áthelyezheted őket.
  // Az azonosítókat itt is megadhatod, ilyenkor a bot sosem hoz létre újat.
  // FONTOS: ebben a kategóriában minden üres hangcsatornát töröl, kivéve a létrehozó csatornát.
  tempVoice: {
    categoryId: '',
    hubId: '',
    categoryName: '🔊 • Ideiglenes szobák',
    hubName: '➕ • Szoba létrehozása',
    // Ennyi perc múlva törlődik a csapatszoba, ha senki nem lépett be
    emptyTimeoutMinutes: 5,
  },

  // Ha megvan a csatorna azonosítója (channelId), a bot mindig azt használja, és sosem hoz létre újat.
  // Ha nincs megadva, név alapján keres, és az első találat után megjegyzi az azonosítót,
  // így utána nyugodtan átnevezheted vagy áthelyezheted.
  clips: {
    channelId: '1566601542155501608',
    channelName: '🎬•klipek',
    cooldownMinutes: 10,
    // Innen fogad el linket a bot
    allowedDomains: ['youtube.com', 'youtu.be', 'twitch.tv', 'medal.tv', 'streamable.com', 'tiktok.com'],
  },
  suggestions: {
    channelId: '',
    channelName: '💡•otletek',
    cooldownMinutes: 10,
  },

  welcomeMessage: 'Üdv a szerveren, {user}! Örülünk, hogy itt vagy. 🎉',
};
