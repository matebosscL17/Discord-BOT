const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const settings = require('../../settings');
const { ephemeral } = require('../utils');
const { langOf, named, translator } = require('../i18n');

const tr = translator({
  hu: {
    commands: '📖 Parancsok',
    pong: '🏓 Pong! Válaszidő: {ms} ms',
    members: 'Tagok',
    channels: 'Csatornák',
    roles: 'Rangok',
    created: 'Létrehozva',
  },
  en: {
    commands: '📖 Commands',
    pong: '🏓 Pong! Latency: {ms} ms',
    members: 'Members',
    channels: 'Channels',
    roles: 'Roles',
    created: 'Created',
  },
});

async function help(interaction, _args, { commands }) {
  const t = tr.user(interaction);
  const hu = langOf(interaction.locale) === 'hu';
  const visible = commands.filter((command) => !command.default_member_permissions
    || interaction.memberPermissions.has(BigInt(command.default_member_permissions)));
  const lines = visible.map((command) => {
    const name = (hu && command.name_localizations?.hu) || command.name;
    const description = (hu && command.description_localizations?.hu) || command.description;
    return `**/${name}**: ${description}`;
  });
  const embed = new EmbedBuilder().setColor(settings.color).setTitle(t('commands'))
    .setDescription(lines.join('\n').slice(0, 4096));
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function ping(interaction) {
  await interaction.reply(ephemeral(tr.user(interaction)('pong', { ms: Math.round(interaction.client.ws.ping) })));
}

async function serverInfo(interaction) {
  const t = tr.user(interaction);
  const { guild } = interaction;
  const embed = new EmbedBuilder().setColor(settings.color).setTitle(guild.name)
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: t('members'), value: String(guild.memberCount), inline: true },
      { name: t('channels'), value: String(guild.channels.cache.size), inline: true },
      { name: t('roles'), value: String(guild.roles.cache.size), inline: true },
      { name: t('created'), value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
    );
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = {
  commands: [
    named(new SlashCommandBuilder(), ['help', "The bot's commands"], ['help', 'A bot parancsai']),
    named(new SlashCommandBuilder(), ['ping', 'Checks whether the bot is alive'], ['ping', 'Megnézi, hogy él-e a bot']),
    named(new SlashCommandBuilder(), ['serverinfo', 'Information about the server'], ['szerverinfo', 'Adatok a szerverről']),
  ],
  handlers: { help, ping, serverinfo: serverInfo },
};
