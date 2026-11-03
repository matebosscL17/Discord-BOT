const fs = require('node:fs');
const path = require('node:path');
const { ActivityType, Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const config = require('./src/config');
const settings = require('./settings');
const { errorMessage } = require('./src/utils');

// Minden .js fájl a src/modules mappából automatikusan betöltődik.
// Ha egy modul hibás, a többi akkor is elindul.
const modulesDir = path.join(__dirname, 'src', 'modules');
const modules = [];
for (const file of fs.readdirSync(modulesDir).filter((name) => name.endsWith('.js')).sort()) {
  try {
    modules.push({ file, ...require(path.join(modulesDir, file)) });
  } catch (error) {
    console.error(`Nem sikerült betölteni: ${file}`, error);
  }
}

const handlers = new Map();
for (const { file, handlers: moduleHandlers = {} } of modules) {
  for (const [key, handler] of Object.entries(moduleHandlers)) {
    if (handlers.has(key)) console.warn(`Ütközés: a(z) "${key}" kétszer szerepel (${file}).`);
    handlers.set(key, handler);
  }
}
const commands = modules.flatMap((module) => (module.commands ?? []).map((command) => command.toJSON()));

const intents = new Set([GatewayIntentBits.Guilds]);
for (const module of modules) (module.intents?.() ?? []).forEach((intent) => intents.add(intent));

const client = new Client({
  intents: [...intents],
  presence: { activities: [{ name: settings.status, type: ActivityType.Watching }] },
});
const context = { commands };

// "ticket:open:hiba" esetén a "ticket:open" kezelő fut, és a "hiba" paraméterként érkezik.
function resolveHandler(id) {
  const parts = id.split(':');
  for (let length = parts.length; length > 0; length -= 1) {
    const handler = handlers.get(parts.slice(0, length).join(':'));
    if (handler) return { handler, args: parts.slice(length) };
  }
  return null;
}

client.once(Events.ClientReady, async (readyClient) => {
  try {
    await readyClient.application.commands.set(commands, config.guildId);
    console.log(`A bot elindult: ${readyClient.user.tag}`);
    console.log(`Modulok: ${modules.map((module) => module.file).join(', ')}`);
    console.log(`Parancsok: ${commands.length}`);
  } catch (error) {
    console.error('Nem sikerült regisztrálni a parancsokat. Jó a GUILD_ID?', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  const id = interaction.isChatInputCommand() ? interaction.commandName : interaction.customId;
  if (!id || !interaction.inGuild()) return;
  const match = resolveHandler(id);
  if (!match) return;

  try {
    await match.handler(interaction, match.args, context);
  } catch (error) {
    // A Discord 3 másodpercet ad a válaszra. Ha lejárt, erre már válaszolni sem lehet.
    if (error.code === 10062) {
      console.warn(`Késett a válasz (${id}). Lassú a net, vagy a bot két helyen fut egyszerre.`);
      return;
    }
    console.error(`Hiba itt: ${id}`, error);
    const message = errorMessage(error);
    const send = interaction.deferred || interaction.replied
      ? interaction.editReply(message)
      : interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    await send.catch(console.error);
  }
});

for (const { events = {} } of modules) {
  for (const [event, listener] of Object.entries(events)) {
    client.on(event, (...args) => Promise.resolve(listener(...args)).catch(console.error));
  }
}

client.on(Events.Error, console.error);
process.on('unhandledRejection', console.error);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await client.destroy();
    process.exit(0);
  });
}

client.login(config.token).catch((error) => {
  if (/disallowed intents/i.test(error.message)) {
    console.error('Be kell kapcsolni egy intentet a Discord fejlesztői oldalán, a Bot fülön: '
      + 'SERVER MEMBERS INTENT (üdvözléshez, alaprangnál) vagy MESSAGE CONTENT INTENT (ticket mentéshez).');
  } else if (error.code === 'TokenInvalid') {
    console.error('Rossz a token. Kérj újat a Reset Token gombbal, és írd be újra.');
  } else {
    console.error('Nem sikerült elindulni:', error);
  }
  process.exit(1);
});
