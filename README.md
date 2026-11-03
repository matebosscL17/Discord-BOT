# Discord bot: Changelog és Ticket

## Parancsok
- `/changelog`: űrlapot nyit, majd szép üzenetben kirakja a frissítést a Changelog csatornába.
- `/ticket-panel`: kirak egy gombot abba a csatornába, ahol futtatod. Erre kattintva nyílik a privát ticket.

Mindkettőt csak a "Szerver kezelése" joggal rendelkezők látják.
A ticketet a nyitója, a support rang és a csatornakezelő jogúak zárhatják le. Lezáráskor a csatorna törlődik, másolat nem készül róla.

## 1. Bot létrehozása
1. Nyisd meg: https://discord.com/developers/applications
2. **New Application**, adj neki nevet.
3. A **General Information** oldalon másold ki az **Application ID**-t.
4. A **Bot** oldalon nyomd meg a **Reset Token** gombot, és másold ki a tokent.

A token olyan, mint egy jelszó: aki megszerzi, átveszi a botot. Ne küldd el senkinek, és ne töltsd fel nyilvános helyre.

## 2. Meghívás a szerverre
Az alábbi linkben cseréld ki az `APP_ID` részt az Application ID-ra, és nyisd meg a böngészőben:

https://discord.com/oauth2/authorize?client_id=APP_ID&scope=bot+applications.commands&permissions=268553232

A linkben szereplő jogok: csatornák megtekintése és kezelése, rangok kezelése, üzenetküldés, linkek beágyazása, fájl csatolása, előzmények olvasása.

Ezután a szerver beállításaiban (**Rangok**) húzd a bot rangját a support rang fölé.

## 3. Azonosítók kimásolása
1. Discordban: **Felhasználói beállítások > Haladó > Fejlesztői mód** bekapcsolása.
2. Jobb klikk a szerverre, a Changelog csatornára és a support rangra, majd **Azonosító másolása**.

## 4. Beállítás
Másold le a `.env.example` fájlt `.env` néven, és töltsd ki:

| Név | Mi ez |
| --- | --- |
| `DISCORD_TOKEN` | a bot tokenje |
| `GUILD_ID` | a szerver azonosítója |
| `CHANGELOG_CHANNEL_ID` | a Changelog csatorna azonosítója |
| `SUPPORT_ROLE_ID` | a ticketeket kezelő rang azonosítója |
| `TICKET_CATEGORY_ID` | nem kötelező: a ticketek kategóriája |

Ha a hosting panelen van "Environment variables" vagy "Startup" rész, inkább ott add meg ezeket, és ne tölts fel `.env` fájlt.

## 5. Feltöltés hostingra
1. Regisztrálj egy Node.js-t támogató bot hostingra, és hozz létre egy szervert **Node.js 22** verzióval.
2. Töltsd fel az `index.js`, `package.json` és `.env` fájlokat. A `node_modules` mappát nem kell.
3. Ha a panel nem telepít magától, futtasd: `npm install`
4. Indítási parancs: `npm start`

Sikeres indításnál a konzolban ez látszik: `A bot elindult: ...`

## 6. Első próba
1. Futtasd a `/changelog` parancsot, és nézd meg a Changelog csatornát.
2. Futtasd a `/ticket-panel` parancsot, nyiss egy ticketet, majd zárd le.

## Ha valami nem megy
- **`Hiányzó beállítás`**: üres vagy rossz nevű sor van a beállításokban.
- **`TokenInvalid` / `An invalid token was provided`**: rossz a token, kérj újat a Reset Tokennel.
- **`Valami hiba történt` ticket nyitásakor**: a bot nem kapott meg minden jogot, vagy a rangja a support rang alatt van.
- **Nem jelennek meg a parancsok**: rossz a `GUILD_ID`, vagy a bot meghívásakor kimaradt az `applications.commands`. Próbáld a Discord újraindításával is.
