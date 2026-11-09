// A vezérlőpult oldalai. Minden szöveg a böngészőben, textContent-tel kerül ki, így a beírt adatokból nem lehet kódot futtatni.
const STYLE = `
:root{--bg:#111214;--panel:#1e1f22;--card:#2b2d31;--line:#3f4147;--text:#dbdee1;--muted:#949ba4;--accent:#5865f2;--ok:#23a55a;--warn:#f0b232;--bad:#da373c}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--text);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:#00a8fc}button,input,select,textarea{font:inherit;color:inherit}
header{position:sticky;top:0;z-index:5;background:var(--panel);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;align-items:center;gap:10px}
header img{width:32px;height:32px;border-radius:50%}header b{font-size:16px}header span{color:var(--muted);font-size:12px;display:block}
nav{display:flex;gap:6px;overflow-x:auto;padding:10px 16px;background:var(--panel);border-bottom:1px solid var(--line);scrollbar-width:none}
nav button{flex:none;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 12px;cursor:pointer;white-space:nowrap}
nav button.on{background:var(--accent);border-color:var(--accent);color:#fff}
main{max-width:760px;margin:0 auto;padding:16px 16px 120px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:12px}
.field{padding:10px 0;border-bottom:1px solid var(--line)}.field:last-child{border-bottom:0}
.field>label{display:block;font-weight:600;margin-bottom:6px}.hint{color:var(--muted);font-size:13px;margin-top:4px}
input[type=text],input[type=number],input[type=time],input[type=password],select,textarea{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px 10px}
textarea{min-height:76px;resize:vertical}
.switch,.field>label.switch{display:flex;align-items:center;gap:10px;cursor:pointer;margin:0}.switch input{width:22px;height:22px;accent-color:var(--accent)}
.chips{display:flex;flex-wrap:wrap;gap:6px;max-height:220px;overflow:auto;padding:4px;background:var(--bg);border:1px solid var(--line);border-radius:8px}
.chip{display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:4px 10px;cursor:pointer;font-size:14px}
.chip input{accent-color:var(--accent)}.dot{width:10px;height:10px;border-radius:50%;flex:none}
.row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-bottom:12px;padding-bottom:12px;border-bottom:1px dashed var(--line)}.row>*:first-child{grid-column:1/-1}
.item{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:10px;display:grid;gap:8px}
.item .top{display:flex;gap:8px;align-items:center}.item .top>*:first-child{flex:1}
.days{display:flex;gap:4px;flex-wrap:wrap}.days label{border:1px solid var(--line);border-radius:8px;padding:5px 9px;cursor:pointer;font-size:13px}
.days input{display:none}.days label.on{background:var(--accent);border-color:var(--accent);color:#fff}
.btn{background:var(--accent);border:0;border-radius:8px;color:#fff;padding:10px 14px;cursor:pointer;font-weight:600}
.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--text)}.btn.bad{background:var(--bad)}.btn.small{padding:6px 10px;font-size:13px}
.btn:disabled{opacity:.5;cursor:default}
.bar{position:fixed;left:0;right:0;bottom:0;z-index:6;background:var(--panel);border-top:1px solid var(--line);padding:12px 16px;display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
.bar .msg{flex:1 1 100%;color:var(--muted);font-size:14px}.bar .btn{flex:1 1 0}
@media(min-width:640px){.bar .msg{flex:1 1 auto}.bar .btn{flex:none}}
.note{border-left:4px solid var(--warn);background:#2a2618;padding:10px 12px;border-radius:8px;margin-bottom:12px;font-size:14px}
.ok{border-left-color:var(--ok);background:#18291f}
.overlay{position:fixed;inset:0;z-index:9;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-size:17px}
.login{max-width:360px;margin:12vh auto;padding:0 16px}.login h1{font-size:22px;margin:0 0 6px}.login p{color:var(--muted);margin:0 0 16px}
.login form{display:grid;gap:10px}.err{color:#ff8a8d;font-size:14px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.stats div{background:var(--bg);border-radius:10px;padding:10px}.stats span{display:block;color:var(--muted);font-size:12px}
`;

