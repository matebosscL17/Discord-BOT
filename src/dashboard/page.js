// A vezérlőpult oldalai. Minden beírt adat textContent-tel kerül ki, így abból nem lehet kódot futtatni.
// Téma: "Penthouse éjjel" – sötétkék éjszaka, a játékok tornyaiban felgyulladó ablakok.
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  + '<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Saira+Condensed:wght@500;600;700&display=swap" rel="stylesheet">';

const STYLE = `
:root{
  --night:#151730;--floor:#1d2042;--pane:rgba(29,32,66,.9);--pane-strong:rgba(22,24,52,.93);--glass:#10122a;--rail:#343a6e;--rail-soft:#262a55;
  --window:#f5b947;--window-glow:rgba(245,185,71,.45);--neon:#9d8cff;
  --text:#eceaf7;--dim:#a3a1c6;--ok:#52c98e;--bad:#f06a78;
  --display:"Saira Condensed",sans-serif-condensed,"Roboto Condensed","Arial Narrow",system-ui,sans-serif;--body:"Figtree",system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:ui-monospace,"Cascadia Mono",Menlo,Consolas,monospace;
  color-scheme:dark;
}
*{box-sizing:border-box}
html{background:var(--night)}
body{margin:0;background:transparent;color:var(--text);font:16px/1.5 var(--body);-webkit-text-size-adjust:100%}
canvas.bg{position:fixed;inset:0;z-index:-1;display:block;pointer-events:none}
button,input,select,textarea{font:inherit;color:inherit}
a{color:var(--neon)}
:focus-visible{outline:2px solid var(--window);outline-offset:2px}
h1,h2,h3{font-family:var(--display);font-weight:600;letter-spacing:.01em;line-height:1.1;margin:0}
h2{font-size:30px}h3{font-size:21px}
p{margin:0}
.dim{color:var(--dim)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

/* Váz */
.top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;padding:10px 16px;background:rgba(15,17,40,.72);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--rail-soft)}
.top .who{flex:1;min-width:0}
.top .who b{display:block;font-family:var(--display);font-size:20px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.top .who span{font-size:13px;color:var(--dim)}
.avatar{width:36px;height:36px;border-radius:12px;background:var(--floor);flex:none;object-fit:cover;display:grid;place-items:center;font-family:var(--display);font-weight:700}
.light{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:var(--bad);vertical-align:1px}
.light.on{background:var(--window);box-shadow:0 0 8px var(--window-glow)}
.menu-btn{background:none;border:1px solid var(--rail);border-radius:10px;width:42px;height:42px;display:grid;place-items:center;cursor:pointer}
.menu-btn i,.menu-btn i::before,.menu-btn i::after{display:block;width:18px;height:2px;background:var(--text);border-radius:2px;position:relative}
.menu-btn i::before,.menu-btn i::after{content:"";position:absolute}.menu-btn i::before{top:-6px}.menu-btn i::after{top:6px}

.side{position:fixed;inset:0 auto 0 0;z-index:30;width:min(86vw,300px);background:var(--pane-strong);border-right:1px solid var(--rail-soft);display:flex;flex-direction:column;transform:translateX(-102%);transition:transform .22s ease}
.side.open{transform:none}
.scrim{position:fixed;inset:0;z-index:25;background:rgba(5,6,18,.6);opacity:0;pointer-events:none;transition:opacity .2s}
.scrim.open{opacity:1;pointer-events:auto}
.side .search{padding:16px 16px 8px}
.side input[type=search]{width:100%;background:var(--floor);border:1px solid var(--rail);border-radius:10px;padding:10px 12px}
.side nav{flex:1;overflow:auto;padding:4px 10px 16px}
.side .group{font-size:13px;color:var(--dim);padding:14px 8px 6px}
.side nav button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:0;border-radius:10px;padding:9px 10px;cursor:pointer;color:var(--text)}
.side nav button:hover{background:var(--rail-soft)}
.side nav button.on{background:var(--floor);box-shadow:inset 3px 0 0 var(--window)}
.side nav button .ico{width:22px;text-align:center;flex:none}
.side nav button small{display:block;color:var(--dim);font-size:12px;line-height:1.3}
.side .foot{border-top:1px solid var(--rail-soft);padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.result{display:block;width:100%;text-align:left;background:none;border:0;border-radius:10px;padding:8px 10px;cursor:pointer;color:var(--text)}
.result:hover{background:var(--rail-soft)}.result small{display:block;color:var(--dim);font-size:12px}

main{max-width:780px;margin:0 auto;padding:20px 16px 140px}
@media(min-width:960px){
  .side{transform:none;transition:none}.scrim,.menu-btn{display:none}
  .top,main,.bar,.toasts{margin-left:300px}
  main{padding:28px 32px 140px}
}
.page-head{margin:4px 0 18px}.page-head p{color:var(--dim);margin-top:6px;max-width:60ch}

/* Panelek és mezők */
.panel{background:var(--pane);border:1px solid var(--rail-soft);border-radius:16px;padding:6px 16px;margin-bottom:14px}
.panel.pad{padding:16px}
.field{position:relative;padding:14px 0;border-bottom:1px solid var(--rail-soft)}
.field:last-child{border-bottom:0}
.field.changed::before{content:"";position:absolute;left:-16px;top:12px;bottom:12px;width:3px;border-radius:0 3px 3px 0;background:var(--window)}
.field.flash{animation:flash 1.4s ease}
@keyframes flash{0%,40%{background:rgba(245,185,71,.14)}100%{background:transparent}}
.field-head{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}
.field-head label,.field-head .label{flex:1;font-weight:600}
.revert{background:none;border:0;color:var(--window);font-size:13px;cursor:pointer;padding:0}
.hint{color:var(--dim);font-size:14px;margin-top:6px}
input[type=text],input[type=number],input[type=time],input[type=password],select,textarea{width:100%;background:var(--glass);border:1px solid var(--rail);border-radius:10px;padding:10px 12px;min-height:44px}
textarea{min-height:88px;resize:vertical;line-height:1.45}
select{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--dim) 50%),linear-gradient(135deg,var(--dim) 50%,transparent 50%);background-position:calc(100% - 18px) 50%,calc(100% - 13px) 50%;background-size:5px 5px;background-repeat:no-repeat;padding-right:34px}
input:focus,select:focus,textarea:focus{border-color:var(--neon);outline:none}

.toggle{display:flex;align-items:center;gap:14px;cursor:pointer;font-weight:600}
.toggle input{appearance:none;flex:none;width:46px;height:28px;border-radius:999px;background:var(--rail);position:relative;cursor:pointer;transition:background .15s;margin:0}
.toggle input::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:var(--text);transition:transform .15s}
.toggle input:checked{background:var(--window)}.toggle input:checked::after{transform:translateX(18px);background:var(--night)}
.toggle span{flex:1}

.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--rail);border-radius:999px;padding:6px 12px;cursor:pointer;font-size:15px;user-select:none}
.chip input{position:absolute;opacity:0;pointer-events:none}
.chip.on{border-color:var(--window);background:rgba(245,185,71,.1)}
.chip:focus-within{outline:2px solid var(--window);outline-offset:2px}
.dot{width:10px;height:10px;border-radius:50%;flex:none}

.rows{display:grid;gap:10px}
.row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:12px;background:var(--glass);border-radius:12px}
.row>*:first-child{grid-column:1/-1}

/* Gombok */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;background:var(--window);color:#241a05;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;font-weight:700}
.btn.ghost{background:transparent;color:var(--text);border:1px solid var(--rail)}
.btn.danger{background:transparent;color:var(--bad);border:1px solid rgba(240,106,120,.5)}
.btn.small{min-height:36px;padding:6px 12px;font-size:14px}
.btn:disabled{opacity:.45;cursor:default}
.actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}

.bar{position:fixed;left:0;right:0;bottom:0;z-index:15;background:var(--pane-strong);border-top:1px solid var(--rail);padding:12px 16px calc(12px + env(safe-area-inset-bottom));display:flex;gap:8px;flex-wrap:wrap;align-items:center;transform:translateY(110%);visibility:hidden;transition:transform .2s ease,visibility .2s}
.bar.show{transform:none;visibility:visible}
.bar .msg{flex:1 1 100%;font-size:14px;color:var(--dim)}.bar .btn{flex:1 1 0}
@media(min-width:640px){.bar .msg{flex:1 1 auto}.bar .btn{flex:none}.toasts{bottom:96px}}

.toasts{position:fixed;left:0;right:0;bottom:calc(150px + env(safe-area-inset-bottom));z-index:40;display:grid;justify-items:center;gap:8px;pointer-events:none;padding:0 16px}
.toast{background:var(--text);color:var(--night);font-weight:600;border-radius:12px;padding:10px 16px;box-shadow:0 8px 24px rgba(0,0,0,.35);animation:pop .2s ease}
.toast.bad{background:var(--bad);color:#fff}
@keyframes pop{from{transform:translateY(8px);opacity:0}}

.note{border-radius:12px;padding:12px 14px;margin-bottom:14px;background:rgba(245,185,71,.1);border:1px solid rgba(245,185,71,.35);font-size:15px}
.note.bad{background:rgba(240,106,120,.1);border-color:rgba(240,106,120,.45)}
.note.calm{background:rgba(157,140,255,.08);border-color:rgba(157,140,255,.3)}

/* Áttekintés */
.skyline{position:relative;margin:0 0 18px;overflow:hidden}
.skyline h1{font-size:clamp(40px,11vw,64px);font-weight:700;line-height:.95}
.skyline .status{margin-top:8px;color:var(--dim)}
.skyline svg{display:block;width:100%;height:auto;margin-top:8px}
.skyline .legend{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;text-align:center;padding:8px 0 14px;font-size:13px;color:var(--dim)}
.skyline .legend b{display:block;font-family:var(--display);font-size:24px;color:var(--text);font-weight:600}.skyline .legend span{display:block;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.win{fill:#2a2f63}.win.lit{fill:var(--window);filter:drop-shadow(0 0 3px var(--window-glow))}
.lit-in{animation:light .5s ease both}
@keyframes light{from{fill:#2a2f63;filter:none}}
.numbers{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}
@media(min-width:640px){.numbers{grid-template-columns:repeat(4,1fr)}}
.number{background:var(--pane);border:1px solid var(--rail-soft);border-radius:14px;padding:12px 14px}
.number b{display:block;font-family:var(--display);font-size:34px;font-weight:600;line-height:1.1}
.number span{color:var(--dim);font-size:14px}
.duo{display:grid;gap:14px}
@media(min-width:700px){.duo{grid-template-columns:1fr 1fr}}
.duo .panel{margin:0}
.list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
.list li{display:flex;gap:10px;align-items:baseline;font-size:15px}
.list li .dim{margin-left:auto;font-size:13px;white-space:nowrap}
.big{font-family:var(--display);font-size:30px;font-weight:600;line-height:1.1;margin-top:6px}

/* Szerkesztők */
.item{background:var(--pane);border:1px solid var(--rail-soft);border-radius:16px;padding:16px;margin-bottom:14px;display:grid;gap:10px}
.item .head{display:flex;gap:10px;align-items:center}.item .head>*:first-child{flex:1}
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.days label{text-align:center;border:1px solid var(--rail);border-radius:10px;padding:8px 6px;cursor:pointer;font-size:14px;user-select:none}
.days label.on{background:var(--window);border-color:var(--window);color:#241a05;font-weight:700}
.days label:focus-within{outline:2px solid var(--window)}
.days input{position:absolute;opacity:0;pointer-events:none}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.empty{text-align:center;padding:28px 16px;color:var(--dim)}

/* Discord-szerű előnézet */
.preview{background:#313338;border-radius:12px;padding:12px 14px;display:flex;gap:12px;font-size:15px;color:#dbdee1}
.preview .pfp{width:40px;height:40px;border-radius:50%;flex:none;background:#5865f2;object-fit:cover}
.preview .name{font-weight:600;color:#f2f3f5}.preview .tag{background:#5865f2;color:#fff;font-size:10px;font-weight:700;border-radius:4px;padding:1px 4px;margin-left:6px;vertical-align:2px}
.preview .embed{margin-top:6px;border-left:4px solid var(--window);background:#2b2d31;border-radius:4px;padding:10px 12px;white-space:pre-wrap;word-break:break-word;max-width:520px}
.preview .embed b.t{display:block;color:#f2f3f5;margin-bottom:4px}
.preview .mention{background:rgba(88,101,242,.3);color:#c9cdfb;border-radius:3px;padding:0 2px}
.preview code{background:#1e1f22;border-radius:4px;padding:0 4px;font-family:var(--mono);font-size:13px}
.preview .ping{margin-top:2px}
.preview-label{font-size:13px;color:var(--dim);margin:4px 0 6px}

/* Napló */
.logs{background:var(--glass);border:1px solid var(--rail-soft);border-radius:14px;padding:8px 0;font-family:var(--mono);font-size:12.5px;line-height:1.5;overflow:auto;max-height:65vh}
.logs div{padding:2px 14px;white-space:pre-wrap;word-break:break-word}
.logs .warn{color:var(--window)}.logs .error{color:var(--bad);background:rgba(240,106,120,.06)}
.logs time{color:var(--dim);margin-right:8px}
.seg{display:inline-flex;border:1px solid var(--rail);border-radius:10px;overflow:hidden}
.seg button{background:none;border:0;padding:8px 14px;cursor:pointer;color:var(--dim)}
.seg button.on{background:var(--floor);color:var(--text)}

/* Belépés */
.login{min-height:100vh;display:grid;align-content:center;justify-items:center;padding:24px 16px}
.login form{background:var(--pane);border:1px solid var(--rail-soft);border-radius:20px;padding:24px}
.login form{width:100%;max-width:340px;display:grid;gap:12px}
.login h1{font-size:46px;font-weight:700}
.login .err{color:var(--bad);font-size:15px}
.login svg{width:100%;max-width:340px;height:auto;margin-bottom:8px}

/* Grafikonok */
.chart{position:relative;margin-top:10px}
.chart svg{display:block;width:100%;height:140px;overflow:visible}
.chart .axis{display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-top:6px}
.chart .tip{position:absolute;top:-6px;transform:translate(-50%,-100%);background:var(--text);color:var(--night);font-size:13px;font-weight:600;border-radius:8px;padding:4px 8px;white-space:nowrap;pointer-events:none}
.chart .knob{position:absolute;width:10px;height:10px;border-radius:50%;background:var(--window);box-shadow:0 0 0 2px var(--floor);transform:translate(-50%,-50%);pointer-events:none}
.bars{display:flex;align-items:flex-end;gap:2px;height:120px;border-bottom:1px solid var(--rail)}
.bars button{flex:1;min-width:0;height:100%;display:flex;align-items:flex-end;background:none;border:0;padding:0;cursor:pointer}
.bars button i{display:block;width:100%;background:var(--window);border-radius:4px 4px 0 0;min-height:2px}
.bars button.zero i{background:var(--rail)}
.bars button:hover i,.bars button:focus-visible i{background:#ffd27a}
.trend{font-size:14px;color:var(--dim)}
/* Tagkereső */
.people{display:grid;gap:6px;margin-top:12px}
.person{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--pane);border:1px solid var(--rail-soft);border-radius:12px;padding:10px 12px;cursor:pointer;color:var(--text)}
.person:hover{border-color:var(--rail)}
.person img,.person .pf{width:36px;height:36px;border-radius:50%;flex:none;background:var(--rail-soft);object-fit:cover}
.person small{display:block;color:var(--dim)}
.profile{display:flex;gap:14px;align-items:center;margin-bottom:12px}
.profile img,.profile .pf{width:64px;height:64px;border-radius:50%;background:var(--rail-soft);object-fit:cover;flex:none}
.profile h3{font-size:26px}
.badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.badge{font-size:12px;font-weight:700;border-radius:6px;padding:2px 8px;background:var(--rail-soft)}
.badge.bad{background:rgba(240,106,120,.18);color:#ffb3bb}.badge.warn{background:rgba(245,185,71,.16);color:var(--window)}
.facts{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:12px 0}
.facts div{background:var(--glass);border-radius:12px;padding:10px 12px}.facts span{display:block;font-size:13px;color:var(--dim)}
/* Bejelentés */
.swatches{display:flex;gap:10px}
.swatches label{width:36px;height:36px;border-radius:50%;cursor:pointer;border:2px solid transparent;display:grid;place-items:center}
.swatches label.on{border-color:var(--text)}
.swatches input{position:absolute;opacity:0;pointer-events:none}
.swatches label:focus-within{outline:2px solid var(--window);outline-offset:2px}
.file-btn{position:relative;overflow:hidden}.file-btn input{position:absolute;inset:0;opacity:0;cursor:pointer}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

// Animált háttér: csillagos ég, hold, hullócsillag és egy város, ahol lassan fel-le kapcsolnak az ablakok.
// Telefonkímélő: legfeljebb 20 képkocka/mp, háttérbe tett lapon megáll, "kevesebb mozgás" beállításnál álló kép.
const BG_SCRIPT = String.raw`
(function () {
  'use strict';
  var canvas = document.createElement('canvas');
  canvas.className = 'bg';
  canvas.setAttribute('aria-hidden', 'true');
  window.BG_CANVAS = canvas;
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, DPR = 1, sky = null, far = null, near = null, stars = [], windows = [], shooting = null, nextShot = 0, last = 0, scrollShift = 0;
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  function layer(color, minH, maxH, minW, maxW, withWindows) {
    var c = document.createElement('canvas');
    c.width = W * DPR; c.height = H * DPR;
    var g = c.getContext('2d');
    g.scale(DPR, DPR);
    g.fillStyle = color;
    var x = -10;
    while (x < W + 10) {
      var w = rand(minW, maxW), h = rand(minH, maxH) * H, top = H - h;
      g.fillRect(x, top, w, h + 2);
      if (Math.random() < 0.25) { g.fillRect(x + w / 2 - 1, top - 14, 2, 14); }
      if (withWindows) {
        var cols = Math.max(2, Math.floor((w - 8) / 10));
        for (var row = top + 10; row < H - 8; row += 13) {
          for (var col = 0; col < cols; col += 1) {
            var wx = x + 6 + col * ((w - 12) / cols);
            if (Math.random() < 0.55) {
              g.fillStyle = 'rgba(60,66,130,0.55)'; g.fillRect(wx, row, 5, 6); g.fillStyle = color;
              if (Math.random() < 0.09) windows.push({ x: wx, y: row, on: Math.random() < 0.5, next: performance.now() + rand(2000, 20000), warm: Math.random() < 0.8 });
            }
          }
        }
      }
      x += w + rand(2, 10);
    }
    return c;
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight; DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    sky = document.createElement('canvas'); sky.width = W * DPR; sky.height = H * DPR;
    var g = sky.getContext('2d'); g.scale(DPR, DPR);
    var grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#090b1f'); grad.addColorStop(0.55, '#151730'); grad.addColorStop(1, '#2a1f4a');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    // Hold: világos kör, belőle kivágva egy eltolt kör, körülötte halvány fény.
    var mx = W * 0.84, my = Math.min(H * 0.13, 110), mr = Math.max(14, Math.min(W, H) * 0.035);
    var glow = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 5);
    glow.addColorStop(0, 'rgba(255,236,190,0.16)'); glow.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = glow; g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    var moon = document.createElement('canvas'); moon.width = moon.height = Math.ceil(mr * 2 + 4);
    var mg = moon.getContext('2d');
    mg.fillStyle = '#f6ecd0'; mg.beginPath(); mg.arc(mr + 2, mr + 2, mr, 0, Math.PI * 2); mg.fill();
    mg.globalCompositeOperation = 'destination-out';
    mg.beginPath(); mg.arc(mr + 2 + mr * 0.45, mr + 2 - mr * 0.2, mr * 0.92, 0, Math.PI * 2); mg.fill();
    g.drawImage(moon, mx - mr - 2, my - mr - 2);
    var count = Math.min(240, Math.round(W * H / 4500));
    stars = [];
    for (var i = 0; i < count; i += 1) stars.push({ x: rand(0, W), y: rand(0, H * 0.78), r: Math.random() < 0.12 ? rand(1.1, 1.7) : rand(0.4, 1), phase: rand(0, Math.PI * 2), speed: rand(0.0006, 0.0022), base: rand(0.35, 0.85) });
    windows = [];
    far = layer('#1b1d3f', 0.10, 0.22, 26, 70, false);
    near = layer('#0d0f26', 0.06, 0.16, 34, 90, true);
    draw(performance.now());
  }

  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.drawImage(sky, 0, 0, W, H);
    // Lassan úszó fényfátyol (sarki fény jelleggel) és a város fénye a látóhatáron.
    var t = now * 0.00004;
    var ax = W * (0.3 + 0.2 * Math.sin(t)), ay = H * (0.25 + 0.05 * Math.cos(t * 1.3));
    var aurora = ctx.createRadialGradient(ax, ay, 0, ax, ay, Math.max(W, H) * 0.55);
    aurora.addColorStop(0, 'rgba(157,140,255,0.13)'); aurora.addColorStop(1, 'rgba(157,140,255,0)');
    ctx.fillStyle = aurora; ctx.fillRect(0, 0, W, H);
    var haze = ctx.createLinearGradient(0, H * 0.6, 0, H);
    haze.addColorStop(0, 'rgba(245,185,71,0)'); haze.addColorStop(1, 'rgba(245,185,71,' + (0.10 + 0.03 * Math.sin(now * 0.0005)) + ')');
    ctx.fillStyle = haze; ctx.fillRect(0, H * 0.6, W, H * 0.4);
    // Csillagok
    for (var i = 0; i < stars.length; i += 1) {
      var st = stars[i];
      ctx.globalAlpha = still ? st.base : Math.max(0.1, st.base + Math.sin(st.phase + now * st.speed) * 0.35);
      ctx.fillStyle = '#e6e3ff';
      ctx.fillRect(st.x, st.y, st.r, st.r);
    }
    ctx.globalAlpha = 1;
    // Hullócsillag
    if (!still) {
      if (!shooting && now > nextShot) {
        shooting = { x: rand(W * 0.1, W * 0.8), y: rand(10, H * 0.3), vx: rand(0.5, 0.8), vy: rand(0.18, 0.3), start: now, life: 0 };
        nextShot = now + rand(6000, 14000);
      }
      if (shooting) {
        shooting.life = now - shooting.start;
        var sx = shooting.x + shooting.vx * shooting.life, sy = shooting.y + shooting.vy * shooting.life;
        var tail = ctx.createLinearGradient(sx, sy, sx - shooting.vx * 140, sy - shooting.vy * 140);
        var fade = Math.max(0, 1 - shooting.life / 900);
        tail.addColorStop(0, 'rgba(255,240,210,' + fade + ')'); tail.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.strokeStyle = tail; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - shooting.vx * 140, sy - shooting.vy * 140); ctx.stroke();
        if (shooting.life > 900) shooting = null;
      }
    }
    // Város: a távoli sor lassabban, a közeli gyorsabban süllyed görgetéskor.
    ctx.drawImage(far, 0, scrollShift * 0.5, W, H);
    ctx.drawImage(near, 0, scrollShift, W, H);
    for (var j = 0; j < windows.length; j += 1) {
      var win = windows[j];
      if (!still && now > win.next) { win.on = !win.on; win.next = now + rand(4000, 30000); }
      if (!win.on) continue;
      ctx.fillStyle = win.warm ? '#f5b947' : '#bfb6ff';
      ctx.fillRect(win.x, win.y + scrollShift, 5, 6);
    }
  }

  function loop(now) {
    if (!document.hidden && now - last > 50) { last = now; draw(now); }
    window.requestAnimationFrame(loop);
  }

  window.addEventListener('resize', function () { clearTimeout(resize.timer); resize.timer = setTimeout(resize, 150); });
  window.addEventListener('scroll', function () { scrollShift = Math.min(70, window.scrollY * 0.06); if (still) draw(performance.now()); }, { passive: true });
  resize();
  if (!still) window.requestAnimationFrame(loop);
})();
`;

function loginPage(error) {
  const message = error === 'wrong' ? 'Hibás jelszó. Próbáld újra. / Wrong password.'
    : error === 'wait' ? 'Túl sok próbálkozás. Várj 5 percet. / Too many attempts, wait 5 minutes.' : '';
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#151730"><title>Vezérlőpult</title><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-192.png">${FONTS}<style>${STYLE}</style></head><body>
<div class="login"><form method="post" action="/login">
<h1>Vezérlőpult</h1><p class="dim">Lépj be a .env fájlban megadott DASHBOARD_PASSWORD jelszóval.</p>
<label class="sr" for="pw">Jelszó</label><input id="pw" type="password" name="password" placeholder="Jelszó / Password" autocomplete="current-password" required autofocus>
<button class="btn" type="submit">Belépés / Log in</button>${message ? `<p class="err" role="alert">${message}</p>` : ''}</form></div><script>${BG_SCRIPT}</script></body></html>`;
}

