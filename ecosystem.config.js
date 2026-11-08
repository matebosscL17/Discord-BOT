// PM2 beállítások. Indítás: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'discord-bot',
      script: 'index.js',
      cwd: __dirname,

      // Összeomlás után újraindul, egyre hosszabb várakozással, hogy ne pörögjön.
      autorestart: true,
      exp_backoff_restart_delay: 2000,
      // Ha 10 mp-en belül újra és újra leáll, 15 próba után feladja. Ilyenkor nézd meg: pm2 logs discord-bot
      min_uptime: '10s',
      max_restarts: 15,

      // Ha túl sok memóriát használ, újraindul (telefonon fontos).
      max_memory_restart: '300M',

      // Leállításkor időt ad a botnak, hogy rendesen kijelentkezzen.
      kill_timeout: 5000,

      // A fájlok változását nem figyeli, különben a bot saját mentései is újraindítanák.
      watch: false,

      // Időbélyeg a naplóban.
      time: true,
      merge_logs: true,
    },
  ],
};