function loginPage(error) {
  const message = error === 'wrong' ? 'Hibás jelszó. / Wrong password.' : error === 'wait' ? 'Túl sok próbálkozás, várj 5 percet. / Too many attempts, wait 5 minutes.' : '';
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bot vezérlőpult</title><style>${STYLE}</style></head><body><div class="login">
<h1>🤖 Bot vezérlőpult</h1><p>Lépj be a .env fájlban megadott DASHBOARD_PASSWORD jelszóval.</p>
<form method="post" action="/login"><input type="password" name="password" placeholder="Jelszó / Password" autocomplete="current-password" required autofocus>
<button class="btn" type="submit">Belépés / Log in</button>${message ? `<div class="err">${message}</div>` : ''}</form></div></body></html>`;
}

const SCRIPT = String.raw`
const HU = (navigator.language || '').toLowerCase().startsWith('hu');
const L = HU ? 0 : 1;
const T = {
  save: ['Mentés és újraindítás', 'Save and restart'], saveOnly: ['Csak mentés', 'Save only'],
  changes: ['{n} módosítás vár mentésre', '{n} unsaved changes'], noChanges: ['Nincs mentetlen módosítás', 'No unsaved changes'],
  saved: ['Elmentve. A következő újraindításkor lép életbe.', 'Saved. It takes effect on the next restart.'],
  restarting: ['A bot újraindul, egy pillanat...', 'The bot is restarting, one moment...'],
  noPm2: ['A bot nem PM2-vel fut, ezért mentés után nem indul újra magától. Indítsd el kézzel (npm start), vagy használd az npm run pm2 parancsot.', 'The bot is not running under PM2, so it will not start again by itself after saving. Start it manually (npm start) or use npm run pm2.'],
  rescue: ['⚠️ A bot most nem fut: nem tudott belépni a Discordba, mert egy intent nincs bekapcsolva a fejlesztői oldal Bot fülén (pl. PRESENCE INTENT a Most játszik panelhez). Kapcsold be ott, vagy kapcsold ki itt a funkciót, majd nyomd meg a Mentés és újraindítás gombot.', '⚠️ The bot is not running: it could not log in to Discord because an intent is not turned on in the developer portal Bot tab (e.g. PRESENCE INTENT for the now playing panel). Turn it on there, or turn the feature off here, then press Save and restart.'],
  pending: ['Van elmentett, de még újraindításra váró módosítás.', 'There are saved changes waiting for a restart.'],
  none: ['— nincs beállítva —', '— not set —'], add: ['+ Hozzáadás', '+ Add'], remove: ['Törlés', 'Remove'],
  commands: ['⌨️ Egyedi parancsok', '⌨️ Custom commands'], schedules: ['⏰ Időzített üzenetek', '⏰ Scheduled messages'], status: ['📊 Állapot', '📊 Status'],
  cmdHelp: ['A tagok így használják: /info név. Mentés után azonnal működik, újraindítás nélkül.', 'Members use it like this: /info name. Works right after saving, no restart needed.'],
  cmdName: ['Név (kisbetű, szóköz nélkül, pl. ip)', 'Name (lowercase, no spaces, e.g. ip)'], cmdTitle: ['Cím (nem kötelező)', 'Title (optional)'], cmdText: ['Válasz szövege', 'Reply text'],
  cmdPrivate: ['Csak a kérdező lássa', 'Only the asker sees it'], saveList: ['Mentés', 'Save'], listSaved: ['Elmentve, már él.', 'Saved, it is live now.'],
  schHelp: ['Budapesti idő szerint, a kiválasztott napokon. Mentés után azonnal működik.', 'In Budapest time, on the selected days. Works right after saving.'],
  schChannel: ['Csatorna', 'Channel'], schTime: ['Időpont', 'Time'], schTitle: ['Cím (nem kötelező)', 'Title (optional)'], schText: ['Üzenet', 'Message'],
  schPing: ['Ping rang (nem kötelező)', 'Ping role (optional)'], schOn: ['Bekapcsolva', 'On'],
  days: [['V','H','K','Sze','Cs','P','Szo'], ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']],
  bot: ['Bot', 'Bot'], ping: ['Válaszidő', 'Latency'], uptime: ['Üzemidő', 'Uptime'], logout: ['Kijelentkezés', 'Log out'], restartNow: ['Újraindítás most', 'Restart now'],
  rewardCount: ['Meghívás', 'Invites'], rewardHint: ['Felül a rang, alatta hány meghívás kell hozzá.', 'The role on top, below it how many invites it needs.'], counterTpl: ['Név, pl. 👥 Tagok: {members}', 'Name, e.g. 👥 Members: {members}'],
  counterHint: ['Helyettesítők: {members} {humans} {bots} {online} {boosts} {playing}. Hangcsatornát érdemes választani.', 'Placeholders: {members} {humans} {bots} {online} {boosts} {playing}. A voice channel works best.'],
  listHint: ['Soronként egy.', 'One per line.'], invalid: ['Hibás érték: ', 'Invalid value: '], error: ['Hiba történt, próbáld újra.', 'Something went wrong, try again.'],
};
const t = (key, vars = {}) => T[key][L].replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'checked' || key === 'value' || key === 'disabled' || key === 'selected') el[key] = value;
    else if (value !== false && value !== undefined && value !== null) el.setAttribute(key, value);
  }
  for (const child of children.flat()) if (child !== null && child !== undefined && child !== false) el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return el;
}

