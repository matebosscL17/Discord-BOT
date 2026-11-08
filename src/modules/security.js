const {
  AuditLogEvent, ChannelType, EmbedBuilder, Events, GatewayIntentBits, MessageFlags,
  PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { sendLog } = require('../utils');
const { readJson, writeJson } = require('../store');
const { choice, named, translator } = require('../i18n');

// ===== Szövegek =====
// A riasztások a szerver nyelvén mennek (nincs kezdeményező), a parancsválaszok a tag nyelvén.
const tr = translator({
  hu: {
    ownersOnly: 'Ezt csak a tulajok használhatják.',
    trustedOnly: 'Ezt csak a tulajok és a megbízható listán szereplők használhatják.',
    disabled: 'A biztonsági modul ki van kapcsolva a settings.js fájlban.',
    statusTitle: '🛡️ Biztonsági állapot',
    on: '🟢 Bekapcsolva',
    off: '⚪ Kikapcsolva',
    raid: '🚨 Raidvédelem',
    raidInfo: '{threshold} belépés / {window} mp • Raid módban: {action}',
    spam: '💬 Spamvédelem',
    spamInfo: '{messages} üzenet / {window} mp • {mentions}+ említés • {minutes} perc némítás',
    nuke: '💣 Anti-nuke',
    nukeInfo: '{window} mp-es ablak • Büntetés: {punishment}',
    raidMode: '🚨 Raid mód',
    raidModeOn: '🔴 AKTÍV (vége: {until})',
    raidModeOff: '🟢 Nincs',
    lockdown: '🔒 Zárolás',
    lockdownOn: '🔴 AKTÍV',
    lockdownOff: '🟢 Nincs',
    whitelist: '✅ Megbízható lista',
    whitelistEmpty: 'Csak a tulajdonos és a tulaj rangok',
    botPosition: '⚠️ Bot rangja',
    botTop: '✅ A bot rangja a legfelső, mindenkit meg tud állítani.',
    botNotTop: '⚠️ A bot rangja nem a legfelső! A fölötte lévő rangú támadókat nem tudja megállítani. Húzd a bot rangját a lista tetejére.',
    actionTimeout: 'némítás',
    actionNone: 'csak riasztás',
    punishStrip: 'minden rang elvétele',
    punishKick: 'kirúgás',
    punishBan: 'kitiltás',
    whitelistAdded: '✅ Felvéve a megbízható listára: {target}',
    whitelistRemoved: '🗑️ Levéve a megbízható listáról: {target}',
    whitelistMissing: 'Ő nincs a megbízható listán (vagy a settings.js-ben szerepel, onnan kell törölni).',
    whitelistNeedTarget: 'Adj meg egy tagot vagy egy rangot.',
    raidOnReply: '🚨 Raid mód bekapcsolva {minutes} percre.',
    raidOffReply: '✅ Raid mód kikapcsolva.',
    lockdownOnReply: '🔒 Zárolás bekapcsolva: {count} csatornában senki nem írhat (a megbízhatókon kívül).',
    lockdownOffReply: '🔓 Zárolás feloldva, {count} csatorna visszaállítva.',
    lockdownAlready: 'A zárolás már aktív.',
    lockdownNotActive: 'Nincs aktív zárolás.',
    // riasztások
    alertTitle: '🚨 BIZTONSÁGI RIASZTÁS',
    raidDetected: 'Raid észlelve: {count} belépés {window} másodpercen belül. A raid mód {minutes} percig aktív.',
    raidStarted: 'Raid mód bekapcsolva: {by}.',
    raidEnded: '✅ A raid mód véget ért.',
    raidJoinMuted: 'Raid módban érkezett, ezért némítva: <@{user}> ({name})',
    youngMuted: 'Nagyon friss fiók, ezért némítva: <@{user}> ({name}, fiók: {age})',
    raidDm: 'A(z) **{guild}** szerver éppen védett módban van egy támadás miatt, ezért ideiglenesen nem írhatsz. Hamarosan feloldjuk, köszönjük a türelmet!',
    spamDetected: 'Spam: <@{user}> {count} üzenetet küldött {window} másodperc alatt. Némítva {minutes} percre.',
    mentionDetected: 'Tömeges pingelés: <@{user}> {count} említést küldött egy üzenetben. Némítva {minutes} percre.',
    nukeDetected: 'Nuke kísérlet: <@{user}> {count}× {action} {window} másodpercen belül.',
    nukePunished: 'Büntetés: {punishment}.',
    nukeFailed: '⚠️ Nem sikerült megbüntetni (a rangja magasabb a botnál, vagy hiányzó jog). AZONNAL nézd meg!',
    botBlocked: 'Nem engedélyezett bot behívása: <@{bot}>, behívta: <@{user}>. A botot a rendszer kirúgta.',
    dangerousRole: 'Veszélyes jog adása a(z) <@&{role}> rangnak: <@{user}>. A jogokat a bot visszaállította.',
    dangerousMember: 'Veszélyes rang adása <@{target}> tagnak: <@{user}>. A rangot a bot visszavette.',
    webhookDeleted: 'A webhookot a bot törölte.',
    lockdownAuto: 'A csatornák automatikusan zárolva.',
    ownerDm: '🚨 Biztonsági riasztás a(z) **{guild}** szerveren:\n{text}',
  },
  en: {
    ownersOnly: 'Only the owners can use this.',
    trustedOnly: 'Only the owners and trusted members can use this.',
    disabled: 'The security module is turned off in settings.js.',
    statusTitle: '🛡️ Security status',
    on: '🟢 On',
    off: '⚪ Off',
    raid: '🚨 Raid protection',
    raidInfo: '{threshold} joins / {window} s • In raid mode: {action}',
    spam: '💬 Spam protection',
    spamInfo: '{messages} messages / {window} s • {mentions}+ mentions • {minutes} min timeout',
    nuke: '💣 Anti-nuke',
    nukeInfo: '{window} s window • Punishment: {punishment}',
    raidMode: '🚨 Raid mode',
    raidModeOn: '🔴 ACTIVE (ends {until})',
    raidModeOff: '🟢 None',
    lockdown: '🔒 Lockdown',
    lockdownOn: '🔴 ACTIVE',
    lockdownOff: '🟢 None',
    whitelist: '✅ Trusted list',
    whitelistEmpty: 'Only the owner and owner roles',
    botPosition: '⚠️ Bot role',
    botTop: '✅ The bot role is at the top, it can stop anyone.',
    botNotTop: '⚠️ The bot role is not at the top! It cannot stop attackers with a higher role. Move the bot role to the top of the list.',
    actionTimeout: 'timeout',
    actionNone: 'alert only',
    punishStrip: 'remove all roles',
    punishKick: 'kick',
    punishBan: 'ban',
    whitelistAdded: '✅ Added to the trusted list: {target}',
    whitelistRemoved: '🗑️ Removed from the trusted list: {target}',
    whitelistMissing: 'They are not on the trusted list (or they are in settings.js and must be removed there).',
    whitelistNeedTarget: 'Give a member or a role.',
    raidOnReply: '🚨 Raid mode turned on for {minutes} minutes.',
    raidOffReply: '✅ Raid mode turned off.',
    lockdownOnReply: '🔒 Lockdown on: nobody can write in {count} channels (except trusted members).',
    lockdownOffReply: '🔓 Lockdown lifted, {count} channels restored.',
    lockdownAlready: 'Lockdown is already active.',
    lockdownNotActive: 'There is no active lockdown.',
    alertTitle: '🚨 SECURITY ALERT',
    raidDetected: 'Raid detected: {count} joins within {window} seconds. Raid mode is active for {minutes} minutes.',
    raidStarted: 'Raid mode turned on by {by}.',
    raidEnded: '✅ Raid mode has ended.',
    raidJoinMuted: 'Joined during raid mode, timed out: <@{user}> ({name})',
    youngMuted: 'Very new account, timed out: <@{user}> ({name}, account: {age})',
    raidDm: '**{guild}** is in protected mode because of an attack, so you cannot write for now. We will lift it soon, thanks for your patience!',
    spamDetected: 'Spam: <@{user}> sent {count} messages in {window} seconds. Timed out for {minutes} minutes.',
    mentionDetected: 'Mass mention: <@{user}> sent {count} mentions in one message. Timed out for {minutes} minutes.',
    nukeDetected: 'Nuke attempt: <@{user}> did {count}× {action} within {window} seconds.',
    nukePunished: 'Punishment: {punishment}.',
    nukeFailed: '⚠️ Could not punish them (their role is above the bot, or a permission is missing). Check IMMEDIATELY!',
    botBlocked: 'Unapproved bot added: <@{bot}>, added by <@{user}>. The bot was kicked.',
    dangerousRole: 'Dangerous permission given to role <@&{role}> by <@{user}>. The bot restored the permissions.',
    dangerousMember: 'Dangerous role given to <@{target}> by <@{user}>. The bot removed the role.',
    webhookDeleted: 'The bot deleted the webhook.',
    lockdownAuto: 'Channels were locked automatically.',
    ownerDm: '🚨 Security alert on **{guild}**:\n{text}',
  },
});

// A műveletek neve a naplóban, a szerver nyelvén.
function actionName(type) {
  const lang = settings.language === 'en' ? 'en' : 'hu';
  const names = {
    hu: {
      channelDelete: 'csatornatörlés', channelCreate: 'csatornalétrehozás', roleDelete: 'rangtörlés',
      roleCreate: 'ranglétrehozás', ban: 'kitiltás', kick: 'kirúgás', webhookCreate: 'webhook-létrehozás',
    },
    en: {
      channelDelete: 'channel deletion', channelCreate: 'channel creation', roleDelete: 'role deletion',
      roleCreate: 'role creation', ban: 'ban', kick: 'kick', webhookCreate: 'webhook creation',
    },
  };
  return names[lang][type] ?? type;
}

// ===== Beállítások és állapot =====
const security = settings.security ?? {};
const raidSettings = security.raid ?? {};
const spamSettings = security.spam ?? {};
const nukeSettings = security.nuke ?? {};
const enabled = (part) => security.enabled !== false && part?.enabled !== false;

const DANGEROUS = [
  PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels, PermissionFlagsBits.BanMembers, PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageWebhooks,
];
const hasDangerous = (bits) => DANGEROUS.some((flag) => (BigInt(bits ?? 0) & flag) === flag);

const STATE_FILE = 'security';
const loadState = () => readJson(STATE_FILE, { whitelist: [], lockdown: null });
const saveState = (state) => writeJson(STATE_FILE, state);

const joins = [];
const counters = new Map(); // "típus:felhasználó" -> időbélyegek
const messageTimes = new Map(); // felhasználó -> üzenetidők
const punishedRecently = new Map(); // ne büntesse kétszer ugyanazt
let raidUntil = 0;
let raidTimer = null;

function trustedIds() {
  return new Set([...(security.whitelist ?? []), ...loadState().whitelist].map(String));
}

// Megbízható: a tulajdonos, maga a bot, a tulaj rangok és a megbízható lista (tagok vagy rangok).
function isTrusted(guild, userId, member) {
  if (!userId) return false;
  if (userId === guild.ownerId || userId === guild.client?.user?.id) return true;
  const trusted = trustedIds();
  if (trusted.has(userId)) return true;
  const roles = member?.roles?.cache;
  if (!roles) return false;
  return settings.ownerRoleIds.some((id) => roles.has(id)) || [...trusted].some((id) => roles.has(id));
}

const isOwner = (interaction) => interaction.guild.ownerId === interaction.user.id
  || settings.ownerRoleIds.some((id) => interaction.member.roles.cache.has(id));

function hit(key, windowMs) {
  const now = Date.now();
  const list = (counters.get(key) ?? []).filter((time) => now - time < windowMs);
  list.push(now);
  counters.set(key, list);
  return list.length;
}

async function alert(guild, text, { ownerDm = false } = {}) {
  await sendLog(guild, { title: tr.server('alertTitle'), description: text, color: settings.errorColor });
  if (!ownerDm) return;
  const owner = await guild.fetchOwner?.().catch(() => null);
  await owner?.send({
    content: tr.server('ownerDm', { guild: guild.name, text }).slice(0, 2000), allowedMentions: { parse: [] },
  }).catch(() => {});
}

// ===== Zárolás =====
// Minden szöveges csatornában megtiltja az írást a @everyone rangnak, és megjegyzi az eredeti állapotot.
async function lockChannels(guild) {
  const state = loadState();
  if (state.lockdown) return null;
  const everyone = guild.roles.everyone.id;
  const channels = await guild.channels.fetch();
  const saved = {};
  for (const channel of channels.values()) {
    if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) continue;
    const overwrite = channel.permissionOverwrites.cache.get(everyone);
    let previous = null;
    if (overwrite?.allow?.has?.(PermissionFlagsBits.SendMessages)) previous = true;
    else if (overwrite?.deny?.has?.(PermissionFlagsBits.SendMessages)) previous = false;
    if (previous === false) continue; // eleve zárt csatorna, nem nyúlunk hozzá
    try {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: false, SendMessagesInThreads: false });
      saved[channel.id] = previous;
    } catch (error) {
      console.error(`Zárolás hiba (${channel.name}):`, error.message);
    }
  }
  state.lockdown = { at: Date.now(), channels: saved };
  saveState(state);
  return Object.keys(saved).length;
}

