// A bot frissítései, a legújabb legyen legfelül.
// Induláskor a bot a még ki nem tett verziókat beírja a Changelog csatornába.
// A "valtozasok" a nyilvános Changelog csatornába, a "privatValtozasok" a logs csatornába kerül.
// Bármelyik elhagyható. A sorok elején a + zöld, a - piros, a ! sárga ikon lesz.
// Az "en" rész nem kötelező: ha a settings.js-ben language: 'en', ezt használja helyette.
module.exports = [
  {
    verzio: '2.13.0',
    cim: 'Megújult vezérlőpult',
    privatValtozasok: [
      '+ Új kinézet: oldalsó menü, telefonon lenyíló, gépen mindig látszik',
      '+ Áttekintő kezdőlap: élő látkép arról, ki mivel játszik, taglétszám, ticketek, moderáció, bump és meghívások',
      '+ Keresés a beállítások között, a találatra kattintva oda ugrik',
      '+ Discord-szerű előnézet az üdvözlő szöveghez, az egyedi parancsokhoz és az időzített üzenetekhez',
      '+ „Küldés most” gomb az időzített üzenetekhez, kipróbáláshoz',
      '+ Napló oldal: a bot üzenetei és hibái a Termux nélkül is láthatók',
      '+ A módosított mezők megjelölve, egy kattintással visszaállíthatók',
    ],
    en: {
      cim: 'Redesigned dashboard',
      privatValtozasok: [
        '+ New look: side menu, slides in on phones, always visible on computers',
        '+ Overview home page: a live skyline of who is playing what, members, tickets, moderation, bump and invites',
        '+ Search settings, tap a result to jump to it',
        '+ Discord-style preview for the welcome text, custom commands and scheduled messages',
        '+ "Send now" button for scheduled messages, to try them out',
        '+ Log page: the bot messages and errors are visible without Termux',
        '+ Changed fields are marked and can be undone with one tap',
      ],
    },
  },
  {
    verzio: '2.12.1',
    cim: 'Tisztább napló',
    privatValtozasok: [
      '- Eltűnt a felesleges "MaxListenersExceededWarning" figyelmeztetés a naplóból',
    ],
    en: {
      cim: 'Cleaner log',
      privatValtozasok: [
        '- Removed the needless "MaxListenersExceededWarning" from the log',
      ],
    },
  },
  {
    verzio: '2.12.0',
    cim: 'Vezérlőpult, Most játszik panel és új extrák',
    valtozasok: [
      '+ Most játszik panel: egy üzenet mutatja, ki játszik éppen CS2-t, Valorantot, Minecraftot, GTA V-öt vagy Robloxot',
      '+ "Csatlakoznék" gomb a panelen: egy kattintással szólhatsz a játszóknak, hogy beszállnál',
      '+ /info: a szerver saját parancsai (pl. /info ip), gépelés közben a bot javasol',
      '+ Időzített üzenetek: a bot a megadott napokon és időben magától kiírja a bejelentéseket',
      '+ Számláló csatornák: a csatorna neve magától mutatja a taglétszámot, az online tagokat vagy a játszókat',
    ],
    privatValtozasok: [
      '+ Webes vezérlőpult: a beállítások a telefon böngészőjéből kattintással módosíthatók (.env: DASHBOARD_PASSWORD)',
      '+ Az egyedi parancsokat és az időzített üzeneteket a vezérlőpulton lehet létrehozni, újraindítás nélkül élnek',
      '! A Most játszik panelhez a Discord fejlesztői oldalán be kell kapcsolni a PRESENCE INTENT-et',
    ],
    en: {
      cim: 'Dashboard, now playing panel and new extras',
      valtozasok: [
        '+ Now playing panel: one message shows who is playing CS2, Valorant, Minecraft, GTA V or Roblox right now',
        '+ "I would join" button on the panel: let the players know with one click that you want in',
        '+ /info: the server\'s own commands (e.g. /info ip), the bot suggests while you type',
        '+ Scheduled messages: the bot posts announcements by itself on the chosen days and times',
        '+ Counter channels: the channel name shows the member count, online members or players by itself',
      ],
      privatValtozasok: [
        '+ Web dashboard: change the settings with clicks from your phone browser (.env: DASHBOARD_PASSWORD)',
        '+ Custom commands and scheduled messages are created on the dashboard and work without a restart',
        '! The now playing panel needs PRESENCE INTENT turned on in the Discord developer portal',
      ],
    },
  },
  {
    verzio: '2.11.0',
    cim: 'Meghívás-követő és partnerrendszer',
    valtozasok: [
      '+ Meghívás-követő: a bot látja, ki kit hívott meg, /invites és /invitetop ranglista',
      '+ Partnerség: a partner panelen más szerverek kérhetnek partnerséget, /partners lista',
    ],
    privatValtozasok: [
      '+ Jutalomrangok adott számú meghívás után (settings.js: invites.rewards)',
      '+ Partnerkérelmek elbírálása gombokkal, a meghívót a bot ellenőrzi',
      '! A meghívók olvasásához a botnak "Szerver kezelése" jog kell: nyisd meg újra a meghívó linket',
    ],
    en: {
      cim: 'Invite tracker and partner system',
      valtozasok: [
        '+ Invite tracker: the bot sees who invited whom, /invites and /invitetop leaderboard',
        '+ Partnerships: other servers can request a partnership on the partner panel, /partners list',
      ],
      privatValtozasok: [
        '+ Reward roles after a number of invites (settings.js: invites.rewards)',
        '+ Partner requests reviewed with buttons, the bot checks the invite',
        '! Reading invites needs the "Manage Server" permission: open the invite link again',
      ],
    },
  },
  {
    verzio: '2.10.0',
    cim: 'Bump-emlékeztető',
    valtozasok: [
      '+ A bot megköszöni a DISBOARD bumpot, és 2 óra múlva szól, hogy újra lehet bumpolni',
      '+ /bumps: ranglista arról, ki bumpolt a legtöbbet, és mikor jön a következő bump',
    ],
    en: {
      cim: 'Bump reminder',
      valtozasok: [
        '+ The bot thanks you for the DISBOARD bump and reminds everyone 2 hours later that it is time to bump again',
        '+ /bumps: leaderboard of who bumped the most, and when the next bump is',
      ],
    },
  },
  {
    verzio: '2.9.1',
    cim: 'Sapphire bot engedélyezve',
    privatValtozasok: [
      '! A Sapphire bot megbízható lett, a védelem nem lép közbe, amikor rangot ad az új tagoknak',
    ],
    en: {
      cim: 'Sapphire bot allowed',
      privatValtozasok: [
        '! The Sapphire bot is now trusted, the protection does not step in when it gives roles to new members',
      ],
    },
  },
  {
    verzio: '2.9.0',
    cim: 'Erős szervervédelem',
    valtozasok: [
      '+ Raid- és spamvédelem: a szerver mostantól automatikusan védekezik a támadások ellen',
    ],
    privatValtozasok: [
      '+ Raidvédelem: tömeges belépésnél raid mód, az új belépők némítása (kirúgás nélkül), riasztás a tulajnak',
      '+ Spamvédelem: üzenetáradat és tömeges pingelés esetén törlés és némítás',
      '+ Szigorú anti-nuke: a Founder és Ügyfélszolgálat rang alatt (és minden idegen botnál) semmilyen szervermódosítás nem engedélyezett, a bot azonnal visszacsinálja és büntet',
      '+ Nem engedélyezett botok kirúgása, veszélyes jogok és rangok automatikus visszavonása',
      '+ /security: állapot, megbízható lista, raid mód, zárolás',
      '! FONTOS: a bot rangja legyen a legfelső, a megbízható adminokat vedd fel a /security whitelist-add paranccsal',
    ],
    en: {
      cim: 'Strong server protection',
      valtozasok: [
        '+ Raid and spam protection: the server now defends itself against attacks automatically',
      ],
      privatValtozasok: [
        '+ Raid protection: raid mode on mass joins, new joiners timed out (no kicks), alert to the owner',
        '+ Spam protection: deletes and times out on message floods and mass mentions',
        '+ Strict anti-nuke: below the Founder and Support roles (and for every other bot) no server change is allowed, the bot reverts it and punishes immediately',
        '+ Unapproved bots are kicked, dangerous permissions and roles are reverted automatically',
        '+ /security: status, trusted list, raid mode, lockdown',
        '! IMPORTANT: put the bot role at the top and add trusted admins with /security whitelist-add',
      ],
    },
  },
  {
    verzio: '2.8.0',
    cim: 'Minden funkció megújult',
    valtozasok: [
      '+ Javaslatdoboz: sorszám, állapot, "Átgondolás alatt" döntés és beszélgetőszál minden ötlethez',
      '+ Klipfal: /cliptop toplista az elmúlt 7 vagy 30 nap legjobb klipjeivel, és kommentszál minden kliphez',
      '+ Rangválasztó: lenyíló menü és "csak egy választható" mód',
      '+ Saját hangszobák: elrejtés, tulajdonjog átadása és állapotkijelzés a panelen',
      '+ Szebb üdvözlés és búcsúüzenet, kategorizált /help, új /userinfo parancs',
    ],
    privatValtozasok: [
      '+ Moderáció: /warn, /warnings, /clearwarns, sorszámozott esetek, automatikus némítás 3 figyelmeztetés után',
      '+ /purge egy tag üzeneteire szűrve, szebb moderációs napló és privát értesítés',
      '+ /changelog: előnézet Közzététel és Mégse gombbal, verziószám és kép',
      '+ /createcategory csatornákkal együtt, /createchannel leírással, lassított móddal és létszámmal',
      '! A beszélgetőszálakhoz új jog kell: nyisd meg újra a meghívó linket a README-ből',
    ],
    en: {
      cim: 'Every feature got an upgrade',
      valtozasok: [
        '+ Suggestion box: numbers, status, "under consideration" decision and a discussion thread for every idea',
        '+ Clip wall: /cliptop leaderboard with the best clips of the last 7 or 30 days, and a comment thread for every clip',
        '+ Role picker: dropdown menu and "only one" mode',
        '+ Personal voice rooms: hide, transfer ownership and a status display on the panel',
        '+ Nicer welcome and goodbye messages, grouped /help, new /userinfo command',
      ],
      privatValtozasok: [
        '+ Moderation: /warn, /warnings, /clearwarns, numbered cases, automatic timeout after 3 warnings',
        '+ /purge filtered to one member, nicer moderation log and DM notice',
        '+ /changelog: preview with Publish and Cancel buttons, version number and image',
        '+ /createcategory with channels inside, /createchannel with description, slowmode and user limit',
        '! Discussion threads need a new permission: open the invite link from the README again',
      ],
    },
  },
  {
    verzio: '2.7.0',
    cim: 'Megújult csapatkereső',
    valtozasok: [
      '+ Tartaléklista: ha a csapat tele van, beállhatsz tartaléknak, és ha valaki kilép, automatikusan bekerülsz',
      '+ A szervező elindíthatja a csapatot kevesebb emberrel, kivehet tagot és módosíthatja a létszámot',
      '+ Szebb kártya: játékonkénti szín, foglaltságjelző sáv és állapot',
      '! Indítás után a kártya aktív marad, az új tagok belépési jogot kapnak a hangszobához',
      '+ A ticketek, kártyák és panelek annak a nyelvén jelennek meg, aki létrehozta őket (magyar vagy angol)',
    ],
    en: {
      cim: 'Improved group finder',
      valtozasok: [
        '+ Reserve list: if the group is full, join as a reserve and get in automatically when someone leaves',
        '+ The host can start with fewer people, remove members and change the group size',
        '+ Nicer card: colour per game, progress bar and status',
        '! After starting, the card stays active and new members get access to the voice room',
        '+ Tickets, cards and panels appear in the language of whoever created them (Hungarian or English)',
      ],
    },
  },
  {
    verzio: '2.6.0',
    cim: 'Angol nyelv',
    valtozasok: [
      '+ A bot mostantól angolul is beszél: mindenkinek a saját Discord-nyelvén válaszol',
      '+ A parancsok neve és leírása is magyar vagy angol, a Discord nyelvétől függően',
    ],
    privatValtozasok: [
      '+ settings.js: language beállítás a közös üzenetek nyelvéhez (hu vagy en)',
      '! A parancsok alapneve angol lett, magyar Discordon a megszokott magyar nevek látszanak',
    ],
    en: {
      cim: 'English language',
      valtozasok: [
        "+ The bot now speaks English too: it replies in each member's own Discord language",
        '+ Command names and descriptions are in Hungarian or English, based on your Discord language',
      ],
      privatValtozasok: [
        '+ settings.js: language setting for shared messages (hu or en)',
        '! Commands now have English base names, Hungarian Discord still shows the Hungarian names',
      ],
    },
  },
  {
    verzio: '2.5.1',
    cim: 'Szebb ticketek',
    valtozasok: [
      '+ Áttekinthetőbb ticket üzenet: üdvözlés, adatok egy sorban és állapotjelzés',
      '+ Értesítést kapsz, amikor valaki a csapatból átveszi a ticketedet',
      '! A ticket csatorna leírása olvasható lett',
    ],
  },
  {
    verzio: '2.5.0',
    cim: 'Megújult ticket rendszer',
    valtozasok: [
      '+ Minden ticket sorszámot kap, pl. ticket-0042',
      '+ Nyitáskor a ticket típusától függő kérdéseket kapsz, így gyorsabban tudunk segíteni',
      '+ Ha egy ticketbe sokáig nem ír senki, a bot megkérdezi, kell-e még, és ha nem jön válasz, lezárja',
    ],
    privatValtozasok: [
      '+ /ticket-statisztika: átvételek, lezárások, átlagos átvételi és megoldási idő',
      '+ A ticket mentése böngészőben megnyitható HTML fájl lett',
      '! A ticket panelt érdemes újra kirakni a /ticket-panel paranccsal',
    ],
  },
  {
    verzio: '2.4.2',
    cim: 'PM2 beállítás',
    privatValtozasok: [
      '+ ecosystem.config.js: a bot PM2-vel stabilabban fut, összeomlás után magától újraindul',
      '+ Frissítés egy paranccsal: npm run update',
    ],
  },
  {
    verzio: '2.4.1',
    cim: 'A bot nem hoz létre csatornákat',
    privatValtozasok: [
      '! A bot többé nem hoz létre csatornát vagy kategóriát, csak megkeresi a meglévőket',
      '! A klipek, ötletek és ideiglenes szobák csatornáit azonosító alapján ismeri fel, átnevezés után is',
      '! A hangszobák a te kategóriádban és létrehozó csatornádban működnek',
    ],
  },
  {
    verzio: '2.4.0',
    cim: 'Klipfal és javaslatdoboz',
    valtozasok: [
      '+ /klip: oszd meg a legjobb játékklipedet, a többiek 🔥 reakcióval szavazhatnak',
      '+ Minden hétfőn este 6-kor kiderül, melyik lett a hét klipje',
      '+ /otlet: küldd be az ötleted, a többiek szavazhatnak rá, a csapat pedig válaszol',
    ],
  },
  {
    verzio: '2.3.0',
    cim: 'Csapatkereső és saját hangszobák',
    valtozasok: [
      '+ /lfg: keress csapatot, és ha megtelik, a bot privát hangszobát nyit nektek',
      '+ Saját hangszoba: lépj be a Szoba létrehozása csatornába',
      '+ A szobádat gombokkal átnevezheted, lezárhatod, és beállíthatod a létszámát',
    ],
  },
  {
    verzio: '2.2.0',
    cim: 'Tulaj parancsok',
    privatValtozasok: [
      '+ /createcategory: új kategória, kérhető csak egy rangnak látható',
      '+ /createchannel: új szöveges vagy hangcsatorna',
      '+ A privát frissítések mostantól ide kerülnek, a nyilvánosak a Changelogba',
    ],
  },
  {
    verzio: '2.1.0',
    cim: 'Automatikus changelog',
    valtozasok: [
      '+ A bot mostantól magától bejelenti a saját frissítéseit ebben a csatornában',
    ],
  },
  {
    verzio: '2.0.0',
    cim: 'Nagy frissítés',
    valtozasok: [
      '+ Ticket kategóriák, átvétel gomb és lezárási indok',
      '+ Rangválasztó panel a játékrangokhoz',
      '+ Moderációs parancsok és napló',
      '+ Üdvözlő üzenet és alaprang új tagoknak',
      '+ /help, /ping és /szerverinfo parancs',
      '! Rendezettebb felépítés és érthetőbb hibaüzenetek',
    ],
  },
];
