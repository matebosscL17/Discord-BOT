// A bot frissítései, a legújabb legyen legfelül.
// Induláskor a bot a még ki nem tett verziókat beírja a Changelog csatornába.
// A "valtozasok" a nyilvános Changelog csatornába, a "privatValtozasok" a logs csatornába kerül.
// Bármelyik elhagyható. A sorok elején a + zöld, a - piros, a ! sárga ikon lesz.
// Az "en" rész nem kötelező: ha a settings.js-ben language: 'en', ezt használja helyette.
module.exports = [
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