async function unlockChannels(guild) {
  const state = loadState();
  if (!state.lockdown) return null;
  const everyone = guild.roles.everyone.id;
  let count = 0;
  for (const [channelId, previous] of Object.entries(state.lockdown.channels)) {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) continue;
    await channel.permissionOverwrites.edit(everyone, { SendMessages: previous, SendMessagesInThreads: previous })
      .then(() => { count += 1; })
      .catch((error) => console.error(`Feloldás hiba (${channel.name}):`, error.message));
  }
  state.lockdown = null;
  saveState(state);
  return count;
}

// ===== Raid mód =====
const raidActive = () => Date.now() < raidUntil;

async function startRaidMode(guild, minutes, reasonText) {
  raidUntil = Date.now() + minutes * 60000;
  clearTimeout(raidTimer);
  raidTimer = setTimeout(() => {
    raidUntil = 0;
    alert(guild, tr.server('raidEnded')).catch(console.error);
  }, minutes * 60000);
  raidTimer.unref?.();
  const lines = [reasonText];
  if (raidSettings.autoLockdown) {
    const count = await lockChannels(guild);
    if (count !== null) lines.push(tr.server('lockdownAuto'));
  }
  await alert(guild, lines.join('\n'), { ownerDm: true });
}

function stopRaidMode() {
  raidUntil = 0;
  clearTimeout(raidTimer);
}

