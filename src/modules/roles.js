const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags,
  PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const settings = require('../../settings');
const { named, translator } = require('../i18n');

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

  const buttons = roles.map((role) => {
    const button = new ButtonBuilder().setCustomId(`role:toggle:${role.id}`)
      .setLabel(role.name.slice(0, 80)).setStyle(ButtonStyle.Secondary);
    const emoji = emojiFor(role);
    return emoji ? button.setEmoji({ name: emoji }) : button;
  });
  const rows = [];
  for (let start = 0; start < buttons.length; start += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(start, start + 5)));
  }

  const embed = new EmbedBuilder().setColor(settings.color)
    .setTitle(interaction.options.getString('title') ?? tr.server('defaultTitle'))
    .setDescription(interaction.options.getString('description') ?? tr.server('defaultDescription'));
  await interaction.channel.send({ embeds: [embed], components: rows });
  await interaction.editReply(t('posted'));
}

async function toggleRole(interaction, [roleId]) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) return void (await interaction.editReply(t('gone')));

  const problem = await roleProblem(interaction.guild, role);
  if (problem) {
    console.warn(`Rangválasztó: ${tr.lang('hu', problem, { role: role.name })}`);
    return void (await interaction.editReply(t('unavailable')));
  }

  const { member } = interaction;
  if (member.roles.cache.has(role.id)) {
    await member.roles.remove(role);
    await interaction.editReply(t('removed', { role: role.name }));
  } else {
    await member.roles.add(role);
    await interaction.editReply(t('added', { role: role.name }));
  }
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
  .addStringOption((option) => named(option, ['description', 'Text of the panel'], ['leiras', 'A panel szövege']).setMaxLength(1000));

module.exports = {
  commands: [command],
  handlers: { rolepanel: postPanel, 'role:toggle': toggleRole },
};
