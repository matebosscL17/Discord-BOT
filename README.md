# Discord bot 2.0

Moduláris Discord bot. Minden funkció külön fájl a `src/modules` mappában.

## Nyelvek

A bot magyarul és angolul is működik:
- **A tagoknak szóló válaszok** a tag saját Discord-nyelvét követik: magyar Discordon magyarul, minden más nyelvnél angolul.
- **A parancsok neve és leírása** is így jelenik meg. Magyar Discordon például `/nemit`, angolon `/mute`. A zárójelben a magyar név szerepel.
- **A közös üzenetek** annak a nyelvén jelennek meg, aki létrehozza őket: a ticket a nyitója nyelvén, a csapatkereső-kártya a szervezőén, a klip- és ötletkártya a beküldőén, a panelek és a `/changelog` bejelentés az őket kirakó adminén. A későbbi frissítések (átvétel, tartalék, döntés, emlékeztető) is ezen a nyelven kerülnek rájuk.
- Egy üzenetet a Discord mindenkinek ugyanúgy mutat, ezért egy közös üzenet nem lehet nézőnként más nyelvű.
- **Ahol nincs kezdeményező** (üdvözlés, napló, automatikus bejelentések, saját hangszobák), ott a `settings.js` fájl `language` beállítása él: `'hu'` vagy `'en'`.

Ha `'en'`-re váltasz, a `settings.js` szövegeinek (kategóriák, kérdések, panel, üdvözlés) az angol változata (`...En` mezők) jelenik meg. A `frissitesek.js` bejegyzéseihez is írhatsz `en` részt.

## Parancsok

| Parancs | Mit csinál | Ki használhatja |
| --- | --- | --- |
| `/changelog` | Bejelentés előnézettel, típussal, verzióval, képpel és opcionális pinggel | Szerver kezelése jog |
| `/ticket-panel` | Ticket gombok kategóriánként | Szerver kezelése jog |
| `/ticket add`, `/ticket remove` (`hozzaad`, `eltavolit`) | Tag kezelése a ticketben | Support rang |
| `/ticket-stats` (`/ticket-statisztika`) | Ticket és csapat statisztika | Support rang |
| `/rolepanel` (`/rangpanel`) | Rangválasztó gombokkal vagy lenyíló menüvel, "csak egy" móddal | Rangok kezelése jog |
| `/kick`, `/ban`, `/unban` | Kirúgás, kitiltás, feloldás, esetszámmal | Megfelelő jog |
| `/mute`, `/unmute` (`/nemit`, `/nemitas-fel`) | Némítás és feloldása | Tagok moderálása jog |
| `/warn`, `/warnings`, `/clearwarns` (`/figyelmeztet`, `/figyelmeztetesek`, `/figyelmeztetes-torles`) | Figyelmeztetések, 3 után automatikus némítás | Tagok moderálása jog |
| `/purge` (`/torles`) | 1-100 üzenet törlése, akár csak egy tagtól | Üzenetek kezelése jog |
| `/lfg` | Csapatkereső tartaléklistával és szervezői gombokkal | Mindenki |
| `/clip` (`/klip`) | Klip beküldése a klipfalra, kommentszállal | Mindenki |
| `/cliptop` (`/kliptop`) | Az elmúlt 7 vagy 30 nap legjobb klipjei | Mindenki |
| `/suggest` (`/otlet`) | Ötlet beküldése sorszámmal és beszélgetőszállal | Mindenki |
| `/bumps` (`/bumpok`) | Bump ranglista és a következő bump ideje | Mindenki |
| `/security` (`/vedelem`) | Védelem állapota, megbízható lista, raid mód, zárolás | Tulajok és megbízhatók |
| `/createcategory`, `/createchannel` | Kategória csatornákkal, csatorna leírással és lassított móddal | Csak tulajok |
| `/help`, `/ping`, `/serverinfo` (`/szerverinfo`), `/userinfo` (`/taginfo`) | Kategorizált súgó és adatok | Mindenki |

A ticketek sorszámot kapnak (pl. `🐞•ticket-0042`), és nyitáskor a kategóriától függő kérdéseket tesznek fel. A kérdéseket a `settings.js` fájl `ticketCategories` részében írhatod át, kategóriánként legfeljebb 5-öt.

A ticketben van átvétel gomb és lezárási indok. Lezáráskor a bot naplóz, és megpróbál privát üzenetet küldeni a ticket nyitójának. Ha `ENABLE_TRANSCRIPT=true`, a naplóba böngészőben megnyitható HTML mentés is kerül.

Ha egy ticketbe 24 óráig senki nem ír, a bot megkérdezi, kell-e még. Ha utána újabb 24 óráig nincs válasz, lezárja. Az időket a `settings.js` fájl `ticketInactivity` részében állíthatod.

A sorszám és a statisztika a `data` mappában van. Ezt ne töröld.
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

https://discord.com/oauth2/authorize?client_id=APP_ID&scope=bot+applications.commands&permissions=1409574628566

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

