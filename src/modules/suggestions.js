const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder,
  PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');
const settings = require('../../settings');
const { ensureBotChannel } = require('../channels');
const { ephemeral, sendLog } = require('../utils');

const UP = '👍';
const DOWN = '👎';
const cooldowns = new Map();
const DECISIONS = {
  accept: { label: 'Elfogadva', emoji: '✅', color: settings.successColor },
  reject: { label: 'Elutasítva', emoji: '❌', color: settings.errorColor },
};

const isStaff = (interaction) => interaction.member.roles.cache.has(config.supportRoleId)
  || interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);

const votesOf = (message, emoji) => Math.max(
  (message.reactions.cache.find((reaction) => reaction.emoji.name === emoji)?.count ?? 1) - 1, 0,
);

async function submit(interaction) {
  const waitMs = (cooldowns.get(interaction.user.id) ?? 0) + settings.suggestions.cooldownMinutes * 60000 - Date.now();
  if (waitMs > 0) {
    return void (await interaction.reply(ephemeral(`Következő ötletet ${Math.ceil(waitMs / 60000)} perc múlva küldhetsz.`)));
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const { user } = interaction;
  const channel = await ensureBotChannel(interaction.guild, settings.suggestions.channelName);
  const embed = new EmbedBuilder().setColor(settings.color)
    .setAuthor({ name: `💡 Ötlet: ${user.username}` })
    .setDescription(interaction.options.getString('szoveg', true))
    .setFooter({ text: `Szavazz: ${UP} vagy ${DOWN}` })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sug:decide:accept:${user.id}`).setLabel('Elfogadás')
      .setEmoji({ name: '✅' }).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`sug:decide:reject:${user.id}`).setLabel('Elutasítás')
      .setEmoji({ name: '❌' }).setStyle(ButtonStyle.Danger),
  );

  const message = await channel.send({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
  await message.react(UP);
  await message.react(DOWN);
  cooldowns.set(user.id, Date.now());
  await interaction.editReply(`Kikerült az ötleted: ${message.url}`);
}

async function showDecision(interaction, [decision, authorId]) {
  if (!isStaff(interaction)) return void (await interaction.reply(ephemeral('Ezt csak a csapat teheti meg.')));
  await interaction.showModal(new ModalBuilder()
    .setCustomId(`sug:modal:${decision}:${authorId}`)
    .setTitle(DECISIONS[decision].label)
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('reason').setLabel('Indok (nem kötelező)')
        .setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500),
    )));
}

async function decide(interaction, [decision, authorId]) {
  if (!isStaff(interaction)) return void (await interaction.reply(ephemeral('Ezt csak a csapat teheti meg.')));
  await interaction.deferUpdate();

  const message = await interaction.channel.messages.fetch({ message: interaction.message.id, force: true });
  const { label, emoji, color } = DECISIONS[decision];
  const reason = interaction.fields.getTextInputValue('reason').trim();
  const score = `${UP} ${votesOf(message, UP)}   ${DOWN} ${votesOf(message, DOWN)}`;
  const embed = EmbedBuilder.from(message.embeds[0]).setColor(color)
    .setFooter({ text: `${label}: ${interaction.user.username}` })
    .addFields(
      { name: 'Szavazatok', value: score, inline: true },
      { name: 'Döntés', value: `${emoji} ${label}`, inline: true },
    );
  if (reason) embed.addFields({ name: 'Indok', value: reason });
  await message.edit({ embeds: [embed], components: [] });

  await interaction.client.users.send(authorId, {
    content: `${emoji} Az ötletedről döntés született: **${label}**.${reason ? `\nIndok: ${reason}` : ''}\n${message.url}`,
    allowedMentions: { parse: [] },
  }).catch(() => {}); // Sokaknál tiltva van a privát üzenet, ez nem hiba.
  await sendLog(interaction.guild, {
    title: `💡 Ötlet: ${label}`,
    description: `**Beküldő:** <@${authorId}>\n**Döntött:** <@${interaction.user.id}>\n**Szavazatok:** ${score}\n${message.url}`,
    color,
  });
}

module.exports = {
  commands: [
    new SlashCommandBuilder()
      .setName('otlet')
      .setDescription('Ötlet beküldése a javaslatdobozba')
      .addStringOption((option) => option.setName('szoveg').setDescription('Mi az ötleted?')
        .setRequired(true).setMaxLength(1000)),
  ],
  handlers: { otlet: submit, 'sug:decide': showDecision, 'sug:modal': decide },
};
