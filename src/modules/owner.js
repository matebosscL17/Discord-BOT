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
    withChannels: '\nBenne: {list}',
    tooMany: 'Egyszerre legfeljebb {max} csatornát hozhatsz létre.',
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
    withChannels: '\nInside: {list}',
    tooMany: 'You can create at most {max} channels at once.',
  },
});

const MAX_CHANNELS = 10;

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
  const split = (name) => (interaction.options.getString(name) ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  const textNames = split('text_channels');
  const voiceNames = split('voice_channels');
  if (textNames.length + voiceNames.length > MAX_CHANNELS) {
    return void (await interaction.editReply(t('tooMany', { max: MAX_CHANNELS })));
  }

  const category = await interaction.guild.channels.create({
    name: interaction.options.getString('name', true),
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites,
  });
  // A csatornák a kategória jogait öröklik.
  const created = [];
  for (const name of textNames) {
    created.push(await interaction.guild.channels.create({
      name: name.replace(/\s*•\s*/g, '•').slice(0, 100), type: ChannelType.GuildText, parent: category.id, permissionOverwrites: overwrites,
    }));
  }
  for (const name of voiceNames) {
    created.push(await interaction.guild.channels.create({
      name: name.slice(0, 100), type: ChannelType.GuildVoice, parent: category.id, permissionOverwrites: overwrites,
    }));
  }
  const list = created.map((channel) => `<#${channel.id}>`).join(' ');
  await interaction.editReply(t('categoryCreated', { name: category.name }) + (list ? t('withChannels', { list }) : ''));
  await logCreated(interaction, 'category', category, role);
}

async function createChannel(interaction) {
  const t = tr.user(interaction);
  if (!isOwner(interaction)) return void (await interaction.reply(ephemeral(t('ownersOnly'))));
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const isVoice = interaction.options.getString('type') === 'voice';
  const name = interaction.options.getString('name', true).trim();
  const { role, overwrites } = visibility(interaction);
  const topic = interaction.options.getString('topic');
  const slowmode = interaction.options.getInteger('slowmode');
  const channel = await interaction.guild.channels.create({
    // A szöveges csatorna nevében nem lehet szóköz, így a "•" köré sem kerül.
    name: isVoice ? name : name.replace(/\s*•\s*/g, '•'),
    type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
    parent: interaction.options.getChannel('category')?.id,
    permissionOverwrites: overwrites,
    topic: isVoice ? undefined : topic ?? undefined,
    rateLimitPerUser: isVoice ? undefined : slowmode ?? undefined,
    userLimit: isVoice ? interaction.options.getInteger('user_limit') ?? undefined : undefined,
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
      .addRoleOption(addRole)
      .addStringOption((option) => named(option, ['text_channels', 'Text channels inside, separated by commas'],
        ['szoveges_csatornak', 'Szöveges csatornák benne, vesszővel elválasztva']).setMaxLength(1000))
      .addStringOption((option) => named(option, ['voice_channels', 'Voice channels inside, separated by commas'],
        ['hangcsatornak', 'Hangcsatornák benne, vesszővel elválasztva']).setMaxLength(1000)),
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
      .addRoleOption(addRole)
      .addStringOption((option) => named(option, ['topic', 'Channel description (text channels)'],
        ['leiras', 'A csatorna leírása (szöveges csatornánál)']).setMaxLength(1024))
      .addIntegerOption((option) => named(option, ['slowmode', 'Slowmode in seconds (0-21600)'],
        ['lassitas', 'Lassított mód másodpercben (0-21600)']).setMinValue(0).setMaxValue(21600))
      .addIntegerOption((option) => named(option, ['user_limit', 'User limit (voice channels, 0-99)'],
        ['letszam', 'Létszámkorlát (hangcsatornánál, 0-99)']).setMinValue(0).setMaxValue(99)),
  ],
  handlers: { createcategory: createCategory, createchannel: createChannel },
};
