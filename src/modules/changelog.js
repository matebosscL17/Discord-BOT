const {
  ActionRowBuilder, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits,
  SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { formatChangelogLine: formatLine } = require('../utils');
const {
  choice, named, pick, serverLang, translator,
} = require('../i18n');

const tr = translator({
  hu: {
    modalTitle: 'Új changelog',
    title: 'Cím',
    titleHint: 'Pl. Frissítés 1.2',
    changes: 'Változások (soronként egy)',
    changesHint: '+ új dolog\n- törölt dolog\n! javított dolog',
    noChannel: 'Nem találom a Changelog csatornát. Ellenőrizd a CHANGELOG_CHANNEL_ID értékét!',
    postedBy: 'Közzétette: {name}',
    done: 'Kész, kikerült ide: <#{channel}>',
  },
  en: {
    modalTitle: 'New changelog',
    title: 'Title',
    titleHint: 'E.g. Update 1.2',
    changes: 'Changes (one per line)',
    changesHint: '+ added thing\n- removed thing\n! fixed thing',
    noChannel: 'I cannot find the Changelog channel. Check the CHANGELOG_CHANNEL_ID value!',
    postedBy: 'Posted by: {name}',
    done: 'Done, posted here: <#{channel}>',
  },
});

const typeById = (id) => settings.changelogTypes.find((type) => type.id === id) ?? settings.changelogTypes[0];

async function showModal(interaction) {
  const t = tr.user(interaction);
  const type = interaction.options.getString('type') ?? settings.changelogTypes[0].id;
  const ping = interaction.options.getBoolean('ping') ? '1' : '0';
  const field = (id, label, style, max, placeholder) => new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setMaxLength(max).setPlaceholder(placeholder),
  );
  await interaction.showModal(new ModalBuilder()
    .setCustomId(`changelog:modal:${type}:${ping}`)
    .setTitle(t('modalTitle'))
    .addComponents(
      field('title', t('title'), TextInputStyle.Short, 200, t('titleHint')),
      field('changes', t('changes'), TextInputStyle.Paragraph, 3500, t('changesHint')),
    ));
}

async function post(interaction, [typeId, ping]) {
  const t = tr.user(interaction);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const channel = await interaction.guild.channels.fetch(config.changelogChannelId).catch(() => null);
  if (!channel?.isTextBased()) {
    await interaction.editReply(t('noChannel'));
    return;
  }

  const type = typeById(typeId);
  const description = interaction.fields.getTextInputValue('changes')
    .split('\n').map((line) => line.trim()).filter(Boolean)
    .map(formatLine).join('\n').slice(0, 4096);

  const embed = new EmbedBuilder()
    .setColor(type.color)
    .setAuthor({ name: `${type.emoji} ${pick(type, 'label', serverLang())}` })
    .setTitle(interaction.fields.getTextInputValue('title'))
    .setDescription(description)
    .setFooter({ text: tr.server('postedBy', { name: interaction.user.username }) })
    .setTimestamp();

  const pingRole = ping === '1' ? config.changelogPingRoleId : undefined;
  await channel.send({
    content: pingRole ? `<@&${pingRole}>` : undefined,
    embeds: [embed],
    allowedMentions: { roles: pingRole ? [pingRole] : [] },
  });
  await interaction.editReply(t('done', { channel: channel.id }));
}

module.exports = {
  commands: [
    named(new SlashCommandBuilder(), ['changelog', 'Announce an update in the Changelog channel'],
      ['changelog', 'Új frissítés bejelentése a Changelog csatornában'])
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption((option) => named(option, ['type', 'Type of the announcement'], ['tipus', 'A bejelentés típusa'])
        .addChoices(...settings.changelogTypes.map((type) => choice(type.id, type.labelEn ?? type.label, type.label))))
      .addBooleanOption((option) => named(option, ['ping', 'Ping the configured role?'], ['ping', 'Pingelje a beállított rangot?'])),
  ],
  handlers: { changelog: showModal, 'changelog:modal': post },
};
