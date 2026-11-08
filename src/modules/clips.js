const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, Events, MessageFlags,
  PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { findChannel, userError } = require('../channels');
const { ephemeral } = require('../utils');
const {
  choice, langOf, named, translator,
} = require('../i18n');

const tr = translator({
  hu: {
    notSet: 'A(z) klipek csatorna nincs beállítva. Szólj egy adminnak!',
    badLink: 'Érvénytelen link. Elfogadott oldalak: {sites}',
    wait: 'Következő klipet {minutes} perc múlva küldhetsz.',
    card: '🎬 Klip',
    sentBy: 'Beküldte: <@{user}>',
    game: 'Játék: {game}',
    vote: 'Szavazz a {emoji} reakcióval!',
    delete: 'Törlés',
    posted: 'Kikerült a klipfalra: {url}',
    noDelete: 'Ezt csak a beküldője vagy a csapat törölheti.',
    deleted: 'A klip törölve.',
    winnerPrefix: 'A hét klipje • ',
    winnerTitle: '🏆 A hét klipje: {title}',
    winnerBody: 'Gratulálunk, <@{user}>! {emoji} {score} szavazat\n[Ugrás a kliphez]({url})',
    thread: '💬 {title}',
    topTitle: '🏆 Legjobb klipek: {period}',
    topEmpty: 'Ebben az időszakban még nem volt klip.',
    topLine: '**{place}.** [{title}]({url}) • <@{user}> • {emoji} {score}',
    period7: 'utolsó 7 nap',
    period30: 'utolsó 30 nap',
  },
  en: {
    notSet: 'The clips channel is not set up. Ask an admin!',
    badLink: 'Invalid link. Accepted sites: {sites}',
    wait: 'You can send your next clip in {minutes} minutes.',
    card: '🎬 Clip',
    sentBy: 'Sent by: <@{user}>',
    game: 'Game: {game}',
    vote: 'Vote with the {emoji} reaction!',
    delete: 'Delete',
    posted: 'Posted to the clip wall: {url}',
    noDelete: 'Only the sender or the team can delete this.',
    deleted: 'The clip was deleted.',
    winnerPrefix: 'Clip of the week • ',
    winnerTitle: '🏆 Clip of the week: {title}',
    winnerBody: 'Congratulations, <@{user}>! {emoji} {score} votes\n[Go to the clip]({url})',
    thread: '💬 {title}',
    topTitle: '🏆 Top clips: {period}',
    topEmpty: 'There were no clips in this period yet.',
    topLine: '**{place}.** [{title}]({url}) • <@{user}> • {emoji} {score}',
    period7: 'last 7 days',
    period30: 'last 30 days',
  },
});

// Mindkét nyelvű kártyát és kihirdetést felismeri, így nyelvváltás után is jól számol.
const CARD_LABELS = [tr.lang('hu', 'card'), tr.lang('en', 'card')];
const WINNER_PREFIXES = [tr.lang('hu', 'winnerPrefix'), tr.lang('en', 'winnerPrefix')];

const VOTE_EMOJI = '🔥';
const WEEK_MS = 7 * 24 * 3600000;
const HOUR_MS = 3600000;
const SCAN_LIMIT = 1000;
const cooldowns = new Map();

async function clipsChannel(guild) {
  const channel = await findChannel(guild, 'clips', {
    id: settings.clips.channelId, name: settings.clips.channelName, type: ChannelType.GuildText,
  });
  if (!channel) throw userError(tr.lang('hu', 'notSet'), tr.lang('en', 'notSet'));
  return channel;
}
let lastCheckedWeek = null;

function parseClipUrl(text) {
  let url;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const allowed = settings.clips.allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  return url.protocol === 'https:' && allowed ? url.href : null;
}

const canDelete = (interaction, authorId) => interaction.user.id === authorId
  || interaction.member.roles.cache.has(config.supportRoleId)
  || interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages);

