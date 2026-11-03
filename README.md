# Discord bot 2.0

Moduláris Discord bot. Minden funkció külön fájl a `src/modules` mappában.

## Parancsok

| Parancs | Mit csinál | Ki használhatja |
| --- | --- | --- |
| `/changelog` | Bejelentés típussal, ikonokkal, opcionális pinggel | Szerver kezelése jog |
| `/ticket-panel` | Ticket gombok kategóriánként | Szerver kezelése jog |
| `/ticket hozzaad`, `/ticket eltavolit` | Tag kezelése a ticketben | Support rang |
| `/rangpanel` | Rangválasztó gombok, legfeljebb 10 rang | Rangok kezelése jog |
| `/kick`, `/ban`, `/unban` | Kirúgás, kitiltás, feloldás | Megfelelő jog |
| `/nemit`, `/nemitas-fel` | Némítás és feloldása | Tagok moderálása jog |
| `/torles` | 1-100 üzenet törlése | Üzenetek kezelése jog |
| `/lfg` | Csapatkereső gombokkal, megteltekor privát hangszoba | Mindenki |
| `/createcategory`, `/createchannel` | Kategória és csatorna létrehozása | Csak tulajok |
| `/help`, `/ping`, `/szerverinfo` | Súgó és adatok | Mindenki |

A ticketben van átvétel gomb és lezárási indok. Lezáráskor a bot naplóz, és megpróbál privát üzenetet küldeni a ticket nyitójának.
A `/changelog` szövegében a `+` zöld, a `-` piros, a `!` sárga ikon lesz a sor elején.

## Frissítés a régi verzióról

1. Állítsd le a botot.
2. Csomagold ki a zipet, és másold a fájlokat a régiek fölé: `index.js`, `package.json`, `settings.js`, `src` mappa, `README.md`, `.env.example`.
3. A `.env` fájlodhoz ne nyúlj. Ha a hosting panelen adtad meg a beállításokat, azok is maradnak.
4. Futtasd: `npm install`
5. Indítsd el: `npm start`

A régi ticket gombok és a nyitott ticketek tovább működnek. A `/ticket-panel` újbóli futtatásával kapod meg az új, kategóriás gombokat.

### Új jogok a botnak

A moderációhoz több jog kell. Nyisd meg újra a meghívó linket az `APP_ID` kicserélésével, és válaszd ugyanazt a szervert:

https://discord.com/oauth2/authorize?client_id=APP_ID&scope=bot+applications.commands&permissions=1099800112150

A bot rangja legyen minden olyan rang fölött, amit kioszt vagy moderál.

## Első telepítés

### 1. Bot létrehozása
1. Nyisd meg: https://discord.com/developers/applications
2. **New Application**, adj neki nevet.
3. A **General Information** oldalon másold ki az **Application ID**-t.
4. A **Bot** oldalon nyomd meg a **Reset Token** gombot, és másold ki a tokent.

A token olyan, mint egy jelszó. Ne küldd el senkinek, és ne töltsd fel nyilvános helyre.

### 2. Meghívás
Nyisd meg a fenti meghívó linket az `APP_ID` kicserélésével.

### 3. Azonosítók kimásolása
Kapcsold be a **Beállítások > Haladó > Fejlesztői mód** opciót, majd jobb klikk vagy hosszú nyomás a szerverre, csatornára vagy rangra, és **Azonosító másolása**.

### 4. Beállítások
Másold le a `.env.example` fájlt `.env` néven, és töltsd ki, vagy add meg az értékeket a hosting paneljén.

| Név | Kötelező | Mi ez |
| --- | --- | --- |
| `DISCORD_TOKEN` | igen | a bot tokenje |
| `GUILD_ID` | igen | a szerver azonosítója |
| `CHANGELOG_CHANNEL_ID` | igen | a Changelog csatorna |
| `SUPPORT_ROLE_ID` | igen | a ticketeket kezelő rang |
| `TICKET_CATEGORY_ID` | nem | a ticketek kategóriája |
| `LOG_CHANNEL_ID` | nem | a napló csatornája |
| `CHANGELOG_PING_ROLE_ID` | nem | a `/changelog` által pingelt rang |
| `WELCOME_CHANNEL_ID` | nem | az üdvözlő csatorna |
| `AUTO_ROLE_ID` | nem | az új tagok alaprangja |
| `ENABLE_TRANSCRIPT` | nem | `true`: lezáráskor szövegfájl a ticketről a naplóba |

