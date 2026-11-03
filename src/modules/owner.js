const {
  ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const settings = require('../../settings');
const { ephemeral, sendLog } = require('../utils');

const isOwner = (interaction) => interaction.guild.ownerId === interaction.user.id
  || settings.ownerRoleIds.some((id) => interaction.member.roles.cache.has(id));

// Ha van rang, csak az (és a bot) látja. Ha nincs, marad az alapértelmezett láthatóság.
function visibility(interaction) {
  const role = interaction.options.getRole('lathato_rang');
  if (!role) return { role: null, overwrites: undefined };
  return {
    role,
    overwrites: [
      { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: role.id, allow: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.client.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
      },
    ],
  };
}

async function logCreated(interaction, label, channel, role) {
  await sendLog(interaction.guild, {
    title: `🏗️ ${label} létrehozva`,
    description: `**Név:** ${channel.name}\n**Létrehozta:** <@${interaction.user.id}>\n`
      + `**Látja:** ${role ? `<@&${role.id}>` : 'alapértelmezett'}`,
  });
}

async function createCategory(interaction) {
  if (!isOwner(interaction)) return void (await interaction.reply(ephemeral('Ezt csak a tulajok használhatják.')));
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { role, overwrites } = visibility(interaction);
  const category = await interaction.guild.channels.create({
    name: interaction.options.getString('nev', true),
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites,
  });
  await interaction.editReply(`✅ Kategória létrehozva: **${category.name}**`);
  await logCreated(interaction, 'Kategória', category, role);
}

async function createChannel(interaction) {
  if (!isOwner(interaction)) return void (await interaction.reply(ephemeral('Ezt csak a tulajok használhatják.')));
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const isVoice = interaction.options.getString('tipus') === 'hang';
  const name = interaction.options.getString('nev', true).trim();
  const { role, overwrites } = visibility(interaction);
  const channel = await interaction.guild.channels.create({
    // A szöveges csatorna nevében nem lehet szóköz, így a "•" köré sem kerül.
    name: isVoice ? name : name.replace(/\s*•\s*/g, '•'),
    type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
    parent: interaction.options.getChannel('kategoria')?.id,
    permissionOverwrites: overwrites,
  });
  await interaction.editReply(`✅ Csatorna létrehozva: <#${channel.id}>`);
  await logCreated(interaction, 'Csatorna', channel, role);
}

const addRole = (option) => option.setName('lathato_rang').setDescription('Ha megadod, csak ez a rang látja');

module.exports = {
  commands: [
    new SlashCommandBuilder()
      .setName('createcategory')
      .setDescription('Új kategória létrehozása (csak tulajoknak)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption((option) => option.setName('nev').setDescription('A kategória neve')
        .setRequired(true).setMaxLength(100))
      .addRoleOption(addRole),
    new SlashCommandBuilder()
      .setName('createchannel')
      .setDescription('Új csatorna létrehozása (csak tulajoknak)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption((option) => option.setName('nev').setDescription('A csatorna neve')
        .setRequired(true).setMaxLength(100))
      .addStringOption((option) => option.setName('tipus').setDescription('Alapból szöveges')
        .addChoices({ name: 'Szöveges', value: 'szoveges' }, { name: 'Hang', value: 'hang' }))
      .addChannelOption((option) => option.setName('kategoria').setDescription('Melyik kategóriába kerüljön?')
        .addChannelTypes(ChannelType.GuildCategory))
      .addRoleOption(addRole),
  ],
  handlers: { createcategory: createCategory, createchannel: createChannel },
};
