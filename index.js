const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, EmbedBuilder,
  Events, GatewayIntentBits, MessageFlags, ModalBuilder, PermissionFlagsBits,
  SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');

// A .env fájl betöltése. Ha a hosting panelen adod meg az értékeket, nem kell .env.
try { process.loadEnvFile(); } catch {}

const { DISCORD_TOKEN, GUILD_ID, CHANGELOG_CHANNEL_ID, SUPPORT_ROLE_ID, TICKET_CATEGORY_ID } = process.env;

const missing = Object.entries({ DISCORD_TOKEN, GUILD_ID, CHANGELOG_CHANNEL_ID, SUPPORT_ROLE_ID })
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (missing.length) {
  console.error(`Hiányzó beállítás: ${missing.join(', ')}. Nézd meg a .env fájlt!`);
  process.exit(1);
}

const COLOR = 0x5865f2;
const TOPIC_PREFIX = 'ticket-owner:';

const commands = [
  new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('Új frissítés bejelentése a Changelog csatornában')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Kirakja a ticket nyitó gombot ebbe a csatornába')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map((command) => command.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const openingTickets = new Set(); // dupla kattintás ellen

const ephemeral = (content) => ({ content, flags: MessageFlags.Ephemeral });

function textInput(id, label, style, { required = true, max = 1000, placeholder } = {}) {
  const input = new TextInputBuilder()
    .setCustomId(id).setLabel(label).setStyle(style).setRequired(required).setMaxLength(max);
  if (placeholder) input.setPlaceholder(placeholder);
  return new ActionRowBuilder().addComponents(input);
}

function ticketOwnerId(channel) {
  return channel.topic?.startsWith(TOPIC_PREFIX) ? channel.topic.slice(TOPIC_PREFIX.length) : null;
}

function canCloseTicket(interaction, ownerId) {
  return interaction.user.id === ownerId
    || interaction.member.roles.cache.has(SUPPORT_ROLE_ID)
    || interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels);
}

async function showChangelogModal(interaction) {
  const modal = new ModalBuilder().setCustomId('changelog:modal').setTitle('Új changelog').addComponents(
    textInput('title', 'Cím', TextInputStyle.Short, { max: 200, placeholder: 'Pl. Frissítés 1.2' }),
    textInput('changes', 'Mi változott? (soronként egy dolog)', TextInputStyle.Paragraph, { max: 3500 }),
  );
  await interaction.showModal(modal);
}

async function postChangelog(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const channel = await interaction.guild.channels.fetch(CHANGELOG_CHANNEL_ID).catch(() => null);
  if (!channel?.isTextBased()) {
    await interaction.editReply('Nem találom a Changelog csatornát. Ellenőrizd a CHANGELOG_CHANNEL_ID értékét!');
    return;
  }

  const description = interaction.fields.getTextInputValue('changes')
    .split('\n').map((line) => line.trim()).filter(Boolean)
    .map((line) => `• ${line}`).join('\n').slice(0, 4096);

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`📢 ${interaction.fields.getTextInputValue('title')}`)
    .setDescription(description)
    .setFooter({ text: `Közzétette: ${interaction.user.username}` })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await interaction.editReply(`Kész, kikerült ide: <#${channel.id}>`);
}

async function postTicketPanel(interaction) {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('🎫 Segítség kell?')
    .setDescription('Kattints a gombra, és nyílik egy privát csatorna, ahol a csapat segít neked.');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:open').setLabel('Ticket nyitása').setEmoji('🎫').setStyle(ButtonStyle.Primary),
  );
  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply(ephemeral('A ticket panel kikerült.'));
}

function findOpenTicket(guild, userId) {
  return guild.channels.cache.find((channel) => channel.topic === `${TOPIC_PREFIX}${userId}`);
}

