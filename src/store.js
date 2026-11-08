const fs = require('node:fs');
const path = require('node:path');

// A bot saját adatai (azonosítók, sorszámok, statisztika). A data mappa nem kerül fel GitHubra.
const DIR = path.join(__dirname, '..', 'data');

function readJson(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, `${name}.json`), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(name, data) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const file = path.join(DIR, `${name}.json`);
    // Előbb ideiglenes fájlba ír, így áramszünetnél sem sérül meg a régi.
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 2));
    fs.renameSync(`${file}.tmp`, file);
  } catch (error) {
    console.error(`Nem sikerült menteni (${name}):`, error.message);
  }
}

const getId = (key) => readJson('ids', {})[key];

function saveId(key, id) {
  const data = readJson('ids', {});
  if (data[key] === id) return;
  data[key] = id;
  writeJson('ids', data);
}

module.exports = {
  getId, saveId, readJson, writeJson,
};