`/lfg jatek:CS2 letszam:5` kirak egy kártyát. Ha van a játékkal egyező nevű rang, csak a tagjai csatlakozhatnak. Amikor megtelik, a bot privát hangszobát nyit a csapatnak.

- **Tartaléklista:** ha a csapat tele van, a **Tartaléknak** gombbal sorba lehet állni (alapból legfeljebb 5 fő). Ha valaki kilép vagy a szervező kiveszi, a következő tartalék automatikusan bekerül, és belépési jogot kap a hangszobához.
- **Szervezői gombok:** **Indítás most** (legalább 2 fővel), **Tag kivétele**, **Létszám** (2-10), **Lezárás**. Ezeket csak a szervező és az Üzenetek kezelése joggal rendelkezők használhatják.
- Indítás után a kártya aktív marad, amíg a szervező le nem zárja, vagy le nem jár. A kártya 3 óra után lejár.

A játékokat, a színeket és a tartaléklimitet a `settings.js` fájl `lfgGames` és `lfgMaxReserves` sorában írhatod át.

## Saját hangszobák

A kategóriát és a létrehozó hangcsatornát **neked kell létrehoznod**, a bot ezeket csak megkeresi. Alapból név alapján: a kategória neve **I D E I G L E N E S V C**, a hangcsatornáé **➕ • Szoba létrehozása** (a szóközök, emojik és kis-nagybetűk nem számítanak). Biztosabb, ha a `settings.js` fájl `tempVoice` részében megadod a `categoryId` és `hubId` értékét. Az első megtalálás után a bot megjegyzi az azonosítókat, így utána átnevezheted és áthelyezheted őket. Amíg nincsenek meg, a hangszobák nem működnek, és a bot ezt kiírja a konzolba. Aki belép ide, saját szobát kap. A szoba chatjében gombokkal állítható a név, a létszám, a zárás, valamint kirúgható vagy beengedhető egy tag. Ha a szoba kiürül, törlődik.

A tagok saját szobáit a bot hozza létre ebben a kategóriában. Ide ne tegyél más hangcsatornát, mert a bot törli, ha üres. A `data` mappát ne töröld. Ha mégis elveszne, add meg a `settings.js` fájl `tempVoice` részében a `categoryId` és `hubId` értékét.

## Klipfal

`/klip link:... cim:...` kirakja a klipet a klipek csatornába. Ennek azonosítója a `settings.js` fájl `clips.channelId` sorában van. Ide csak a bot ír, a tagok 🔥 reakcióval szavaznak. Minden hétfőn 18:00-kor a bot kihirdeti az előző hét klipjét, a saját szavazat nem számít. Az elfogadott oldalakat a `settings.js` fájl `clips` része tartalmazza. A klipet a beküldője és a csapat törölheti.

## Javaslatdoboz

`/otlet szoveg:...` kirak egy kártyát az ötletek csatornába (`settings.js`: `suggestions.channelId`) 👍 és 👎 szavazással. A support rang és a Szerver kezelése joggal rendelkezők indokkal elfogadhatják vagy elutasíthatják. A döntésről a beküldő privát üzenetet kap, ha engedélyezte, és a döntés a naplóba is bekerül.

**A bot semmilyen csatornát vagy kategóriát nem hoz létre magától**, kivéve a ticketeket és a tagok ideiglenes hangszobáit. A klipek és ötletek csatornáját a `settings.js` fájlban add meg (`channelId`).

## Bump-emlékeztető (DISBOARD)

Amikor valaki sikeresen beírja a `/bump` parancsot, a bot megköszöni, és pontosan 2 óra múlva emlékeztet, hogy újra lehet bumpolni. A bot **nem bumpol helyetted**, mert ezt a DISBOARD tiltja, és kitilthatja érte a szervert.

A `settings.js` fájl `bump` részében:
- `channelId`: ide megy az emlékeztető. Ha üres, oda, ahol utoljára bumpoltak.
- `pingRoleId`: ezt a rangot pingeli az emlékeztető, például egy „Bumpoló” rangot.

A számlálás a `data/bump.json` fájlban van, így újraindítás után is tudja, mikor jön a következő bump.

## Biztonság (raidvédelem, anti-nuke)

**Fontos beállítások, különben a védelem nem tud működni:**
1. A szerver beállításaiban (**Rangok**) húzd a bot rangját a **legfelső** helyre. A bot csak a nála alacsonyabb rangú támadókat tudja megállítani.
2. A Discord fejlesztői oldalán a **Bot** fülön kapcsold be a **SERVER MEMBERS INTENT** opciót. Enélkül a bot el sem indul, mert a raidvédelemnek látnia kell a belépéseket.
3. Nyisd meg újra a meghívó linket, mert az ellenőrzési napló olvasásához és a webhookok törléséhez új jog kell.
4. **Ellenőrizd a megbízható rangokat:** a **Founder** és az **Ügyfélszolgálat** rang, valamint minden fölöttük lévő rang megbízható. A `/security status` paranccsal megnézheted, hogy a bot megtalálta-e őket.
5. **A többi botot vedd fel a megbízható listára**, ha meg szeretnéd tartani őket, például: `/security whitelist-add tag:@MásikBot`. Enélkül bármilyen szervermódosításnál a bot kirúgja őket, például ha rangot osztanak ki.

