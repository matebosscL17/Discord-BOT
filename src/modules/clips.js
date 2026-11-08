const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, MessageFlags,
  PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { ChannelType } = require('discord.js');
const { findChannel, userError } = require('../channels');
const { ephemeral } = require('../utils');

const VOTE_EMOJI = '🔥';
const CARD_LABEL = '🎬 Klip';
const WINNER_PREFIX = 'A hét klipje • ';
const WEEK_MS = 7 * 24 * 3600000;
const HOUR_MS = 3600000;
const SCAN_LIMIT = 1000;
const cooldowns = new Map();

async function clipsChannel(guild) {
  const channel = await findChannel(guild, 'clips', {
    id: settings.clips.channelId, name: settings.clips.channelName, type: ChannelType.GuildText,
  });
  if (!channel) throw userError('A(z) klipek csatorna nincs beállítva. Szólj egy adminnak!');
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
  const url = parseClipUrl(interaction.options.getString('link', true));
  if (!url) {
    return void (await interaction.reply(ephemeral(
      `Érvénytelen link. Elfogadott oldalak: ${settings.clips.allowedDomains.join(', ')}`,
    )));
  }

  const waitMs = (cooldowns.get(interaction.user.id) ?? 0) + settings.clips.cooldownMinutes * 60000 - Date.now();
  if (waitMs > 0) {
    return void (await interaction.reply(ephemeral(`Következő klipet ${Math.ceil(waitMs / 60000)} perc múlva küldhetsz.`)));
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const channel = await clipsChannel(interaction.guild);
  const game = interaction.options.getString('jatek');
  const embed = new EmbedBuilder().setColor(settings.color)
    .setAuthor({ name: CARD_LABEL })
    .setTitle(interaction.options.getString('cim', true))
    .setDescription(`Beküldte: <@${interaction.user.id}>${game ? `\nJáték: ${game}` : ''}`)
    .setFooter({ text: `Szavazz a ${VOTE_EMOJI} reakcióval!` });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`clip:delete:${interaction.user.id}`).setLabel('Törlés')
      .setEmoji({ name: '🗑️' }).setStyle(ButtonStyle.Secondary),
  );

  const message = await channel.send({
    content: url, embeds: [embed], components: [row], allowedMentions: { parse: [] },
  });
  await message.react(VOTE_EMOJI);
  cooldowns.set(interaction.user.id, Date.now());
  await interaction.editReply(`Kikerült a klipfalra: ${message.url}`);
}

async function deleteClip(interaction, [authorId]) {
  if (!canDelete(interaction, authorId)) {
    return void (await interaction.reply(ephemeral('Ezt csak a beküldője vagy a csapat törölheti.')));
  }
  await interaction.message.delete();
  await interaction.reply(ephemeral('A klip törölve.'));
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
  if (own.some((message) => message.embeds[0]?.footer?.text === `${WINNER_PREFIX}${week}`)) {
    lastCheckedWeek = week;
    return;
  }

  const clips = own.filter((message) => message.embeds[0]?.author?.name === CARD_LABEL
    && message.createdTimestamp >= cutoff - WEEK_MS && message.createdTimestamp < cutoff);
  const top = clips.sort((a, b) => baseScore(b) - baseScore(a)).slice(0, 5);
  const scored = [];
  for (const message of top) scored.push({ message, score: await realScore(message) });
  const winner = scored.sort((a, b) => b.score - a.score)[0];

  lastCheckedWeek = week;
  if (!winner || winner.score < 1) return;

  const authorId = clipAuthorId(winner.message);
  const embed = new EmbedBuilder().setColor(settings.warningColor)
    .setTitle(`🏆 A hét klipje: ${winner.message.embeds[0].title}`.slice(0, 256))
    .setDescription(`Gratulálunk, <@${authorId}>! ${VOTE_EMOJI} ${winner.score} szavazat\n[Ugrás a kliphez](${winner.message.url})`)
    .setFooter({ text: `${WINNER_PREFIX}${week}` });
  await channel.send({
    content: winner.message.content, embeds: [embed], allowedMentions: { users: authorId ? [authorId] : [] },
  });
}

let warned = false;
function startWeeklyCheck(client) {
  const check = () => announceWinner(client).catch((error) => {
    if (error.userMessage && warned) return; // a hiányzó csatornát csak egyszer írja ki
    warned = true;
    console.error('Hét klipje hiba:', error.message);
  });
  check();
  setInterval(check, HOUR_MS);
}

module.exports = {
  commands: [
    new SlashCommandBuilder()
      .setName('klip')
      .setDescription('Klip beküldése a klipfalra')
      .addStringOption((option) => option.setName('link').setDescription('A klip linkje').setRequired(true).setMaxLength(500))
      .addStringOption((option) => option.setName('cim').setDescription('A klip címe').setRequired(true).setMaxLength(100))
      .addStringOption((option) => option.setName('jatek').setDescription('Melyik játék?')
        .addChoices(...settings.lfgGames.map((game) => ({ name: game.label, value: game.label })))),
  ],
  handlers: { klip: submitClip, 'clip:delete': deleteClip },
  events: { [Events.ClientReady]: startWeeklyCheck },
  lastWeeklyCutoff,
  parseClipUrl,
  announceWinner,
};
