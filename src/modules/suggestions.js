const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder,
  PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { findChannel, userError } = require('../channels');
const { ephemeral, sendLog } = require('../utils');
const { langOf, named, translator } = require('../i18n');

const tr = translator({
  hu: {
    notSet: 'A(z) ötletek csatorna nincs beállítva. Szólj egy adminnak!',
    wait: 'Következő ötletet {minutes} perc múlva küldhetsz.',
    author: '💡 Ötlet: {name}',
    vote: 'Szavazz: {up} vagy {down}',
    accept: 'Elfogadás',
    reject: 'Elutasítás',
    posted: 'Kikerült az ötleted: {url}',
    staffOnly: 'Ezt csak a csapat teheti meg.',
    accepted: 'Elfogadva',
    rejected: 'Elutasítva',
    reasonLabel: 'Indok (nem kötelező)',
    votes: 'Szavazatok',
    decision: 'Döntés',
    reason: 'Indok',
    dm: '{emoji} Az ötletedről döntés született: **{label}**.',
    dmReason: 'Indok: {reason}',
    logTitle: '💡 Ötlet: {label}',
    logBody: '**Beküldő:** <@{author}>\n**Döntött:** <@{staff}>\n**Szavazatok:** {score}\n{url}',
  },
  en: {
    notSet: 'The suggestions channel is not set up. Ask an admin!',
    wait: 'You can send your next suggestion in {minutes} minutes.',
    author: '💡 Suggestion: {name}',
    vote: 'Vote: {up} or {down}',
    accept: 'Accept',
    reject: 'Reject',
    posted: 'Your suggestion was posted: {url}',
    staffOnly: 'Only the team can do this.',
    accepted: 'Accepted',
    rejected: 'Rejected',
    reasonLabel: 'Reason (optional)',
    votes: 'Votes',
    decision: 'Decision',
    reason: 'Reason',
    dm: '{emoji} A decision was made on your suggestion: **{label}**.',
    dmReason: 'Reason: {reason}',
    logTitle: '💡 Suggestion: {label}',
    logBody: '**Sent by:** <@{author}>\n**Decided by:** <@{staff}>\n**Votes:** {score}\n{url}',
  },
});

const UP = '👍';
const DOWN = '👎';
const cooldowns = new Map();
const DECISIONS = {
  accept: { key: 'accepted', emoji: '✅', color: settings.successColor },
  reject: { key: 'rejected', emoji: '❌', color: settings.errorColor },
};

async function suggestionsChannel(guild) {
  const channel = await findChannel(guild, 'suggestions', {
    id: settings.suggestions.channelId, name: settings.suggestions.channelName, type: ChannelType.GuildText,
  });
  if (!channel) throw userError(tr.lang('hu', 'notSet'), tr.lang('en', 'notSet'));
  return channel;
}

const isStaff = (interaction) => interaction.member.roles.cache.has(config.supportRoleId)
  || interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);

const votesOf = (message, emoji) => Math.max(
  (message.reactions.cache.find((reaction) => reaction.emoji.name === emoji)?.count ?? 1) - 1, 0,
);

async function submit(interaction) {
  const t = tr.user(interaction);
  const waitMs = (cooldowns.get(interaction.user.id) ?? 0) + settings.suggestions.cooldownMinutes * 60000 - Date.now();
  if (waitMs > 0) {
    return void (await interaction.reply(ephemeral(t('wait', { minutes: Math.ceil(waitMs / 60000) }))));
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const { user } = interaction;
  const channel = await suggestionsChannel(interaction.guild);
  // A kártya a beküldő nyelvén jelenik meg, a döntés is ezen a nyelven kerül rá.
  const T = tr.as(langOf(interaction.locale));
  const embed = new EmbedBuilder().setColor(settings.color)
    .setAuthor({ name: T('author', { name: user.username }) })
    .setDescription(interaction.options.getString('text', true))
    .setFooter({ text: T('vote', { up: UP, down: DOWN }) })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sug:decide:accept:${user.id}`).setLabel(T('accept'))
      .setEmoji({ name: '✅' }).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`sug:decide:reject:${user.id}`).setLabel(T('reject'))
      .setEmoji({ name: '❌' }).setStyle(ButtonStyle.Danger),
  );

  const message = await channel.send({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
  await message.react(UP);
  await message.react(DOWN);
  cooldowns.set(user.id, Date.now());
  await interaction.editReply(t('posted', { url: message.url }));
}

async function showDecision(interaction, [decision, authorId]) {
  const t = tr.user(interaction);
  if (!isStaff(interaction)) return void (await interaction.reply(ephemeral(t('staffOnly'))));
  await interaction.showModal(new ModalBuilder()
    .setCustomId(`sug:modal:${decision}:${authorId}`)
    .setTitle(t(DECISIONS[decision].key))
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('reason').setLabel(t('reasonLabel'))
        .setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500),
    )));
}

async function decide(interaction, [decision, authorId]) {
  if (!isStaff(interaction)) return void (await interaction.reply(ephemeral(tr.user(interaction)('staffOnly'))));
  await interaction.deferUpdate();

  const message = await interaction.channel.messages.fetch({ message: interaction.message.id, force: true });
  const { key, emoji, color } = DECISIONS[decision];
  const cardLang = message.embeds[0]?.author?.name?.startsWith(tr.lang('en', 'author', { name: '' })) ? 'en' : 'hu';
  const T = tr.as(cardLang);
  const label = T(key);
  const reason = interaction.fields.getTextInputValue('reason').trim();
  const score = `${UP} ${votesOf(message, UP)}   ${DOWN} ${votesOf(message, DOWN)}`;
  const embed = EmbedBuilder.from(message.embeds[0]).setColor(color)
    .setFooter({ text: `${label}: ${interaction.user.username}` })
    .addFields(
      { name: T('votes'), value: score, inline: true },
      { name: T('decision'), value: `${emoji} ${label}`, inline: true },
    );
  if (reason) embed.addFields({ name: T('reason'), value: reason });
  await message.edit({ embeds: [embed], components: [] });

  const dmLines = [T('dm', { emoji, label })];
  if (reason) dmLines.push(T('dmReason', { reason }));
  dmLines.push(message.url);
  await interaction.client.users.send(authorId, { content: dmLines.join('\n'), allowedMentions: { parse: [] } })
    .catch(() => {}); // Sokaknál tiltva van a privát üzenet, ez nem hiba.
  await sendLog(interaction.guild, {
    title: tr.server('logTitle', { label: tr.server(key) }),
    description: tr.server('logBody', {
      author: authorId, staff: interaction.user.id, score, url: message.url,
    }),
    color,
  });
}

module.exports = {
  commands: [
    named(new SlashCommandBuilder(), ['suggest', 'Send an idea to the suggestion box'],
      ['otlet', 'Ötlet beküldése a javaslatdobozba'])
      .addStringOption((option) => named(option, ['text', 'What is your idea?'], ['szoveg', 'Mi az ötleted?'])
        .setRequired(true).setMaxLength(1000)),
  ],
  handlers: { suggest: submit, 'sug:decide': showDecision, 'sug:modal': decide },
};
