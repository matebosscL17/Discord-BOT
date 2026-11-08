const { readJson, writeJson } = require('./store');

const FILE = 'ticket-stats';
const MAX_EVENTS = 5000;

// Események: open, claim, close. A régieket törli, hogy ne nőjön a végtelenségig.
function record(event) {
  const data = readJson(FILE, { events: [] });
  data.events.push({ time: Date.now(), ...event });
  if (data.events.length > MAX_EVENTS) data.events = data.events.slice(-MAX_EVENTS);
  writeJson(FILE, data);
}

function nextTicketNumber(minimum = 0) {
  const data = readJson(FILE, { events: [] });
  data.counter = Math.max(data.counter ?? 0, minimum) + 1;
  writeJson(FILE, data);
  return data.counter;
}

function summarize(sinceMs) {
  const events = readJson(FILE, { events: [] }).events.filter((event) => event.time >= sinceMs);
  const opened = events.filter((event) => event.type === 'open');
  const closed = events.filter((event) => event.type === 'close');
  const claims = events.filter((event) => event.type === 'claim');

  const count = (list, key) => list.reduce((acc, event) => {
    if (event[key]) acc[event[key]] = (acc[event[key]] ?? 0) + 1;
    return acc;
  }, {});
  const durations = closed.map((event) => event.durationMs).filter((ms) => ms > 0);
  const firstReplies = claims.map((event) => event.waitMs).filter((ms) => ms > 0);
  const average = (list) => (list.length ? list.reduce((sum, ms) => sum + ms, 0) / list.length : 0);

  return {
    opened: opened.length,
    closed: closed.length,
    autoClosed: closed.filter((event) => event.auto).length,
    byCategory: count(opened, 'category'),
    claimsByStaff: count(claims, 'userId'),
    closesByStaff: count(closed.filter((event) => !event.auto && !event.byOwner), 'userId'),
    averageCloseMs: average(durations),
    averageClaimMs: average(firstReplies),
  };
}

module.exports = { nextTicketNumber, record, summarize };