let META = null; let ORIGINAL = {}; let VALUES = {}; let TAB = null;
const api = (path, body) => fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dashboard': '1' }, body: JSON.stringify(body) })
  .then(async (r) => { if (r.status === 401) { location.reload(); throw new Error('login'); } const data = await r.json(); if (!r.ok) throw Object.assign(new Error('api'), { data }); return data; });

const changed = () => Object.keys(VALUES).filter((key) => JSON.stringify(VALUES[key]) !== JSON.stringify(ORIGINAL[key]));
function setValue(path, value) { VALUES[path] = value; updateBar(); }

function channelOptions(kind, current) {
  const list = META.guild.channels.filter((c) => !kind || kind === 'any' || c.kind === kind);
  const prefix = { text: '#', voice: '🔊 ', category: '📁 ' };
  return [h('option', { value: '' }, t('none')), ...list.map((c) => h('option', { value: c.id, selected: c.id === current }, (prefix[c.kind] || '') + c.name))];
}
function roleOptions(current) {
  return [h('option', { value: '' }, t('none')), ...META.guild.roles.map((r) => h('option', { value: r.id, selected: r.id === current }, '@' + r.name))];
}

function renderField(field) {
  const value = VALUES[field.path];
  const label = field.label[L];
  const wrap = h('div', { class: 'field' });
  const set = (v) => setValue(field.path, v);
  switch (field.type) {
    case 'bool':
      wrap.append(h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: Boolean(value), onchange: (e) => set(e.target.checked) }), label));
      return wrap;
    case 'text':
      wrap.append(h('label', {}, label), h('input', { type: 'text', value: value ?? '', maxlength: field.max || 200, oninput: (e) => set(e.target.value) }));
      return wrap;
    case 'textarea':
      wrap.append(h('label', {}, label), h('textarea', { maxlength: field.max || 1000, oninput: (e) => set(e.target.value) }, value ?? ''));
      return wrap;
    case 'number':
      wrap.append(h('label', {}, label), h('input', { type: 'number', value: value ?? 0, min: field.min, max: field.max, oninput: (e) => set(Number(e.target.value)) }));
      return wrap;
    case 'select':
      wrap.append(h('label', {}, label), h('select', { onchange: (e) => set(e.target.value) }, field.options.map(([v, name]) => h('option', { value: v, selected: v === value }, name))));
      return wrap;
    case 'channel':
      wrap.append(h('label', {}, label), h('select', { onchange: (e) => set(e.target.value) }, channelOptions(field.kind, value)));
      return wrap;
    case 'role':
      wrap.append(h('label', {}, label), h('select', { onchange: (e) => set(e.target.value) }, roleOptions(value)));
      return wrap;
    case 'roles': {
      const selected = new Set((value || []).map(String));
      wrap.append(h('label', {}, label), h('div', { class: 'chips' }, META.guild.roles.map((r) => h('label', { class: 'chip' },
        h('input', { type: 'checkbox', checked: selected.has(r.id), onchange: (e) => { e.target.checked ? selected.add(r.id) : selected.delete(r.id); set([...selected]); } }),
        h('span', { class: 'dot', style: 'background:' + (r.color === '#000000' ? '#99aab5' : r.color) }), r.name))));
      return wrap;
    }
    case 'list':
      wrap.append(h('label', {}, label), h('textarea', { oninput: (e) => set(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)) }, (value || []).join('\n')), h('div', { class: 'hint' }, t('listHint')));
      return wrap;
    case 'rewards':
    case 'counters': {
      const rows = h('div');
      const isReward = field.type === 'rewards';
      const draw = () => {
        rows.replaceChildren(...(VALUES[field.path] || []).map((item, index) => {
          const update = (patch) => { const list = [...VALUES[field.path]]; list[index] = { ...list[index], ...patch }; set(list); };
          const removeBtn = h('button', { class: 'btn ghost small', onclick: () => { const list = [...VALUES[field.path]]; list.splice(index, 1); set(list); draw(); } }, t('remove'));
          return isReward
            ? h('div', { class: 'row' }, h('select', { onchange: (e) => update({ roleId: e.target.value }) }, roleOptions(item.roleId)), h('input', { type: 'number', min: 1, value: item.count, placeholder: t('rewardCount'), title: t('rewardCount'), oninput: (e) => update({ count: Number(e.target.value) }) }), removeBtn)
            : h('div', { class: 'row' }, h('select', { onchange: (e) => update({ channelId: e.target.value }) }, channelOptions('any', item.channelId)), h('input', { type: 'text', maxlength: 100, value: item.template, placeholder: t('counterTpl'), oninput: (e) => update({ template: e.target.value }) }), removeBtn);
        }));
      };
      draw();
      wrap.append(h('label', {}, label), rows, h('button', { class: 'btn ghost small', onclick: () => { set([...(VALUES[field.path] || []), isReward ? { count: 5, roleId: '' } : { channelId: '', template: '👥 {members}' }]); draw(); } }, t('add')));
      wrap.append(h('div', { class: 'hint' }, t(isReward ? 'rewardHint' : 'counterHint')));
      return wrap;
    }
    default:
      return wrap;
  }
}

