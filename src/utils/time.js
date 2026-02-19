function randomDateBetween(start, end) {
  const startMs = start instanceof Date ? start.getTime() : new Date(start).getTime();
  const endMs = end instanceof Date ? end.getTime() : new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return new Date(startMs);
  }
  const offsetMs = Math.floor(Math.random() * (endMs - startMs));
  return new Date(startMs + offsetMs);
}

function randomDateWithinNext24h() {
  const now = Date.now();
  return randomDateBetween(now, now + 24 * 60 * 60 * 1000);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

module.exports = { randomDateBetween, randomDateWithinNext24h, startOfDay, endOfDay };
