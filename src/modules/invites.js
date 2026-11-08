const {
  EmbedBuilder, Events, GatewayIntentBits, MessageFlags, SlashCommandBuilder,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { sendLog } = require('../utils');
const { readJson, writeJson } = require('../store');
const { named, translator } = require('../i18n');

// Meghívás-követő: belépéskor összehasonlítja a meghívók használatát, így kiderül, ki hívta meg az új tagot.
// A belépés és kilépés eseménynél nincs kezdeményező, ezért ezek a szerver nyelvén mennek.
const tr = translator({
  hu: {
    joined: '📥 <@{member}> csatlakozott, meghívta: <@{inviter}> ({count} meghívás)',
    joinedVanity: '📥 <@{member}> csatlakozott az egyedi meghívó linkkel.',
    joinedUnknown: '📥 <@{member}> csatlakozott, de nem derült ki, ki hívta meg.',
    fakeNote: ' ⚠️ friss fiók, nem számít bele',
    logTitle: '📨 Meghívás',
    reward: '🎁 <@{user}> elérte a(z) {count} meghívást, és megkapta a(z) <@&{role}> rangot!',
    statsTitle: '📨 {name} meghívásai',
    valid: '✅ Érvényes',
    regular: '📥 Összes belépett',
    left: '📤 Kilépett',
    fake: '⚠️ Friss fiók',
    invitedBy: '👤 Őt meghívta',
    nobody: 'ismeretlen',
    nextReward: '🎁 Következő jutalom',
    nextRewardValue: '<@&{role}> még {left} meghívás múlva',
    topTitle: '🏆 Legtöbb meghívás',
    topEmpty: 'Még senki nem hívott meg senkit.',
    topLine: '{place} <@{user}> • **{valid}** ({regular} belépett, {left} kilépett)',
    disabled: 'A meghívás-követő ki van kapcsolva a settings.js fájlban.',
  },
  en: {
    joined: '📥 <@{member}> joined, invited by <@{inviter}> ({count} invites)',
    joinedVanity: '📥 <@{member}> joined with the custom invite link.',
    joinedUnknown: '📥 <@{member}> joined, but the inviter could not be found.',
    fakeNote: ' ⚠️ new account, not counted',
    logTitle: '📨 Invite',
    reward: '🎁 <@{user}> reached {count} invites and got the <@&{role}> role!',
    statsTitle: "📨 {name}'s invites",
    valid: '✅ Valid',
    regular: '📥 Total joined',
    left: '📤 Left',
    fake: '⚠️ New accounts',
    invitedBy: '👤 Invited by',
    nobody: 'unknown',
    nextReward: '🎁 Next reward',
    nextRewardValue: '<@&{role}> in {left} more invites',
    topTitle: '🏆 Most invites',
    topEmpty: 'Nobody has invited anyone yet.',
    topLine: '{place} <@{user}> • **{valid}** ({regular} joined, {left} left)',
    disabled: 'The invite tracker is turned off in settings.js.',
  },
});

const inviteSettings = settings.invites ?? {};
const enabled = () => inviteSettings.enabled !== false;
const FILE = 'invites';
const MEDALS = ['🥇', '🥈', '🥉'];
const DAY_MS = 86400000;

const load = () => readJson(FILE, { members: {}, inviters: {} });
const save = (data) => writeJson(FILE, data);

// meghívókód -> { uses, inviterId }
let inviteCache = new Map();
let vanityUses = null;

const statsOf = (data, userId) => data.inviters[userId] ?? { regular: 0, left: 0, fake: 0 };
const validCount = (stats) => Math.max(0, stats.regular - stats.left - stats.fake);

async function snapshot(guild) {
  const invites = await guild.invites.fetch().catch(() => null);
  const map = new Map();
  for (const invite of invites?.values?.() ?? []) map.set(invite.code, { uses: invite.uses ?? 0, inviterId: invite.inviterId ?? invite.inviter?.id });
  const vanity = await guild.fetchVanityData?.().catch(() => null);
  return { map, vanity: vanity?.uses ?? null, ok: Boolean(invites) };
}

async function onReady(client) {
  if (!enabled()) return;
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) return;
  const result = await snapshot(guild);
  if (!result.ok) console.warn('Meghívás-követő: a botnak "Szerver kezelése" jog kell a meghívók olvasásához.');
  inviteCache = result.map;
  vanityUses = result.vanity;
}

