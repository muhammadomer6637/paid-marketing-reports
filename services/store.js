// Picks the Google Sheets backend once it's configured, otherwise falls
// back to a local JSON file so the app is fully usable from day one.
//
// Data model: each row is a CAMPAIGN-TO-DATE snapshot — "as of this date,
// the running total since the campaign started is X" — not a weekly
// increment. That's what lets the dashboard show "campaign so far" and
// compare the same calendar date across years.
const fs = require("fs");
const path = require("path");

const KEY_FILE = process.env.GOOGLE_KEY_FILE || path.join(__dirname, "..", "service-account.json");
const hasCredentials = !!process.env.GOOGLE_CREDENTIALS_JSON || fs.existsSync(KEY_FILE);
const sheetsConfigured = !!process.env.SPREADSHEET_ID && hasCredentials;

const backend = sheetsConfigured ? require("./sheetsClient") : require("./localStore");
const mode = sheetsConfigured ? "google-sheets" : "local-file";

const fields = require("../config/fieldsStore");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function saveSnapshot({ platform, date, values }) {
  const platformConfig = fields.getFields()[platform];
  if (!platformConfig) throw new Error(`Unknown platform: ${platform}`);
  if (!date) throw new Error("date is required");

  const metricByKey = {};
  platformConfig.metrics.forEach((m) => (metricByKey[m.key] = m));

  const newRows = Object.entries(values)
    .filter(([, value]) => value !== "" && value !== null && value !== undefined)
    .map(([metricKey, value]) => {
      const metric = metricByKey[metricKey] || { label: metricKey, unit: "" };
      return {
        date,
        logged_at: new Date().toISOString(),
        platform,
        metric_key: metricKey,
        metric_label: metric.label,
        unit: metric.unit || "",
        value: Number(value)
      };
    });

  const all = await backend.getAllRows();
  const kept = all.filter((r) => !(r.platform === platform && r.date === date));
  await backend.overwriteRows(kept.concat(newRows));
  return newRows;
}

async function getPlatformHistory(platform, limit) {
  const all = await backend.getAllRows();
  const rows = all.filter((r) => r.platform === platform);
  const byDate = {};
  rows.forEach((r) => {
    if (!byDate[r.date]) byDate[r.date] = { date: r.date, metrics: {} };
    byDate[r.date].metrics[r.metric_key] = r.value;
  });
  const entries = Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return limit ? entries.slice(-limit) : entries;
}

// For each of the last 4 years (this year and the 3 before it), find the
// latest snapshot on or before the same month/day as asOfDate — i.e.
// "as of the same point in the year". Returns one entry per year found.
async function getComparison(platform, metricKey, asOfDateStr) {
  const all = await backend.getAllRows();
  const rows = all.filter((r) => r.platform === platform && r.metric_key === metricKey);
  const asOf = new Date(asOfDateStr + "T00:00:00");
  const result = {};
  for (let back = 0; back <= 3; back++) {
    const year = asOf.getFullYear() - back;
    const target = new Date(year, asOf.getMonth(), asOf.getDate());
    const targetStr = target.toISOString().slice(0, 10);
    const candidates = rows.filter((r) => {
      const d = new Date(r.date + "T00:00:00");
      return d.getFullYear() === year && d <= target;
    });
    if (candidates.length) {
      candidates.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      result[year] = { value: candidates[0].value, asOfDate: candidates[0].date, targetDate: targetStr };
    }
  }
  return result;
}

const TAX_RATE = 0.25;

// Blended totals across every channel, using each channel's latest
// campaign-to-date snapshot. CTR is derived from summed clicks/impressions
// (not averaged from per-channel CTR fields) since that's the correct way
// to combine a rate across channels with different volumes.
async function getOverallSummary() {
  const platforms = Object.keys(fields.getFields());
  const totals = { reach: 0, impressions: 0, clicks: 0, spent: 0 };
  let asOfDate = null;

  for (const platform of platforms) {
    const history = await getPlatformHistory(platform, 1);
    const latest = history[history.length - 1];
    if (!latest) continue;
    if (!asOfDate || latest.date > asOfDate) asOfDate = latest.date;
    Object.keys(totals).forEach((key) => {
      if (typeof latest.metrics[key] === "number") totals[key] += latest.metrics[key];
    });
  }

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null;
  const spentWithTax = totals.spent * (1 + TAX_RATE);

  return { ...totals, ctr, taxRate: TAX_RATE, spentWithTax, asOfDate };
}

module.exports = {
  mode,
  todayISO,
  saveSnapshot,
  getPlatformHistory,
  getComparison,
  getOverallSummary,
  getAllRows: backend.getAllRows
};
