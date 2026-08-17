const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "settings.json");

function getSettings() {
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveSettings(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

module.exports = { getSettings, saveSettings };
