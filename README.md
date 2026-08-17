# Paid marketing reports

Local weekly paid-marketing performance dashboard — Facebook & Instagram,
Google search, YouTube and website (Google Analytics) — with history and a
3-year, same-week comparison. Runs on your machine only; data is stored in a
Google Sheet.

## Run it

```bash
npm install
npm start
```

Open http://localhost:4100

Until you connect Google Sheets (steps below), the app stores data in
`data/reports.local.json` so you can use it right away.

## Weekly workflow

1. Go to **Add this week** → pick a channel tab → fill in the numbers → **Save**.
2. Repeat for each channel.
3. Go back to the dashboard to see the animated slides and the 3-year comparison.
4. Use **Print / PDF** on the dashboard to save/share a PDF with your Chairman or
   authorities (your browser's print dialog → Save as PDF).

Fields (metrics) can be added or removed per channel from the **Add this
week** page, under "Manage fields for this channel" — no code changes needed.

## Connect Google Sheets (so your history is saved there instead of the local file)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a
   project (or reuse one).
2. **APIs & Services → Library** → search "Google Sheets API" → **Enable**.
3. **APIs & Services → Credentials → Create credentials → Service account**.
   Give it any name, no roles needed → **Done**.
4. Open the service account → **Keys** tab → **Add key → Create new key → JSON**.
   A `.json` file downloads.
5. Rename that file to `service-account.json` and put it in this project's
   root folder (same level as `server.js`). It's already git-ignored.
6. Create a new Google Sheet (blank). Copy its ID from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`
7. Open the downloaded JSON key file, copy the `client_email` value
   (looks like `xxxx@xxxx.iam.gserviceaccount.com`).
8. In your Google Sheet, click **Share** and add that email as **Editor**.
9. Create a `.env` file in the project root (copy `.env.example`) and set:
   ```
   SPREADSHEET_ID=paste_the_sheet_id_here
   ```
10. Restart the app (`npm start`). The dashboard's top-right badge should
    say "Connected to Google Sheets". The app auto-creates a `Reports` tab
    with headers on first write.

If you ever want to move away from the local file, migrate is manual —
copy rows from `data/reports.local.json` into the sheet, matching columns:
`timestamp, week, year, platform, metric_key, metric_label, unit, value`.

## Project structure

- `server.js` — Express app
- `routes/api.js` — API endpoints (fields, reports, comparison)
- `config/fields.json` — the metric fields shown per channel (editable via
  the entry page, or by hand)
- `services/store.js` — picks Google Sheets or the local file automatically
- `public/` — dashboard (`index.html`) and entry form (`entry.html`)