**Mit csinál:**
- **Raidvédelem:** ha 10 másodpercen belül legalább 8 ember lép be, a bot 10 percre raid módba kapcsol, riaszt a naplóban, és privát üzenetet küld a tulajdonosnak. Raid módban az újonnan érkezőket a raid mód végéig némítja. **Senkit nem rúg ki.**
- **Spamvédelem:** 5 másodperc alatt 6 üzenet, vagy egy üzenetben legalább 5 említés esetén a bot törli az üzeneteket, és 10 percre némít. A megbízhatókra és az Üzenetek kezelése joggal rendelkezőkre nem vonatkozik.
- **Anti-nuke, szigorú mód (alapértelmezett):** aki a **Founder** és az **Ügyfélszolgálat** rang alatt van, és minden idegen bot, az **semmilyen szervermódosítást nem végezhet**. Ide tartozik a csatorna és a rang létrehozása, törlése és módosítása, a csatornajogok, a rangkiosztás, a ban, a kick, a becenév és a némítás, a webhook, a bot behívása, a szerverbeállítás és az emoji is. A bot minden ilyen lépést azonnal visszacsinál, ahol a Discord engedi:
  - a törölt csatornát vagy rangot újra létrehozza,
  - a létrehozottat törli,
  - a bant feloldja,
  - a kiosztott rangot visszaveszi,
  - a régi nevet és jogokat visszaállítja.

  Az elkövetőt megbünteti: elveszi minden rangját és 1 órára némítja, idegen botnál pedig kirúgja. A naplóba és neked privát üzenetben is riaszt.
- A kirúgást, a törölt webhookot és a törölt emojit a Discord nem engedi visszacsinálni, ezekről csak riasztás megy. Törölt rang visszaállításakor a tagjait kézzel kell visszaadni.
- A megbízható rangokat a `settings.js` fájl `trustedRoles` sorában állíthatod (név vagy azonosító). Aki ezek valamelyikén vagy fölöttük van, megbízható. Ha `mode: 'limits'`-re állítod, a bot csak a határértékek fölött lép közbe, mint korábban.
- **Botok és veszélyes jogok:** a nem megbízható ember által behívott botot kirúgja. Ha nem megbízható ember adminjogot ad egy rangnak, vagy veszélyes rangot oszt ki, a bot visszacsinálja, és megbünteti.

**Parancsok:** `/security status`, `whitelist-add`, `whitelist-remove`, `raidmode` (be vagy ki), `lockdown` (minden szöveges csatorna zárolása, majd az eredeti állapot visszaállítása).

Minden határérték és büntetés a `settings.js` fájl `security` részében állítható. A megbízható lista és a zárolás állapota a `data/security.json` fájlban van.

## Moderáció

Minden moderációs lépés sorszámot kap (pl. `#12`), ami megjelenik a naplóban, a moderátornak adott válaszban és a tagnak küldött privát üzenetben. A figyelmeztetéseket a `/warnings` paranccsal nézheted meg, a `/clearwarns` paranccsal törölheted (egyesével is, esetszám alapján). A `settings.js` fájl `warnAutoMute` beállítása szerint minden 3. figyelmeztetésnél a bot 60 percre automatikusan némít. Az esetek a `data/mod-cases.json` fájlban vannak.

## Tulaj parancsok

A `/createcategory` és a `/createchannel` parancsot a szerver tulajdonosa használhatja. Más rangot a `settings.js` fájl `ownerRoleIds` listájában adhatsz hozzá, de annak a rangnak Administrator jog is kell, különben a Discord nem mutatja neki a parancsot.

Ha megadsz `lathato_rang` értéket, a kategóriát vagy csatornát csak az a rang látja.

## Futtatás PM2-vel

A PM2 újraindítja a botot, ha összeomlik, és a Termux munkamenet bezárása után is tovább fut.

Első alkalommal:

```bash
npm install -g pm2
cd ~/Discord-BOT
termux-wake-lock
npm run pm2
```

Frissítés: `npm run update`

| Parancs | Mire jó |
| --- | --- |
| `pm2 status` | Fut-e a bot |
| `pm2 logs discord-bot` | A bot naplója, kilépés: Ctrl + C |
| `pm2 restart discord-bot` | Újraindítás |
| `pm2 stop discord-bot` | Leállítás |

A telefon vagy a Termux újraindítása után: `termux-wake-lock`, majd `pm2 resurrect`.

Mellette ne használd az `npm start` parancsot, mert akkor két példány futna.

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
