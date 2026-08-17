// Fallback data store used when Google Sheets isn't configured yet.
// Lets you build and test the whole app locally before wiring up the
// real spreadsheet. Same row shape as the Sheets-backed store.
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "reports.local.json");

function readAll() {
  if (!fs.existsSync(FILE)) return [];
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read local store, starting empty:", err.message);
    return [];
  }
}

function writeAll(rows) {
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2), "utf8");
}

async function getAllRows() {
  return readAll();
}

async function appendRows(rows) {
  const existing = readAll();
  writeAll(existing.concat(rows));
}

async function overwriteRows(rows) {
  writeAll(rows);
}

module.exports = { getAllRows, appendRows, overwriteRows };
