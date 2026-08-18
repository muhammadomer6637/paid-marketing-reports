// Google Sheets-backed store. Used automatically once SPREADSHEET_ID and
// a service-account key file are configured (see README.md for setup).
const path = require("path");
const { google } = require("googleapis");

const SHEET_NAME = "Reports";
const HEADER = ["date", "logged_at", "platform", "metric_key", "metric_label", "unit", "value"];

let sheetsApi = null;
let authEmail = "(unknown)";

async function getClient() {
  if (sheetsApi) return sheetsApi;
  // On a host with no local disk to keep the key file on, paste the whole
  // JSON key into GOOGLE_CREDENTIALS_JSON instead — that takes priority.
  const authOptions = { scopes: ["https://www.googleapis.com/auth/spreadsheets"] };
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    let creds;
    try {
      creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (err) {
      console.error("GOOGLE_CREDENTIALS_JSON is not valid JSON:", err.message);
      throw err;
    }
    authOptions.credentials = creds;
    authEmail = creds.client_email || "(credentials JSON has no client_email)";
  } else {
    authOptions.keyFile = process.env.GOOGLE_KEY_FILE || path.join(__dirname, "..", "service-account.json");
    authEmail = "(from key file: " + authOptions.keyFile + ")";
  }
  const auth = new google.auth.GoogleAuth(authOptions);
  sheetsApi = google.sheets({ version: "v4", auth });
  return sheetsApi;
}

function rowToArray(row) {
  return HEADER.map((key) => row[key] ?? "");
}

function arrayToRow(arr) {
  const row = {};
  HEADER.forEach((key, i) => {
    row[key] = arr[i] ?? "";
  });
  row.value = Number(row.value);
  return row;
}

async function ensureSheetExists(sheets, spreadsheetId) {
  let meta;
  try {
    meta = await sheets.spreadsheets.get({ spreadsheetId });
  } catch (err) {
    console.error("Google Sheets access failed.");
    console.error("  spreadsheetId used:", JSON.stringify(spreadsheetId));
    console.error("  service account email:", authEmail);
    console.error("  Google error:", err.response ? JSON.stringify(err.response.data) : err.message);
    throw err;
  }
  const exists = (meta.data.sheets || []).some((s) => s.properties.title === SHEET_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }
    });
  }
}

async function ensureHeader(sheets, spreadsheetId) {
  await ensureSheetExists(sheets, spreadsheetId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:G1`
  });
  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:G1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER] }
    });
  }
}

async function getAllRows() {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const sheets = await getClient();
  await ensureHeader(sheets, spreadsheetId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:G`
  });
  const values = res.data.values || [];
  return values.map(arrayToRow);
}

async function appendRows(rows) {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const sheets = await getClient();
  await ensureHeader(sheets, spreadsheetId);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:G`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows.map(rowToArray) }
  });
}

async function overwriteRows(rows) {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const sheets = await getClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:G`
  });
  if (rows.length === 0) return;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:G`,
    valueInputOption: "RAW",
    requestBody: { values: rows.map(rowToArray) }
  });
}

module.exports = { getAllRows, appendRows, overwriteRows };