async function showTicketModal(interaction) {
  const existing = findOpenTicket(interaction.guild, interaction.user.id);
  if (existing) {
    await interaction.reply(ephemeral(`Már van nyitott ticketed: <#${existing.id}>`));
    return;
  }
  const modal = new ModalBuilder().setCustomId('ticket:modal').setTitle('Ticket nyitása').addComponents(
    textInput('reason', 'Miben segíthetünk?', TextInputStyle.Paragraph),
  );
  await interaction.showModal(modal);
}

async function createTicket(interaction) {
  const { guild, user } = interaction;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const existing = findOpenTicket(guild, user.id);
  if (existing || openingTickets.has(user.id)) {
    await interaction.editReply(existing ? `Már van nyitott ticketed: <#${existing.id}>` : 'A ticketed éppen készül.');
    return;
  }

  openingTickets.add(user.id);
  try {
    const safeName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || user.id;
    const channel = await guild.channels.create({
      name: `🎫•ticket-${safeName}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID || undefined,
      topic: `${TOPIC_PREFIX}${user.id}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: SUPPORT_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels, PermissionFlagsBits.EmbedLinks,
          ],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('🎫 Új ticket')
      .setDescription(interaction.fields.getTextInputValue('reason'))
      .setFooter({ text: user.username })
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket:close').setLabel('Lezárás').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    );

    await channel.send({
      content: `<@${user.id}> <@&${SUPPORT_ROLE_ID}>`,
      embeds: [embed],
      components: [row],
      allowedMentions: { users: [user.id], roles: [SUPPORT_ROLE_ID] },
    });
    await interaction.editReply(`Elkészült a ticketed: <#${channel.id}>`);
  } finally {
    openingTickets.delete(user.id);
  }
}

async function askCloseConfirmation(interaction) {
  const ownerId = ticketOwnerId(interaction.channel);
  if (!ownerId) return void (await interaction.reply(ephemeral('Ez nem ticket csatorna.')));
  if (!canCloseTicket(interaction, ownerId)) {
    return void (await interaction.reply(ephemeral('Ezt a ticketet nem zárhatod le.')));
  }
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:confirm-close').setLabel('Igen, lezárom').setStyle(ButtonStyle.Danger),
  );
  await interaction.reply({
    content: 'Biztosan lezárod? A csatorna véglegesen törlődik.',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

async function closeTicket(interaction) {
  const ownerId = ticketOwnerId(interaction.channel);
  if (!ownerId) return void (await interaction.reply(ephemeral('Ez nem ticket csatorna.')));
  if (!canCloseTicket(interaction, ownerId)) {
    return void (await interaction.reply(ephemeral('Ezt a ticketet nem zárhatod le.')));
  }
  await interaction.update({ content: 'Lezárás folyamatban...', components: [] });
  await interaction.channel.send(`🔒 A ticketet lezárta: ${interaction.user.username}. A csatorna 5 másodperc múlva törlődik.`);
  const { channel } = interaction;
  setTimeout(() => channel.delete().catch(console.error), 5000);
}

const handlers = {
  changelog: showChangelogModal,
  'ticket-panel': postTicketPanel,
  'changelog:modal': postChangelog,
  'ticket:open': showTicketModal,
  'ticket:modal': createTicket,
  'ticket:close': askCloseConfirmation,
  'ticket:confirm-close': closeTicket,
};

client.once(Events.ClientReady, async (readyClient) => {
  await readyClient.application.commands.set(commands, GUILD_ID);
  console.log(`A bot elindult: ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  const key = interaction.isChatInputCommand() ? interaction.commandName : interaction.customId;
  const handler = handlers[key];
  if (!handler || !interaction.inGuild()) return;

  try {
    await handler(interaction);
  } catch (error) {
    console.error(error);
    const message = 'Valami hiba történt. Ellenőrizd a bot jogosultságait!';
    const send = interaction.deferred || interaction.replied
      ? interaction.editReply(message)
      : interaction.reply(ephemeral(message));
    await send.catch(console.error);
  }
});

client.login(DISCORD_TOKEN);