function renderSection(section) {
  return h('div', { class: 'card' }, section.fields.map(renderField));
}

function listEditor({ items, help, makeItem, render, save }) {
  let list = items.map((x) => ({ ...x }));
  const box = h('div');
  const status = h('span', { class: 'hint' });
  const draw = () => box.replaceChildren(...list.map((item, index) => render(item, (patch) => { list[index] = { ...list[index], ...patch }; }, () => { list.splice(index, 1); draw(); })));
  draw();
  return h('div', {},
    h('div', { class: 'note ok' }, help),
    box,
    h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
      h('button', { class: 'btn ghost', onclick: () => { list.push(makeItem()); draw(); } }, t('add')),
      h('button', { class: 'btn', onclick: async () => { status.textContent = '...'; try { const r = await save(list); list = r.list; draw(); status.textContent = t('listSaved'); } catch (e) { status.textContent = t('error'); } } }, t('saveList')),
      status));
}

function renderCommands() {
  return listEditor({
    items: META.commands, help: t('cmdHelp'), makeItem: () => ({ name: '', title: '', response: '', private: false }),
    save: (list) => api('/api/commands', { list }).then((r) => { META.commands = r.list; return r; }),
    render: (item, update, remove) => h('div', { class: 'item' },
      h('div', { class: 'top' }, h('input', { type: 'text', value: item.name, maxlength: 32, placeholder: t('cmdName'), oninput: (e) => update({ name: e.target.value.toLowerCase().replace(/\s+/g, '-') }) }), h('button', { class: 'btn ghost small', onclick: remove }, t('remove'))),
      h('input', { type: 'text', value: item.title, maxlength: 100, placeholder: t('cmdTitle'), oninput: (e) => update({ title: e.target.value }) }),
      h('textarea', { maxlength: 2000, placeholder: t('cmdText'), oninput: (e) => update({ response: e.target.value }) }, item.response),
      h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: item.private, onchange: (e) => update({ private: e.target.checked }) }), t('cmdPrivate'))),
  });
}

function renderSchedules() {
  return listEditor({
    items: META.schedules, help: t('schHelp'),
    makeItem: () => ({ enabled: true, channelId: '', days: [5], time: '18:00', title: '', text: '', pingRoleId: '' }),
    save: (list) => api('/api/schedules', { list }).then((r) => { META.schedules = r.list; return r; }),
    render: (item, update, remove) => {
      const days = new Set(item.days || []);
      const order = [1, 2, 3, 4, 5, 6, 0];
      const dayRow = h('div', { class: 'days' }, order.map((d) => {
        const lab = h('label', { class: days.has(d) ? 'on' : '' }, h('input', { type: 'checkbox', checked: days.has(d), onchange: (e) => { e.target.checked ? days.add(d) : days.delete(d); lab.className = e.target.checked ? 'on' : ''; update({ days: [...days] }); } }), T.days[L][d]);
        return lab;
      }));
      return h('div', { class: 'item' },
        h('div', { class: 'top' }, h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: item.enabled !== false, onchange: (e) => update({ enabled: e.target.checked }) }), t('schOn')), h('button', { class: 'btn ghost small', onclick: remove }, t('remove'))),
        h('select', { onchange: (e) => update({ channelId: e.target.value }) }, channelOptions('text', item.channelId)),
        dayRow,
        h('input', { type: 'time', value: item.time, oninput: (e) => update({ time: e.target.value }) }),
        h('input', { type: 'text', value: item.title, maxlength: 100, placeholder: t('schTitle'), oninput: (e) => update({ title: e.target.value }) }),
        h('textarea', { maxlength: 2000, placeholder: t('schText'), oninput: (e) => update({ text: e.target.value }) }, item.text),
        h('select', { onchange: (e) => update({ pingRoleId: e.target.value }) }, roleOptions(item.pingRoleId)));
    },
  });
}

