const {
  ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const settings = require('../../settings');
const { ephemeral, sendLog } = require('../utils');
const { choice, named, translator } = require('../i18n');

const tr = translator({
  hu: {
    ownersOnly: 'Ezt csak a tulajok használhatják.',
    categoryCreated: '✅ Kategória létrehozva: **{name}**',
    channelCreated: '✅ Csatorna létrehozva: <#{channel}>',
    logTitle: '🏗️ {kind} létrehozva',
    category: 'Kategória',
    channel: 'Csatorna',
    logBody: '**Név:** {name}\n**Létrehozta:** <@{user}>\n**Látja:** {visible}',
    defaultVisibility: 'alapértelmezett',
  },
  en: {
    ownersOnly: 'Only the owners can use this.',
    categoryCreated: '✅ Category created: **{name}**',
    channelCreated: '✅ Channel created: <#{channel}>',
    logTitle: '🏗️ {kind} created',
    category: 'Category',
    channel: 'Channel',
    logBody: '**Name:** {name}\n**Created by:** <@{user}>\n**Visible to:** {visible}',
    defaultVisibility: 'default',
  },
});

const isOwner = (interaction) => interaction.guild.ownerId === interaction.user.id
  || settings.ownerRoleIds.some((id) => interaction.member.roles.cache.has(id));

// Ha van rang, csak az (és a bot) látja. Ha nincs, marad az alapértelmezett láthatóság.
function visibility(interaction) {
  const role = interaction.options.getRole('visible_role');
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

async function logCreated(interaction, kindKey, channel, role) {
  await sendLog(interaction.guild, {
    title: tr.server('logTitle', { kind: tr.server(kindKey) }),
    description: tr.server('logBody', {
      name: channel.name, user: interaction.user.id, visible: role ? `<@&${role.id}>` : tr.server('defaultVisibility'),
    }),
  });
}

async function createCategory(interaction) {
  const t = tr.user(interaction);
  if (!isOwner(interaction)) return void (await interaction.reply(ephemeral(t('ownersOnly'))));
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { role, overwrites } = visibility(interaction);
  const category = await interaction.guild.channels.create({
    name: interaction.options.getString('name', true),
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites,
  });
  await interaction.editReply(t('categoryCreated', { name: category.name }));
  await logCreated(interaction, 'category', category, role);
}

async function createChannel(interaction) {
  const t = tr.user(interaction);
  if (!isOwner(interaction)) return void (await interaction.reply(ephemeral(t('ownersOnly'))));
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const isVoice = interaction.options.getString('type') === 'voice';
  const name = interaction.options.getString('name', true).trim();
  const { role, overwrites } = visibility(interaction);
  const channel = await interaction.guild.channels.create({
    // A szöveges csatorna nevében nem lehet szóköz, így a "•" köré sem kerül.
    name: isVoice ? name : name.replace(/\s*•\s*/g, '•'),
    type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
    parent: interaction.options.getChannel('category')?.id,
    permissionOverwrites: overwrites,
  });
  await interaction.editReply(t('channelCreated', { channel: channel.id }));
  await logCreated(interaction, 'channel', channel, role);
}

const addRole = (option) => named(option, ['visible_role', 'If set, only this role can see it'],
  ['lathato_rang', 'Ha megadod, csak ez a rang látja']);

module.exports = {
  commands: [
    named(new SlashCommandBuilder(), ['createcategory', 'Create a new category (owners only)'],
      ['createcategory', 'Új kategória létrehozása (csak tulajoknak)'])
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption((option) => named(option, ['name', 'Name of the category'], ['nev', 'A kategória neve'])
        .setRequired(true).setMaxLength(100))
      .addRoleOption(addRole),
    named(new SlashCommandBuilder(), ['createchannel', 'Create a new channel (owners only)'],
      ['createchannel', 'Új csatorna létrehozása (csak tulajoknak)'])
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption((option) => named(option, ['name', 'Name of the channel'], ['nev', 'A csatorna neve'])
        .setRequired(true).setMaxLength(100))
      .addStringOption((option) => named(option, ['type', 'Text by default'], ['tipus', 'Alapból szöveges'])
        .addChoices(choice('text', 'Text', 'Szöveges'), choice('voice', 'Voice', 'Hang')))
      .addChannelOption((option) => named(option, ['category', 'Which category should it go in?'],
        ['kategoria', 'Melyik kategóriába kerüljön?'])
        .addChannelTypes(ChannelType.GuildCategory))
      .addRoleOption(addRole),
  ],
  handlers: { createcategory: createCategory, createchannel: createChannel },
};
