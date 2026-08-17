let FIELDS = {};
let currentPlatform = null;
let showAddChannelForm = false;

const CHANNEL_ICONS = [
  { value: "ti-brand-google", label: "Google" },
  { value: "ti-brand-facebook", label: "Facebook" },
  { value: "ti-brand-instagram", label: "Instagram" },
  { value: "ti-brand-youtube", label: "YouTube" },
  { value: "ti-brand-tiktok", label: "TikTok" },
  { value: "ti-brand-linkedin", label: "LinkedIn" },
  { value: "ti-brand-snapchat", label: "Snapchat" },
  { value: "ti-brand-whatsapp", label: "WhatsApp" },
  { value: "ti-target-arrow", label: "Ads / campaign" },
  { value: "ti-photo", label: "Display ads" },
  { value: "ti-world", label: "Website" },
  { value: "ti-database", label: "Internal system" },
  { value: "ti-building", label: "Institution" },
  { value: "ti-chart-bar", label: "General" }
];

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

function renderTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";
  Object.keys(FIELDS).forEach((key) => {
    const p = FIELDS[key];
    const btn = document.createElement("button");
    const active = key === currentPlatform;
    btn.className = "btn";
    if (active) btn.style.cssText = "background:var(--text-accent);color:#fff;border-color:var(--text-accent);";
    btn.innerHTML = `<i class="ti ${p.icon}"></i> ${p.label}`;
    btn.onclick = () => { currentPlatform = key; showAddChannelForm = false; renderTabs(); renderAddChannelRow(); renderForm().then(prefillFromExisting); renderFieldList(); };
    tabs.appendChild(btn);
  });
  const addBtn = document.createElement("button");
  addBtn.className = "btn";
  addBtn.style.cssText = "border-style:dashed;";
  addBtn.innerHTML = '<i class="ti ti-plus"></i> Add channel';
  addBtn.onclick = () => { showAddChannelForm = !showAddChannelForm; renderAddChannelRow(); };
  tabs.appendChild(addBtn);
}

function renderAddChannelRow() {
  const row = document.getElementById("add-channel-row");
  row.innerHTML = "";
  if (!showAddChannelForm) return;
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:var(--surface-2);border:0.5px solid var(--border);border-radius:var(--radius);padding:10px;";
  wrap.innerHTML = `
    <input id="new-channel-name" type="text" placeholder="Channel name, e.g. Google Performance Max" style="min-width:240px;">
    <select id="new-channel-icon">${CHANNEL_ICONS.map((i) => `<option value="${i.value}">${i.label}</option>`).join("")}</select>
    <button class="btn primary" id="confirm-add-channel"><i class="ti ti-check"></i> Add</button>
    <span id="add-channel-msg" style="font-size:12px;color:var(--text-danger);"></span>
  `;
  row.appendChild(wrap);

  document.getElementById("confirm-add-channel").onclick = async () => {
    const label = document.getElementById("new-channel-name").value.trim();
    const icon = document.getElementById("new-channel-icon").value;
    const msg = document.getElementById("add-channel-msg");
    if (!label) { msg.textContent = "Enter a channel name."; return; }
    try {
      const created = await fetchJSON("/api/platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, icon })
      });
      FIELDS = await fetchJSON("/api/fields");
      currentPlatform = created.key;
      showAddChannelForm = false;
      renderTabs(); renderAddChannelRow(); renderReorderList();
      await renderForm(); prefillFromExisting(); renderFieldList();
    } catch (err) {
      msg.textContent = err.message;
    }
  };
}