// A bot senkit nem rúg ki belépéskor: raid módban csak ideiglenesen némít.
async function muteJoiner(member, minutes) {
  if (!member.moderatable) return false;
  await member.timeout(minutes * 60000, 'Raid védelem').catch(() => {});
  await member.send({ content: tr.server('raidDm', { guild: member.guild.name }), allowedMentions: { parse: [] } })
    .catch(() => {});
  return true;
}

async function onJoin(member) {
  if (!enabled(raidSettings) || member.guild.id !== config.guildId || member.user.bot) return;
  const { guild } = member;
  const now = Date.now();
  const windowMs = (raidSettings.joinWindowSeconds ?? 10) * 1000;
  joins.push(now);
  while (joins.length && now - joins[0] > windowMs) joins.shift();

  const minutes = raidSettings.durationMinutes ?? 10;
  if (!raidActive() && joins.length >= (raidSettings.joinThreshold ?? 8)) {
    await startRaidMode(guild, minutes, tr.server('raidDetected', {
      count: joins.length, window: raidSettings.joinWindowSeconds ?? 10, minutes,
    }));
  }

  if (raidActive()) {
    if (raidSettings.action === 'none') return;
    const remaining = Math.max(1, Math.ceil((raidUntil - now) / 60000));
    if (await muteJoiner(member, remaining)) {
      await sendLog(guild, {
        title: tr.server('alertTitle'),
        description: tr.server('raidJoinMuted', { user: member.id, name: member.user.username }),
        color: settings.warningColor,
      });
    }
    return;
  }

  const ageMs = now - member.user.createdTimestamp;
  const tooYoung = ageMs < (raidSettings.minAccountAgeDays ?? 3) * 86400000;
  if (tooYoung && raidSettings.youngAccountAction === 'timeout' && member.moderatable) {
    await member.timeout(60 * 60000, 'Nagyon friss fiók').catch(() => {});
    await sendLog(guild, {
      title: tr.server('alertTitle'),
      description: tr.server('youngMuted', {
        user: member.id, name: member.user.username, age: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
      }),
      color: settings.warningColor,
    });
  }
}

