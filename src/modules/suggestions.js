const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder,
  PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { findChannel, userError } = require('../channels');
const { ephemeral, sendLog } = require('../utils');
const { readJson, writeJson } = require('../store');
const { langOf, named, translator } = require('../i18n');

const tr = translator({
  hu: {
    notSet: 'A(z) ötletek csatorna nincs beállítva. Szólj egy adminnak!',
    wait: 'Következő ötletet {minutes} perc múlva küldhetsz.',
    author: '💡 Ötlet #{number}',
    sentBy: 'Beküldte: {name}',
    vote: 'Szavazz: {up} vagy {down}',
    status: '📌 Állapot',
    voting: '🗳️ Szavazás alatt',
    accepted: '✅ Elfogadva',
    rejected: '❌ Elutasítva',
    considering: '🤔 Átgondolás alatt',
    accept: 'Elfogadás',
    reject: 'Elutasítás',
    consider: 'Átgondolás',
    thread: 'Ötlet #{number} – beszélgetés',
    posted: 'Kikerült az ötleted (#{number}): {url}',
    staffOnly: 'Ezt csak a csapat teheti meg.',
    reasonLabel: 'Indok vagy megjegyzés (nem kötelező)',
    votes: '🗳️ Szavazatok',
    decidedBy: '👤 Döntött',
    reason: '💬 Indok',
    dm: 'Az ötletedről (#{number}) döntés született: **{label}**.',
    dmReason: 'Indok: {reason}',
    logTitle: '💡 Ötlet #{number}: {label}',
    logBody: '**Beküldő:** <@{author}>\n**Döntött:** <@{staff}>\n**Szavazatok:** {score}\n{url}',
  },
  en: {
    notSet: 'The suggestions channel is not set up. Ask an admin!',
    wait: 'You can send your next suggestion in {minutes} minutes.',
    author: '💡 Suggestion #{number}',
    sentBy: 'Sent by: {name}',
    vote: 'Vote: {up} or {down}',
    status: '📌 Status',
    voting: '🗳️ Open for votes',
    accepted: '✅ Accepted',
    rejected: '❌ Rejected',
    considering: '🤔 Under consideration',
    accept: 'Accept',
    reject: 'Reject',
    consider: 'Consider',
    thread: 'Suggestion #{number} – discussion',
    posted: 'Your suggestion was posted (#{number}): {url}',
    staffOnly: 'Only the team can do this.',
    reasonLabel: 'Reason or comment (optional)',
    votes: '🗳️ Votes',
    decidedBy: '👤 Decided by',
    reason: '💬 Reason',
    dm: 'A decision was made on your suggestion (#{number}): **{label}**.',
    dmReason: 'Reason: {reason}',
    logTitle: '💡 Suggestion #{number}: {label}',
    logBody: '**Sent by:** <@{author}>\n**Decided by:** <@{staff}>\n**Votes:** {score}\n{url}',
  },
});

const UP = '👍';
const DOWN = '👎';
const cooldowns = new Map();
const DECISIONS = {
  accept: { key: 'accepted', color: settings.successColor, final: true },
  reject: { key: 'rejected', color: settings.errorColor, final: true },
  consider: { key: 'considering', color: settings.warningColor, final: false },
};
const STATUS_ICON = '📌';

async function suggestionsChannel(guild) {
  const channel = await findChannel(guild, 'suggestions', {
    id: settings.suggestions.channelId, name: settings.suggestions.channelName, type: ChannelType.GuildText,
  });
  if (!channel) throw userError(tr.lang('hu', 'notSet'), tr.lang('en', 'notSet'));
  return channel;
}

function nextNumber() {
  const data = readJson('suggestions', { counter: 0 });
  data.counter += 1;
  writeJson('suggestions', data);
  return data.counter;
}

const isStaff = (interaction) => interaction.member.roles.cache.has(config.supportRoleId)
  || interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);

const votesOf = (message, emoji) => Math.max(
  (message.reactions.cache.find((reaction) => reaction.emoji.name === emoji)?.count ?? 1) - 1, 0,
);

