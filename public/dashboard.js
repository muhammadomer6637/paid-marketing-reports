let PLATFORM_KEYS = [];
let FIELDS = {};
let SETTINGS = {};
let current = 0;
let playing = false;
let timer = null;
let sparkChart = null, yoyChart = null;
let TODAY = new Date().toISOString().slice(0, 10);

const SUMMARY_ACCENT = "#ba7517";

function totalSlides() {
  return 1 + PLATFORM_KEYS.length + 1; // slide 0 = cover, 1..N = channels, last = overall summary
}
function isSummarySlide(i) {
  return i === totalSlides() - 1;
}

function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function fmt(m, val) {
  if (val === undefined || val === null || Number.isNaN(val)) return "—";
  if (m.unit === "%") return val.toFixed(1) + "%";
  if (m.unit) return m.unit + " " + Math.round(val).toLocaleString();
  return Math.round(val).toLocaleString();
}
// Compact M/K formatting for on-screen numbers; fmt() above stays full-precision for tooltips.
function fmtCompact(m, val) {
  if (val === undefined || val === null || Number.isNaN(val)) return "—";
  if (m.unit === "%") return val.toFixed(1) + "%";
  const prefix = m.unit ? m.unit + " " : "";
  const abs = Math.abs(val);
  if (abs >= 1000000) return prefix + (val / 1000000).toFixed(abs / 1000000 >= 100 ? 0 : 1) + "M";
  if (abs >= 1000) return prefix + (val / 1000).toFixed(abs / 1000 >= 100 ? 0 : 1) + "K";
  return prefix + Math.round(val).toLocaleString();
}
function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
function deltaColor(m, delta) {
  const good = m.lowerIsBetter ? delta < 0 : delta >= 0;
  return good ? "var(--text-success)" : "var(--text-danger)";
}
function animateValue(el, target, m, duration) {
  if (target === undefined || target === null) { el.textContent = "—"; return; }
  let startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    const progress = Math.min((ts - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = fmtCompact(m, target * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderDots() {
  const dots = document.getElementById("dots");
  dots.innerHTML = "";
  for (let i = 0; i < totalSlides(); i++) {
    const d = document.createElement("button");
    d.className = "dot" + (i === current ? " active" : "");
    d.setAttribute("aria-label", i === 0 ? "Go to cover slide" : isSummarySlide(i) ? "Go to overall summary slide" : "Go to " + FIELDS[PLATFORM_KEYS[i - 1]].label + " slide");
    d.onclick = () => goTo(i);
    dots.appendChild(d);
  }
}

function buildCoverHTML() {
  return `
    <div class="cover-slide" style="margin:-1.75rem -2rem;min-height:calc(100vh - 260px);max-height:640px;position:relative;overflow:hidden;background:#0b1550;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:3rem 2rem;">
      <div class="aurora-blob b1"></div>
      <div class="aurora-blob b2"></div>
      <div class="aurora-blob b3"></div>
      <div class="aurora-blob b4"></div>
      <button class="nav-btn no-print" id="edit-cover-btn" aria-label="Edit cover text" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.3);color:#fff;z-index:5;"><i class="ti ti-pencil"></i></button>
      <img src="assets/mul-logo.png" alt="Minhaj University Lahore" style="position:relative;z-index:2;max-width:520px;width:80%;margin-bottom:2.25rem;">
      <h1 id="cover-title" style="position:relative;z-index:2;color:#fff;font-size:42px;font-weight:700;letter-spacing:0.5px;margin:0 0 12px;text-transform:uppercase;max-width:800px;"></h1>
      <p id="cover-subtitle" style="position:relative;z-index:2;color:rgba(255,255,255,0.92);font-size:20px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 2rem;max-width:680px;"></p>
      <p id="cover-presenter" style="position:relative;z-index:2;color:rgba(255,255,255,0.7);font-size:14px;margin:0;"></p>
      <div id="cover-edit-form" style="display:none;position:relative;z-index:6;background:rgba(255,255,255,0.97);border-radius:12px;padding:1.25rem;margin-top:1.5rem;width:100%;max-width:420px;text-align:left;">
        <label style="font-size:12px;color:#333;display:block;margin-bottom:4px;">Title</label>
        <input id="cover-title-input" type="text" style="width:100%;margin-bottom:10px;color:#111;">
        <label style="font-size:12px;color:#333;display:block;margin-bottom:4px;">Subtitle</label>
        <input id="cover-subtitle-input" type="text" style="width:100%;margin-bottom:10px;color:#111;">
        <label style="font-size:12px;color:#333;display:block;margin-bottom:4px;">Presented by</label>
        <input id="cover-presenter-input" type="text" style="width:100%;margin-bottom:12px;color:#111;">
        <div style="display:flex;gap:8px;">
          <button class="btn primary" id="cover-save-btn" style="flex:1;">Save</button>
          <button class="btn" id="cover-cancel-btn" style="flex:1;">Cancel</button>
        </div>
      </div>
    </div>`;
}

function wireCover() {
  document.getElementById("cover-title").textContent = SETTINGS.coverTitle || "";
  document.getElementById("cover-subtitle").textContent = SETTINGS.coverSubtitle || "";
  document.getElementById("cover-presenter").textContent = SETTINGS.presenter ? "Presented by: " + SETTINGS.presenter : "";

  const form = document.getElementById("cover-edit-form");
  document.getElementById("edit-cover-btn").onclick = () => {
    document.getElementById("cover-title-input").value = SETTINGS.coverTitle || "";
    document.getElementById("cover-subtitle-input").value = SETTINGS.coverSubtitle || "";
    document.getElementById("cover-presenter-input").value = SETTINGS.presenter || "";
    form.style.display = form.style.display === "none" ? "block" : "none";
  };
  document.getElementById("cover-cancel-btn").onclick = () => { form.style.display = "none"; };
  document.getElementById("cover-save-btn").onclick = async () => {
    SETTINGS = await fetchJSON("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coverTitle: document.getElementById("cover-title-input").value.trim(),
        coverSubtitle: document.getElementById("cover-subtitle-input").value.trim(),
        presenter: document.getElementById("cover-presenter-input").value.trim()
      })
    });
    document.title = (SETTINGS.coverTitle || "Paid marketing report") + " — Paid marketing report";
    form.style.display = "none";
    wireCover();
  };
}

function emptyStateHTML(p) {
  return `<div class="accent-stripe" style="height:4px;border-radius:2px;background:${p.accent};margin:-1.75rem -2rem 1.5rem;"></div>
    <div style="text-align:center;padding:3rem 1rem;">
      <i class="ti ${p.icon}" style="font-size:28px;color:${p.accent};" aria-hidden="true"></i>
      <h2 style="margin:0.75rem 0 0.25rem;font-size:18px;">${p.label}</h2>
      <p style="color:var(--text-secondary);font-size:14px;margin:0 0 1.25rem;">No campaign totals logged yet for this channel.</p>
      <a class="btn primary" href="entry.html"><i class="ti ti-plus"></i> Add campaign total</a>
    </div>`;
}

function prevSameYear(history, latest) {
  // "vs last report" should only compare within the same campaign year —
  // comparing to a prior year's backfilled total isn't a real week-over-week move.
  const year = new Date(latest.date).getFullYear();
  const sameYear = history.filter((h) => h !== latest && new Date(h.date).getFullYear() === year);
  return sameYear.length ? sameYear[sameYear.length - 1] : null;
}

function buildSlideHTML(p, history) {
  const latest = history[history.length - 1];
  if (!latest) return emptyStateHTML(p);
  const prev = prevSameYear(history, latest);

  const hero = p.metrics.find((m) => m.hero) || p.metrics[0];
  const secondary = p.metrics.filter((m) => m.key !== hero.key);
  const heroVal = latest.metrics[hero.key];
  const heroPrev = prev ? prev.metrics[hero.key] : undefined;
  const heroDelta = heroPrev ? ((heroVal - heroPrev) / heroPrev) * 100 : null;

  const secondaryHTML = secondary
    .map((m, i) => {
      const val = latest.metrics[m.key];
      const pVal = prev ? prev.metrics[m.key] : undefined;
      const delta = pVal ? ((val - pVal) / pVal) * 100 : null;
      return `<div class="metric-pick reveal-item" data-metric-key="${m.key}" style="position:relative;cursor:pointer;background:var(--surface-2);border:0.5px solid var(--border);border-radius:var(--radius);padding:0.85rem;animation-delay:${(i + 1) * 90}ms;">
        <i class="ti ${m.icon}" style="font-size:16px;color:${p.accent};" aria-hidden="true"></i>
        <p style="font-size:12px;color:var(--text-secondary);margin:6px 0 3px;">${m.label}</p>
        <p style="font-size:19px;font-weight:600;margin:0;" data-sec="${m.key}">0</p>
        ${delta !== null ? `<p style="font-size:11px;margin:3px 0 0;color:${deltaColor(m, delta)};display:flex;align-items:center;gap:2px;"><i class="ti ${delta >= 0 ? "ti-arrow-up-right" : "ti-arrow-down-right"}" aria-hidden="true"></i>${Math.abs(delta).toFixed(1)}% vs last report</p>` : `<p style="font-size:11px;margin:3px 0 0;color:var(--text-muted);">no prior report</p>`}
      </div>`;
    })
    .join("");

  return `
    <div class="accent-stripe" style="height:4px;border-radius:2px;background:${p.accent};margin:-1.75rem -2rem 1.5rem;"></div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5rem;">
      <div><p style="font-size:12px;color:var(--text-muted);margin:0 0 4px;">Campaign to date</p>
      <h1 style="display:flex;align-items:center;gap:8px;margin:0;font-size:20px;font-weight:600;"><i class="ti ${p.icon}" style="font-size:20px;color:${p.accent};" aria-hidden="true"></i>${p.label}</h1></div>
      <span style="font-size:12px;color:var(--text-muted);">As of ${fmtDate(latest.date)}</span>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:1.75rem;align-items:end;margin-bottom:1.5rem;">
      <div class="metric-pick reveal-item" data-metric-key="${hero.key}" style="cursor:pointer;border-radius:var(--radius);padding:6px 10px;margin:-6px -10px;animation-delay:20ms;"><p style="font-size:13px;color:var(--text-secondary);margin:0 0 2px;display:flex;align-items:center;gap:6px;"><i class="ti ${hero.icon}" style="font-size:14px;color:${p.accent};" aria-hidden="true"></i>${hero.label} (cumulative)</p>
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;"><span style="font-family:var(--font-voice);font-size:48px;font-weight:500;font-variant-numeric:tabular-nums;" id="hero-val">0</span>
      ${heroDelta !== null ? `<span style="font-size:13px;padding:2px 8px;border-radius:var(--radius);background:${hexToRgba(p.accent, 0.12)};color:${deltaColor(hero, heroDelta)};display:inline-flex;align-items:center;gap:2px;"><i class="ti ${heroDelta >= 0 ? "ti-arrow-up-right" : "ti-arrow-down-right"}" aria-hidden="true"></i>${Math.abs(heroDelta).toFixed(1)}% vs last report</span>` : ""}</div></div>
      <div style="position:relative;height:56px;"><canvas id="sparkline" role="img" aria-label="Cumulative trend for ${hero.label}"></canvas></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:1.75rem;">${secondaryHTML}</div>
    <p style="font-size:11px;color:var(--text-muted);margin:-1.25rem 0 1rem;">Tap a number above to compare it below</p>
    <div style="border-top:0.5px solid var(--border);padding-top:1.1rem;">
      <div style="margin-bottom:0.6rem;"><span style="font-size:12px;color:var(--text-secondary);">Same date, last 3 years &mdash; </span><span id="compare-metric-name" style="font-size:12px;font-weight:600;"></span></div>
      <div style="position:relative;width:100%;height:340px;"><canvas id="yoyChart" role="img" aria-label="Bar chart comparing campaign-to-date totals across years, as of the same date"></canvas></div>
    </div>`;
}

function buildSummaryHTML(summary) {
  const reach = { key: "reach", unit: "" };
  const impressions = { key: "impressions", unit: "" };
  const clicks = { key: "clicks", unit: "" };
  const ctr = { key: "ctr", unit: "%" };
  const spent = { key: "spent", unit: "PKR" };
  const spentWithTax = { key: "spentWithTax", unit: "PKR" };

  const tiles = [
    { m: reach, label: "Reach", icon: "ti-users" },
    { m: impressions, label: "Impressions", icon: "ti-eye" },
    { m: clicks, label: "Clicks", icon: "ti-click" },
    { m: ctr, label: "CTR", icon: "ti-percentage" }
  ];

  const tilesHTML = tiles
    .map(
      (t, i) => `<div class="reveal-item" style="background:var(--surface-2);border:0.5px solid var(--border);border-radius:var(--radius);padding:0.85rem;animation-delay:${(i + 1) * 90}ms;">
        <i class="ti ${t.icon}" style="font-size:16px;color:${SUMMARY_ACCENT};" aria-hidden="true"></i>
        <p style="font-size:12px;color:var(--text-secondary);margin:6px 0 3px;">${t.label}</p>
        <p style="font-size:19px;font-weight:600;margin:0;" data-summary="${t.m.key}">0</p>
      </div>`
    )
    .join("");

  return `
    <div class="accent-stripe" style="height:4px;border-radius:2px;background:${SUMMARY_ACCENT};margin:-1.75rem -2rem 1.5rem;"></div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5rem;">
      <div><p style="font-size:12px;color:var(--text-muted);margin:0 0 4px;">All channels combined</p>
      <h1 style="display:flex;align-items:center;gap:8px;margin:0;font-size:20px;font-weight:600;"><i class="ti ti-report-money" style="font-size:20px;color:${SUMMARY_ACCENT};" aria-hidden="true"></i>Overall campaign summary</h1></div>
      <span style="font-size:12px;color:var(--text-muted);">${summary.asOfDate ? "As of " + fmtDate(summary.asOfDate) : ""}</span>
    </div>
    <div class="reveal-item" style="margin-bottom:1.5rem;animation-delay:20ms;">
      <p style="font-size:13px;color:var(--text-secondary);margin:0 0 2px;display:flex;align-items:center;gap:6px;"><i class="ti ti-currency-dollar" style="font-size:14px;color:${SUMMARY_ACCENT};" aria-hidden="true"></i>Total amount spent</p>
      <span style="font-family:var(--font-voice);font-size:48px;font-weight:500;font-variant-numeric:tabular-nums;" data-summary="spent">0</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:1.75rem;">${tilesHTML}</div>
    <div class="reveal-item" style="animation-delay:${(tiles.length + 1) * 90}ms;border-top:0.5px solid var(--border);padding-top:1.25rem;">
      <div style="background:${hexToRgba(SUMMARY_ACCENT, 0.1)};border:0.5px solid ${SUMMARY_ACCENT};border-radius:12px;padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div><p style="font-size:13px;color:var(--text-secondary);margin:0 0 2px;display:flex;align-items:center;gap:6px;"><i class="ti ti-receipt-2" style="font-size:14px;color:${SUMMARY_ACCENT};" aria-hidden="true"></i>Total spent, including 25% tax</p>
        <p style="font-size:11px;color:var(--text-muted);margin:0;">Total spent &times; 1.25</p></div>
        <span style="font-family:var(--font-voice);font-size:34px;font-weight:500;font-variant-numeric:tabular-nums;" data-summary="spentWithTax">0</span>
      </div>
    </div>`;
}

function wireSummary(summary) {
  const specs = {
    reach: { unit: "" }, impressions: { unit: "" }, clicks: { unit: "" },
    ctr: { unit: "%" }, spent: { unit: "PKR" }, spentWithTax: { unit: "PKR" }
  };
  Object.keys(specs).forEach((key) => {
    const el = document.querySelector(`[data-summary="${key}"]`);
    if (el) animateValue(el, summary[key], specs[key], 800);
  });
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

async function wireSlide(p, history) {
  const latest = history[history.length - 1];
  if (!latest) return;
  const hero = p.metrics.find((m) => m.hero) || p.metrics[0];
  const secondary = p.metrics.filter((m) => m.key !== hero.key);

  animateValue(document.getElementById("hero-val"), latest.metrics[hero.key], hero, 800);
  secondary.forEach((m) => {
    const el = document.querySelector(`[data-sec="${m.key}"]`);
    if (el) animateValue(el, latest.metrics[m.key], m, 800);
  });

  const isDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const latestYear = new Date(latest.date).getFullYear();
  const trend = history
    .filter((h) => new Date(h.date).getFullYear() === latestYear)
    .slice(-8)
    .map((h) => h.metrics[hero.key])
    .filter((v) => v !== undefined);
  if (sparkChart) sparkChart.destroy();
  if (trend.length >= 2) {
    sparkChart = new Chart(document.getElementById("sparkline"), {
      type: "line",
      data: { labels: trend.map(() => ""), datasets: [{ data: trend, borderColor: p.accent, backgroundColor: hexToRgba(p.accent, 0.1), fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
  }

  let activeMetricKey = hero.key;
  const picks = Array.from(document.querySelectorAll(".metric-pick"));

  function highlightActive() {
    picks.forEach((el) => {
      const active = el.dataset.metricKey === activeMetricKey;
      el.style.boxShadow = active ? `0 0 0 1.5px ${p.accent} inset` : "none";
      el.style.background = active ? hexToRgba(p.accent, 0.1) : (el.classList.contains("metric-pick") && el.dataset.metricKey !== hero.key ? "var(--surface-2)" : "transparent");
    });
    const nameEl = document.getElementById("compare-metric-name");
    const m = p.metrics.find((x) => x.key === activeMetricKey);
    if (nameEl && m) nameEl.textContent = m.label;
  }

  async function drawYoy() {
    const metric = p.metrics.find((m) => m.key === activeMetricKey);
    const comparison = await fetchJSON(`/api/reports/${p.key}/compare?metric=${metric.key}&date=${latest.date}`);
    const years = Object.keys(comparison).map(Number).sort();
    const shades = years.map((y, i) => hexToRgba(p.accent, 0.3 + (0.7 * (i + 1)) / years.length));
    const values = years.map((y) => comparison[y].value);
    const maxVal = Math.max(...values, 0);
    const labelColor = isDark ? "#f5f4f0" : "#0b0b0b";
    if (yoyChart) yoyChart.destroy();
    yoyChart = new Chart(document.getElementById("yoyChart"), {
      type: "bar",
      data: {
        labels: years.map((y) => y === new Date(latest.date).getFullYear() ? y + " (this report)" : y + " (as of " + fmtDate(comparison[y].asOfDate) + ")"),
        datasets: [{ data: values, backgroundColor: shades, borderRadius: 4 }]
      },
      plugins: window.ChartDataLabels ? [window.ChartDataLabels] : [],
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 24 } },
        animation: {
          delay: (ctx) => ctx.type === "data" && ctx.mode === "default" ? ctx.dataIndex * 180 : 0
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => fmt(metric, c.parsed.y) } },
          datalabels: {
            anchor: "end", align: "top", offset: 4,
            color: labelColor, font: { size: 12, weight: "600" },
            formatter: (v) => fmtCompact(metric, v)
          }
        },
        scales: {
          y: { suggestedMax: maxVal * 1.18, ticks: { callback: (v) => fmtCompact(metric, v), font: { size: 10 } }, grid: { color: isDark ? "#333" : "#e1e0d9" } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  picks.forEach((el) => {
    el.onclick = () => {
      activeMetricKey = el.dataset.metricKey;
      highlightActive();
      drawYoy();
      // Web Animations API instead of a CSS class — a class-based animation
      // here would fight the reveal-in animation's `forwards` fill and leave
      // the card stuck invisible once the click animation ended.
      if (el.animate) {
        el.animate(
          [{ transform: "scale(1)" }, { transform: "scale(0.96)" }, { transform: "scale(1)" }],
          { duration: 280, easing: "ease" }
        );
      }
    };
  });
  highlightActive();
  drawYoy();
}

async function render(animate) {
  const wrap = document.getElementById("slide-wrap");
  renderDots();

  const build = async () => {
    if (current === 0) {
      wrap.innerHTML = buildCoverHTML();
      wireCover();
      return;
    }
    if (isSummarySlide(current)) {
      const summary = await fetchJSON("/api/summary");
      wrap.innerHTML = buildSummaryHTML(summary);
      wireSummary(summary);
      return;
    }
    const key = PLATFORM_KEYS[current - 1];
    const p = { key, ...FIELDS[key] };
    const history = await fetchJSON(`/api/reports/${key}?limit=12`);
    wrap.innerHTML = buildSlideHTML(p, history);
    await wireSlide(p, history);
  };

  if (animate) {
    wrap.classList.add("out");
    setTimeout(async () => { await build(); wrap.classList.remove("out"); }, 220);
  } else {
    await build();
  }
}

function goTo(i) {
  current = (i + totalSlides()) % totalSlides();
  render(true);
}
function resetTimer() {
  if (timer) clearInterval(timer);
  if (playing) timer = setInterval(() => goTo(current + 1), 6000);
}

document.addEventListener("keydown", (e) => {
  const tag = (document.activeElement && document.activeElement.tagName) || "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (e.key === "ArrowRight") { goTo(current + 1); resetTimer(); }
  else if (e.key === "ArrowLeft") { goTo(current - 1); resetTimer(); }
});

async function init() {
  const meta = await fetchJSON("/api/meta");
  TODAY = meta.today;
  document.getElementById("mode-badge").textContent = meta.mode === "google-sheets" ? "Connected to Google Sheets" : "Local mode (Google Sheets not connected yet)";
  SETTINGS = await fetchJSON("/api/settings");
  document.title = (SETTINGS.coverTitle || "Paid marketing report") + " — Paid marketing report";
  FIELDS = await fetchJSON("/api/fields");
  PLATFORM_KEYS = Object.keys(FIELDS);

  document.getElementById("prev-btn").onclick = () => { goTo(current - 1); resetTimer(); };
  document.getElementById("next-btn").onclick = () => { goTo(current + 1); resetTimer(); };
  document.getElementById("play-btn").onclick = function () {
    playing = !playing;
    this.innerHTML = playing ? '<i class="ti ti-player-pause"></i>' : '<i class="ti ti-player-play"></i>';
    this.setAttribute("aria-label", playing ? "Pause slideshow" : "Play slideshow");
    resetTimer();
  };

  const presentBtn = document.getElementById("present-btn");
  presentBtn.onclick = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };
  document.addEventListener("fullscreenchange", () => {
    const isFull = !!document.fullscreenElement;
    document.body.classList.toggle("presenting", isFull);
    presentBtn.innerHTML = isFull ? '<i class="ti ti-minimize"></i> Exit' : '<i class="ti ti-maximize"></i> Present';
  });

  render(false);
}

init();