// ===== Spamvédelem =====
async function onMessage(message) {
  if (!enabled(spamSettings) || !message.guild || message.guild.id !== config.guildId) return;
  if (message.author?.bot || message.webhookId) return;
  const { member, guild } = message;
  if (!member || isTrusted(guild, message.author.id, member)) return;
  if (member.permissions?.has?.(PermissionFlagsBits.ManageMessages)) return;

  const minutes = spamSettings.timeoutMinutes ?? 10;
  const mentionCount = (message.mentions?.users?.size ?? 0) + (message.mentions?.roles?.size ?? 0)
    + (message.mentions?.everyone ? 5 : 0);
  if (mentionCount >= (spamSettings.mentions ?? 5)) {
    await message.delete().catch(() => {});
    if (member.moderatable) await member.timeout(minutes * 60000, 'Tömeges pingelés').catch(() => {});
    await alert(guild, tr.server('mentionDetected', { user: member.id, count: mentionCount, minutes }));
    return;
  }

  const windowMs = (spamSettings.windowSeconds ?? 5) * 1000;
  const now = Date.now();
  const times = (messageTimes.get(member.id) ?? []).filter((time) => now - time < windowMs);
  times.push(now);
  messageTimes.set(member.id, times);
  if (times.length < (spamSettings.messages ?? 6)) return;

  messageTimes.delete(member.id);
  if (member.moderatable) await member.timeout(minutes * 60000, 'Spam').catch(() => {});
  // A spam üzenetek törlése az adott csatornából.
  const recent = await message.channel.messages.fetch({ limit: 50 }).catch(() => null);
  const own = recent ? [...recent.values()].filter((item) => item.author.id === member.id && now - item.createdTimestamp < windowMs * 3) : [];
  if (own.length) await message.channel.bulkDelete(own, true).catch(() => {});
  await alert(guild, tr.server('spamDetected', {
    user: member.id, count: times.length, window: spamSettings.windowSeconds ?? 5, minutes,
  }));
}