A `.env` fájlt soha ne töltsd fel GitHubra.

### Discord intentek
A fejlesztői oldal **Bot** fülén a **Privileged Gateway Intents** résznél kapcsold be:
- **SERVER MEMBERS INTENT**, ha használod a `WELCOME_CHANNEL_ID` vagy `AUTO_ROLE_ID` beállítást.
- **MESSAGE CONTENT INTENT**, ha `ENABLE_TRANSCRIPT=true`.

Ha ezek nélkül indítod, a bot leáll, és kiírja, mit kell bekapcsolnod.

### 5. Indítás
A bothoz **Node.js 22** ajánlott.

```bash
npm install
npm start
```

Sikeres indításkor ez jelenik meg: `A bot elindult: ...`

## Automatikus changelog

Induláskor a bot megnézi a `frissitesek.js` fájlt, és a még ki nem tett verziókat beírja a Changelog csatornába. Azt, hogy mi ment már ki, a két csatorna utolsó 100-100 üzenetéből állapítja meg, ezért újraindításkor nem ismétel.

A `valtozasok` sorai a nyilvános Changelog csatornába, a `privatValtozasok` sorai a logs csatornába kerülnek.

Új frissítésnél a lista **elejére** kell felvenni egy új bejegyzést, új verziószámmal. Ha a `frissitesek.js` fájlt üresre állítod, vagy törlöd a `src/modules/auto-changelog.js` fájlt, a funkció nem fut.

## Csapatkereső

`/lfg jatek:CS2 letszam:5` kirak egy kártyát csatlakozás gombbal. Ha van a játékkal egyező nevű rang, csak a tagjai csatlakozhatnak. Amikor megtelik, a bot privát hangszobát nyit a csapatnak. A játékokat a `settings.js` fájl `lfgGames` listájában írhatod át. Minden kártya 3 óra után lejár.

## Saját hangszobák

A bot indításkor létrehoz egy **🔊 • Ideiglenes szobák** kategóriát és benne a **➕ • Szoba létrehozása** csatornát. Aki belép ide, saját szobát kap. A szoba chatjében gombokkal állítható a név, a létszám, a zárás, valamint kirúgható vagy beengedhető egy tag. Ha a szoba kiürül, törlődik.

Ebbe a kategóriába ne tegyél saját hangcsatornát, mert a bot törli, ha üres. Ha átnevezed a kategóriát, a `settings.js` fájlban is írd át, különben indításkor újat hoz létre.

## Tulaj parancsok

A `/createcategory` és a `/createchannel` parancsot a szerver tulajdonosa használhatja. Más rangot a `settings.js` fájl `ownerRoleIds` listájában adhatsz hozzá, de annak a rangnak Administrator jog is kell, különben a Discord nem mutatja neki a parancsot.

Ha megadsz `lathato_rang` értéket, a kategóriát vagy csatornát csak az a rang látja.

## Testreszabás

A `settings.js` fájlban átírhatod a színeket, a szövegeket, a ticket kategóriákat és a rangok ikonjait. Utána indítsd újra a botot.

Egy funkciót úgy kapcsolhatsz ki, hogy kitörlöd a fájlját a `src/modules` mappából. Új `.js` fájl ebben a mappában automatikusan betöltődik.

## Példa rangválasztóra

```text
/rangpanel rang1:@Minecraft rang2:@CS2 rang3:@Valorant rang4:@GTA V rang5:@Roblox
```

Moderátori joggal rendelkező rangot a bot biztonsági okból nem tesz gombra.

## Ha valami nem megy

- **`Hiányzó beállítás`**: üres vagy rossz nevű sor van a beállításokban.
- **`Rossz a token`**: kérj újat a Reset Token gombbal.
- **`A botnak nincs ehhez joga`**: nyisd meg újra a meghívó linket, és húzd feljebb a bot rangját.
- **Nem jelennek meg a parancsok**: ellenőrizd a `GUILD_ID` értékét, és indítsd újra a Discordot.
