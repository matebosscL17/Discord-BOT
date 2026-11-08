const { AttachmentBuilder } = require('discord.js');
const { serverLang } = require('./i18n');

const MAX_MESSAGES = 2000;

const escape = (text = '') => String(text)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const formatTime = (date) => date.toLocaleString(serverLang() === 'en' ? 'en-GB' : 'hu-HU', { timeZone: 'Europe/Budapest' });

async function fetchAll(channel) {
  const messages = [];
  let before;
  while (messages.length < MAX_MESSAGES) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
  }
  return messages.reverse();
}

function renderMessage(message) {
  const embeds = message.embeds.map((embed) => {
    const fields = (embed.fields ?? [])
      .map((field) => `<div class="field"><b>${escape(field.name)}</b><br>${escape(field.value)}</div>`).join('');
    return `<div class="embed">${embed.title ? `<b>${escape(embed.title)}</b>` : ''}`
      + `${embed.description ? `<p>${escape(embed.description)}</p>` : ''}${fields}</div>`;
  }).join('');
  const files = [...message.attachments.values()]
    .map((file) => `<a class="file" href="${escape(file.url)}">📎 ${escape(file.name)}</a>`).join('');
  return `<div class="msg${message.author.bot ? ' bot' : ''}">
  <div class="head"><span class="name">${escape(message.author.username)}</span>`
    + `<span class="time">${escape(formatTime(message.createdAt))}</span></div>
  ${message.content ? `<div class="text">${escape(message.content)}</div>` : ''}${embeds}${files}
</div>`;
}

// Böngészőben megnyitható mentés a ticketről.
async function buildTranscript(channel, info) {
  const messages = await fetchAll(channel);
  const rows = Object.entries(info)
    .map(([label, value]) => `<div><span>${escape(label)}</span>${escape(value)}</div>`).join('');
  const html = `<!doctype html>
<html lang="${serverLang()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(channel.name)}</title>
<style>
body{margin:0;background:#313338;color:#dbdee1;font:15px/1.45 system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:8px 0 12px}
.info{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;background:#2b2d31;border-radius:8px;padding:12px;margin-bottom:16px}
.info span{display:block;color:#949ba4;font-size:12px}
.msg{padding:8px 4px;border-bottom:1px solid #3f4147}
.head{display:flex;gap:8px;align-items:baseline}
.name{font-weight:600;color:#f2f3f5}.bot .name{color:#949cf7}
.time{font-size:12px;color:#949ba4}
.text{white-space:pre-wrap;word-break:break-word}
.embed{border-left:4px solid #5865f2;background:#2b2d31;border-radius:4px;padding:8px 12px;margin-top:6px;white-space:pre-wrap}
.embed p{margin:4px 0}.field{margin-top:6px}
.file{display:inline-block;margin-top:6px;color:#00a8fc}
</style></head><body><main>
<h1>${escape(channel.name)}</h1>
<div class="info">${rows}<div><span>${serverLang() === 'en' ? 'Messages' : 'Üzenetek'}</span>${messages.length}</div></div>
${messages.map(renderMessage).join('\n')}
</main></body></html>`;
  return new AttachmentBuilder(Buffer.from(html, 'utf8'), { name: `${channel.name.replace(/[^\w-]/g, '') || 'ticket'}.html` });
}

module.exports = { buildTranscript, escape };