// ===== Anti-nuke =====
const AUDIT_TYPES = {
  [AuditLogEvent.ChannelDelete]: 'channelDelete',
  [AuditLogEvent.ChannelCreate]: 'channelCreate',
  [AuditLogEvent.RoleDelete]: 'roleDelete',
  [AuditLogEvent.RoleCreate]: 'roleCreate',
  [AuditLogEvent.MemberBanAdd]: 'ban',
  [AuditLogEvent.MemberKick]: 'kick',
  [AuditLogEvent.WebhookCreate]: 'webhookCreate',
};

const punishmentName = () => tr.server({ strip: 'punishStrip', kick: 'punishKick', ban: 'punishBan' }[nukeSettings.punishment] ?? 'punishStrip');

// A támadó büntetése. Visszaadja, sikerült-e.
async function punish(guild, userId, reason) {
  const last = punishedRecently.get(userId) ?? 0;
  if (Date.now() - last < 30000) return true;
  punishedRecently.set(userId, Date.now());

  const member = await guild.members.fetch(userId).catch(() => null);
  try {
    if (nukeSettings.punishment === 'ban') {
      await guild.bans.create(userId, { reason });
      return true;
    }
    if (!member) return false;
    if (nukeSettings.punishment === 'kick' || member.user.bot) {
      if (!member.kickable) return false;
      await member.kick(reason);
      return true;
    }
    // Minden rang elvétele (a Discord által kezelt rangok kivételével, azokat nem lehet levenni).
    if (!member.manageable) return false;
    const keep = [...member.roles.cache.values()].filter((role) => role.managed || role.id === guild.id).map((role) => role.id);
    await member.roles.set(keep, reason);
    if (member.moderatable) await member.timeout(60 * 60000, reason).catch(() => {});
    return true;
  } catch (error) {
    console.error('Nem sikerült megbüntetni:', error.message);
    return false;
  }
}

