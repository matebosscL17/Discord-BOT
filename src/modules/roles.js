const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags,
  PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder,
} = require('discord.js');
const settings = require('../../settings');
const { choice, named, translator } = require('../i18n');

const tr = translator({
  hu: {
    notAssignable: 'A(z) {role} nem osztható ki.',
    dangerous: 'A(z) {role} rangnak moderátori joga van, ezért nem tehető panelre.',
    tooHigh: 'Húzd a bot rangját a(z) {role} fölé!',
    defaultTitle: '🎮 Válaszd ki a játékaidat',
    defaultDescription: 'Kattints a gombra a rang felvételéhez, újra kattintva leveszed.',
    posted: 'A rangválasztó kikerült.',
    gone: 'Ez a rang már nem létezik.',
    unavailable: 'Ez a rang most nem vehető fel, szólj egy adminnak.',
    removed: '➖ Levetted: **{role}**',
    added: '✅ Megkaptad: **{role}**',
    exclusiveNote: 'Egyszerre csak egy rangot választhatsz.',
    menuPlaceholder: 'Válassz rangot...',
    menuDescription: 'Kattints, hogy felvedd vagy levedd',
    updated: 'Kész! Felvetted: {added} • Levetted: {removed}',
    nothing: 'Nem változott semmi.',
    none: '-',
  },
  en: {
    notAssignable: 'The {role} role cannot be assigned.',
    dangerous: 'The {role} role has moderator permissions, so it cannot go on a panel.',
    tooHigh: "Move the bot's role above {role}!",
    defaultTitle: '🎮 Pick your games',
    defaultDescription: 'Click a button to get the role, click again to remove it.',
    posted: 'The role picker has been posted.',
    gone: 'This role no longer exists.',
    unavailable: 'This role cannot be picked right now, ask an admin.',
    removed: '➖ Removed: **{role}**',
    added: '✅ You got: **{role}**',
    exclusiveNote: 'You can pick only one role at a time.',
    menuPlaceholder: 'Pick a role...',
    menuDescription: 'Click to add or remove it',
    updated: 'Done! Added: {added} • Removed: {removed}',
    nothing: 'Nothing changed.',
    none: '-',
  },
});

const MAX_ROLES = 10;
// Ilyen jogú rangot a tagok nem kaphatnak meg gombbal.
const DANGEROUS = [
  'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'ManageMessages', 'ManageWebhooks',
  'KickMembers', 'BanMembers', 'ModerateMembers', 'MentionEveryone',
].map((name) => PermissionFlagsBits[name]);

const isDangerous = (role) => DANGEROUS.some((permission) => role.permissions.has(permission));

// A hiba kulcsa, vagy null, ha a rang kiosztható.
async function roleProblem(guild, role) {
  const me = await guild.members.fetchMe();
  if (role.id === guild.id || role.managed) return 'notAssignable';
  if (isDangerous(role)) return 'dangerous';
  if (me.roles.highest.comparePositionTo(role) <= 0) return 'tooHigh';
  return null;
}

function emojiFor(role) {
  const name = role.name.toLowerCase();
  return Object.entries(settings.roleEmojis).find(([word]) => name.includes(word))?.[1];
}

// A panel rangjai a gombokból vagy a menüből olvashatók ki, így nem kell őket máshol tárolni.
function panelRoleIds(message) {
  const ids = [];
  for (const row of message?.components ?? []) {
    for (const component of row.components ?? []) {
      const customId = component.customId ?? component.custom_id ?? '';
      if (customId.startsWith('role:toggle:')) ids.push(customId.split(':')[2]);
      if (customId.startsWith('role:menu')) ids.push(...(component.options ?? []).map((option) => option.value));
    }
  }
  return ids;
}

async function postPanel(interaction) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const roles = [];
  for (let index = 1; index <= MAX_ROLES; index += 1) {
    const role = interaction.options.getRole(`role${index}`);
    if (role && !roles.some((item) => item.id === role.id)) roles.push(role);
  }

  for (const role of roles) {
    const problem = await roleProblem(interaction.guild, role);
    if (problem) return void (await interaction.editReply(t(problem, { role: role.name })));
  }

  const exclusive = interaction.options.getBoolean('exclusive') ?? false;
  const useMenu = interaction.options.getString('style') === 'menu';
  const rows = [];
  if (useMenu) {
    rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
      .setCustomId(`role:menu${exclusive ? ':x' : ''}`)
      .setPlaceholder(t('menuPlaceholder'))
      .setMinValues(0)
      .setMaxValues(exclusive ? 1 : roles.length)
      .addOptions(roles.map((role) => {
        const option = { label: role.name.slice(0, 100), value: role.id, description: t('menuDescription') };
        const emoji = emojiFor(role);
        return emoji ? { ...option, emoji: { name: emoji } } : option;
      }))));
  } else {
    const buttons = roles.map((role) => {
      const button = new ButtonBuilder().setCustomId(`role:toggle:${role.id}${exclusive ? ':x' : ''}`)
        .setLabel(role.name.slice(0, 80)).setStyle(ButtonStyle.Secondary);
      const emoji = emojiFor(role);
      return emoji ? button.setEmoji({ name: emoji }) : button;
    });
    for (let start = 0; start < buttons.length; start += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(start, start + 5)));
    }
  }

  // A panel az őt kirakó admin nyelvén jelenik meg, a rangok listájával.
  const list = roles.map((role) => `${emojiFor(role) ?? '•'} <@&${role.id}>`).join('\n');
  const description = interaction.options.getString('description') ?? t('defaultDescription');
  const embed = new EmbedBuilder().setColor(settings.color)
    .setTitle(interaction.options.getString('title') ?? t('defaultTitle'))
    .setDescription(`${description}\n\n${list}`.slice(0, 4096));
  if (exclusive) embed.setFooter({ text: t('exclusiveNote') });
  await interaction.channel.send({ embeds: [embed], components: rows, allowedMentions: { parse: [] } });
  await interaction.editReply(t('posted'));
}