async function submitClip(interaction) {
  const t = tr.user(interaction);
  const url = parseClipUrl(interaction.options.getString('link', true));
  if (!url) {
    return void (await interaction.reply(ephemeral(t('badLink', { sites: settings.clips.allowedDomains.join(', ') }))));
  }

  const waitMs = (cooldowns.get(interaction.user.id) ?? 0) + settings.clips.cooldownMinutes * 60000 - Date.now();
  if (waitMs > 0) {
    return void (await interaction.reply(ephemeral(t('wait', { minutes: Math.ceil(waitMs / 60000) }))));
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const channel = await clipsChannel(interaction.guild);
  const game = interaction.options.getString('game');
  // A kártya a beküldő nyelvén jelenik meg.
  const T = tr.as(langOf(interaction.locale));
  const sentBy = T('sentBy', { user: interaction.user.id });
  const embed = new EmbedBuilder().setColor(settings.color)
    .setAuthor({ name: T('card') })
    .setTitle(interaction.options.getString('title', true))
    .setDescription(game ? `${sentBy}\n${T('game', { game })}` : sentBy)
    .setFooter({ text: T('vote', { emoji: VOTE_EMOJI }) });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`clip:delete:${interaction.user.id}`).setLabel(T('delete'))
      .setEmoji({ name: '🗑️' }).setStyle(ButtonStyle.Secondary),
  );

  const message = await channel.send({
    content: url, embeds: [embed], components: [row], allowedMentions: { parse: [] },
  });
  await message.react(VOTE_EMOJI);
  // Kommentszál a kliphez. Ha a botnak nincs joga szálat nyitni, egyszerűen kimarad.
  await message.startThread?.({ name: T('thread', { title: interaction.options.getString('title', true) }).slice(0, 100), autoArchiveDuration: 4320 })
    .catch(() => {});
  cooldowns.set(interaction.user.id, Date.now());
  await interaction.editReply(t('posted', { url: message.url }));
}

async function deleteClip(interaction, [authorId]) {
  const t = tr.user(interaction);
  if (!canDelete(interaction, authorId)) return void (await interaction.reply(ephemeral(t('noDelete'))));
  await interaction.message.delete();
  await interaction.reply(ephemeral(t('deleted')));
}

// A legutóbbi hétfő 18:00 budapesti idő szerint.
function lastWeeklyCutoff(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Budapest', hourCycle: 'h23', weekday: 'short', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const year = Number(parts.year);
  const month = Number(parts.month) - 1;
  const day = Number(parts.day);
  const localNow = Date.UTC(year, month, day, Number(parts.hour), Number(parts.minute), Number(parts.second));
  const offset = localNow - Math.floor(now.getTime() / 1000) * 1000;
  const daysSinceMonday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday);
  let cutoff = Date.UTC(year, month, day - daysSinceMonday, 18);
  if (localNow < cutoff) cutoff -= WEEK_MS;
  return cutoff - offset;
}

async function recentMessages(channel, oldest) {
  const messages = [];
  let before;
  while (messages.length < SCAN_LIMIT) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
    if (batch.last().createdTimestamp < oldest) break;
  }
  return messages;
}

const clipAuthorId = (message) => message.embeds[0]?.description?.match(/<@(\d+)>/)?.[1];
const voteReaction = (message) => message.reactions.cache.find((reaction) => reaction.emoji.name === VOTE_EMOJI);
const baseScore = (message) => Math.max((voteReaction(message)?.count ?? 1) - 1, 0); // a bot saját reakciója nem számít

async function realScore(message) {
  const reaction = voteReaction(message);
  if (!reaction) return 0;
  const voters = await reaction.users.fetch({ limit: 100 });
  return baseScore(message) - (voters.has(clipAuthorId(message)) ? 1 : 0); // magára nem szavazhat
}

