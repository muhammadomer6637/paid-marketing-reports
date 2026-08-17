require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const store = require("./services/store");

const app = express();
const PORT = process.env.PORT || 4100;

// Password-gates the whole app when AUTH_USER/AUTH_PASS are set (e.g. once
// hosted publicly). Left off for local use so there's no login prompt on
// your own PC.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function basicAuth(req, res, next) {
  const user = process.env.AUTH_USER;
  const pass = process.env.AUTH_PASS;
  if (!user || !pass) return next();

  const header = req.headers.authorization || "";
  if (header.startsWith("Basic ")) {
    const [reqUser, reqPass] = Buffer.from(header.slice(6), "base64").toString().split(":");
    if (reqUser && reqPass && safeEqual(reqUser, user) && safeEqual(reqPass, pass)) {
      return next();
    }
  }
  res.set("WWW-Authenticate", 'Basic realm="Paid marketing report"');
  res.status(401).send("Authentication required");
}

app.use(basicAuth);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", require("./routes/api"));

app.listen(PORT, () => {
  console.log(`Paid marketing reports running at http://localhost:${PORT}`);
  console.log(`Data store: ${store.mode === "google-sheets" ? "Google Sheets" : "local file (data/reports.local.json) — see README to connect Google Sheets"}`);
});