function renderStatus() {
  const uptime = Math.floor(META.bot.uptime / 60000);
  return h('div', {},
    !META.pm2 ? h('div', { class: 'note' }, t('noPm2')) : null,
    h('div', { class: 'card stats' },
      h('div', {}, h('span', {}, t('bot')), META.bot.tag || '-'),
      h('div', {}, h('span', {}, t('ping')), META.bot.ping + ' ms'),
      h('div', {}, h('span', {}, t('uptime')), Math.floor(uptime / 60) + ' h ' + (uptime % 60) + ' min')),
    h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
      h('button', { class: 'btn ghost', onclick: () => restart('/api/restart', {}) }, t('restartNow')),
      h('form', { method: 'post', action: '/logout' }, h('button', { class: 'btn bad', type: 'submit' }, t('logout')))));
}

const bar = { msg: null, save: null, saveOnly: null };
function updateBar() {
  const n = changed().length;
  bar.msg.textContent = n ? t('changes', { n }) : (META.savedSinceStart ? t('pending') : t('noChanges'));
  bar.save.disabled = !n && !META.savedSinceStart;
  bar.saveOnly.disabled = !n;
}

async function waitForBot() {
  for (let i = 0; i < 60; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    try { const r = await fetch('/api/meta'); if (r.ok || r.status === 401) { location.reload(); return; } } catch (e) { /* még nem él */ }
  }
  location.reload();
}

async function restart(path, body) {
  document.body.append(h('div', { class: 'overlay' }, t('restarting') + (META.pm2 ? '' : '\n\n' + t('noPm2'))));
  try { await api(path, body); } catch (e) { /* a bot közben leállhat */ }
  waitForBot();
}

async function saveSettings(withRestart) {
  const values = Object.fromEntries(changed().map((k) => [k, VALUES[k]]));
  try {
    if (withRestart) { await restart('/api/settings', { values, restart: true }); return; }
    await api('/api/settings', { values, restart: false });
    ORIGINAL = JSON.parse(JSON.stringify(VALUES)); META.savedSinceStart = true; updateBar(); bar.msg.textContent = t('saved');
  } catch (e) {
    bar.msg.textContent = e.data && e.data.fields ? t('invalid') + e.data.fields.join(', ') : t('error');
  }
}

function render() {
  const tabs = [...META.sections.map((s) => ({ id: s.id, label: s.label[L], body: () => renderSection(s) })),
    { id: 'commands', label: t('commands'), body: renderCommands },
    { id: 'schedules', label: t('schedules'), body: renderSchedules },
    { id: 'status', label: t('status'), body: renderStatus }];
  TAB = TAB || tabs[0].id;
  const main = h('main');
  const nav = h('nav');
  const show = (id) => { TAB = id; nav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === id)); main.replaceChildren(tabs.find((x) => x.id === id).body()); window.scrollTo(0, 0); };
  tabs.forEach((tab) => nav.append(h('button', { 'data-id': tab.id, onclick: () => show(tab.id) }, tab.label)));
  bar.msg = h('span', { class: 'msg' });
  bar.saveOnly = h('button', { class: 'btn ghost', onclick: () => saveSettings(false) }, t('saveOnly'));
  bar.save = h('button', { class: 'btn', onclick: () => saveSettings(true) }, t('save'));
  document.body.replaceChildren(...[
    h('header', {}, META.guild.icon ? h('img', { src: META.guild.icon, alt: '' }) : null, h('div', {}, h('b', {}, META.guild.name), h('span', {}, '🤖 ' + (META.bot.tag || '')))),
    nav, META.startupError ? h('div', { class: 'note', style: 'margin:12px 16px 0' }, t('rescue')) : null, main, h('div', { class: 'bar' }, bar.msg, bar.saveOnly, bar.save)].filter(Boolean));
  show(TAB);
  updateBar();
}

api('/api/meta').then((meta) => { META = meta; VALUES = JSON.parse(JSON.stringify(meta.values)); ORIGINAL = JSON.parse(JSON.stringify(meta.values)); render(); })
  .catch(() => { document.body.textContent = t('error'); });
window.addEventListener('beforeunload', (e) => { if (changed().length) { e.preventDefault(); e.returnValue = ''; } });
`;

function appPage() {
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bot vezérlőpult</title><style>${STYLE}</style></head><body><main><p>…</p></main><script>${SCRIPT}</script></body></html>`;
}

module.exports = { loginPage, appPage };