async function announceWinner(client) {
  const cutoff = lastWeeklyCutoff();
  const week = new Date(cutoff).toISOString().slice(0, 10);
  if (lastCheckedWeek === week) return;

  const guild = await client.guilds.fetch(config.guildId);
  const channel = await clipsChannel(guild);
  const messages = await recentMessages(channel, cutoff - WEEK_MS);
  const own = messages.filter((message) => message.author.id === client.user.id);

  // Az üzenetekből derül ki, hogy kihirdetésre került-e már, így újraindításkor sem ismétel.
  if (own.some((message) => WINNER_PREFIXES.some((prefix) => message.embeds[0]?.footer?.text === `${prefix}${week}`))) {
    lastCheckedWeek = week;
    return;
  }

  const clips = own.filter((message) => CARD_LABELS.includes(message.embeds[0]?.author?.name)
    && message.createdTimestamp >= cutoff - WEEK_MS && message.createdTimestamp < cutoff);
  const top = clips.sort((a, b) => baseScore(b) - baseScore(a)).slice(0, 5);
  const scored = [];
  for (const message of top) scored.push({ message, score: await realScore(message) });
  const winner = scored.sort((a, b) => b.score - a.score)[0];

  lastCheckedWeek = week;
  if (!winner || winner.score < 1) return;

  const authorId = clipAuthorId(winner.message);
  // A kihirdetés a győztes klip kártyájának nyelvén jelenik meg.
  const T = tr.as(winner.message.embeds[0]?.author?.name === tr.lang('en', 'card') ? 'en' : 'hu');
  const embed = new EmbedBuilder().setColor(settings.warningColor)
    .setTitle(T('winnerTitle', { title: winner.message.embeds[0].title }).slice(0, 256))
    .setDescription(T('winnerBody', {
      user: authorId, emoji: VOTE_EMOJI, score: winner.score, url: winner.message.url,
    }))
    .setFooter({ text: `${T('winnerPrefix')}${week}` });
  await channel.send({
    content: winner.message.content, embeds: [embed], allowedMentions: { users: authorId ? [authorId] : [] },
  });
}

let warned = false;
function startWeeklyCheck(client) {
  const check = () => announceWinner(client).catch((error) => {
    if (error.userMessages && warned) return; // a hiányzó csatornát csak egyszer írja ki
    warned = true;
    console.error('Hét klipje hiba:', error.message);
  });
  check();
  setInterval(check, HOUR_MS);
}

const MEDALS = ['🥇', '🥈', '🥉'];

// Toplista: az elmúlt 7 vagy 30 nap klipjei 🔥 szerint. A beküldő saját szavazata itt nem számít bele.
async function topClips(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const days = Number(interaction.options.getString('period') ?? '7');
  const since = Date.now() - days * 24 * HOUR_MS;
  const channel = await clipsChannel(interaction.guild);
  const messages = await recentMessages(channel, since);
  const clips = messages.filter((message) => message.author.id === interaction.client.user.id
    && CARD_LABELS.includes(message.embeds[0]?.author?.name) && message.createdTimestamp >= since);
  const top = clips.sort((a, b) => baseScore(b) - baseScore(a)).slice(0, 15);
  const scored = [];
  for (const message of top) scored.push({ message, score: await realScore(message) });
  const best = scored.sort((a, b) => b.score - a.score).slice(0, 10);

  const lines = best.map(({ message, score }, index) => t('topLine', {
    place: MEDALS[index] ?? index + 1,
    title: message.embeds[0].title,
    url: message.url,
    user: clipAuthorId(message),
    emoji: VOTE_EMOJI,
    score,
  }).replace(/^\*\*(🥇|🥈|🥉)\.\*\*/, '$1'));
  const embed = new EmbedBuilder().setColor(settings.warningColor)
    .setTitle(t('topTitle', { period: t(`period${days}`) }))
    .setDescription(lines.join('\n') || t('topEmpty'));
  await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
}

module.exports = {
  commands: [
    named(new SlashCommandBuilder(), ['clip', 'Send a clip to the clip wall'], ['klip', 'Klip beküldése a klipfalra'])
      .addStringOption((option) => named(option, ['link', 'Link to the clip'], ['link', 'A klip linkje'])
        .setRequired(true).setMaxLength(500))
      .addStringOption((option) => named(option, ['title', 'Title of the clip'], ['cim', 'A klip címe'])
        .setRequired(true).setMaxLength(100))
      .addStringOption((option) => named(option, ['game', 'Which game?'], ['jatek', 'Melyik játék?'])
        .addChoices(...settings.lfgGames.map((game) => choice(game.label, game.labelEn ?? game.label, game.label)))),
    named(new SlashCommandBuilder(), ['cliptop', 'The best clips by votes'], ['kliptop', 'A legjobb klipek a szavazatok alapján'])
      .addStringOption((option) => named(option, ['period', 'Which period?'], ['idoszak', 'Melyik időszak?'])
        .addChoices(choice('7', 'Last 7 days', 'Utolsó 7 nap'), choice('30', 'Last 30 days', 'Utolsó 30 nap'))),
  ],
  handlers: { clip: submitClip, cliptop: topClips, 'clip:delete': deleteClip },
  events: { [Events.ClientReady]: startWeeklyCheck },
  lastWeeklyCutoff,
  parseClipUrl,
  announceWinner,
};
