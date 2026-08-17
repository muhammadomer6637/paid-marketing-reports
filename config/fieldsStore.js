// Reads/writes config/fields.json — the list of platforms and the metric
// fields shown on the entry form and dashboard for each. This is what
// lets fields be added or removed without touching code.
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "fields.json");

function getFields() {
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveFields(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

function slugify(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function addMetric(platform, { label, unit, icon }) {
  const data = getFields();
  if (!data[platform]) throw new Error(`Unknown platform: ${platform}`);
  const key = slugify(label);
  if (!key) throw new Error("Metric name is required");
  if (data[platform].metrics.some((m) => m.key === key)) {
    throw new Error("A metric with that name already exists");
  }
  data[platform].metrics.push({ key, label, icon: icon || "ti-chart-line", unit: unit || "" });
  saveFields(data);
  return data[platform];
}

function removeMetric(platform, key) {
  const data = getFields();
  if (!data[platform]) throw new Error(`Unknown platform: ${platform}`);
  const metric = data[platform].metrics.find((m) => m.key === key);
  if (metric && metric.hero) {
    throw new Error("Can't remove the hero metric — pick a different metric as hero first");
  }
  data[platform].metrics = data[platform].metrics.filter((m) => m.key !== key);
  saveFields(data);
  return data[platform];
}

// Swaps a metric field with its neighbor to change its position on the
// entry form and among the secondary tiles on the dashboard.
function moveMetric(platform, key, direction) {
  const data = getFields();
  if (!data[platform]) throw new Error(`Unknown platform: ${platform}`);
  const metrics = data[platform].metrics;
  const idx = metrics.findIndex((m) => m.key === key);
  if (idx === -1) throw new Error(`Unknown metric: ${key}`);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= metrics.length) return data[platform];
  [metrics[idx], metrics[swapWith]] = [metrics[swapWith], metrics[idx]];
  saveFields(data);
  return data[platform];
}

// Accent colors handed out to new channels, in order, skipping ones already in use.
const ACCENT_PALETTE = ["#7f77dd", "#1d9e75", "#d85a30", "#d4537e", "#378add", "#ba7517", "#639922", "#993c1d", "#4a3aa7"];

function addPlatform(label, icon) {
  const data = getFields();
  const key = slugify(label);
  if (!key) throw new Error("Channel name is required");
  if (data[key]) throw new Error("A channel with that name already exists");
  const used = Object.values(data).map((p) => p.accent);
  const accent = ACCENT_PALETTE.find((c) => !used.includes(c)) || ACCENT_PALETTE[Object.keys(data).length % ACCENT_PALETTE.length];
  data[key] = { label, icon: icon || "ti-chart-bar", accent, metrics: [] };
  saveFields(data);
  return { key, ...data[key] };
}

function removePlatform(key) {
  const data = getFields();
  if (!data[key]) throw new Error(`Unknown channel: ${key}`);
  delete data[key];
  saveFields(data);
  return { removed: key };
}

// Swaps a channel with its neighbor to change slide order. Object key order
// is what both the entry form and dashboard read, so rewriting the file
// with keys in the new order is all that's needed — no separate "order" field.
function movePlatform(key, direction) {
  const data = getFields();
  const keys = Object.keys(data);
  const idx = keys.indexOf(key);
  if (idx === -1) throw new Error(`Unknown channel: ${key}`);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= keys.length) return data;
  [keys[idx], keys[swapWith]] = [keys[swapWith], keys[idx]];
  const reordered = {};
  keys.forEach((k) => { reordered[k] = data[k]; });
  saveFields(reordered);
  return reordered;
}

module.exports = { getFields, saveFields, addMetric, removeMetric, moveMetric, addPlatform, removePlatform, movePlatform };