function onInviteCreate(invite) {
  if (invite.guild?.id !== config.guildId) return;
  inviteCache.set(invite.code, { uses: invite.uses ?? 0, inviterId: invite.inviterId ?? invite.inviter?.id });
}

function onInviteDelete(invite) {
  inviteCache.delete(invite.code);
}

// Melyik meghívó használata nőtt a legutóbbi állapot óta.
function findUsedInvite(before, after) {
  for (const [code, now] of after) {
    const old = before.get(code);
    if (now.uses > (old?.uses ?? 0)) return { code, inviterId: now.inviterId };
  }
  // Egyszer használatos meghívó: a használat után eltűnik a listából.
  const vanished = [...before.keys()].filter((code) => !after.has(code));
  if (vanished.length === 1) return { code: vanished[0], inviterId: before.get(vanished[0]).inviterId };
  return null;
}

async function giveRewards(guild, inviterId, data) {
  const valid = validCount(statsOf(data, inviterId));
  const member = await guild.members.fetch(inviterId).catch(() => null);
  if (!member) return [];
  const given = [];
  for (const reward of inviteSettings.rewards ?? []) {
    if (!reward.roleId || valid < reward.count || member.roles.cache.has(reward.roleId)) continue;
    const ok = await member.roles.add(reward.roleId, 'Meghívás jutalom').then(() => true).catch(() => false);
    if (ok) given.push(reward);
  }
  return given;
}

async function announce(guild, text) {
  await sendLog(guild, { title: tr.server('logTitle'), description: text, color: settings.successColor });
  if (!inviteSettings.channelId) return;
  const channel = await guild.channels.fetch(inviteSettings.channelId).catch(() => null);
  await channel?.send({ content: text, allowedMentions: { parse: [] } }).catch(() => {});
}

// A belépéseket egymás után dolgozza fel, különben két gyors belépés összekeveredhetne.
let joinQueue = Promise.resolve();
function onJoin(member) {
  joinQueue = joinQueue.then(() => handleJoin(member)).catch((error) => console.error('Meghívás-követő hiba:', error.message));
  return joinQueue;
}

async function handleJoin(member) {
  if (!enabled() || member.guild.id !== config.guildId || member.user.bot) return;
  const { guild } = member;
  const before = inviteCache;
  const beforeVanity = vanityUses;
  const result = await snapshot(guild);
  if (!result.ok) return;
  const used = findUsedInvite(before, result.map);

  // Ha közben többen is beléptek, a többi használatot "függőben" hagyja a következő belépőnek:
  // csak a most megtalált meghívó használata nő eggyel, a többi a régi értéken marad.
  const next = new Map();
  for (const [code, now] of result.map) {
    const old = before.get(code);
    if (code === used?.code) next.set(code, { ...now, uses: (old?.uses ?? 0) + 1 });
    else if (old && now.uses > old.uses) next.set(code, { ...now, uses: old.uses });
    else if (!old && now.uses > 0) next.set(code, { ...now, uses: 0 });
    else next.set(code, now);
  }
  inviteCache = next;
  const viaVanity = !used && beforeVanity !== null && result.vanity !== null && result.vanity > beforeVanity;
  vanityUses = viaVanity ? beforeVanity + 1 : (used ? beforeVanity : result.vanity);

  const data = load();
  const isFake = Date.now() - member.user.createdTimestamp < (inviteSettings.fakeAccountDays ?? 7) * DAY_MS;

  if (!used?.inviterId) {
    data.members[member.id] = { inviterId: null, code: viaVanity ? 'vanity' : null, at: Date.now() };
    save(data);
    await announce(guild, tr.server(viaVanity ? 'joinedVanity' : 'joinedUnknown', { member: member.id }));
    return;
  }

  // Aki kilépett és visszajön ugyanattól, az nem számít újra.
  const previous = data.members[member.id];
  const stats = statsOf(data, used.inviterId);
  if (previous?.inviterId === used.inviterId && previous.left) {
    stats.left = Math.max(0, stats.left - 1);
  } else {
    stats.regular += 1;
    if (isFake) stats.fake += 1;
  }
  data.inviters[used.inviterId] = stats;
  data.members[member.id] = {
    inviterId: used.inviterId, code: used.code, at: Date.now(), fake: isFake, left: false,
  };
  save(data);

  const text = tr.server('joined', { member: member.id, inviter: used.inviterId, count: validCount(stats) })
    + (isFake ? tr.server('fakeNote') : '');
  await announce(guild, text);
  for (const reward of await giveRewards(guild, used.inviterId, data)) {
    await announce(guild, tr.server('reward', { user: used.inviterId, count: reward.count, role: reward.roleId }));
  }
}

