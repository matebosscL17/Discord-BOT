// Két nyelv: magyar (hu) és angol (en).
// A tagnak szóló válaszok a tag Discord-nyelvét követik: magyar appnál magyar, minden másnál angol.
// A közös üzenetek (panelek, ticketek, napló) a settings.js "language" beállítását követik.
const settings = require('../settings');

const LANGUAGES = ['hu', 'en'];

const langOf = (locale) => (String(locale ?? '').toLowerCase().startsWith('hu') ? 'hu' : 'en');
const serverLang = () => (LANGUAGES.includes(settings.language) ? settings.language : 'hu');

const format = (text, vars = {}) => String(text)
  .replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));

// Minden modul a saját szótárát adja át: { hu: { kulcs: 'szöveg' }, en: { kulcs: 'text' } }
function translator(dictionary) {
  const translate = (lang, key, vars) => format(
    dictionary[lang]?.[key] ?? dictionary.hu?.[key] ?? key,
    vars,
  );
  return {
    // A parancsot használó tag nyelvén
    user: (interaction) => (key, vars) => translate(langOf(interaction?.locale), key, vars),
    // A szerver nyelvén (settings.js)
    server: (key, vars) => translate(serverLang(), key, vars),
    // Megadott nyelven, pl. egy közös üzenet saját nyelvén: tr.as('en')('kulcs')
    as: (lang) => (key, vars) => translate(lang, key, vars),
    lang: translate,
  };
}

// Parancs vagy opció neve és leírása: angol az alap, magyarul a magyar Discordon jelenik meg.
function named(builder, [enName, enDescription], [huName, huDescription]) {
  builder.setName(enName).setDescription(enDescription);
  if (huName && huName !== enName) builder.setNameLocalizations({ hu: huName });
  if (huDescription) builder.setDescriptionLocalizations({ hu: huDescription });
  return builder;
}

// Beállításból jövő szöveg a megadott nyelven: { label: 'magyar', labelEn: 'English' }
const pick = (item, field, lang) => (lang === 'en' && item?.[`${field}En`]) || item?.[field];

const choice = (value, enName, huName) => ({ name: enName, value, name_localizations: { hu: huName } });

module.exports = {
  LANGUAGES, choice, format, langOf, named, pick, serverLang, translator,
};
