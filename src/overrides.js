// A webes vezérlőpult módosításai a data/settings-override.json fájlba kerülnek,
// és induláskor felülírják a settings.js megfelelő értékeit. A settings.js-hez így nem kell nyúlni.
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'data', 'settings-override.json');

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function readOverrides() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

// Mélyen összefésül: az objektumokat kulcsonként, a listákat és egyszerű értékeket egészben cseréli.
function merge(base, extra) {
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(extra ?? {})) {
    result[key] = isPlainObject(value) && isPlainObject(base?.[key]) ? merge(base[key], value) : value;
  }
  return result;
}

function apply(settings) {
  return merge(settings, readOverrides());
}

// Egy pontozott útvonal (pl. "security.raid.joinThreshold") beállítása az override fájlban.
function setValues(values) {
  const data = readOverrides();
  for (const [dotted, value] of Object.entries(values)) {
    const keys = dotted.split('.');
    let node = data;
    for (const key of keys.slice(0, -1)) {
      if (!isPlainObject(node[key])) node[key] = {};
      node = node[key];
    }
    node[keys.at(-1)] = value;
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(data, null, 2));
  fs.renameSync(`${FILE}.tmp`, FILE);
  return data;
}

function getValue(object, dotted) {
  return dotted.split('.').reduce((node, key) => (node == null ? undefined : node[key]), object);
}

module.exports = {
  apply, getValue, merge, readOverrides, setValues,
};