async function handleNukeAction(guild, type, executorId, targetId) {
  const limit = nukeSettings.limits?.[type];
  if (!limit) return;
  const windowSeconds = nukeSettings.windowSeconds ?? 10;
  const count = hit(`${type}:${executorId}`, windowSeconds * 1000);

  // Nem megbízható ember webhookja azonnal törlődik, mert ezzel szoktak tömegesen spamelni.
  const extra = [];
  if (type === 'webhookCreate' && targetId) {
    const hooks = await guild.fetchWebhooks?.().catch(() => null);
    const hook = hooks?.get?.(targetId);
    if (hook) {
      await hook.delete('Anti-nuke').catch(() => {});
      extra.push(tr.server('webhookDeleted'));
    }
  }
  if (count < limit) {
    if (extra.length) await alert(guild, extra.join('\n'));
    return;
  }

  const ok = await punish(guild, executorId, `Anti-nuke: ${type} x${count}`);
  const lines = [
    tr.server('nukeDetected', {
      user: executorId, count, action: actionName(type), window: windowSeconds,
    }),
    ok ? tr.server('nukePunished', { punishment: punishmentName() }) : tr.server('nukeFailed'),
    ...extra,
  ];
  await alert(guild, lines.join('\n'), { ownerDm: true });
}

function permissionChange(entry) {
  const change = entry.changes?.find((item) => item.key === 'permissions');
  if (!change) return null;
  return { old: BigInt(change.old ?? 0), new: BigInt(change.new ?? 0) };
}

async function onAuditLog(entry, guild) {
  if (!enabled(nukeSettings) || guild.id !== config.guildId) return;
  const executorId = entry.executorId;
  if (!executorId) return;
  const executor = await guild.members.fetch(executorId).catch(() => null);
  if (isTrusted(guild, executorId, executor)) return;

  // Bot behívása nem megbízható embertől: a bot azonnal megy.
  if (entry.action === AuditLogEvent.BotAdd && nukeSettings.blockBots !== false) {
    const bot = await guild.members.fetch(entry.targetId).catch(() => null);
    if (bot?.kickable) await bot.kick('Anti-nuke: nem engedélyezett bot').catch(() => {});
    await alert(guild, tr.server('botBlocked', { bot: entry.targetId, user: executorId }), { ownerDm: true });
    return;
  }

  // Veszélyes jog adása egy rangnak: visszaállítás és büntetés.
  if (entry.action === AuditLogEvent.RoleUpdate && nukeSettings.protectDangerousPermissions !== false) {
    const change = permissionChange(entry);
    if (change && hasDangerous(change.new & ~change.old)) {
      const role = guild.roles.cache.get(entry.targetId) ?? await guild.roles.fetch(entry.targetId).catch(() => null);
      await role?.setPermissions(new PermissionsBitField(change.old), 'Anti-nuke: veszélyes jog').catch(() => {});
      const ok = await punish(guild, executorId, 'Anti-nuke: veszélyes jog');
      await alert(guild, [
        tr.server('dangerousRole', { role: entry.targetId, user: executorId }),
        ok ? tr.server('nukePunished', { punishment: punishmentName() }) : tr.server('nukeFailed'),
      ].join('\n'), { ownerDm: true });
    }
    return;
  }

  // Veszélyes rang adása egy tagnak: a rang lekerül, a kiosztó büntetést kap.
  if (entry.action === AuditLogEvent.MemberRoleUpdate && nukeSettings.protectDangerousPermissions !== false) {
    const added = entry.changes?.find((item) => item.key === '$add')?.new ?? [];
    const dangerous = added.filter((item) => {
      const role = guild.roles.cache.get(item.id);
      return role && hasDangerous(role.permissions.bitfield);
    });
    if (!dangerous.length) return;
    const target = await guild.members.fetch(entry.targetId).catch(() => null);
    await target?.roles.remove(dangerous.map((item) => item.id), 'Anti-nuke: veszélyes rang').catch(() => {});
    const ok = await punish(guild, executorId, 'Anti-nuke: veszélyes rang kiosztása');
    await alert(guild, [
      tr.server('dangerousMember', { target: entry.targetId, user: executorId }),
      ok ? tr.server('nukePunished', { punishment: punishmentName() }) : tr.server('nukeFailed'),
    ].join('\n'), { ownerDm: true });
    return;
  }

  const type = AUDIT_TYPES[entry.action];
  if (type) await handleNukeAction(guild, type, executorId, entry.targetId);
}

