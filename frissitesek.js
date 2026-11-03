// A bot frissítései, a legújabb legyen legfelül.
// Induláskor a bot a még ki nem tett verziókat beírja a Changelog csatornába.
// A "valtozasok" a nyilvános Changelog csatornába, a "privatValtozasok" a logs csatornába kerül.
// Bármelyik elhagyható. A sorok elején a + zöld, a - piros, a ! sárga ikon lesz.
module.exports = [
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
