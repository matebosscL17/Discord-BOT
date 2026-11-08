const { getId, saveId } = require('./store');

// Szóközök, emojik és kis-nagybetű nélkül hasonlít: "I D E I G L E N E S  V C" = "ideiglenes vc".
const normalize = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

async function fetchChannel(guild, id) {
  if (!id) return null;
  return guild.channels.fetch(id).catch(() => null);
}

// A bot SOSEM hoz létre csatornát. Keresési sorrend: megadott azonosító, megjegyzett azonosító, név.
// Ha nincs meg, null az eredmény.
async function findChannel(guild, key, {
  id, name, oldNames = [], type,
}) {
  if (id) return fetchChannel(guild, id);

  const remembered = await fetchChannel(guild, getId(key));
  if (remembered) return remembered;

  const wanted = [name, ...oldNames].filter(Boolean).map(normalize);
  const channels = await guild.channels.fetch();
  const channel = channels.find((item) => item?.type === type && wanted.includes(normalize(item.name)));
  if (channel) saveId(key, channel.id);
  return channel ?? null;
}

// Hiba, amit a tag is láthat, mindkét nyelven: userError('magyar szöveg', 'English text')
function userError(hu, en = hu) {
  const error = new Error(hu);
  error.userMessages = { hu, en };
  return error;
}

module.exports = { findChannel, userError };