// A kártya nyelve és sorszáma a fejlécből derül ki ("💡 Ötlet #12" vagy "💡 Suggestion #12").
function cardInfo(embed) {
  const name = embed?.author?.name ?? '';
  return {
    lang: name.startsWith('💡 Suggestion') ? 'en' : 'hu',
    number: name.match(/#(\d+)/)?.[1] ?? '?',
  };
}

function decisionButtons(lang, authorId, disabled = false) {
  const T = tr.as(lang);
  const button = (id, style, emoji) => new ButtonBuilder().setCustomId(`sug:decide:${id}:${authorId}`)
    .setLabel(T(id)).setEmoji({ name: emoji }).setStyle(style).setDisabled(disabled);
  return new ActionRowBuilder().addComponents(
    button('accept', ButtonStyle.Success, '✅'),
    button('consider', ButtonStyle.Secondary, '🤔'),
    button('reject', ButtonStyle.Danger, '❌'),
  );
}

async function submit(interaction) {
  const t = tr.user(interaction);
  const waitMs = (cooldowns.get(interaction.user.id) ?? 0) + settings.suggestions.cooldownMinutes * 60000 - Date.now();
  if (waitMs > 0) {
    return void (await interaction.reply(ephemeral(t('wait', { minutes: Math.ceil(waitMs / 60000) }))));
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const { user } = interaction;
  const channel = await suggestionsChannel(interaction.guild);
  const number = nextNumber();
  // A kártya a beküldő nyelvén jelenik meg, a döntés is ezen a nyelven kerül rá.
  const lang = langOf(interaction.locale);
  const T = tr.as(lang);
  const embed = new EmbedBuilder().setColor(settings.color)
    .setAuthor({ name: T('author', { number }), iconURL: user.displayAvatarURL?.() })
    .setDescription(interaction.options.getString('text', true))
    .addFields({ name: T('status'), value: T('voting') })
    .setFooter({ text: `${T('sentBy', { name: user.username })} • ${T('vote', { up: UP, down: DOWN })}` })
    .setTimestamp();

  const message = await channel.send({
    embeds: [embed], components: [decisionButtons(lang, user.id)], allowedMentions: { parse: [] },
  });
  await message.react(UP);
  await message.react(DOWN);
  // Beszélgetőszál az ötlethez. Ha a botnak nincs joga szálat nyitni, egyszerűen kimarad.
  await message.startThread?.({ name: T('thread', { number }).slice(0, 100), autoArchiveDuration: 10080 })
    .catch(() => {});
  cooldowns.set(user.id, Date.now());
  await interaction.editReply(t('posted', { number, url: message.url }));
}

async function showDecision(interaction, [decision, authorId]) {
  const t = tr.user(interaction);
  if (!isStaff(interaction)) return void (await interaction.reply(ephemeral(t('staffOnly'))));
  await interaction.showModal(new ModalBuilder()
    .setCustomId(`sug:modal:${decision}:${authorId}`)
    .setTitle(t(DECISIONS[decision].key).replace(/^\S+\s/, ''))
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('reason').setLabel(t('reasonLabel'))
        .setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500),
    )));
}

async function decide(interaction, [decision, authorId]) {
  if (!isStaff(interaction)) return void (await interaction.reply(ephemeral(tr.user(interaction)('staffOnly'))));
  await interaction.deferUpdate();

  const message = await interaction.channel.messages.fetch({ message: interaction.message.id, force: true });
  const original = message.embeds[0];
  const { lang, number } = cardInfo(original);
  const T = tr.as(lang);
  const { key, color, final } = DECISIONS[decision];
  const reason = interaction.fields.getTextInputValue('reason').trim();
  const score = `${UP} ${votesOf(message, UP)}   ${DOWN} ${votesOf(message, DOWN)}`;

  // Az állapot, a szavazatok és az indok mezői frissülnek, a többi marad.
  const keep = (original.fields ?? []).filter((field) => ![T('status'), T('votes'), T('decidedBy'), T('reason')].includes(field.name)
    && !field.name.startsWith(STATUS_ICON));
  const fields = [
    ...keep,
    { name: T('status'), value: T(key), inline: true },
    { name: T('votes'), value: score, inline: true },
    { name: T('decidedBy'), value: `<@${interaction.user.id}>`, inline: true },
  ];
  if (reason) fields.push({ name: T('reason'), value: reason });
  const embed = EmbedBuilder.from(original).setColor(color).setFields(fields);
  await message.edit({ embeds: [embed], components: final ? [] : [decisionButtons(lang, authorId)] });

  const dmLines = [T('dm', { number, label: T(key) })];
  if (reason) dmLines.push(T('dmReason', { reason }));
  dmLines.push(message.url);
  await interaction.client.users.send(authorId, { content: dmLines.join('\n'), allowedMentions: { parse: [] } })
    .catch(() => {}); // Sokaknál tiltva van a privát üzenet, ez nem hiba.
  await sendLog(interaction.guild, {
    title: tr.server('logTitle', { number, label: tr.server(key) }),
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
  cardInfo,
};
