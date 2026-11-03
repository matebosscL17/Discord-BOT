const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags,
  PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const settings = require('../../settings');
const { ephemeral } = require('../utils');

const MAX_ROLES = 10;
// Ilyen jogú rangot a tagok nem kaphatnak meg gombbal.
const DANGEROUS = [
  'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'ManageMessages', 'ManageWebhooks',
  'KickMembers', 'BanMembers', 'ModerateMembers', 'MentionEveryone',
].map((name) => PermissionFlagsBits[name]);

const isDangerous = (role) => DANGEROUS.some((permission) => role.permissions.has(permission));

async function roleProblem(guild, role) {
  const me = await guild.members.fetchMe();
  if (role.id === guild.id || role.managed) return `A(z) ${role.name} nem osztható ki.`;
  if (isDangerous(role)) return `A(z) ${role.name} rangnak moderátori joga van, ezért nem tehető panelre.`;
  if (me.roles.highest.comparePositionTo(role) <= 0) return `Húzd a bot rangját a(z) ${role.name} fölé!`;
  return null;
}

function emojiFor(role) {
  const name = role.name.toLowerCase();
  return Object.entries(settings.roleEmojis).find(([word]) => name.includes(word))?.[1];
}

async function postPanel(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const roles = [];
  for (let index = 1; index <= MAX_ROLES; index += 1) {
    const role = interaction.options.getRole(`rang${index}`);
    if (role && !roles.some((item) => item.id === role.id)) roles.push(role);
  }

  for (const role of roles) {
    const problem = await roleProblem(interaction.guild, role);
    if (problem) return void (await interaction.editReply(problem));
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
    .setTitle(interaction.options.getString('cim') ?? '🎮 Válaszd ki a játékaidat')
    .setDescription(interaction.options.getString('leiras') ?? 'Kattints a gombra a rang felvételéhez, újra kattintva leveszed.');
  await interaction.channel.send({ embeds: [embed], components: rows });
  await interaction.editReply('A rangválasztó kikerült.');
}

async function toggleRole(interaction, [roleId]) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) return void (await interaction.editReply('Ez a rang már nem létezik.'));

  const problem = await roleProblem(interaction.guild, role);
  if (problem) {
    console.warn(`Rangválasztó: ${problem}`);
    return void (await interaction.editReply('Ez a rang most nem vehető fel, szólj egy adminnak.'));
  }

  const { member } = interaction;
  if (member.roles.cache.has(role.id)) {
    await member.roles.remove(role);
    await interaction.editReply(`➖ Levetted: **${role.name}**`);
  } else {
    await member.roles.add(role);
    await interaction.editReply(`✅ Megkaptad: **${role.name}**`);
  }
}

const command = new SlashCommandBuilder()
  .setName('rangpanel')
  .setDescription('Rangválasztó gombokat rak ki ebbe a csatornába')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addRoleOption((option) => option.setName('rang1').setDescription('1. rang').setRequired(true));
for (let index = 2; index <= MAX_ROLES; index += 1) {
  command.addRoleOption((option) => option.setName(`rang${index}`).setDescription(`${index}. rang`));
}
command
  .addStringOption((option) => option.setName('cim').setDescription('A panel címe').setMaxLength(200))
  .addStringOption((option) => option.setName('leiras').setDescription('A panel szövege').setMaxLength(1000));

module.exports = {
  commands: [command],
  handlers: { rangpanel: postPanel, 'role:toggle': toggleRole },
};