// ===== Parancsok =====
async function status(interaction) {
  const t = tr.user(interaction);
  const state = loadState();
  const trusted = [...trustedIds()];
  const me = await interaction.guild.members.fetchMe();
  const topPosition = Math.max(...[...interaction.guild.roles.cache.values()].map((role) => role.position));
  const botTop = me.roles.highest.position >= topPosition;
  const actionText = raidSettings.action === 'none' ? t('actionNone') : t('actionTimeout');
  const punishText = t({ strip: 'punishStrip', kick: 'punishKick', ban: 'punishBan' }[nukeSettings.punishment] ?? 'punishStrip');

  const embed = new EmbedBuilder().setColor(botTop ? settings.color : settings.warningColor)
    .setTitle(t('statusTitle'))
    .setDescription(botTop ? t('botTop') : t('botNotTop'))
    .addFields(
      {
        name: t('raid'),
        value: `${enabled(raidSettings) ? t('on') : t('off')}\n${t('raidInfo', {
          threshold: raidSettings.joinThreshold ?? 8, window: raidSettings.joinWindowSeconds ?? 10, action: actionText,
        })}`,
      },
      {
        name: t('spam'),
        value: `${enabled(spamSettings) ? t('on') : t('off')}\n${t('spamInfo', {
          messages: spamSettings.messages ?? 6, window: spamSettings.windowSeconds ?? 5,
          mentions: spamSettings.mentions ?? 5, minutes: spamSettings.timeoutMinutes ?? 10,
        })}`,
      },
      {
        name: t('nuke'),
        value: `${enabled(nukeSettings) ? t('on') : t('off')}\n${t('nukeInfo', {
          window: nukeSettings.windowSeconds ?? 10, punishment: punishText,
        })}`,
      },
      {
        name: t('raidMode'),
        value: raidActive() ? t('raidModeOn', { until: `<t:${Math.floor(raidUntil / 1000)}:R>` }) : t('raidModeOff'),
        inline: true,
      },
      { name: t('lockdown'), value: state.lockdown ? t('lockdownOn') : t('lockdownOff'), inline: true },
      {
        name: t('whitelist'),
        value: trusted.map((id) => (interaction.guild.roles.cache.has(id) ? `<@&${id}>` : `<@${id}>`)).join(' ') || t('whitelistEmpty'),
      },
    );
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

function whitelistTarget(interaction) {
  const user = interaction.options.getUser('member');
  const role = interaction.options.getRole('role');
  if (user) return { id: user.id, label: `<@${user.id}>` };
  if (role) return { id: role.id, label: `<@&${role.id}>` };
  return null;
}

async function whitelistAdd(interaction) {
  const t = tr.user(interaction);
  if (!isOwner(interaction)) return void (await interaction.reply({ content: t('ownersOnly'), flags: MessageFlags.Ephemeral }));
  const target = whitelistTarget(interaction);
  if (!target) return void (await interaction.reply({ content: t('whitelistNeedTarget'), flags: MessageFlags.Ephemeral }));
  const state = loadState();
  if (!state.whitelist.includes(target.id)) state.whitelist.push(target.id);
  saveState(state);
  await interaction.reply({ content: t('whitelistAdded', { target: target.label }), flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

async function whitelistRemove(interaction) {
  const t = tr.user(interaction);
  if (!isOwner(interaction)) return void (await interaction.reply({ content: t('ownersOnly'), flags: MessageFlags.Ephemeral }));
  const target = whitelistTarget(interaction);
  if (!target) return void (await interaction.reply({ content: t('whitelistNeedTarget'), flags: MessageFlags.Ephemeral }));
  const state = loadState();
  if (!state.whitelist.includes(target.id)) return void (await interaction.reply({ content: t('whitelistMissing'), flags: MessageFlags.Ephemeral }));
  state.whitelist = state.whitelist.filter((id) => id !== target.id);
  saveState(state);
  await interaction.reply({ content: t('whitelistRemoved', { target: target.label }), flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}

const canControl = (interaction) => isOwner(interaction) || isTrusted(interaction.guild, interaction.user.id, interaction.member);

async function raidMode(interaction) {
  const t = tr.user(interaction);
  if (!canControl(interaction)) return void (await interaction.reply({ content: t('trustedOnly'), flags: MessageFlags.Ephemeral }));
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  if (interaction.options.getString('state', true) === 'on') {
    const minutes = interaction.options.getInteger('minutes') ?? raidSettings.durationMinutes ?? 10;
    await startRaidMode(interaction.guild, minutes, tr.server('raidStarted', { by: `<@${interaction.user.id}>` }));
    await interaction.editReply(t('raidOnReply', { minutes }));
  } else {
    stopRaidMode();
    await alert(interaction.guild, tr.server('raidEnded'));
    await interaction.editReply(t('raidOffReply'));
  }
}

async function lockdown(interaction) {
  const t = tr.user(interaction);
  if (!canControl(interaction)) return void (await interaction.reply({ content: t('trustedOnly'), flags: MessageFlags.Ephemeral }));
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  if (interaction.options.getString('state', true) === 'on') {
    const count = await lockChannels(interaction.guild);
    if (count === null) return void (await interaction.editReply(t('lockdownAlready')));
    await alert(interaction.guild, `${t('lockdownOnReply', { count })} (<@${interaction.user.id}>)`);
    await interaction.editReply(t('lockdownOnReply', { count }));
  } else {
    const count = await unlockChannels(interaction.guild);
    if (count === null) return void (await interaction.editReply(t('lockdownNotActive')));
    await alert(interaction.guild, `${t('lockdownOffReply', { count })} (<@${interaction.user.id}>)`);
    await interaction.editReply(t('lockdownOffReply', { count }));
  }
}

async function route(interaction) {
  if (security.enabled === false) {
    return void (await interaction.reply({ content: tr.user(interaction)('disabled'), flags: MessageFlags.Ephemeral }));
  }
  const handler = {
    status, 'whitelist-add': whitelistAdd, 'whitelist-remove': whitelistRemove, raidmode: raidMode, lockdown,
  }[interaction.options.getSubcommand()];
  await handler(interaction);
}

const stateOption = (option) => named(option, ['state', 'On or off'], ['allapot', 'Be vagy ki']).setRequired(true)
  .addChoices(choice('on', 'On', 'Be'), choice('off', 'Off', 'Ki'));

module.exports = {
  intents: () => (security.enabled === false ? [] : [
    GatewayIntentBits.GuildModeration,
    ...(enabled(spamSettings) ? [GatewayIntentBits.GuildMessages] : []),
    ...(enabled(raidSettings) ? [GatewayIntentBits.GuildMembers] : []),
  ]),
  events: {
    [Events.GuildMemberAdd]: onJoin,
    [Events.MessageCreate]: onMessage,
    [Events.GuildAuditLogEntryCreate]: onAuditLog,
  },
  commands: [
    named(new SlashCommandBuilder(), ['security', 'Raid protection, anti-nuke and lockdown'],
      ['vedelem', 'Raidvédelem, anti-nuke és zárolás'])
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand((sub) => named(sub, ['status', 'Show the security status'], ['allapot', 'A védelem állapota']))
      .addSubcommand((sub) => named(sub, ['whitelist-add', 'Add a trusted member or role (owners only)'],
        ['megbizhato-hozzaad', 'Megbízható tag vagy rang hozzáadása (csak tulajoknak)'])
        .addUserOption((option) => named(option, ['member', 'Trusted member'], ['tag', 'Megbízható tag']))
        .addRoleOption((option) => named(option, ['role', 'Trusted role'], ['rang', 'Megbízható rang'])))
      .addSubcommand((sub) => named(sub, ['whitelist-remove', 'Remove a trusted member or role (owners only)'],
        ['megbizhato-torol', 'Megbízható tag vagy rang törlése (csak tulajoknak)'])
        .addUserOption((option) => named(option, ['member', 'Member'], ['tag', 'Tag']))
        .addRoleOption((option) => named(option, ['role', 'Role'], ['rang', 'Rang'])))
      .addSubcommand((sub) => named(sub, ['raidmode', 'Turn raid mode on or off'], ['raidmod', 'Raid mód be- vagy kikapcsolása'])
        .addStringOption(stateOption)
        .addIntegerOption((option) => named(option, ['minutes', 'For how many minutes? (default from settings)'],
          ['perc', 'Hány percre? (alapból a beállítás szerint)']).setMinValue(1).setMaxValue(1440)))
      .addSubcommand((sub) => named(sub, ['lockdown', 'Lock or unlock every text channel'],
        ['zarolas', 'Minden szöveges csatorna zárolása vagy feloldása'])
        .addStringOption(stateOption)),
  ],
  handlers: { security: route },
  // tesztekhez
  _internal: {
    isTrusted, hasDangerous, raidActive, stopRaidMode, lockChannels, unlockChannels, counters,
  },
};
