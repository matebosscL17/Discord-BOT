const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const settings = require('../../settings');
const { sendLog } = require('../utils');

const MAX_TIMEOUT_MINUTES = 40320; // A Discord legfeljebb 28 napot enged.

const reasonOf = (interaction) => interaction.options.getString('indok') ?? 'Nincs megadva';

// Megnézi, hogy a parancsot használó és a bot is erősebb-e a célpontnál.
function blockReason(interaction, target, botCan) {
  if (!target) return 'Ez a felhasználó nincs a szerveren.';
  if (target.id === interaction.user.id) return 'Magadon ezt nem használhatod.';
  const isOwner = interaction.guild.ownerId === interaction.user.id;
  if (!isOwner && interaction.member.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    return 'Ez a tag azonos vagy magasabb rangú nálad.';
  }
  if (!botCan) return 'A bot ezt nem teheti meg ezzel a taggal: húzd feljebb a bot rangját, és ellenőrizd a jogait.';
  return null;
}

async function logAction(interaction, action, userId, reason, color = settings.warningColor) {
  await sendLog(interaction.guild, {
    title: `🛡️ ${action}`,
    description: `**Tag:** <@${userId}>\n**Moderátor:** <@${interaction.user.id}>\n**Indok:** ${reason}`,
    color,
  });
}

async function notify(user, text) {
  await user.send({ content: text, allowedMentions: { parse: [] } }).catch(() => {});
}

async function kick(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('tag');
  const problem = blockReason(interaction, target, target?.kickable);
  if (problem) return void (await interaction.editReply(problem));

  const reason = reasonOf(interaction);
  await notify(target, `Ki lettél rúgva a(z) **${interaction.guild.name}** szerverről. Indok: ${reason}`);
  await target.kick(`${interaction.user.username}: ${reason}`);
  await interaction.editReply(`✅ ${target.user.username} kirúgva.`);
  await logAction(interaction, 'Kirúgás', target.id, reason, settings.errorColor);
}

async function ban(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const user = interaction.options.getUser('tag', true);
  const target = interaction.options.getMember('tag');
  if (target) {
    const problem = blockReason(interaction, target, target.bannable);
    if (problem) return void (await interaction.editReply(problem));
  }

  const reason = reasonOf(interaction);
  const days = interaction.options.getInteger('torles_nap') ?? 0;
  if (target) await notify(target, `Ki lettél tiltva a(z) **${interaction.guild.name}** szerverről. Indok: ${reason}`);
  await interaction.guild.bans.create(user.id, {
    reason: `${interaction.user.username}: ${reason}`,
    deleteMessageSeconds: days * 86400,
  });
  await interaction.editReply(`✅ ${user.username} kitiltva.`);
  await logAction(interaction, 'Kitiltás', user.id, reason, settings.errorColor);
}

async function unban(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const id = interaction.options.getString('azonosito', true).trim();
  if (!/^\d{15,22}$/.test(id)) return void (await interaction.editReply('Ez nem érvényes felhasználó-azonosító.'));

  const reason = reasonOf(interaction);
  await interaction.guild.bans.remove(id, `${interaction.user.username}: ${reason}`);
  await interaction.editReply('✅ A tiltás feloldva.');
  await logAction(interaction, 'Tiltás feloldása', id, reason, settings.successColor);
}

async function timeout(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('tag');
  const problem = blockReason(interaction, target, target?.moderatable);
  if (problem) return void (await interaction.editReply(problem));

  const minutes = interaction.options.getInteger('perc', true);
  const reason = reasonOf(interaction);
  await target.timeout(minutes * 60000, `${interaction.user.username}: ${reason}`);
  await interaction.editReply(`✅ ${target.user.username} némítva ${minutes} percre.`);
  await logAction(interaction, `Némítás (${minutes} perc)`, target.id, reason);
}

async function untimeout(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const target = interaction.options.getMember('tag');
  const problem = blockReason(interaction, target, target?.moderatable);
  if (problem) return void (await interaction.editReply(problem));

  await target.timeout(null, `${interaction.user.username}: némítás feloldása`);
  await interaction.editReply(`✅ ${target.user.username} némítása feloldva.`);
  await logAction(interaction, 'Némítás feloldása', target.id, reasonOf(interaction), settings.successColor);
}

async function purge(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const amount = interaction.options.getInteger('darab', true);
  const deleted = await interaction.channel.bulkDelete(amount, true);
  await interaction.editReply(`🧹 ${deleted.size} üzenet törölve. A 14 napnál régebbieket a Discord nem engedi tömegesen törölni.`);
  await sendLog(interaction.guild, {
    title: '🧹 Üzenetek törlése',
    description: `**Darab:** ${deleted.size}\n**Csatorna:** <#${interaction.channelId}>\n**Moderátor:** <@${interaction.user.id}>`,
  });
}

const addReason = (option) => option.setName('indok').setDescription('Mi az indok?').setMaxLength(400);
const addTag = (option) => option.setName('tag').setDescription('Melyik tag?').setRequired(true);

module.exports = {
  commands: [
    new SlashCommandBuilder().setName('kick').setDescription('Tag kirúgása')
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption(addTag).addStringOption(addReason),
    new SlashCommandBuilder().setName('ban').setDescription('Felhasználó kitiltása')
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption(addTag).addStringOption(addReason)
      .addIntegerOption((option) => option.setName('torles_nap').setDescription('Hány napnyi üzenete törlődjön? (0-7)')
        .setMinValue(0).setMaxValue(7)),
    new SlashCommandBuilder().setName('unban').setDescription('Tiltás feloldása')
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addStringOption((option) => option.setName('azonosito').setDescription('A felhasználó azonosítója').setRequired(true))
      .addStringOption(addReason),
    new SlashCommandBuilder().setName('nemit').setDescription('Tag némítása')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(addTag)
      .addIntegerOption((option) => option.setName('perc').setDescription('Hány percre?').setRequired(true)
        .setMinValue(1).setMaxValue(MAX_TIMEOUT_MINUTES))
      .addStringOption(addReason),
    new SlashCommandBuilder().setName('nemitas-fel').setDescription('Némítás feloldása')
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(addTag).addStringOption(addReason),
    new SlashCommandBuilder().setName('torles').setDescription('Üzenetek törlése ebben a csatornában')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption((option) => option.setName('darab').setDescription('Hány üzenet? (1-100)').setRequired(true)
        .setMinValue(1).setMaxValue(100)),
  ],
  handlers: {
    kick, ban, unban, nemit: timeout, 'nemitas-fel': untimeout, torles: purge,
  },
};