// Rangok felvétele és levétele. Kizárólagos panelnél a többi panelrang lekerül.
async function applyRoles(interaction, wanted, panelIds) {
  const t = tr.user(interaction);
  const { member, guild } = interaction;
  const added = [];
  const removed = [];
  for (const roleId of panelIds) {
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;
    const has = member.roles.cache.has(roleId);
    const want = wanted.includes(roleId);
    if (has === want) continue;
    const problem = await roleProblem(guild, role);
    if (problem) {
      console.warn(`Rangválasztó: ${tr.lang('hu', problem, { role: role.name })}`);
      return void (await interaction.editReply(t('unavailable')));
    }
    if (want) {
      await member.roles.add(role);
      added.push(role.name);
    } else {
      await member.roles.remove(role);
      removed.push(role.name);
    }
  }
  return { added, removed };
}

async function toggleRole(interaction, [roleId, mode]) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) return void (await interaction.editReply(t('gone')));

  const has = interaction.member.roles.cache.has(roleId);
  if (mode === 'x') {
    const result = await applyRoles(interaction, has ? [] : [roleId], panelRoleIds(interaction.message));
    if (!result) return;
    return void (await interaction.editReply(has ? t('removed', { role: role.name }) : t('added', { role: role.name })));
  }

  const problem = await roleProblem(interaction.guild, role);
  if (problem) {
    console.warn(`Rangválasztó: ${tr.lang('hu', problem, { role: role.name })}`);
    return void (await interaction.editReply(t('unavailable')));
  }
  if (has) {
    await interaction.member.roles.remove(role);
    await interaction.editReply(t('removed', { role: role.name }));
  } else {
    await interaction.member.roles.add(role);
    await interaction.editReply(t('added', { role: role.name }));
  }
}

// Menü: a kiválasztott rangok átváltanak (ami megvolt, lekerül, ami nem, felkerül).
// Kizárólagos menünél csak a kiválasztott marad meg.
async function menuSelect(interaction, [mode]) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const panelIds = panelRoleIds(interaction.message);
  const has = (id) => interaction.member.roles.cache.has(id);
  const wanted = mode === 'x'
    ? interaction.values
    : panelIds.filter((id) => has(id) !== interaction.values.includes(id));
  const result = await applyRoles(interaction, wanted, panelIds);
  if (!result) return;
  const { added, removed } = result;
  await interaction.editReply(added.length || removed.length
    ? t('updated', { added: added.join(', ') || t('none'), removed: removed.join(', ') || t('none') })
    : t('nothing'));
}

const command = named(new SlashCommandBuilder(), ['rolepanel', 'Post role picker buttons in this channel'],
  ['rangpanel', 'Rangválasztó gombokat rak ki ebbe a csatornába'])
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addRoleOption((option) => named(option, ['role1', 'Role 1'], ['rang1', '1. rang']).setRequired(true));
for (let index = 2; index <= MAX_ROLES; index += 1) {
  command.addRoleOption((option) => named(option, [`role${index}`, `Role ${index}`], [`rang${index}`, `${index}. rang`]));
}
command
  .addStringOption((option) => named(option, ['title', 'Title of the panel'], ['cim', 'A panel címe']).setMaxLength(200))
  .addStringOption((option) => named(option, ['description', 'Text of the panel'], ['leiras', 'A panel szövege']).setMaxLength(1000))
  .addStringOption((option) => named(option, ['style', 'Buttons or a dropdown menu'], ['stilus', 'Gombok vagy lenyíló menü'])
    .addChoices(choice('buttons', 'Buttons', 'Gombok'), choice('menu', 'Dropdown menu', 'Lenyíló menü')))
  .addBooleanOption((option) => named(option, ['exclusive', 'Only one role can be picked at a time'],
    ['csak_egy', 'Egyszerre csak egy rang választható']));

module.exports = {
  commands: [command],
  handlers: { rolepanel: postPanel, 'role:toggle': toggleRole, 'role:menu': menuSelect },
  panelRoleIds,
};
