const fs = require('node:fs');
const path = require('node:path');

// A bot által megjegyzett csatorna-azonosítók. Ez a fájl nem kerül fel GitHubra.
const FILE = path.join(__dirname, '..', 'data', 'ids.json');

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

const getId = (key) => readAll()[key];

function saveId(key, id) {
  const data = readAll();
  if (data[key] === id) return;
  data[key] = id;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Nem sikerült menteni az azonosítót:', error.message);
  }
}

module.exports = { getId, saveId };
