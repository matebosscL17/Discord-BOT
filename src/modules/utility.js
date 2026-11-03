const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const settings = require('../../settings');
const { ephemeral } = require('../utils');

async function help(interaction, _args, { commands }) {
  const visible = commands.filter((command) => !command.default_member_permissions
    || interaction.memberPermissions.has(BigInt(command.default_member_permissions)));
  const embed = new EmbedBuilder().setColor(settings.color).setTitle('📖 Parancsok')
    .setDescription(visible.map((command) => `**/${command.name}**: ${command.description}`).join('\n'));
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function ping(interaction) {
  await interaction.reply(ephemeral(`🏓 Pong! Válaszidő: ${Math.round(interaction.client.ws.ping)} ms`));
}

async function serverInfo(interaction) {
  const { guild } = interaction;
  const embed = new EmbedBuilder().setColor(settings.color).setTitle(guild.name)
    .setThumbnail(guild.iconURL())
    .addFields(
      { name: 'Tagok', value: String(guild.memberCount), inline: true },
      { name: 'Csatornák', value: String(guild.channels.cache.size), inline: true },
      { name: 'Rangok', value: String(guild.roles.cache.size), inline: true },
      { name: 'Létrehozva', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
    );
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = {
  commands: [
    new SlashCommandBuilder().setName('help').setDescription('A bot parancsai'),
    new SlashCommandBuilder().setName('ping').setDescription('Megnézi, hogy él-e a bot'),
    new SlashCommandBuilder().setName('szerverinfo').setDescription('Adatok a szerverről'),
  ],
  handlers: { help, ping, szerverinfo: serverInfo },
};