function renderReorderList() {
  const list = document.getElementById("reorder-list");
  list.innerHTML = "";
  const keys = Object.keys(FIELDS);
  keys.forEach((key, i) => {
    const p = FIELDS[key];
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:8px;background:var(--surface-2);border:0.5px solid var(--border);border-radius:var(--radius);padding:6px 10px;";
    row.innerHTML = `<i class="ti ${p.icon}" style="color:${p.accent};font-size:15px;"></i><span style="flex:1;font-size:13px;">${p.label}</span>`;

    async function move(direction) {
      await fetchJSON(`/api/platforms/${key}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction })
      });
      FIELDS = await fetchJSON("/api/fields");
      renderTabs();
      renderReorderList();
    }

    const upBtn = document.createElement("button");
    upBtn.innerHTML = '<i class="ti ti-chevron-up"></i>';
    upBtn.setAttribute("aria-label", "Move " + p.label + " earlier");
    upBtn.disabled = i === 0;
    upBtn.style.cssText = "background:none;border:0.5px solid var(--border);border-radius:var(--radius);cursor:pointer;color:var(--text-secondary);padding:3px 6px;" + (i === 0 ? "opacity:0.35;cursor:default;" : "");
    upBtn.onclick = () => move("up");

    const downBtn = document.createElement("button");
    downBtn.innerHTML = '<i class="ti ti-chevron-down"></i>';
    downBtn.setAttribute("aria-label", "Move " + p.label + " later");
    downBtn.disabled = i === keys.length - 1;
    downBtn.style.cssText = "background:none;border:0.5px solid var(--border);border-radius:var(--radius);cursor:pointer;color:var(--text-secondary);padding:3px 6px;" + (i === keys.length - 1 ? "opacity:0.35;cursor:default;" : "");
    downBtn.onclick = () => move("down");

    row.appendChild(upBtn);
    row.appendChild(downBtn);
    list.appendChild(row);
  });
}

async function renderForm() {
  const form = document.getElementById("metric-form");
  form.innerHTML = "";
  FIELDS[currentPlatform].metrics.forEach((m) => {
    const wrap = document.createElement("label");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--text-secondary);";
    wrap.innerHTML = `<span><i class="ti ${m.icon}" style="margin-right:4px;"></i>${m.label}${m.unit ? " (" + m.unit + ")" : ""}</span>`;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.id = "metric-" + m.key;
    input.placeholder = "0";
    wrap.appendChild(input);
    form.appendChild(wrap);
  });
  if (FIELDS[currentPlatform].metrics.length === 0) {
    form.innerHTML = `<p style="font-size:13px;color:var(--text-muted);grid-column:1/-1;">This channel has no fields yet — add some below under "Manage fields".</p>`;
  }
}

async function prefillFromExisting() {
  const date = document.getElementById("date-input").value;
  const msg = document.getElementById("save-msg");
  msg.textContent = "";
  if (!date) return;
  const history = await fetchJSON(`/api/reports/${currentPlatform}`);
  const existing = history.find((h) => h.date === date);
  FIELDS[currentPlatform].metrics.forEach((m) => {
    const el = document.getElementById("metric-" + m.key);
    if (el) el.value = existing && existing.metrics[m.key] !== undefined ? existing.metrics[m.key] : "";
  });
  if (existing) {
    msg.style.color = "var(--text-secondary)";
    msg.textContent = "Editing the existing entry for this date.";
  }
}

function renderFieldList() {
  const list = document.getElementById("field-list");
  list.innerHTML = "";
  const metrics = FIELDS[currentPlatform].metrics;
  metrics.forEach((m, i) => {
    const chip = document.createElement("span");
    chip.style.cssText = "display:inline-flex;align-items:center;gap:4px;background:var(--surface-2);border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 6px 4px 8px;font-size:12px;";
    const label = document.createElement("span");
    label.innerHTML = `${m.label}` + (m.hero ? ' <span style="color:var(--text-muted);">(hero)</span>' : "");
    chip.appendChild(label);

    async function move(direction) {
      await fetchJSON(`/api/fields/${currentPlatform}/${m.key}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction })
      });
      FIELDS[currentPlatform] = await fetchJSON(`/api/fields`).then((f) => f[currentPlatform]);
      await renderForm(); prefillFromExisting(); renderFieldList();
    }

    const up = document.createElement("button");
    up.innerHTML = '<i class="ti ti-chevron-left"></i>';
    up.setAttribute("aria-label", "Move " + m.label + " earlier");
    up.disabled = i === 0;
    up.style.cssText = "background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0 2px;line-height:0;" + (i === 0 ? "opacity:0.3;cursor:default;" : "");
    up.onclick = () => move("up");
    chip.appendChild(up);

    const down = document.createElement("button");
    down.innerHTML = '<i class="ti ti-chevron-right"></i>';
    down.setAttribute("aria-label", "Move " + m.label + " later");
    down.disabled = i === metrics.length - 1;
    down.style.cssText = "background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0 2px;line-height:0;" + (i === metrics.length - 1 ? "opacity:0.3;cursor:default;" : "");
    down.onclick = () => move("down");
    chip.appendChild(down);

    if (!m.hero) {
      const x = document.createElement("button");
      x.innerHTML = '<i class="ti ti-x"></i>';
      x.setAttribute("aria-label", "Remove " + m.label);
      x.style.cssText = "background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0 2px;line-height:0;";
      x.onclick = async () => {
        await fetchJSON(`/api/fields/${currentPlatform}/${m.key}`, { method: "DELETE" });
        FIELDS[currentPlatform] = await fetchJSON(`/api/fields`).then((f) => f[currentPlatform]);
        await renderForm(); prefillFromExisting(); renderFieldList();
      };
      chip.appendChild(x);
    }
    list.appendChild(chip);
  });
}

