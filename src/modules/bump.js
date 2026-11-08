const {
  EmbedBuilder, Events, GatewayIntentBits, MessageFlags, SlashCommandBuilder,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { readJson, writeJson } = require('../store');
const { named, translator } = require('../i18n');

// Bump-emlékeztető a DISBOARD-hoz. A bot NEM bumpol helyetted (azt a DISBOARD tiltja),
// csak észreveszi a sikeres bumpot, megköszöni, és 2 óra múlva szól, hogy újra lehet.
const tr = translator({
  hu: {
    thanksTitle: '🚀 Köszi a bumpot!',
    thanksBody: '<@{user}> felrakta a szervert a DISBOARD listára. Ez volt a(z) **{count}.** bumpja.\nKövetkező bump: {next}',
    reminderTitle: '⏰ Lehet bumpolni!',
    reminderBody: 'Írd be: **/bump**, és a szerver újra a lista elejére kerül. Minden bump több új tagot hoz! 🚀',
    lastBy: 'Legutóbb: <@{user}>',
    statsTitle: '🚀 Bump statisztika',
    next: '⏰ Következő bump',
    nowAvailable: 'Most lehet bumpolni! Írd be: /bump',
    total: '📈 Összes bump',
    top: '🏆 Legtöbb bump',
    noBumps: 'Még senki nem bumpolt.',
    disabled: 'A bump-emlékeztető ki van kapcsolva a settings.js fájlban.',
  },
  en: {
    thanksTitle: '🚀 Thanks for the bump!',
    thanksBody: '<@{user}> bumped the server on DISBOARD. That was their **#{count}** bump.\nNext bump: {next}',
    reminderTitle: '⏰ Time to bump!',
    reminderBody: 'Type **/bump** to push the server back to the top of the list. Every bump brings new members! 🚀',
    lastBy: 'Last bump by <@{user}>',
    statsTitle: '🚀 Bump statistics',
    next: '⏰ Next bump',
    nowAvailable: 'You can bump now! Type /bump',
    total: '📈 Total bumps',
    top: '🏆 Most bumps',
    noBumps: 'Nobody has bumped yet.',
    disabled: 'The bump reminder is turned off in settings.js.',
  },
});

const bumpSettings = settings.bump ?? {};
const enabled = () => bumpSettings.enabled !== false;
const INTERVAL_MS = (bumpSettings.intervalMinutes ?? 120) * 60000;
const FILE = 'bump';
const MEDALS = ['🥇', '🥈', '🥉'];

const load = () => readJson(FILE, {
  nextAt: 0, reminded: true, channelId: null, lastUserId: null, counts: {}, total: 0,
});
const save = (state) => writeJson(FILE, state);

let timer = null;
const relative = (ms) => `<t:${Math.floor(ms / 1000)}:R>`;

function isDisboard(user) {
  if (!user?.bot) return false;
  return user.id === String(bumpSettings.disboardId ?? '') || user.username === 'DISBOARD';
}

// Ki futtatta a parancsot, amire a DISBOARD válaszolt. Az üzenet tartalmát a bot nem olvassa.
function bumperOf(message) {
  const meta = message.interactionMetadata ?? message.interaction;
  return meta?.user?.id ?? null;
}

async function sendReminder(client) {
  const state = load();
  if (state.reminded) return;
  const channelId = bumpSettings.channelId || state.channelId;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder().setColor(settings.successColor)
    .setTitle(tr.server('reminderTitle'))
    .setDescription(state.lastUserId
      ? `${tr.server('reminderBody')}\n\n${tr.server('lastBy', { user: state.lastUserId })}`
      : tr.server('reminderBody'));
  const role = bumpSettings.pingRoleId;
  await channel.send({
    content: role ? `<@&${role}>` : undefined,
    embeds: [embed],
    allowedMentions: { roles: role ? [role] : [] },
  });
  state.reminded = true;
  save(state);
}

// Időzítés a következő bump idejére. Újraindítás után is a mentett időpontból számol.
function schedule(client) {
  clearTimeout(timer);
  const state = load();
  if (state.reminded || !state.nextAt) return;
  const wait = Math.max(0, state.nextAt - Date.now());
  timer = setTimeout(() => sendReminder(client).catch((error) => console.error('Bump emlékeztető hiba:', error.message)), wait);
  timer.unref?.();
}

async function onMessage(message) {
  if (!enabled() || message.guild?.id !== config.guildId || !isDisboard(message.author)) return;
  const userId = bumperOf(message);
  if (!userId) return;

  // A DISBOARD 2 óránként enged bumpolni: ha ennél hamarabb válaszol, az nem sikeres bump volt.
  const state = load();
  const now = Date.now();
  if (state.nextAt && now < state.nextAt - 60000) return;

  state.counts[userId] = (state.counts[userId] ?? 0) + 1;
  state.total += 1;
  state.lastUserId = userId;
  state.channelId = message.channelId;
  state.nextAt = now + INTERVAL_MS;
  state.reminded = false;
  save(state);

  const embed = new EmbedBuilder().setColor(settings.color)
    .setTitle(tr.server('thanksTitle'))
    .setDescription(tr.server('thanksBody', { user: userId, count: state.counts[userId], next: relative(state.nextAt) }));
  await message.channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
  schedule(message.client);
}

async function onReady(client) {
  if (!enabled()) return;
  const state = load();
  // Ha leállás alatt járt le, rögtön szól.
  if (!state.reminded && state.nextAt && state.nextAt <= Date.now()) await sendReminder(client).catch(() => {});
  else schedule(client);
}

async function stats(interaction) {
  const t = tr.user(interaction);
  if (!enabled()) return void (await interaction.reply({ content: t('disabled'), flags: MessageFlags.Ephemeral }));
  const state = load();
  const top = Object.entries(state.counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([id, count], index) => `${MEDALS[index] ?? `**${index + 1}.**`} <@${id}> • ${count}`).join('\n');
  const next = !state.nextAt || state.nextAt <= Date.now() ? t('nowAvailable') : relative(state.nextAt);
  const embed = new EmbedBuilder().setColor(settings.color).setTitle(t('statsTitle'))
    .addFields(
      { name: t('next'), value: next, inline: true },
      { name: t('total'), value: String(state.total), inline: true },
      { name: t('top'), value: top || t('noBumps') },
    );
  if (state.lastUserId) embed.setDescription(t('lastBy', { user: state.lastUserId }));
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

module.exports = {
  intents: () => (enabled() ? [GatewayIntentBits.GuildMessages] : []),
  events: { [Events.MessageCreate]: onMessage, [Events.ClientReady]: onReady },
  commands: [
    named(new SlashCommandBuilder(), ['bumps', 'Bump leaderboard and next bump time'],
      ['bumpok', 'Bump ranglista és a következő bump ideje']),
  ],
  handlers: { bumps: stats },
  _internal: { isDisboard, load, sendReminder },
};
