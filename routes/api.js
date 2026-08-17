const express = require("express");
const store = require("../services/store");
const fieldsStore = require("../config/fieldsStore");
const settingsStore = require("../config/settingsStore");

const router = express.Router();

router.get("/meta", (req, res) => {
  res.json({ mode: store.mode, today: store.todayISO() });
});

router.get("/settings", (req, res) => {
  res.json(settingsStore.getSettings());
});

router.post("/settings", (req, res) => {
  try {
    const current = settingsStore.getSettings();
    const updated = { ...current, ...req.body };
    settingsStore.saveSettings(updated);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/fields", (req, res) => {
  res.json(fieldsStore.getFields());
});

router.post("/fields/:platform", (req, res) => {
  try {
    const platform = fieldsStore.addMetric(req.params.platform, req.body);
    res.json(platform);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/fields/:platform/:key", (req, res) => {
  try {
    const platform = fieldsStore.removeMetric(req.params.platform, req.params.key);
    res.json(platform);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/fields/:platform/:key/move", (req, res) => {
  try {
    const platform = fieldsStore.moveMetric(req.params.platform, req.params.key, req.body.direction);
    res.json(platform);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/platforms", (req, res) => {
  try {
    const { label, icon } = req.body;
    const platform = fieldsStore.addPlatform(label, icon);
    res.json(platform);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/platforms/:key", (req, res) => {
  try {
    const result = fieldsStore.removePlatform(req.params.key);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/platforms/:key/move", (req, res) => {
  try {
    const result = fieldsStore.movePlatform(req.params.key, req.body.direction);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Body: { platform, date: "YYYY-MM-DD", values: { metricKey: cumulativeTotal, ... } }
router.post("/reports", async (req, res) => {
  try {
    const { platform, date, values } = req.body;
    if (!platform || !date || !values) {
      return res.status(400).json({ error: "platform, date and values are required" });
    }
    const rows = await store.saveSnapshot({ platform, date, values });
    res.json({ saved: rows.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/reports/:platform", async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const history = await store.getPlatformHistory(req.params.platform, limit);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ?metric=key&date=YYYY-MM-DD — "date" is the as-of date (usually today).
router.get("/reports/:platform/compare", async (req, res) => {
  try {
    const { metric, date } = req.query;
    if (!metric || !date) return res.status(400).json({ error: "metric and date are required" });
    const comparison = await store.getComparison(req.params.platform, metric, date);
    res.json(comparison);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const summary = await store.getOverallSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
