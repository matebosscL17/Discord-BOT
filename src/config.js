const settings = require('../settings');

// A .env fájl betöltése. Ha a hosting panelen adod meg az értékeket, nem kell .env.
try { process.loadEnvFile(); } catch {}

const env = (name) => process.env[name]?.trim() || undefined;

const config = {
  token: env('DISCORD_TOKEN'),
  guildId: env('GUILD_ID'),
  changelogChannelId: env('CHANGELOG_CHANNEL_ID'),
  supportRoleId: env('SUPPORT_ROLE_ID'),
  ticketCategoryId: env('TICKET_CATEGORY_ID'),
  logChannelId: env('LOG_CHANNEL_ID') ?? settings.logChannelId,
  changelogPingRoleId: env('CHANGELOG_PING_ROLE_ID'),
  welcomeChannelId: env('WELCOME_CHANNEL_ID'),
  autoRoleId: env('AUTO_ROLE_ID'),
  transcriptEnabled: env('ENABLE_TRANSCRIPT')?.toLowerCase() === 'true',
};

const required = {
  DISCORD_TOKEN: config.token,
  GUILD_ID: config.guildId,
  CHANGELOG_CHANNEL_ID: config.changelogChannelId,
  SUPPORT_ROLE_ID: config.supportRoleId,
};
const missing = Object.keys(required).filter((name) => !required[name]);
if (missing.length) {
  console.error(`Hiányzó beállítás: ${missing.join(', ')}. Nézd meg a .env fájlt!`);
  process.exit(1);
}

module.exports = config;
