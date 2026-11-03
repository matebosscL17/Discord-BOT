const {
  ActionRowBuilder, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits,
  SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { formatChangelogLine: formatLine } = require('../utils');

const typeById = (id) => settings.changelogTypes.find((type) => type.id === id) ?? settings.changelogTypes[0];

async function showModal(interaction) {
  const type = interaction.options.getString('tipus') ?? settings.changelogTypes[0].id;
  const ping = interaction.options.getBoolean('ping') ? '1' : '0';
  const field = (id, label, style, max, placeholder) => new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setMaxLength(max).setPlaceholder(placeholder),
  );
  await interaction.showModal(new ModalBuilder()
    .setCustomId(`changelog:modal:${type}:${ping}`)
    .setTitle('Új changelog')
    .addComponents(
      field('title', 'Cím', TextInputStyle.Short, 200, 'Pl. Frissítés 1.2'),
      field('changes', 'Változások (soronként egy)', TextInputStyle.Paragraph, 3500, '+ új dolog\n- törölt dolog\n! javított dolog'),
    ));
}

async function post(interaction, [typeId, ping]) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const channel = await interaction.guild.channels.fetch(config.changelogChannelId).catch(() => null);
  if (!channel?.isTextBased()) {
    await interaction.editReply('Nem találom a Changelog csatornát. Ellenőrizd a CHANGELOG_CHANNEL_ID értékét!');
    return;
  }

  const type = typeById(typeId);
  const description = interaction.fields.getTextInputValue('changes')
    .split('\n').map((line) => line.trim()).filter(Boolean)
    .map(formatLine).join('\n').slice(0, 4096);

  const embed = new EmbedBuilder()
    .setColor(type.color)
    .setAuthor({ name: `${type.emoji} ${type.label}` })
    .setTitle(interaction.fields.getTextInputValue('title'))
    .setDescription(description)
    .setFooter({ text: `Közzétette: ${interaction.user.username}` })
    .setTimestamp();

  const pingRole = ping === '1' ? config.changelogPingRoleId : undefined;
  await channel.send({
    content: pingRole ? `<@&${pingRole}>` : undefined,
    embeds: [embed],
    allowedMentions: { roles: pingRole ? [pingRole] : [] },
  });
  await interaction.editReply(`Kész, kikerült ide: <#${channel.id}>`);
}

module.exports = {
  commands: [
    new SlashCommandBuilder()
      .setName('changelog')
      .setDescription('Új frissítés bejelentése a Changelog csatornában')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) => option.setName('tipus').setDescription('A bejelentés típusa')
        .addChoices(...settings.changelogTypes.map((type) => ({ name: type.label, value: type.id }))))
      .addBooleanOption((option) => option.setName('ping').setDescription('Pingelje a beállított rangot?')),
  ],
  handlers: { changelog: showModal, 'changelog:modal': post },
};