async function onLeave(member) {
  if (!enabled() || member.guild.id !== config.guildId) return;
  const data = load();
  const record = data.members[member.id];
  if (!record?.inviterId || record.left) return;
  const stats = statsOf(data, record.inviterId);
  stats.left += 1;
  if (record.fake) stats.fake = Math.max(0, stats.fake - 1); // a kilépett friss fiók csak egyszer vonódjon le
  data.inviters[record.inviterId] = stats;
  record.left = true;
  save(data);
}

async function showInvites(interaction) {
  const t = tr.user(interaction);
  if (!enabled()) return void (await interaction.reply({ content: t('disabled'), flags: MessageFlags.Ephemeral }));
  const user = interaction.options.getUser('member') ?? interaction.user;
  const data = load();
  const stats = statsOf(data, user.id);
  const valid = validCount(stats);
  const invitedBy = data.members[user.id]?.inviterId;

  const embed = new EmbedBuilder().setColor(settings.color)
    .setTitle(t('statsTitle', { name: user.username }))
    .setThumbnail(user.displayAvatarURL?.() ?? null)
    .addFields(
      { name: t('valid'), value: `**${valid}**`, inline: true },
      { name: t('regular'), value: String(stats.regular), inline: true },
      { name: t('left'), value: String(stats.left), inline: true },
      { name: t('fake'), value: String(stats.fake), inline: true },
      { name: t('invitedBy'), value: invitedBy ? `<@${invitedBy}>` : t('nobody'), inline: true },
    );
  const next = (inviteSettings.rewards ?? []).filter((reward) => reward.roleId && reward.count > valid)
    .sort((a, b) => a.count - b.count)[0];
  if (next) embed.addFields({ name: t('nextReward'), value: t('nextRewardValue', { role: next.roleId, left: next.count - valid }) });
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

async function showTop(interaction) {
  const t = tr.user(interaction);
  if (!enabled()) return void (await interaction.reply({ content: t('disabled'), flags: MessageFlags.Ephemeral }));
  const data = load();
  const lines = Object.entries(data.inviters)
    .map(([user, stats]) => ({ user, stats, valid: validCount(stats) }))
    .filter((item) => item.stats.regular > 0)
    .sort((a, b) => b.valid - a.valid || b.stats.regular - a.stats.regular)
    .slice(0, 10)
    .map((item, index) => t('topLine', {
      place: MEDALS[index] ?? `**${index + 1}.**`, user: item.user, valid: item.valid, regular: item.stats.regular, left: item.stats.left,
    }));
  const embed = new EmbedBuilder().setColor(settings.warningColor).setTitle(t('topTitle'))
    .setDescription(lines.join('\n') || t('topEmpty'));
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

module.exports = {
  intents: () => (enabled() ? [GatewayIntentBits.GuildInvites, GatewayIntentBits.GuildMembers] : []),
  events: {
    [Events.ClientReady]: onReady,
    [Events.InviteCreate]: onInviteCreate,
    [Events.InviteDelete]: onInviteDelete,
    [Events.GuildMemberAdd]: onJoin,
    [Events.GuildMemberRemove]: onLeave,
  },
  commands: [
    named(new SlashCommandBuilder(), ['invites', "Someone's invite statistics"], ['meghivasok', 'Egy tag meghívási statisztikája'])
      .addUserOption((option) => named(option, ['member', 'Which member? (default: you)'], ['tag', 'Melyik tag? (alapból te)'])),
    named(new SlashCommandBuilder(), ['invitetop', 'Who invited the most people'], ['meghivo-toplista', 'Ki hívta meg a legtöbb embert']),
  ],
  handlers: { invites: showInvites, invitetop: showTop },
  _internal: { findUsedInvite, validCount, load },
};
