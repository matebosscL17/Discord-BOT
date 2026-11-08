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

  // ===== Biztonság: raidvédelem, spamvédelem, anti-nuke =====
  // A bot rangja legyen a LEGFELSŐ a rangok listájában, különben a fölötte lévőket nem tudja megállítani.
  security: {
    enabled: true,
    // Megbízható felhasználók és rangok azonosítói. Rájuk nem vonatkozik az anti-nuke és a spamvédelem.
    // A szerver tulajdonosa és a fenti ownerRoleIds rangok mindig megbízhatók.
    // A /security whitelist-add paranccsal Discordból is bővítheted.
    whitelist: [
      '678344927997853742', // Sapphire bot: ő adja a rangot az új tagoknak
    ],

    raid: {
      enabled: true,
      // Ha ennyi ember lép be ennyi másodpercen belül, a bot raid módba kapcsol
      joinThreshold: 8,
      joinWindowSeconds: 10,
      // Raid módban az újonnan belépők: 'timeout' (némítás a raid mód végéig) vagy 'none' (csak riasztás).
      // A bot senkit nem rúg ki.
      action: 'timeout',
      // Ennyi perc után a raid mód magától kikapcsol
      durationMinutes: 10,
      // Raid módba lépéskor az összes csatorna zárolása is (mint a /security lockdown)
      autoLockdown: false,
      // Raid módon kívül a nagyon friss fiókok kezelése: 'none' vagy 'timeout'
      youngAccountAction: 'none',
      minAccountAgeDays: 3,
    },

    spam: {
      enabled: true,
      // Ennyi üzenet ennyi másodpercen belül már spamnek számít
      messages: 6,
      windowSeconds: 5,
      // Ennyi vagy több említés (tag, rang, @everyone) egy üzenetben
      mentions: 5,
      timeoutMinutes: 10,
    },

    nuke: {
      enabled: true,
      // 'strict': aki a megbízható rangok ALATT van (és minden idegen bot), az egyetlen szerverbeállítást
      //           sem módosíthat. Minden ilyen lépést a bot azonnal visszacsinál, és megbünteti.
      // 'limits': csak a lenti határértékek fölött lép közbe.
      mode: 'strict',
      // Ezek a rangok (név vagy azonosító) és minden fölöttük lévő rang megbízható.
      // A nevekben a szóköz, emoji és kis-nagybetű nem számít.
      trustedRoles: ['Founder', 'Ügyfélszolgálat'],
      // Ennyi másodpercen belül ennyi művelet egy embertől már támadásnak számít
      windowSeconds: 10,
      limits: {
        channelDelete: 3,
        channelCreate: 5,
        roleDelete: 3,
        roleCreate: 5,
        ban: 3,
        kick: 5,
        webhookCreate: 3,
      },
      // A támadó büntetése: 'strip' (minden rang elvétele), 'kick' vagy 'ban'
      punishment: 'strip',
      // Nem megbízható ember által behívott botot azonnal kirúg
      blockBots: true,
      // Nem megbízható ember által adott veszélyes jogot (pl. Administrator) azonnal visszavon
      protectDangerousPermissions: true,
    },
  },

  // A közös üzenetek nyelve (panelek, ticketek, napló, kártyák): 'hu' vagy 'en'.
  // A tagoknak szóló válaszok mindig a saját Discord-nyelvüket követik.
  // A lenti szövegeket (kategóriák, kérdések, üdvözlés) ehhez igazítva írd át, ha 'en'-re váltasz.
  language: 'hu',

  // Ennyi figyelmeztetés után a bot automatikusan némít (minden 3., 6., 9. ... figyelmeztetésnél).
  // Kikapcsolás: warnAutoMute: null,
  warnAutoMute: { count: 3, minutes: 60 },

  // A bot neve alatt megjelenő szöveg: "Nézi: ..."
  status: 'a szervert',

  // A "...En" mezők az angol szövegek, ha a language 'en'.
  ticketPanel: {
    title: '🎫 Segítség kell?',
    titleEn: '🎫 Need help?',
    description: 'Válaszd ki, miben segíthetünk, és nyílik egy privát csatorna a csapattal.',
    descriptionEn: 'Pick what you need help with, and a private channel opens with the team.',
  },
  // Legfeljebb 5 kategória. Az "id" csak angol kisbetű és szám legyen.
  // Kategóriánként legfeljebb 5 kérdés. "long: true" = több soros válasz, "optional: true" = nem kötelező.
  // A kérdés szövege legfeljebb 45 karakter lehet.
  ticketCategories: [
    {
      id: 'hiba',
      label: 'Hibajelentés',
      labelEn: 'Bug report',
      emoji: '🐞',
      questions: [
        { label: 'Mi a hiba?', labelEn: 'What is the problem?', long: true },
        { label: 'Hol és mikor történt?', labelEn: 'Where and when did it happen?' },
        { label: 'Kép vagy videó linkje', labelEn: 'Link to a picture or video', optional: true },
      ],
    },
    {
      id: 'kerdes',
      label: 'Kérdés',
      labelEn: 'Question',
      emoji: '❓',
      questions: [{ label: 'Mi a kérdésed?', labelEn: 'What is your question?', long: true }],
    },
    {
      id: 'jelentes',
      label: 'Tag jelentése',
      labelEn: 'Report a member',
      emoji: '🚨',
      questions: [
        { label: 'Kit jelentesz? (név)', labelEn: 'Who are you reporting? (name)' },
        { label: 'Mi történt?', labelEn: 'What happened?', long: true },
        { label: 'Bizonyíték linkje (kép, videó)', labelEn: 'Link to proof (picture, video)', optional: true },
      ],
    },
    {
      id: 'egyeb',
      label: 'Egyéb',
      labelEn: 'Other',
      emoji: '💬',
      questions: [{ label: 'Miben segíthetünk?', labelEn: 'How can we help?', long: true }],
    },
  ],

  ticketInactivity: {
    // Ennyi óra csend után a bot megkérdezi, kell-e még a ticket
    remindHours: 24,
    // Ha az emlékeztető után ennyi óráig senki nem ír, a bot lezárja
    closeHours: 24,
  },

  changelogTypes: [
    { id: 'frissites', label: 'Frissítés', labelEn: 'Update', emoji: '📢', color: 0x5865f2 },
    { id: 'ujdonsag', label: 'Újdonság', labelEn: 'New feature', emoji: '✨', color: 0x57f287 },
    { id: 'javitas', label: 'Javítás', labelEn: 'Fix', emoji: '🛠️', color: 0xfee75c },
    { id: 'esemeny', label: 'Esemény', labelEn: 'Event', emoji: '🎉', color: 0xeb459e },
  ],
  // A changelog sorok elején ezek a jelek ikonra cserélődnek
  changelogLineIcons: { '+': '🟢', '-': '🔴', '!': '🟡' },

  // Ha a rang neve tartalmazza a szót, ez az ikon kerül a gombjára
  roleEmojis: { minecraft: '⛏️', cs2: '🔫', valorant: '🎯', gta: '🚗', roblox: '🧱' },

  // /lfg játékok. Legfeljebb 25 sor. A "roleName" a játékrang neve: ha van ilyen rang,
  // csak a tagjai csatlakozhatnak. Ha nincs, bárki jöhet.
  lfgGames: [
    { id: 'minecraft', label: 'Minecraft', emoji: '⛏️', roleName: 'Minecraft', color: 0x62b246 },
    { id: 'cs2', label: 'CS2', emoji: '🔫', roleName: 'CS2', color: 0xf0a030 },
    { id: 'valorant', label: 'Valorant', emoji: '🎯', roleName: 'Valorant', color: 0xfd4556 },
    { id: 'gta', label: 'GTA V', emoji: '🚗', roleName: 'GTA V', color: 0x2fa84f },
    { id: 'roblox', label: 'Roblox', emoji: '🧱', roleName: 'Roblox', color: 0x3b82f6 },
  ],
  lfgExpiryHours: 3,
  // Ennyien állhatnak sorba tartaléknak egy kártyán
  lfgMaxReserves: 5,

  // A kategóriát és a létrehozó hangcsatornát TE hozod létre, a bot csak megkeresi őket
  // (azonosító alapján, vagy ha az nincs megadva, név alapján). Csak a tagok saját szobáit hozza létre.
  // FONTOS: ebben a kategóriában minden üres hangcsatornát töröl, kivéve a létrehozó csatornát.
  tempVoice: {
    categoryId: '1567406049802195104',
    hubId: '1567406051215548488',
    categoryName: 'I D E I G L E N E S V C',
    // A régi nevén is megtalálja, ha még nem nevezted át.
    categoryOldNames: ['🔊 • Ideiglenes szobák'],
    hubName: '➕ • Szoba létrehozása',
    // Ennyi perc múlva törlődik a csapatszoba, ha senki nem lépett be
    emptyTimeoutMinutes: 5,
  },

  // A bot SOHA nem hoz létre csatornát. Ha megadod az azonosítót (channelId), azt használja.
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

  // Üdvözlés. Ha megadod a szabályok csatornáját, a kártya hivatkozik rá. Pl. rulesChannelId: '123...'
  rulesChannelId: '',
  // Búcsúüzenet az üdvözlő csatornában, amikor valaki kilép. Kikapcsolás: false
  goodbyeMessage: true,
  welcomeMessage: 'Üdv a szerveren, {user}! Örülünk, hogy itt vagy. 🎉',
  welcomeMessageEn: 'Welcome to the server, {user}! Glad to have you here. 🎉',
};
