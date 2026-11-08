const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits,
  SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const crypto = require('node:crypto');
const config = require('../config');
const settings = require('../../settings');
const { ephemeral, formatChangelogLine: formatLine } = require('../utils');
const {
  choice, langOf, named, pick, translator,
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
    version: 'Verzió (nem kötelező)',
    versionHint: 'Pl. 1.2.0',
    image: 'Kép linkje (nem kötelező)',
    imageHint: 'https://...',
    badImage: 'A kép linkjének https://-sel kell kezdődnie.',
    preview: '👀 **Előnézet.** Így fog kinézni. Ha jó, nyomd meg a Közzététel gombot.{ping}',
    previewPing: '\nA bejelentés pingelni fogja ezt a rangot: <@&{role}>',
    publish: 'Közzététel',
    cancel: 'Mégse',
    cancelled: 'Elvetve, nem került ki semmi.',
    expired: 'Ez az előnézet lejárt vagy már közzé lett téve. Futtasd újra a /changelog parancsot.',
    notYours: 'Ezt csak az teheti közzé, aki megírta.',
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
    version: 'Version (optional)',
    versionHint: 'E.g. 1.2.0',
    image: 'Image link (optional)',
    imageHint: 'https://...',
    badImage: 'The image link must start with https://.',
    preview: '👀 **Preview.** This is how it will look. If it is good, press Publish.{ping}',
    previewPing: '\nThe announcement will ping this role: <@&{role}>',
    publish: 'Publish',
    cancel: 'Cancel',
    cancelled: 'Discarded, nothing was posted.',
    expired: 'This preview has expired or was already published. Run /changelog again.',
    notYours: 'Only the person who wrote this can publish it.',
  },
});

const typeById = (id) => settings.changelogTypes.find((type) => type.id === id) ?? settings.changelogTypes[0];

const DRAFT_TTL_MS = 15 * 60000;
const drafts = new Map(); // előnézetek: azonosító -> { userId, embed, pingRole, createdAt }

function cleanupDrafts() {
  for (const [id, draft] of drafts) if (Date.now() - draft.createdAt > DRAFT_TTL_MS) drafts.delete(id);
}

async function showModal(interaction) {
  const t = tr.user(interaction);
  const type = interaction.options.getString('type') ?? settings.changelogTypes[0].id;
  const ping = interaction.options.getBoolean('ping') ? '1' : '0';
  const field = (id, label, style, max, placeholder, required = true) => new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setMaxLength(max)
      .setPlaceholder(placeholder).setRequired(required),
  );
  await interaction.showModal(new ModalBuilder()
    .setCustomId(`changelog:modal:${type}:${ping}`)
    .setTitle(t('modalTitle'))
    .addComponents(
      field('title', t('title'), TextInputStyle.Short, 200, t('titleHint')),
      field('version', t('version'), TextInputStyle.Short, 30, t('versionHint'), false),
      field('changes', t('changes'), TextInputStyle.Paragraph, 3500, t('changesHint')),
      field('image', t('image'), TextInputStyle.Short, 500, t('imageHint'), false),
    ));
}

function readField(interaction, id) {
  try {
    return interaction.fields.getTextInputValue(id).trim();
  } catch {
    return '';
  }
}

// Az űrlap után előbb előnézet jön, csak a Közzététel gomb után kerül ki.
async function preview(interaction, [typeId, ping]) {
  const t = tr.user(interaction);
  const image = readField(interaction, 'image');
  if (image && !/^https:\/\/\S+$/.test(image)) return void (await interaction.reply(ephemeral(t('badImage'))));

  const type = typeById(typeId);
  const version = readField(interaction, 'version');
  const title = readField(interaction, 'title');
  const description = readField(interaction, 'changes')
    .split('\n').map((line) => line.trim()).filter(Boolean)
    .map(formatLine).join('\n').slice(0, 4096);

  const embed = new EmbedBuilder()
    .setColor(type.color)
    .setAuthor({ name: `${type.emoji} ${pick(type, 'label', langOf(interaction.locale))}${version ? ` • v${version.replace(/^v/i, '')}` : ''}` })
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: t('postedBy', { name: interaction.user.username }) })
    .setTimestamp();
  if (image) embed.setImage(image);

  cleanupDrafts();
  const id = crypto.randomUUID().slice(0, 8);
  const pingRole = ping === '1' ? config.changelogPingRoleId : undefined;
  drafts.set(id, {
    userId: interaction.user.id, embed, pingRole, createdAt: Date.now(),
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`changelog:publish:${id}`).setLabel(t('publish')).setEmoji({ name: '📢' }).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`changelog:cancel:${id}`).setLabel(t('cancel')).setStyle(ButtonStyle.Secondary),
  );
  await interaction.reply({
    content: t('preview', { ping: pingRole ? t('previewPing', { role: pingRole }) : '' }),
    embeds: [embed],
    components: [row],
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  });
}

async function publish(interaction, [id]) {
  const t = tr.user(interaction);
  const draft = drafts.get(id);
  if (!draft) return void (await interaction.update({ content: t('expired'), embeds: [], components: [] }));
  if (draft.userId !== interaction.user.id) return void (await interaction.reply(ephemeral(t('notYours'))));

  const channel = await interaction.guild.channels.fetch(config.changelogChannelId).catch(() => null);
  if (!channel?.isTextBased()) return void (await interaction.update({ content: t('noChannel'), embeds: [], components: [] }));

  drafts.delete(id);
  await channel.send({
    content: draft.pingRole ? `<@&${draft.pingRole}>` : undefined,
    embeds: [draft.embed],
    allowedMentions: { roles: draft.pingRole ? [draft.pingRole] : [] },
  });
  await interaction.update({ content: t('done', { channel: channel.id }), embeds: [], components: [] });
}

async function cancel(interaction, [id]) {
  drafts.delete(id);
  await interaction.update({ content: tr.user(interaction)('cancelled'), embeds: [], components: [] });
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
  handlers: {
    changelog: showModal,
    'changelog:modal': preview,
    'changelog:publish': publish,
    'changelog:cancel': cancel,
  },
};