async function init() {
  FIELDS = await fetchJSON("/api/fields");
  currentPlatform = Object.keys(FIELDS)[0];
  const meta = await fetchJSON("/api/meta");
  document.getElementById("date-input").value = meta.today;

  renderTabs();
  renderAddChannelRow();
  renderReorderList();
  await renderForm();
  renderFieldList();
  prefillFromExisting();

  document.getElementById("date-input").onchange = prefillFromExisting;

  document.getElementById("add-field-btn").onclick = async () => {
    const label = document.getElementById("new-field-label").value.trim();
    const unit = document.getElementById("new-field-unit").value;
    if (!label) return;
    await fetchJSON(`/api/fields/${currentPlatform}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, unit })
    });
    document.getElementById("new-field-label").value = "";
    FIELDS[currentPlatform] = await fetchJSON(`/api/fields`).then((f) => f[currentPlatform]);
    await renderForm(); prefillFromExisting(); renderFieldList();
  };

  document.getElementById("remove-channel-btn").onclick = async () => {
    if (Object.keys(FIELDS).length <= 1) {
      alert("At least one channel needs to stay — add another channel before removing this one.");
      return;
    }
    if (!confirm(`Remove "${FIELDS[currentPlatform].label}"? Its past entries stay in the Google Sheet but won't show on the dashboard.`)) return;
    await fetchJSON(`/api/platforms/${currentPlatform}`, { method: "DELETE" });
    FIELDS = await fetchJSON("/api/fields");
    currentPlatform = Object.keys(FIELDS)[0];
    renderTabs(); renderAddChannelRow(); renderReorderList();
    await renderForm(); prefillFromExisting(); renderFieldList();
  };

  document.getElementById("save-btn").onclick = async () => {
    const values = {};
    FIELDS[currentPlatform].metrics.forEach((m) => {
      const el = document.getElementById("metric-" + m.key);
      if (el && el.value !== "") values[m.key] = el.value;
    });
    const date = document.getElementById("date-input").value;
    const msg = document.getElementById("save-msg");
    if (!date) {
      msg.style.color = "var(--text-danger)";
      msg.textContent = "Pick a date first.";
      return;
    }
    try {
      await fetchJSON("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: currentPlatform, date, values })
      });
      msg.style.color = "var(--text-success)";
      msg.textContent = "Saved.";
    } catch (err) {
      msg.style.color = "var(--text-danger)";
      msg.textContent = err.message;
    }
  };
}

init();