const SCRIPT = String.raw`
'use strict';
let LANG = (navigator.language || '').toLowerCase().startsWith('hu') ? 0 : 1;
try { const saved = localStorage.getItem('lang'); if (saved === 'hu') LANG = 0; if (saved === 'en') LANG = 1; } catch (e) { /* nincs tárhely */ }

const T = {
  overview: ['Áttekintés', 'Overview'], overviewSub: ['Élőben a szerverről', 'Live from the server'],
  settings: ['Beállítások', 'Settings'], tools: ['Eszközök', 'Tools'],
  commands: ['Egyedi parancsok', 'Custom commands'], commandsSub: ['/info válaszok', '/info replies'],
  schedules: ['Időzített üzenetek', 'Scheduled messages'], schedulesSub: ['Bejelentések menetrend szerint', 'Announcements on a schedule'],
  logs: ['Napló', 'Log'], logsSub: ['Mit csinált a bot', 'What the bot did'],
  announce: ['Bejelentés', 'Announcement'], announceSub: ['Üzenet a bot nevében', 'A message from the bot'],
  annIntro: ['A bot a kiválasztott csatornába küldi az üzenetet. A **félkövér** és a *dőlt* jelölés is működik.', 'The bot posts the message to the selected channel. **Bold** and *italic* both work.'],
  annChannel: ['Csatorna', 'Channel'], annTitle: ['Cím (nem kötelező)', 'Title (optional)'], annText: ['Üzenet', 'Message'], annColor: ['Szín', 'Color'],
  annSend: ['Bejelentés küldése', 'Send announcement'], annSent: ['Bejelentés elküldve', 'Announcement sent'], annMissing: ['Válassz csatornát, és írj üzenetet.', 'Pick a channel and write a message.'],
  members2: ['Tagok', 'Members'], membersSub: ['Keresés és adatlap', 'Search and profile'],
  memIntro: ['Írd be egy tag nevét vagy azonosítóját.', 'Type a member name or ID.'], memSearch: ['Név vagy azonosító', 'Name or ID'],
  memNone: ['Nincs találat. Próbáld a név elejével.', 'No match. Try the start of the name.'], memBack: ['Vissza a kereséshez', 'Back to search'],
  joined: ['Csatlakozott', 'Joined'], account: ['Fiók kora', 'Account age'], invitedBy: ['Meghívta', 'Invited by'], invitedCount: ['Meghívott', 'Invited'],
  warnings: ['Aktív figyelmeztetés', 'Active warnings'], notInServer: ['Nincs a szerveren', 'Not in the server'], timeout: ['Némítva', 'Timed out'], ago: ['{t} óta', '{t} ago'],
  roles: ['Rangok', 'Roles'], noRoles: ['Nincs rangja.', 'No roles.'], history2: ['Moderációs előzmények', 'Moderation history'], clean: ['Tiszta lap, még nem volt moderálva.', 'Clean record, never moderated.'], unknown: ['ismeretlen', 'unknown'],
  backup: ['Biztonsági mentés', 'Backup'], backupSub: ['Letöltés és visszaállítás', 'Download and restore'],
  backupIntro: ['A mentés a vezérlőpulton módosított beállításokat, az egyedi parancsokat és az időzített üzeneteket tartalmazza. Tokent és jelszót nem.', 'The backup holds the settings changed on the dashboard, the custom commands and the scheduled messages. No token or password.'],
  download: ['Mentés letöltése', 'Download backup'], restoreFile: ['Visszaállítás fájlból', 'Restore from file'],
  restored: ['Visszaállítva: {s} beállítás, {c} parancs, {m} időzített üzenet. A beállítások újraindítás után élnek.', 'Restored: {s} settings, {c} commands, {m} scheduled messages. Settings apply after a restart.'],
  badFile: ['Ez nem a vezérlőpult mentésfájlja.', 'This is not a dashboard backup file.'],
  install: ['Tedd a kezdőképernyőre: a böngésző menüjében válaszd a „Hozzáadás a kezdőképernyőhöz” pontot, és alkalmazásként nyílik meg.', 'Add it to your home screen: in the browser menu pick "Add to Home screen" and it opens like an app.'],
  memberChart: ['Taglétszám', 'Members'], memberChartEmpty: ['A bot naponta feljegyzi a taglétszámot. Pár nap múlva itt látod, hogyan nő a szerver.', 'The bot notes the member count every day. In a few days you will see the server grow here.'],
  change30: ['{d} az elmúlt {n} napban', '{d} in the last {n} days'], ticketChart: ['Új ticketek naponta', 'New tickets per day'], ticketsOn: ['{d}: {n} ticket', '{d}: {n} tickets'],
  search: ['Keresés a beállítások között', 'Search settings'], noResults: ['Nincs ilyen beállítás.', 'No setting matches.'],
  logout: ['Kijelentkezés', 'Log out'], restart: ['Bot újraindítása', 'Restart bot'], lang: ['English', 'Magyar'],
  botOn: ['A bot fut', 'The bot is running'], botOff: ['A bot most nem fut', 'The bot is not running'],
  statusLine: ['{ping} ms válaszidő, {uptime} óta fut, {mem} MB memória', '{ping} ms latency, up for {uptime}, {mem} MB memory'],
  members: ['tag', 'members'], online: ['online', 'online'], boosts: ['boost', 'boosts'], version: ['verzió', 'version'],
  nobodyPlays: ['Most senki sem játszik a szerver játékaival.', 'Nobody is playing the server games right now.'],
  playingNow: ['{n} tag játszik most.', '{n} members are playing right now.'],
  presenceOff: ['Az ablakok akkor gyulladnak fel, ha valaki játszik. Ehhez kapcsold be a Most játszik panelt (és a PRESENCE INTENT-et a fejlesztői oldalon).', 'The windows light up when someone plays. Turn on the now playing panel (and PRESENCE INTENT in the developer portal) for this.'],
  openNowPlaying: ['Most játszik beállítása', 'Set up now playing'],
  tickets: ['Ticketek az elmúlt 7 napban', 'Tickets in the last 7 days'], opened: ['nyitva', 'opened'], closed: ['lezárva', 'closed'],
  avgClose: ['Átlagosan {t} alatt zárult le egy ticket.', 'A ticket was closed in {t} on average.'], noTickets: ['Ezen a héten nem nyílt ticket.', 'No tickets were opened this week.'],
  mod: ['Moderáció', 'Moderation'], modWeek: ['{n} eset az elmúlt 7 napban', '{n} cases in the last 7 days'], noCases: ['Még nincs moderációs eset.', 'No moderation cases yet.'],
  bump: ['Bump', 'Bump'], bumpNow: ['Most lehet bumpolni', 'You can bump now'], bumpIn: ['Következő bump {t} múlva', 'Next bump in {t}'],
  bumpTotal: ['Összesen {n} bump', '{n} bumps in total'], bumpLast: ['legutóbb: {name}', 'last: {name}'],
  invites: ['Legtöbb meghívás', 'Top inviters'], noInvites: ['Még senki nem hívott meg senkit.', 'Nobody has invited anyone yet.'],
  lockdown: ['A szerver zárolva van: a csatornákban csak a megbízhatók írhatnak. Feloldás Discordon: /security.', 'The server is locked down: only trusted members can write. Unlock in Discord with /security.'],
  rescue: ['A bot most nem tudott belépni a Discordba, mert egy intent nincs bekapcsolva a fejlesztői oldal Bot fülén (például PRESENCE INTENT a Most játszik panelhez). Kapcsold be ott, vagy kapcsold ki itt a funkciót, aztán mentsd újraindítással.', 'The bot could not log in to Discord because an intent is off in the developer portal Bot tab (for example PRESENCE INTENT for the now playing panel). Turn it on there, or turn the feature off here, then save and restart.'],
  none: ['Nincs beállítva', 'Not set'], add: ['Hozzáadás', 'Add'], remove: ['Törlés', 'Remove'], revert: ['Visszaállítás', 'Undo'],
  changes: ['{n} mentetlen módosítás', '{n} unsaved changes'], pending: ['Elmentve. A következő újraindításkor lép életbe.', 'Saved. Takes effect after the next restart.'],
  save: ['Mentés', 'Save'], saveRestart: ['Mentés és újraindítás', 'Save and restart'], saved: ['Elmentve', 'Saved'],
  restarting: ['A bot újraindul. Pár másodperc, és az oldal magától frissül.', 'The bot is restarting. The page reloads by itself in a few seconds.'],
  noPm2: ['A bot nem PM2-vel fut, ezért leállás után nem indul el magától. Indítsd el a Termuxban: npm run pm2', 'The bot is not running under PM2, so it will not start again by itself. Start it in Termux: npm run pm2'],
  invalid: ['Ezeket nem sikerült menteni: ', 'These could not be saved: '], error: ['Nem sikerült. Nézd meg, fut-e a bot, és próbáld újra.', 'That did not work. Check that the bot is running and try again.'],
  listHint: ['Soronként egy.', 'One per line.'],
  rewardHint: ['Válaszd ki a rangot, és add meg, hány meghívás kell hozzá.', 'Pick the role and how many invites it needs.'], rewardCount: ['Meghívás', 'Invites'],
  counterHint: ['Hozd létre a csatornát Discordon (hangcsatorna ajánlott), a bot csak átnevezi. Helyettesítők: {members} {humans} {bots} {online} {boosts} {playing}', 'Create the channel in Discord (a voice channel works best), the bot only renames it. Placeholders: {members} {humans} {bots} {online} {boosts} {playing}'],
  counterTpl: ['Név, pl. 👥 Tagok: {members}', 'Name, e.g. 👥 Members: {members}'],
  cmdIntro: ['A tagok így használják: /info és a név. Mentés után azonnal működik, újraindítás nélkül.', 'Members use it as /info plus the name. Works right after saving, no restart needed.'],
  cmdName: ['Név', 'Name'], cmdNameHint: ['kisbetű, szóköz nélkül, pl. ip', 'lowercase, no spaces, e.g. ip'], cmdTitle: ['Cím (nem kötelező)', 'Title (optional)'],
  cmdText: ['Válasz', 'Reply'], cmdPrivate: ['Csak a kérdező lássa', 'Only the asker sees it'], cmdEmpty: ['Még nincs egyedi parancs. Az első legyen mondjuk az ip!', 'No custom commands yet. Start with ip, for example!'],
  newCommand: ['Új parancs', 'New command'], saveCommands: ['Parancsok mentése', 'Save commands'],
  schIntro: ['Budapesti idő szerint, a kiválasztott napokon. Mentés után azonnal működik.', 'In Budapest time, on the selected days. Works right after saving.'],
  schChannel: ['Csatorna', 'Channel'], schTime: ['Időpont', 'Time'], schTitle: ['Cím (nem kötelező)', 'Title (optional)'], schText: ['Üzenet', 'Message'],
  schPing: ['Ping rang', 'Ping role'], schOn: ['Bekapcsolva', 'On'], schEmpty: ['Még nincs időzített üzenet. Például: péntek 20:00, közös játék.', 'No scheduled messages yet. For example: Friday 20:00, game night.'],
  newSchedule: ['Új üzenet', 'New message'], saveSchedules: ['Üzenetek mentése', 'Save messages'],
  sendNow: ['Küldés most', 'Send now'], sendSure: ['Biztos? Küldés', 'Sure? Send'], sent: ['Elküldve', 'Sent'], sendFail: ['Nem sikerült elküldeni. Jó a csatorna, és látja a bot?', 'Could not send. Is the channel right and can the bot see it?'],
  days: [['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']],
  preview: ['Így fog kinézni', 'How it will look'], you: ['Te', 'You'],
  logsIntro: ['A bot utolsó 300 naplósora. Magától frissül, amíg nyitva van.', 'The last 300 log lines. Refreshes by itself while open.'],
  all: ['Mind', 'All'], errors: ['Hibák', 'Errors'], noLogs: ['Még nincs naplósor.', 'No log lines yet.'], noErrors: ['Nincs hiba. 👌', 'No errors. 👌'],
  min: ['perc', 'min'], hour: ['óra', 'h'], day: ['nap', 'd'],
  caseNames: [{ kick: 'Kirúgás', ban: 'Kitiltás', unban: 'Feloldás', mute: 'Némítás', autoMute: 'Auto némítás', unmute: 'Némítás vége', warn: 'Figyelmeztetés' },
    { kick: 'Kick', ban: 'Ban', unban: 'Unban', mute: 'Timeout', autoMute: 'Auto timeout', unmute: 'Timeout removed', warn: 'Warning' }],
};
const SECTION_SUB = {
  general: ['Nyelv, napló, üdvözlés', 'Language, log, welcome'], channels: ['Hová posztol a bot', 'Where the bot posts'],
  tickets: ['Ticket, csapatkereső, figyelmeztetés', 'Tickets, group finder, warnings'], invites: ['Követés és jutalmak', 'Tracking and rewards'],
  security: ['Raid, spam, anti-nuke', 'Raid, spam, anti-nuke'], extras: ['Játszók és számlálók', 'Players and counters'],
};
const t = (key, vars) => { const v = T[key][LANG]; return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m)) : v; };

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (['checked', 'value', 'disabled', 'selected'].includes(key)) el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) if (child !== null && child !== undefined && child !== false) el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return el;
}
const SVG = 'http://www.w3.org/2000/svg';
function s(tag, attrs) { const el = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; }

let META = null; let STATS = null; let VALUES = {}; let ORIGINAL = {}; let VIEW = 'overview';
const fieldEls = new Map();
const timers = new Set();

function api(path, body) {
  const options = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dashboard': '1' }, body: JSON.stringify(body) };
  return fetch(path, options).then(async (r) => {
    if (r.status === 401) { location.reload(); throw new Error('login'); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error('api'), { data });
    return data;
  });
}

function toast(text, bad) {
  const el = h('div', { class: 'toast' + (bad ? ' bad' : ''), role: 'status' }, text);
  document.querySelector('.toasts').append(el);
  setTimeout(() => el.remove(), 3200);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const changed = () => Object.keys(VALUES).filter((key) => !same(VALUES[key], ORIGINAL[key]));
function setValue(path, value) {
  VALUES[path] = value;
  const el = fieldEls.get(path);
  if (el) {
    const isChanged = !same(value, ORIGINAL[path]);
    el.classList.toggle('changed', isChanged);
    const btn = el.querySelector('.revert');
    if (btn) btn.hidden = !isChanged;
  }
  updateBar();
}

function duration(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return minutes + ' ' + t('min');
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return hours + ' ' + t('hour') + (minutes % 60 ? ' ' + (minutes % 60) + ' ' + t('min') : '');
  return Math.floor(hours / 24) + ' ' + t('day');
}

// ---- Discord-szerű előnézet: félkövér, dőlt, kód és említések, HTML nélkül ----
function richText(text) {
  const out = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|~~[^~]+~~|` + '`' + String.raw`[^` + '`' + String.raw`]+` + '`' + String.raw`|<@&\d+>|<#\d+>|<@!?\d+>|\{user\})/g;
  let last = 0; let m;
  while ((m = pattern.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const x = m[0];
    if (x.startsWith('**')) out.push(h('b', {}, x.slice(2, -2)));
    else if (x.startsWith('__')) out.push(h('u', {}, x.slice(2, -2)));
    else if (x.startsWith('~~')) out.push(h('s', {}, x.slice(2, -2)));
    else if (x.startsWith('*')) out.push(h('i', {}, x.slice(1, -1)));
    else if (x.charCodeAt(0) === 96) out.push(h('code', {}, x.slice(1, -1)));
    else if (x === '{user}') out.push(h('span', { class: 'mention' }, '@' + t('you')));
    else if (x.startsWith('<@&')) { const role = META.guild.roles.find((r) => r.id === x.slice(3, -1)); out.push(h('span', { class: 'mention' }, '@' + (role ? role.name : '?'))); }
    else if (x.startsWith('<#')) { const ch = META.guild.channels.find((c) => c.id === x.slice(2, -1)); out.push(h('span', { class: 'mention' }, '#' + (ch ? ch.name : '?'))); }
    else out.push(h('span', { class: 'mention' }, '@' + t('you')));
    last = m.index + x.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
function preview({ title, text, pingRoleId, color }) {
  const box = h('div', { class: 'preview' });
  const draw = (data) => {
    const role = data.pingRoleId && META.guild.roles.find((r) => r.id === data.pingRoleId);
    box.replaceChildren(
      META.bot.avatar ? h('img', { class: 'pfp', src: META.bot.avatar, alt: '' }) : h('div', { class: 'pfp' }),
      h('div', { style: 'min-width:0;flex:1' },
        h('div', {}, h('span', { class: 'name' }, (META.bot.tag || 'Bot').split('#')[0]), h('span', { class: 'tag' }, 'BOT')),
        role ? h('div', { class: 'ping' }, h('span', { class: 'mention' }, '@' + role.name)) : null,
        h('div', { class: 'embed', style: data.color ? 'border-left-color:' + data.color : null }, data.title ? h('b', { class: 't' }, data.title) : null, richText(data.text || '…'))));
  };
  draw({ title, text, pingRoleId, color });
  return { el: h('div', {}, h('div', { class: 'preview-label' }, t('preview')), box), update: draw };
}

// ---- Választók ----
const KIND_PREFIX = { text: '# ', voice: '🔊 ', category: '📁 ' };
function channelSelect(kind, current, onchange) {
  const list = META.guild.channels.filter((c) => !kind || kind === 'any' || c.kind === kind);
  const known = !current || list.some((c) => c.id === current);
  return h('select', { onchange: (e) => onchange(e.target.value) },
    h('option', { value: '' }, t('none')),
    known ? null : h('option', { value: current, selected: true }, current),
    list.map((c) => h('option', { value: c.id, selected: c.id === current }, (KIND_PREFIX[c.kind] || '') + c.name)));
}
function roleSelect(current, onchange) {
  const known = !current || META.guild.roles.some((r) => r.id === current);
  return h('select', { onchange: (e) => onchange(e.target.value) },
    h('option', { value: '' }, t('none')),
    known ? null : h('option', { value: current, selected: true }, current),
    META.guild.roles.map((r) => h('option', { value: r.id, selected: r.id === current }, '@' + r.name)));
}
const roleColor = (r) => (r.color && r.color !== '#000000' ? r.color : '#99aab5');

// ---- Beállítás mezők ----
function renderField(field) {
  const path = field.path;
  const value = VALUES[path];
  const label = field.label[LANG];
  const id = 'f-' + path.replace(/\W/g, '-');
  const set = (v) => setValue(path, v);
  const wrap = h('div', { class: 'field', id: 'field-' + id });
  fieldEls.set(path, wrap);
  const revert = h('button', { class: 'revert', type: 'button', hidden: true, onclick: () => { VALUES[path] = JSON.parse(JSON.stringify(ORIGINAL[path])); const fresh = renderField(field); wrap.replaceWith(fresh); setValue(path, VALUES[path]); } }, t('revert'));
  const head = (forId) => h('div', { class: 'field-head' }, forId ? h('label', { for: forId }, label) : h('span', { class: 'label' }, label), revert);
  let body;
  switch (field.type) {
    case 'bool':
      body = h('div', { class: 'field-head', style: 'margin:0' }, h('label', { class: 'toggle' }, h('input', { type: 'checkbox', role: 'switch', checked: Boolean(value), onchange: (e) => set(e.target.checked) }), h('span', {}, label)), revert);
      wrap.append(body);
      break;
    case 'text':
      wrap.append(head(id), h('input', { id, type: 'text', value: value ?? '', maxlength: field.max || 200, oninput: (e) => set(e.target.value) }));
      break;
    case 'textarea': {
      const pv = path.startsWith('welcome') ? preview({ text: value || '' }) : null;
      wrap.append(head(id), h('textarea', { id, maxlength: field.max || 1000, oninput: (e) => { set(e.target.value); if (pv) pv.update({ text: e.target.value }); } }, value ?? ''));
      if (pv) wrap.append(h('div', { style: 'margin-top:10px' }, pv.el));
      break;
    }
    case 'number':
      wrap.append(head(id), h('input', { id, type: 'number', inputmode: 'numeric', value: value ?? 0, min: field.min, max: field.max, oninput: (e) => set(Number(e.target.value)) }));
      break;
    case 'select':
      wrap.append(head(id), h('select', { id, onchange: (e) => set(e.target.value) }, field.options.map(([v, name]) => h('option', { value: v, selected: v === value }, name))));
      break;
    case 'channel': {
      const sel = channelSelect(field.kind, value, set); sel.id = id;
      wrap.append(head(id), sel);
      break;
    }
    case 'role': {
      const sel = roleSelect(value, set); sel.id = id;
      wrap.append(head(id), sel);
      break;
    }
    case 'roles': {
      const selected = new Set((value || []).map(String));
      wrap.append(head(), h('div', { class: 'chips' }, META.guild.roles.map((r) => {
        const chip = h('label', { class: 'chip' + (selected.has(r.id) ? ' on' : '') },
          h('input', { type: 'checkbox', checked: selected.has(r.id), onchange: (e) => { if (e.target.checked) selected.add(r.id); else selected.delete(r.id); chip.classList.toggle('on', e.target.checked); set([...selected]); } }),
          h('span', { class: 'dot', style: 'background:' + roleColor(r) }), r.name);
        return chip;
      })));
      break;
    }
    case 'list':
      wrap.append(head(id), h('textarea', { id, oninput: (e) => set(e.target.value.split('\n').map((x) => x.trim()).filter(Boolean)) }, (value || []).join('\n')), h('p', { class: 'hint' }, t('listHint')));
      break;
    case 'rewards':
    case 'counters': {
      const isReward = field.type === 'rewards';
      const rows = h('div', { class: 'rows' });
      const draw = () => rows.replaceChildren(...(VALUES[path] || []).map((item, index) => {
        const update = (patch) => { const list = VALUES[path].map((x) => ({ ...x })); list[index] = { ...list[index], ...patch }; set(list); };
        const remove = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { const list = [...VALUES[path]]; list.splice(index, 1); set(list); draw(); } }, t('remove'));
        return isReward
          ? h('div', { class: 'row' }, roleSelect(item.roleId, (v) => update({ roleId: v })), h('input', { type: 'number', min: 1, inputmode: 'numeric', value: item.count, 'aria-label': t('rewardCount'), oninput: (e) => update({ count: Number(e.target.value) }) }), remove)
          : h('div', { class: 'row' }, channelSelect('any', item.channelId, (v) => update({ channelId: v })), h('input', { type: 'text', maxlength: 100, value: item.template, placeholder: t('counterTpl'), 'aria-label': t('counterTpl'), oninput: (e) => update({ template: e.target.value }) }), remove);
      }));
      draw();
      wrap.append(head(), rows, h('div', { class: 'actions' }, h('button', { class: 'btn ghost small', type: 'button', onclick: () => { set([...(VALUES[path] || []), isReward ? { count: 5, roleId: '' } : { channelId: '', template: '👥 {members}' }]); draw(); } }, '+ ' + t('add'))),
        h('p', { class: 'hint' }, t(isReward ? 'rewardHint' : 'counterHint')));
      break;
    }
    default:
      break;
  }
  const isChanged = !same(VALUES[path], ORIGINAL[path]);
  wrap.classList.toggle('changed', isChanged);
  revert.hidden = !isChanged;
  return wrap;
}

// ---- Áttekintés ----
const TOWER_HEIGHTS = [118, 150, 104, 136, 92];
function skyline(stats) {
  const games = stats.games.slice(0, 5);
  const width = 360; const ground = 170;
  const svg = s('svg', { viewBox: '0 0 ' + width + ' ' + ground, role: 'img', 'aria-label': t('overview') });
  const slot = width / Math.max(games.length, 1);
  let order = 0;
  games.forEach((game, g) => {
    const height = TOWER_HEIGHTS[g % TOWER_HEIGHTS.length];
    const w = Math.min(54, slot - 14); const x = g * slot + (slot - w) / 2; const y = ground - height;
    svg.append(s('rect', { x, y, width: w, height, rx: 3, fill: '#1d2042' }));
    const cols = 3; const rows = Math.floor((height - 16) / 14);
    const windows = [];
    for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) windows.push(s('rect', { x: x + 7 + c * ((w - 14 - 8) / 2), y: y + 10 + r * 14, width: 8, height: 7, rx: 1, class: 'win' }));
    // Egy játékos = egy felgyulladt ablak, szétszórva, mintha emberek lennének otthon.
    const lit = Math.min(game.players, windows.length);
    const picks = windows.map((_, i) => i).sort((a, b) => ((a * 7 + g * 13) % 11) - ((b * 7 + g * 13) % 11)).slice(0, lit);
    picks.forEach((i) => { windows[i].classList.add('lit', 'lit-in'); windows[i].style.animationDelay = (order++ * 90) + 'ms'; });
    windows.forEach((win) => svg.append(win));
    if (g === 1) {
      svg.append(s('rect', { x: x + w / 2 - 14, y: y - 12, width: 28, height: 12, rx: 2, fill: '#1d2042' }));
      svg.append(s('rect', { x: x + w / 2 - 9, y: y - 9, width: 18, height: 6, rx: 1, class: 'win' + (stats.bot.online ? ' lit' : '') }));
    }
  });
  svg.append(s('rect', { x: 0, y: ground - 2, width, height: 2, fill: '#343a6e' }));
  return svg;
}

function overview() {
  const st = STATS;
  if (!st) return h('p', { class: 'dim' }, '…');
  const playing = st.games.reduce((sum, g) => sum + g.players, 0);
  const sky = h('section', { class: 'skyline' },
    h('h1', {}, st.guild ? st.guild.name : META.guild.name),
    h('p', { class: 'status' }, h('span', { class: 'light' + (st.bot.online ? ' on' : '') }), (st.bot.online ? t('botOn') : t('botOff')) + '. ',
      st.bot.online ? t('statusLine', { ping: st.bot.ping, uptime: duration(st.bot.uptime), mem: st.bot.memoryMb }) : ''),
    skyline(st),
    h('div', { class: 'legend' }, st.games.slice(0, 5).map((g) => h('div', {}, h('b', {}, String(g.players)), h('span', { 'aria-hidden': 'true' }, g.emoji), h('span', {}, g.label)))));
  const parts = [sky];
  if (META.startupError) parts.push(h('div', { class: 'note bad' }, t('rescue')));
  if (!META.pm2) parts.push(h('div', { class: 'note' }, t('noPm2')));
  if (st.lockdown) parts.push(h('div', { class: 'note bad' }, t('lockdown')));
  if (!st.presenceOn) parts.push(h('div', { class: 'note calm' }, h('p', {}, t('presenceOff')), h('div', { class: 'actions' }, h('button', { class: 'btn ghost small', onclick: () => go('extras') }, t('openNowPlaying')))));
  else parts.push(h('p', { class: 'dim', style: 'margin-bottom:14px' }, playing ? t('playingNow', { n: playing }) : t('nobodyPlays')));

  const num = (value, label) => h('div', { class: 'number' }, h('b', {}, value === null || value === undefined ? '–' : String(value)), h('span', {}, label));
  parts.push(h('div', { class: 'numbers' }, num(st.guild && st.guild.members, t('members')), num(st.guild && st.guild.online, t('online')), num(st.guild && st.guild.boosts, t('boosts')), num(st.version, t('version'))));

  const tk = st.tickets;
  const ticketPanel = h('div', { class: 'panel pad' }, h('h3', {}, t('tickets')),
    tk.opened ? [h('p', { class: 'big' }, tk.opened + ' ' + t('opened') + ', ' + tk.closed + ' ' + t('closed')), tk.averageCloseMs ? h('p', { class: 'hint' }, t('avgClose', { t: duration(tk.averageCloseMs) })) : null]
      : h('p', { class: 'hint' }, t('noTickets')));
  const nextIn = st.bump.nextAt - Date.now();
  const bumpPanel = h('div', { class: 'panel pad' }, h('h3', {}, t('bump')),
    h('p', { class: 'big' }, nextIn > 0 ? t('bumpIn', { t: duration(nextIn) }) : t('bumpNow')),
    h('p', { class: 'hint' }, t('bumpTotal', { n: st.bump.total }) + (st.bump.last ? ', ' + t('bumpLast', { name: st.bump.last }) : '')));
  const caseNames = T.caseNames[LANG];
  const modPanel = h('div', { class: 'panel pad' }, h('h3', {}, t('mod')), h('p', { class: 'hint' }, t('modWeek', { n: st.cases.week })),
    st.cases.recent.length ? h('ul', { class: 'list' }, st.cases.recent.map((c) => h('li', {}, h('b', {}, '#' + c.id), (caseNames[c.type] || c.type) + ': ' + c.user, h('span', { class: 'dim' }, duration(Date.now() - c.time)))))
      : h('p', { class: 'hint' }, t('noCases')));
  const medals = ['🥇', '🥈', '🥉'];
  const invitePanel = h('div', { class: 'panel pad' }, h('h3', {}, t('invites')),
    st.invites.length ? h('ul', { class: 'list' }, st.invites.map((x, i) => h('li', {}, medals[i], x.name, h('span', { class: 'dim' }, String(x.count)))))
      : h('p', { class: 'hint' }, t('noInvites')));
  parts.push(h('div', { class: 'duo', style: 'margin-bottom:14px' }, memberTrend(st.history), ticketTrend(st.ticketDays)));
  parts.push(h('div', { class: 'duo' }, ticketPanel, bumpPanel, modPanel, invitePanel));
  return h('div', {}, parts);
}

// ---- Grafikonok ----
const dateFmt = () => new Intl.DateTimeFormat(LANG ? 'en-GB' : 'hu-HU', { month: 'short', day: 'numeric' });
const shortDate = (key) => dateFmt().format(new Date(key + 'T12:00:00'));

function memberTrend(history) {
  const points = (history || []).filter((p) => typeof p.members === 'number');
  const panel = h('div', { class: 'panel pad' }, h('h3', {}, t('memberChart')));
  if (points.length < 2) { panel.append(h('p', { class: 'hint' }, t('memberChartEmpty'))); return panel; }
  const diff = points[points.length - 1].members - points[0].members;
  panel.append(h('p', { class: 'trend' }, t('change30', { d: (diff > 0 ? '+' : '') + diff, n: points.length - 1 })));
  const W = 300; const H = 140; const pad = 8;
  const values = points.map((p) => p.members);
  let min = Math.min(...values); let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const x = (i) => (i / (points.length - 1)) * W;
  const y = (v) => pad + (1 - (v - min) / (max - min)) * (H - pad * 2);
  const line = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.members).toFixed(1)).join(' ');
  const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'img', 'aria-label': t('memberChart') });
  svg.append(s('line', { x1: 0, x2: W, y1: H, y2: H, stroke: '#343a6e', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
  svg.append(s('path', { d: line, fill: 'none', stroke: '#f5b947', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }));
  const cross = s('line', { y1: 0, y2: H, stroke: '#a3a1c6', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', opacity: 0 });
  svg.append(cross);
  const knob = h('div', { class: 'knob', hidden: true });
  const tip = h('div', { class: 'tip', hidden: true });
  const wrap = h('div', { class: 'chart' }, svg, knob, tip, h('div', { class: 'axis' }, h('span', {}, shortDate(points[0].date) + ': ' + values[0]), h('span', {}, shortDate(points[points.length - 1].date) + ': ' + values[values.length - 1])));
  const show = (clientX) => {
    const box = svg.getBoundingClientRect();
    const i = Math.max(0, Math.min(points.length - 1, Math.round(((clientX - box.left) / box.width) * (points.length - 1))));
    const px = (x(i) / W) * box.width; const py = (y(points[i].members) / H) * box.height;
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', 0.6);
    knob.hidden = false; knob.style.left = px + 'px'; knob.style.top = py + 'px';
    tip.hidden = false; tip.style.left = Math.max(40, Math.min(box.width - 40, px)) + 'px'; tip.style.top = py - 8 + 'px';
    tip.textContent = shortDate(points[i].date) + ': ' + points[i].members + ' ' + t('members');
  };
  const hide = () => { knob.hidden = true; tip.hidden = true; cross.setAttribute('opacity', 0); };
  svg.addEventListener('pointermove', (e) => show(e.clientX));
  svg.addEventListener('pointerdown', (e) => show(e.clientX));
  svg.addEventListener('pointerleave', hide);
  panel.append(wrap);
  return panel;
}

function ticketTrend(days) {
  const list = days || [];
  const max = Math.max(1, ...list.map((d) => d.count));
  const tip = h('div', { class: 'tip', hidden: true });
  const bars = h('div', { class: 'bars', role: 'img', 'aria-label': t('ticketChart') });
  list.forEach((d) => {
    const label = t('ticketsOn', { d: shortDate(d.date), n: d.count });
    const btn = h('button', { type: 'button', class: d.count ? '' : 'zero', 'aria-label': label }, h('i', { style: 'height:' + Math.max(2, (d.count / max) * 100) + '%' }));
    const show = () => { const box = bars.getBoundingClientRect(); const b = btn.getBoundingClientRect(); tip.hidden = false; tip.textContent = label; tip.style.left = Math.max(60, Math.min(box.width - 60, b.left - box.left + b.width / 2)) + 'px'; tip.style.top = (b.bottom - box.top) - (d.count / max) * 120 - 8 + 'px'; };
    btn.addEventListener('pointerenter', show); btn.addEventListener('focus', show); btn.addEventListener('click', show);
    btn.addEventListener('pointerleave', () => { tip.hidden = true; }); btn.addEventListener('blur', () => { tip.hidden = true; });
    bars.append(btn);
  });
  const total = list.reduce((sum, d) => sum + d.count, 0);
  return h('div', { class: 'panel pad' }, h('h3', {}, t('ticketChart')), h('p', { class: 'trend' }, t('change30', { d: total, n: list.length })),
    h('div', { class: 'chart' }, bars, tip, list.length ? h('div', { class: 'axis' }, h('span', {}, shortDate(list[0].date)), h('span', {}, shortDate(list[list.length - 1].date))) : null));
}

// ---- Bejelentés ----
const SWATCHES = [['amber', '#f5b947'], ['violet', '#9d8cff'], ['green', '#52c98e'], ['red', '#f06a78'], ['blue', '#5865f2']];
function announceView() {
  const data = { channelId: '', title: '', text: '', pingRoleId: '', color: 'amber' };
  const colorOf = () => SWATCHES.find(([id]) => id === data.color)[1];
  const pv = preview({ ...data, color: colorOf() });
  const refresh = () => pv.update({ ...data, color: colorOf() });
  const textEl = h('textarea', { maxlength: 4000, style: 'min-height:140px', 'aria-label': t('annText'), placeholder: t('annText'), oninput: (e) => { data.text = e.target.value; refresh(); } });
  const titleEl = h('input', { type: 'text', maxlength: 256, placeholder: t('annTitle'), 'aria-label': t('annTitle'), oninput: (e) => { data.title = e.target.value; refresh(); } });
  const swatches = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('annColor') }, SWATCHES.map(([id, hex]) => {
    const lab = h('label', { class: id === data.color ? 'on' : '', style: 'background:' + hex, title: id }, h('input', { type: 'radio', name: 'color', value: id, checked: id === data.color, 'aria-label': id, onchange: () => { data.color = id; swatches.querySelectorAll('label').forEach((l) => l.classList.toggle('on', l === lab)); refresh(); } }));
    return lab;
  }));
  let armed = null;
  const sendBtn = h('button', { class: 'btn', type: 'button', onclick: async () => {
    if (!data.channelId || !data.text.trim()) { toast(t('annMissing'), true); return; }
    if (!armed) { sendBtn.textContent = t('sendSure'); armed = setTimeout(() => { armed = null; sendBtn.textContent = t('annSend'); }, 3000); return; }
    clearTimeout(armed); armed = null; sendBtn.textContent = t('annSend'); sendBtn.disabled = true;
    try { await api('/api/announce', data); toast(t('annSent')); data.title = ''; data.text = ''; titleEl.value = ''; textEl.value = ''; refresh(); } catch (e) { toast(t('sendFail'), true); }
    sendBtn.disabled = false;
  } }, t('annSend'));
  const lab = (text, el) => h('label', { style: 'display:block' }, h('span', { class: 'hint', style: 'display:block;margin:0 0 4px' }, text), el);
  return h('div', {}, h('div', { class: 'note calm' }, richText(t('annIntro'))),
    h('div', { class: 'item' },
      h('div', { class: 'two' }, lab(t('annChannel'), channelSelect('text', '', (v) => { data.channelId = v; })), lab(t('schPing'), roleSelect('', (v) => { data.pingRoleId = v; refresh(); }))),
      titleEl, textEl,
      h('div', {}, h('span', { class: 'hint', style: 'display:block;margin:0 0 6px' }, t('annColor')), swatches),
      pv.el,
      h('div', { class: 'actions', style: 'margin:0' }, sendBtn)));
}

// ---- Tagkereső ----
function membersView() {
  const results = h('div', { class: 'people', 'aria-live': 'polite' });
  const area = h('div');
  let timer = null; let lastQuery = '';
  const input = h('input', { type: 'text', placeholder: t('memSearch'), 'aria-label': t('memSearch'), autocomplete: 'off', oninput: (e) => {
    clearTimeout(timer);
    const q = e.target.value.trim();
    timer = setTimeout(async () => {
      lastQuery = q;
      if (!q) { results.replaceChildren(); return; }
      try {
        const { list } = await api('/api/members?q=' + encodeURIComponent(q));
        if (q !== lastQuery) return;
        results.replaceChildren(...(list.length ? list.map((m) => h('button', { class: 'person', type: 'button', onclick: () => openMember(m.id) },
          m.avatar ? h('img', { src: m.avatar, alt: '' }) : h('div', { class: 'pf' }), h('span', {}, m.name, h('small', {}, '@' + m.username))))
          : [h('p', { class: 'hint' }, t('memNone'))]));
      } catch (e) { results.replaceChildren(h('p', { class: 'hint' }, t('error'))); }
    }, 350);
  } });
  const searchBox = h('div', {}, h('div', { class: 'note calm' }, t('memIntro')), input, results);
  const openMember = async (id) => {
    let m;
    try { m = await api('/api/member?id=' + encodeURIComponent(id)); } catch (e) { toast(t('error'), true); return; }
    const caseNames = T.caseNames[LANG];
    const fact = (label, value) => h('div', {}, h('span', {}, label), value);
    area.replaceChildren(h('div', {},
      h('div', { class: 'actions', style: 'margin:0 0 12px' }, h('button', { class: 'btn ghost small', type: 'button', onclick: () => { area.replaceChildren(searchBox); input.focus(); } }, '← ' + t('memBack'))),
      h('div', { class: 'panel pad' },
        h('div', { class: 'profile' }, m.avatar ? h('img', { src: m.avatar, alt: '' }) : h('div', { class: 'pf' }),
          h('div', {}, h('h3', {}, m.name), h('p', { class: 'dim' }, '@' + m.username),
            h('div', { class: 'badges' }, m.bot ? h('span', { class: 'badge' }, 'BOT') : null, m.inServer ? null : h('span', { class: 'badge bad' }, t('notInServer')),
              m.timeoutUntil ? h('span', { class: 'badge bad' }, t('timeout') + ': ' + duration(m.timeoutUntil - Date.now())) : null,
              m.warnings ? h('span', { class: 'badge warn' }, '⚠️ ' + m.warnings) : null))),
        h('div', { class: 'facts' },
          fact(t('joined'), m.joinedAt ? t('ago', { t: duration(Date.now() - m.joinedAt) }) : '–'),
          fact(t('account'), m.createdAt ? duration(Date.now() - m.createdAt) : '–'),
          fact(t('invitedBy'), m.invitedBy || t('unknown')),
          fact(t('invitedCount'), String(m.invited)),
          fact(t('warnings'), String(m.warnings))),
        h('h3', { style: 'margin-top:6px' }, t('roles')),
        m.roles.length ? h('div', { class: 'chips', style: 'margin-top:8px' }, m.roles.map((r) => h('span', { class: 'chip', style: 'cursor:default' }, h('span', { class: 'dot', style: 'background:' + roleColor(r) }), r.name))) : h('p', { class: 'hint' }, t('noRoles')),
        h('h3', { style: 'margin-top:16px' }, t('history2')),
        m.cases.length ? h('ul', { class: 'list' }, m.cases.map((c) => h('li', {}, h('b', {}, '#' + c.id), (caseNames[c.type] || c.type) + (c.reason ? ': ' + c.reason : ''), h('span', { class: 'dim' }, duration(Date.now() - c.time)))))
          : h('p', { class: 'hint' }, t('clean')))));
    window.scrollTo(0, 0);
  };
  area.append(searchBox);
  setTimeout(() => input.focus(), 50);
  return area;
}

// ---- Biztonsági mentés ----
function backupView() {
  const file = h('input', { type: 'file', accept: 'application/json,.json', 'aria-label': t('restoreFile'), onchange: async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    let data;
    try { data = JSON.parse(await f.text()); } catch (err) { toast(t('badFile'), true); return; }
    try {
      const r = await api('/api/restore', { data });
      toast(t('restored', { s: r.settings, c: r.commands, m: r.schedules }));
      setTimeout(() => location.reload(), 2500);
    } catch (err) { toast(t('badFile'), true); }
  } });
  return h('div', {}, h('div', { class: 'note calm' }, t('backupIntro')),
    h('div', { class: 'actions' }, h('a', { class: 'btn', href: '/api/backup', download: '' }, t('download')), h('span', { class: 'btn ghost file-btn' }, t('restoreFile'), file)),
    h('div', { class: 'note', style: 'margin-top:18px' }, '📱 ' + t('install')));
}

// ---- Listaszerkesztők (parancsok, időzített üzenetek) ----
function listEditor({ items, intro, empty, newLabel, saveLabel, makeItem, render, save }) {
  let list = items.map((x) => ({ ...x }));
  let dirty = false;
  const box = h('div');
  const saveBtn = h('button', { class: 'btn', type: 'button', disabled: true, onclick: async () => {
    saveBtn.disabled = true;
    try { const r = await save(list); list = r.list.map((x) => ({ ...x })); dirty = false; draw(); toast(t('saved')); } catch (e) { saveBtn.disabled = false; toast(t('error'), true); }
  } }, saveLabel);
  const touch = () => { dirty = true; saveBtn.disabled = false; };
  const draw = () => {
    box.replaceChildren(...(list.length ? list.map((item, index) => render(item, (patch) => { list[index] = { ...list[index], ...patch }; touch(); }, () => { list.splice(index, 1); touch(); draw(); }))
      : [h('div', { class: 'panel empty' }, empty)]));
    saveBtn.disabled = !dirty;
  };
  draw();
  window.onbeforeunload = () => (dirty || changed().length ? true : undefined);
  return h('div', {}, h('div', { class: 'note calm' }, intro), box,
    h('div', { class: 'actions' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => { list.push(makeItem()); touch(); draw(); const last = box.lastElementChild; if (last) { last.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inp = last.querySelector('input,textarea'); if (inp) inp.focus({ preventScroll: true }); } } }, '+ ' + newLabel), saveBtn));
}

function commandsView() {
  return listEditor({
    items: META.commands, intro: t('cmdIntro'), empty: t('cmdEmpty'), newLabel: t('newCommand'), saveLabel: t('saveCommands'),
    makeItem: () => ({ name: '', title: '', response: '', private: false }),
    save: (list) => api('/api/commands', { list }).then((r) => { META.commands = r.list; return r; }),
    render: (item, update, remove) => {
      const pv = preview({ title: item.title, text: item.response });
      const refresh = () => pv.update({ title: item.title, text: item.response });
      return h('div', { class: 'item' },
        h('div', { class: 'head' }, h('label', {}, h('span', { class: 'sr' }, t('cmdName')), h('input', { type: 'text', value: item.name, maxlength: 32, placeholder: t('cmdName') + ' (' + t('cmdNameHint') + ')', autocapitalize: 'none', oninput: (e) => { e.target.value = e.target.value.toLowerCase().replace(/\s+/g, '-'); item.name = e.target.value; update({ name: item.name }); } })),
          h('button', { class: 'btn danger small', type: 'button', onclick: remove }, t('remove'))),
        h('input', { type: 'text', value: item.title, maxlength: 100, placeholder: t('cmdTitle'), 'aria-label': t('cmdTitle'), oninput: (e) => { item.title = e.target.value; update({ title: item.title }); refresh(); } }),
        h('textarea', { maxlength: 2000, placeholder: t('cmdText'), 'aria-label': t('cmdText'), oninput: (e) => { item.response = e.target.value; update({ response: item.response }); refresh(); } }, item.response),
        h('label', { class: 'toggle' }, h('input', { type: 'checkbox', role: 'switch', checked: item.private, onchange: (e) => update({ private: e.target.checked }) }), h('span', {}, t('cmdPrivate'))),
        pv.el);
    },
  });
}

function schedulesView() {
  return listEditor({
    items: META.schedules, intro: t('schIntro'), empty: t('schEmpty'), newLabel: t('newSchedule'), saveLabel: t('saveSchedules'),
    makeItem: () => ({ enabled: true, channelId: '', days: [5], time: '20:00', title: '', text: '', pingRoleId: '' }),
    save: (list) => api('/api/schedules', { list }).then((r) => { META.schedules = r.list; return r; }),
    render: (item, update, remove) => {
      const days = new Set(item.days || []);
      const pv = preview(item);
      const patch = (p) => { Object.assign(item, p); update(p); pv.update(item); };
      const dayRow = h('div', { class: 'days', role: 'group' }, [1, 2, 3, 4, 5, 6, 0].map((d) => {
        const lab = h('label', { class: days.has(d) ? 'on' : '' }, h('input', { type: 'checkbox', checked: days.has(d), onchange: (e) => { if (e.target.checked) days.add(d); else days.delete(d); lab.classList.toggle('on', e.target.checked); patch({ days: [...days] }); } }), T.days[LANG][d]);
        return lab;
      }));
      let armed = null;
      const sendBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: async () => {
        if (!armed) { sendBtn.textContent = t('sendSure'); armed = setTimeout(() => { armed = null; sendBtn.textContent = t('sendNow'); }, 3000); return; }
        clearTimeout(armed); armed = null; sendBtn.textContent = t('sendNow'); sendBtn.disabled = true;
        try { await api('/api/schedules/send', { item }); toast(t('sent')); } catch (e) { toast(t('sendFail'), true); }
        sendBtn.disabled = false;
      } }, t('sendNow'));
      return h('div', { class: 'item' },
        h('div', { class: 'head' }, h('label', { class: 'toggle' }, h('input', { type: 'checkbox', role: 'switch', checked: item.enabled !== false, onchange: (e) => patch({ enabled: e.target.checked }) }), h('span', {}, t('schOn'))),
          h('button', { class: 'btn danger small', type: 'button', onclick: remove }, t('remove'))),
        h('div', { class: 'two' },
          h('label', {}, h('span', { class: 'hint', style: 'display:block;margin:0 0 4px' }, t('schChannel')), channelSelect('text', item.channelId, (v) => patch({ channelId: v }))),
          h('label', {}, h('span', { class: 'hint', style: 'display:block;margin:0 0 4px' }, t('schTime')), h('input', { type: 'time', value: item.time, oninput: (e) => patch({ time: e.target.value }) }))),
        dayRow,
        h('input', { type: 'text', value: item.title, maxlength: 100, placeholder: t('schTitle'), 'aria-label': t('schTitle'), oninput: (e) => patch({ title: e.target.value }) }),
        h('textarea', { maxlength: 2000, placeholder: t('schText'), 'aria-label': t('schText'), oninput: (e) => patch({ text: e.target.value }) }, item.text),
        h('label', {}, h('span', { class: 'hint', style: 'display:block;margin:0 0 4px' }, t('schPing')), roleSelect(item.pingRoleId, (v) => patch({ pingRoleId: v }))),
        pv.el,
        h('div', { class: 'actions', style: 'margin:0' }, sendBtn));
    },
  });
}

function logsView() {
  let mode = 'all';
  const box = h('div', { class: 'logs', role: 'log' });
  const seg = h('div', { class: 'seg' });
  const fmt = new Intl.DateTimeFormat(LANG ? 'en-GB' : 'hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const load = async () => {
    try {
      const { lines } = await api('/api/logs');
      const shown = lines.filter((l) => mode === 'all' || l.level === 'error').reverse();
      box.replaceChildren(...(shown.length ? shown.map((l) => h('div', { class: l.level }, h('time', {}, fmt.format(l.time)), l.text)) : [h('div', { class: 'dim' }, mode === 'all' ? t('noLogs') : t('noErrors'))]));
    } catch (e) { /* a következő körben újra */ }
  };
  const drawSeg = () => seg.replaceChildren(...[['all', t('all')], ['error', t('errors')]].map(([id, label]) => h('button', { type: 'button', class: mode === id ? 'on' : '', 'aria-pressed': String(mode === id), onclick: () => { mode = id; drawSeg(); load(); } }, label)));
  drawSeg(); load();
  timers.add(setInterval(load, 5000));
  return h('div', {}, h('div', { class: 'actions', style: 'margin:0 0 12px' }, seg), box);
}

// ---- Navigáció ----
function views() {
  return [
    { id: 'overview', group: 0, icon: '🌃', label: t('overview'), sub: t('overviewSub'), render: overview },
    ...META.sections.map((sec) => ({ id: sec.id, group: 1, icon: sec.label[LANG].split(' ')[0], label: sec.label[LANG].split(' ').slice(1).join(' '), sub: (SECTION_SUB[sec.id] || ['', ''])[LANG], render: () => h('div', { class: 'panel' }, sec.fields.map(renderField)) })),
    { id: 'commands', group: 2, icon: '⌨️', label: t('commands'), sub: t('commandsSub'), render: commandsView },
    { id: 'schedules', group: 2, icon: '⏰', label: t('schedules'), sub: t('schedulesSub'), render: schedulesView },
    { id: 'announce', group: 2, icon: '📣', label: t('announce'), sub: t('announceSub'), render: announceView },
    { id: 'members', group: 2, icon: '👥', label: t('members2'), sub: t('membersSub'), render: membersView },
    { id: 'logs', group: 2, icon: '📜', label: t('logs'), sub: t('logsSub'), render: logsView },
    { id: 'backup', group: 2, icon: '💾', label: t('backup'), sub: t('backupSub'), render: backupView },
  ];
}

const shell = {};
function go(id, focusPath) {
  const view = views().find((v) => v.id === id) || views()[0];
  VIEW = view.id;
  timers.forEach((x) => clearInterval(x)); timers.clear();
  fieldEls.clear();
  window.onbeforeunload = () => (changed().length ? true : undefined);
  shell.main.replaceChildren(...[view.id === 'overview' ? null : h('header', { class: 'page-head' }, h('h2', {}, view.icon + ' ' + view.label), h('p', {}, view.sub)), view.render()].filter(Boolean));
  shell.nav.querySelectorAll('button[data-id]').forEach((b) => { b.classList.toggle('on', b.dataset.id === view.id); if (b.dataset.id === view.id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  closeMenu();
  if (view.id === 'overview') timers.add(setInterval(refreshStats, 20000));
  if (focusPath && fieldEls.get(focusPath)) {
    const el = fieldEls.get(focusPath);
    el.scrollIntoView({ block: 'center' }); el.classList.add('flash');
    const input = el.querySelector('input,select,textarea'); if (input) input.focus({ preventScroll: true });
  } else window.scrollTo(0, 0);
  try { history.replaceState(null, '', '#' + view.id); } catch (e) { /* mindegy */ }
}

async function refreshStats() {
  try { STATS = await api('/api/stats'); if (VIEW === 'overview') shell.main.replaceChildren(overview()); paintHeader(); } catch (e) { /* újrapróbál */ }
}

function openMenu() { shell.side.classList.add('open'); shell.scrim.classList.add('open'); shell.search.focus(); }
function closeMenu() { shell.side.classList.remove('open'); shell.scrim.classList.remove('open'); }

function drawNav(query) {
  const q = (query || '').trim().toLowerCase();
  if (q) {
    const hits = [];
    for (const sec of META.sections) for (const f of sec.fields) if (f.label[0].toLowerCase().includes(q) || f.label[1].toLowerCase().includes(q) || f.path.toLowerCase().includes(q)) hits.push({ sec, f });
    shell.nav.replaceChildren(...(hits.length ? hits.slice(0, 30).map(({ sec, f }) => h('button', { class: 'result', type: 'button', onclick: () => { shell.search.value = ''; drawNav(); go(sec.id, f.path); } }, f.label[LANG], h('small', {}, sec.label[LANG]))) : [h('p', { class: 'hint', style: 'padding:8px' }, t('noResults'))]));
    return;
  }
  const groups = [t('overview'), t('settings'), t('tools')];
  const items = []; let lastGroup = -1;
  for (const v of views()) {
    if (v.group !== lastGroup && v.group > 0) items.push(h('div', { class: 'group' }, groups[v.group]));
    lastGroup = v.group;
    items.push(h('button', { type: 'button', 'data-id': v.id, class: v.id === VIEW ? 'on' : '', onclick: () => go(v.id) }, h('span', { class: 'ico', 'aria-hidden': 'true' }, v.icon), h('span', {}, v.label, h('small', {}, v.sub))));
  }
  shell.nav.replaceChildren(...items);
}

function paintHeader() {
  const online = STATS ? STATS.bot.online : !META.startupError;
  const g = (STATS && STATS.guild) || META.guild;
  shell.who.replaceChildren(h('b', {}, g.name), h('span', {}, h('span', { class: 'light' + (online ? ' on' : '') }), online ? t('botOn') : t('botOff')));
  shell.avatar.replaceChildren();
  if (g.icon) shell.avatar.replaceWith(shell.avatar = h('img', { class: 'avatar', src: g.icon, alt: '' }));
  else shell.avatar.textContent = (g.name || '?').slice(0, 1);
}

// ---- Mentés ----
const bar = {};
function updateBar() {
  const n = changed().length;
  const show = n > 0 || META.savedSinceStart;
  bar.el.classList.toggle('show', show);
  bar.msg.textContent = n ? t('changes', { n }) : t('pending');
  bar.save.disabled = !n;
  bar.restart.disabled = !n && !META.savedSinceStart;
  bar.restart.textContent = n ? t('saveRestart') : t('restart');
}

async function waitForBot() {
  for (let i = 0; i < 60; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    try { const r = await fetch('/api/meta'); if (r.ok || r.status === 401) { location.reload(); return; } } catch (e) { /* még nem él */ }
  }
  location.reload();
}
async function restart(path, body) {
  window.onbeforeunload = null;
  document.body.append(h('div', { class: 'note', role: 'alert', style: 'position:fixed;inset:auto 16px 24px;z-index:50' }, t('restarting') + (META.pm2 ? '' : ' ' + t('noPm2'))));
  try { await api(path, body); } catch (e) { /* közben leállhat */ }
  waitForBot();
}
async function saveSettings(withRestart) {
  const values = Object.fromEntries(changed().map((k) => [k, VALUES[k]]));
  if (withRestart && !Object.keys(values).length) { restart('/api/restart', {}); return; }
  try {
    if (withRestart) { await restart('/api/settings', { values, restart: true }); return; }
    await api('/api/settings', { values, restart: false });
    ORIGINAL = JSON.parse(JSON.stringify(VALUES)); META.savedSinceStart = true;
    fieldEls.forEach((el) => { el.classList.remove('changed'); const b = el.querySelector('.revert'); if (b) b.hidden = true; });
    updateBar(); toast(t('saved'));
  } catch (e) {
    const fields = e.data && e.data.fields;
    toast(fields ? t('invalid') + fields.map((p) => { const f = META.sections.flatMap((x) => x.fields).find((x) => x.path === p); return f ? f.label[LANG] : p; }).join(', ') : t('error'), true);
  }
}

function build() {
  shell.avatar = h('div', { class: 'avatar' });
  shell.who = h('div', { class: 'who' });
  shell.search = h('input', { type: 'search', placeholder: t('search'), 'aria-label': t('search'), oninput: (e) => drawNav(e.target.value) });
  shell.nav = h('nav', { 'aria-label': t('settings') });
  shell.side = h('aside', { class: 'side' },
    h('div', { class: 'search' }, shell.search), shell.nav,
    h('div', { class: 'foot' },
      h('button', { class: 'btn ghost small', type: 'button', onclick: () => { LANG = 1 - LANG; try { localStorage.setItem('lang', LANG ? 'en' : 'hu'); } catch (e) { /* mindegy */ } build(); } }, t('lang')),
      h('form', { method: 'post', action: '/logout' }, h('button', { class: 'btn ghost small', type: 'submit' }, t('logout')))));
  shell.scrim = h('div', { class: 'scrim', onclick: closeMenu });
  shell.main = h('main', { id: 'main' });
  bar.msg = h('span', { class: 'msg', 'aria-live': 'polite' });
  bar.save = h('button', { class: 'btn ghost', type: 'button', onclick: () => saveSettings(false) }, t('save'));
  bar.restart = h('button', { class: 'btn', type: 'button', onclick: () => saveSettings(true) }, t('saveRestart'));
  bar.el = h('div', { class: 'bar' }, bar.msg, bar.save, bar.restart);
  document.documentElement.lang = LANG ? 'en' : 'hu';
  document.body.replaceChildren(...[window.BG_CANVAS || null,
    h('header', { class: 'top' }, h('button', { class: 'menu-btn', type: 'button', 'aria-label': 'Menu', onclick: openMenu }, h('i')), shell.avatar, shell.who),
    shell.side, shell.scrim, shell.main, h('div', { class: 'toasts' }), bar.el].filter(Boolean));
  drawNav(); paintHeader(); updateBar();
  go(VIEW);
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

Promise.all([api('/api/meta'), api('/api/stats').catch(() => null)]).then(([meta, stats]) => {
  META = meta; STATS = stats;
  VALUES = JSON.parse(JSON.stringify(meta.values)); ORIGINAL = JSON.parse(JSON.stringify(meta.values));
  const hash = location.hash.slice(1);
  if (hash) VIEW = hash;
  build();
}).catch(() => { document.body.replaceChildren(h('main', {}, h('div', { class: 'note bad' }, t('error')))); });
`;

function appPage() {
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#151730"><title>Vezérlőpult</title><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-192.png">${FONTS}<style>${STYLE}</style></head><body><main><p class="dim">…</p></main><script>${BG_SCRIPT}</script><script>${SCRIPT}</script></body></html>`;
}

module.exports = { loginPage, appPage };
