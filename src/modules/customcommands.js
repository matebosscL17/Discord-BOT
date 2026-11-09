const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const settings = require('../../settings');
const { readJson, writeJson } = require('../store');
const { named, translator } = require('../i18n');

// Egyedi parancsok: a vezérlőpulton létrehozott válaszok, pl. /info ip → "play.penthouse.hu".
// A lista minden használatkor frissen töltődik be, így mentés után azonnal él, újraindítás nélkül.
const tr = translator({
  hu: { notFound: 'Nincs ilyen parancs. Kezdj el gépelni, és a bot javasol.', empty: 'Még nincs egyedi parancs. A vezérlőpulton hozhatsz létre.' },
  en: { notFound: 'There is no such command. Start typing and the bot will suggest.', empty: 'There are no custom commands yet. You can create them on the dashboard.' },
});

const FILE = 'custom-commands';
const NAME = /^[a-z0-9áéíóöőúüű_-]{1,32}$/;
const load = () => readJson(FILE, []);

function validateList(list) {
  if (!Array.isArray(list)) return null;
  const seen = new Set();
  const result = [];
  for (const item of list.slice(0, 100)) {
    const name = String(item?.name ?? '').trim().toLowerCase();
    const response = String(item?.response ?? '').trim().slice(0, 2000);
    if (!NAME.test(name) || !response || seen.has(name)) continue;
    seen.add(name);
    result.push({
      name, title: String(item?.title ?? '').trim().slice(0, 100), response, private: Boolean(item?.private),
    });
  }
  return result;
}

const save = (list) => writeJson(FILE, validateList(list) ?? []);

async function autocomplete(interaction) {
  const typed = String(interaction.options.getFocused?.() ?? '').toLowerCase();
  const matches = load().filter((item) => item.name.includes(typed)).slice(0, 25)
    .map((item) => ({ name: item.title ? `${item.name} – ${item.title}`.slice(0, 100) : item.name, value: item.name }));
  await interaction.respond(matches);
}

async function run(interaction) {
  const t = tr.user(interaction);
  const list = load();
  if (!list.length) return void (await interaction.reply({ content: t('empty'), flags: MessageFlags.Ephemeral }));
  const name = interaction.options.getString('name', true).trim().toLowerCase();
  const command = list.find((item) => item.name === name);
  if (!command) return void (await interaction.reply({ content: t('notFound'), flags: MessageFlags.Ephemeral }));

  const embed = new EmbedBuilder().setColor(settings.color).setDescription(command.response);
  if (command.title) embed.setTitle(command.title);
  await interaction.reply({
    embeds: [embed], flags: command.private ? MessageFlags.Ephemeral : undefined, allowedMentions: { parse: [] },
  });
}

module.exports = {
  commands: [
    named(new SlashCommandBuilder(), ['info', 'Custom server commands (e.g. ip, rules)'], ['info', 'Egyedi szerverparancsok (pl. ip, szabályok)'])
      .addStringOption((option) => named(option, ['name', 'Which one?'], ['nev', 'Melyik?']).setRequired(true).setAutocomplete(true)),
  ],
  handlers: { info: run, 'info:autocomplete': autocomplete },
  load,
  save,
  validateList,
};
