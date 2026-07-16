/* WASTELORDS client — vanilla JS, no build step. */
"use strict";

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const SESSION_KEY = "wastelords.session";
let session = null;
try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch {}

let MAP = null;          // static map geometry
let S = null;            // last server state
let draft = [];          // orders being edited
let sel = { src: null, mode: null }; // map interaction state
let pollTimer = null, cdTimer = null;

const view = $("#view");

async function api(path, body) {
  const opts = body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : {};
  const res = await fetch(`/api/${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}

async function loadMap() {
  if (!MAP) MAP = await (await fetch("/map.json")).json();
  return MAP;
}

function saveSession(s) { session = s; localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearSession() { session = null; localStorage.removeItem(SESSION_KEY); }

/* ============================== LANDING ============================== */

function landing(msg = "") {
  stopTimers();
  $("#who").innerHTML = "";
  view.innerHTML = `
  <div class="landing">
    <div>
      <img class="hero-art" src="https://d8j0ntlcm91z4.cloudfront.net/user_3EmXsBg3I4hdDBBNcruL5YuMS2f/hf_20260716_022620_23b6bf7a-32d7-4ea3-9ad8-e7b3f7f26a81.png" alt="The Ashline — a ruined wasteland region" onerror="this.style.display='none'">
      <p class="pitch">
        Twenty-six territories. Up to eight clans. <b>One turn a week.</b><br>
        File secret orders whenever you like &mdash; march, dig in, rally recruits, run scouts.
        Every <b>Monday at 8:00&nbsp;AM Central</b> all orders resolve at once, and the map redraws itself.
        Between turns, the wire crackles: dispatches, rumors, and half-true leaks about your rivals
        arrive <b>by email</b>. Some of it is even true.
      </p>
      <div class="rules">
        <b>THE LAW OF THE WASTE</b><br>
        &bull; 3 orders a week (fuel territories add convoy capacity, up to 5)<br>
        &bull; MARCH warbands into adjacent land &mdash; take it or break on its walls<br>
        &bull; HOLD to dig in (+50% defense for the week)<br>
        &bull; RALLY to choose where this week's recruits muster<br>
        &bull; RECON any territory to count its garrison and steal its owner's orders<br>
        &bull; Water feeds recruits. Scrap hardens walls. Fuel moves convoys.<br>
        &bull; Take 60% of the map, or hold the most when turn 12 ends.
      </div>
    </div>
    <div>
      <div class="panel">
        <div class="tabs">
          <button id="tab-join" class="active">Join</button>
          <button id="tab-create">Found a war</button>
          <button id="tab-login">Return</button>
        </div>
        <form id="form-join">
          <label>Game code</label><input name="code" placeholder="RUST-XXXX" required style="text-transform:uppercase">
          <label>Your name</label><input name="playerName" maxlength="40" required>
          <label>Clan name</label><input name="clanName" maxlength="30" placeholder="e.g. The Glass Choir" required>
          <label>Email &mdash; where the wire finds you</label><input name="email" type="email" placeholder="optional but recommended">
          <label>PIN (4+ characters, to log back in)</label><input name="pin" type="password" minlength="4" required>
          <button type="submit">Sign the ledger</button>
        </form>
        <form id="form-create" class="hidden">
          <label>Name of the war</label><input name="gameName" maxlength="60" placeholder="The Ashline War">
          <label>Your name</label><input name="playerName" maxlength="40" required>
          <label>Clan name</label><input name="clanName" maxlength="30" required>
          <label>Email</label><input name="email" type="email" placeholder="optional but recommended">
          <label>PIN (4+ characters)</label><input name="pin" type="password" minlength="4" required>
          <label>Pace</label>
          <div class="pace-pick">
            <label class="pace-opt"><input type="radio" name="pace" value="weekly" checked>
              <b>Weekly campaign</b> — turns resolve Mondays 8:00 AM Central. The real thing.</label>
            <label class="pace-opt"><input type="radio" name="pace" value="blitz">
              <b>Blitz</b> — each turn resolves the moment every clan has filed. Solo practice allowed. Good for testing.</label>
          </div>
          <button type="submit">Light the signal fire</button>
        </form>
        <form id="form-login" class="hidden">
          <label>Game code</label><input name="code" placeholder="RUST-XXXX" required style="text-transform:uppercase">
          <label>Your name</label><input name="playerName" required>
          <label>PIN</label><input name="pin" type="password" required>
          <button type="submit">Back to the war</button>
        </form>
        <div class="error" id="landing-err">${esc(msg)}</div>
      </div>
    </div>
  </div>`;

  const forms = { join: $("#form-join"), create: $("#form-create"), login: $("#form-login") };
  const tabs = { join: $("#tab-join"), create: $("#tab-create"), login: $("#tab-login") };
  for (const k of Object.keys(tabs)) {
    tabs[k].onclick = () => {
      for (const j of Object.keys(tabs)) {
        tabs[j].classList.toggle("active", j === k);
        forms[j].classList.toggle("hidden", j !== k);
      }
    };
  }
  const wire = (form, path) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(form).entries());
      if (body.code) body.code = body.code.toUpperCase().trim();
      try {
        const r = await api(path, body);
        saveSession({ code: r.code, token: r.token });
        enterGame();
      } catch (ex) { $("#landing-err").textContent = ex.message; }
    };
  };
  wire(forms.join, "join"); wire(forms.create, "create"); wire(forms.login, "login");
}

/* ============================== GAME ============================== */

async function enterGame() {
  try {
    await loadMap();
    S = await api(`state?code=${encodeURIComponent(session.code)}&token=${encodeURIComponent(session.token)}`);
  } catch (ex) {
    clearSession();
    return landing(ex.message);
  }
  draft = S.myOrders.map((o) => ({ ...o }));
  sel = { src: null, mode: null };
  renderGame();
  startTimers();
}

function startTimers() {
  stopTimers();
  pollTimer = setInterval(refresh, 60000);
  cdTimer = setInterval(renderCountdown, 1000);
}
function stopTimers() {
  if (pollTimer) clearInterval(pollTimer);
  if (cdTimer) clearInterval(cdTimer);
  pollTimer = cdTimer = null;
}

async function refresh() {
  try {
    const fresh = await api(`state?code=${encodeURIComponent(session.code)}&token=${encodeURIComponent(session.token)}`);
    const turnChanged = fresh.turn !== S?.turn || fresh.status !== S?.status;
    S = fresh;
    if (turnChanged) { draft = S.myOrders.map((o) => ({ ...o })); sel = { src: null, mode: null }; }
    renderGame();
  } catch { /* keep last view; next poll retries */ }
}

function tname(tid) { return MAP.territories.find((t) => t.id === tid)?.name || tid; }
function tdef(tid) { return MAP.territories.find((t) => t.id === tid); }
function ownedByMe(tid) { return S.territories[tid]?.owner === S.you.pid; }

function renderGame() {
  $("#who").innerHTML = `${esc(S.you.clanName)} &mdash; ${esc(S.you.name)}<br><span class="mono">${esc(S.code)}</span> &middot; <a href="#" id="logout">walk away</a>`;
  $("#logout").onclick = (e) => { e.preventDefault(); clearSession(); landing(); };

  if (S.status === "recruiting") return renderLobby();
  renderActive();
}

/* ---------- lobby ---------- */
function renderLobby() {
  view.innerHTML = `
  <div class="panel" style="max-width:680px">
    <h2>${esc(S.name)} &mdash; mustering${S.pace === "blitz" ? ' <span class="stencil" style="font-size:14px;color:var(--oxide-deep)">BLITZ</span>' : ""}</h2>
    <p>${S.pace === "blitz"
      ? "Blitz pace: turns resolve the moment every clan files. You can even start solo to practice."
      : "Pass the code to your rivals. The war needs 2&ndash;8 clans. When the ledger is full enough, the Overseer opens the season."}</p>
    <p><span class="code-badge">${esc(S.code)}</span></p>
    <div id="lobby-list"></div>
    ${S.you.isMaster ? `<button id="btn-start">Open the season</button>
      <button class="ghost" id="btn-bot" style="margin-left:10px">Hire a raider clan (AI)</button>
      <div class="order-hint" style="margin-top:8px">Starting locks the ledger and deals every clan a stronghold. Raider clans are AI-run — they expand, scheme, and leak intel like anyone else.</div>` : `<p class="order-hint">Waiting on the Overseer's word.</p>`}
    <div class="error" id="game-err"></div>
  </div>`;
  $("#lobby-list").innerHTML = S.players.map((p) => `
    <div class="standing">
      <span class="sw" style="background:${esc(p.colorHex)}"></span>
      <span class="nm">${esc(p.clanName)}</span>
      ${p.isMaster ? '<span class="stencil" style="font-size:11px;color:var(--oxide-deep)">OVERSEER</span>' : ""}
      ${p.isBot ? '<span class="stencil" style="font-size:11px;color:var(--ink-soft)">RAIDER AI</span>' : ""}
    </div>`).join("");
  if (S.you.isMaster) {
    $("#btn-start").onclick = async () => {
      try { await api("start", { code: S.code, token: session.token }); refresh(); }
      catch (ex) { $("#game-err").textContent = ex.message; }
    };
    $("#btn-bot").onclick = async () => {
      try { await api("addbot", { code: S.code, token: session.token }); refresh(); }
      catch (ex) { $("#game-err").textContent = ex.message; }
    };
  }
}

/* ---------- active game ---------- */
function renderActive() {
  const finished = S.status === "finished";
  const blitz = S.pace === "blitz";
  view.innerHTML = `
  <div class="strip">
    <span class="chip">TURN <b>${S.turn}</b> / ${S.seasonTurns}</span>
    ${finished
      ? `<span class="stamp">Season over</span>`
      : blitz
        ? `<span class="chip"><b>BLITZ</b> &mdash; resolves when every clan files</span>`
        : `<span class="chip">orders lock in <b class="countdown" id="cd">&mdash;</b></span>
           <span class="chip">${esc(S.deadlineText || "")}</span>`}
    <span class="chip">recruits next muster: <b>+${S.you.recruitsNext}</b></span>
    <span class="chip">water ${S.you.resources.water} &middot; scrap ${S.you.resources.scrap} &middot; fuel ${S.you.resources.fuel}</span>
    ${S.emailEnabled ? "" : `<span class="chip" title="No email key configured — hints land in the radio log only">wire: <b>radio only</b></span>`}
    ${S.you.isMaster && !finished ? `<button class="small ghost" id="btn-force" title="Resolve the turn right now (testing)">force resolution</button>` : ""}
  </div>
  <div class="game">
    <div>
      <div class="mapwrap">
        <div class="map-title">THE ASHLINE &mdash; SURVEY 7-C</div>
        <div id="map"></div>
      </div>
      <div class="legend">
        <span><span class="sw" style="background:#b9ae94"></span>unclaimed</span>
        ${S.players.map((p) => `<span><span class="sw" style="background:${esc(p.colorHex)}"></span>${esc(p.clanName)}</span>`).join("")}
        <span>&#9679; = capital &nbsp; &#128167; water &nbsp; &#9881; scrap &nbsp; &#9981; fuel</span>
      </div>
    </div>
    <div class="side">
      ${finished ? "" : `
      <div class="panel">
        <h2>Orders &mdash; turn ${S.turn + 1}</h2>
        <div id="orders"></div>
        <div id="builder"></div>
        <button id="btn-file" ${S.you.eliminated ? "disabled" : ""}>File orders</button>
        <div class="error" id="game-err"></div>
        <div class="notice" id="game-ok"></div>
      </div>`}
      <div class="panel">
        <h2>Standings</h2>
        ${S.players.map((p) => `
          <div class="standing ${p.eliminated ? "dead" : ""}">
            <span class="sw" style="background:${esc(p.colorHex)}"></span>
            <span class="nm">${p.rank}. ${esc(p.clanName)}</span>
            <span class="mono">${p.territories}t/${p.units}w</span>
            ${finished || p.eliminated ? "" : p.isBot ? '<span class="filed" style="color:var(--ink-soft)">RAIDER</span>' : (p.submitted ? '<span class="filed">FILED</span>' : '<span class="silent">SILENT</span>')}
          </div>`).join("")}
      </div>
      <div class="panel">
        <h2>Radio log</h2>
        <div class="radio-log">
          ${S.log.map((e) => `
            <div class="entry ${esc(e.kind)}">
              <div class="meta">T${e.turn} &middot; ${esc(e.kind)}${e.pid ? " &middot; your ears only" : ""}</div>
              ${esc(e.text)}
            </div>`).join("") || '<div class="entry">Static. Nothing yet.</div>'}
        </div>
      </div>
    </div>
  </div>`;

  renderMapSvg();
  if (!finished) { renderOrders(); renderCountdown(); }
  if (S.you.isMaster && !finished) $("#btn-force").onclick = forceResolve;
  if (!finished) $("#btn-file").onclick = fileOrders;
}

async function forceResolve() {
  if (!confirm("Resolve the turn right now? This is meant for testing / season admin.")) return;
  try { await api("resolve", { code: S.code, token: session.token }); await refresh(); }
  catch (ex) { $("#game-err").textContent = ex.message; }
}

/* ---------- map ---------- */
function renderMapSvg() {
  const colors = Object.fromEntries(S.players.map((p) => [p.pid, p.colorHex]));
  const caps = Object.fromEntries(S.players.map((p) => [p.pid, p.pid === S.you.pid ? S.you.capital : null]));
  const parts = [];
  parts.push(`<svg viewBox="0 0 ${MAP.width} ${MAP.height}" xmlns="http://www.w3.org/2000/svg">`);
  for (const t of MAP.territories) {
    const st = S.territories[t.id];
    const fill = st.owner ? colors[st.owner] || "#777" : "#b9ae94";
    const cls = ["terr"];
    if (sel.src === t.id) cls.push("sel-src");
    if (sel.mode === "march-dst" && sel.src && tdef(sel.src).neighbors.includes(t.id)) cls.push("sel-dst");
    if (sel.mode === "recon-dst" && !ownedByMe(t.id)) cls.push("sel-dst");
    parts.push(`<polygon class="${cls.join(" ")}" data-tid="${t.id}" points="${t.poly.map((p) => p.join(",")).join(" ")}"
      fill="${fill}" fill-opacity="${st.owner ? "0.78" : "0.55"}"/>`);
  }
  for (const t of MAP.territories) {
    const st = S.territories[t.id];
    const units = st.exact ? st.units : st.units === "?" ? "?" : ({ light: "·", manned: "··", heavy: "···", fortress: "####" }[st.units] || st.units);
    const icon = t.resource === "water" ? "💧" : t.resource === "scrap" ? "⚙" : t.resource === "fuel" ? "⛽" : "";
    const isCap = S.you.capital === t.id;
    parts.push(`<text class="tname" x="${t.cx}" y="${t.cy - 10}" text-anchor="middle">${esc(t.name)}</text>`);
    parts.push(`<text class="tunits" x="${t.cx}" y="${t.cy + 8}" text-anchor="middle" fill="${st.owner ? "#f6efdd" : "#4a4237"}" stroke="#2b2721" stroke-width="0.5" paint-order="stroke">${units}${isCap ? " ●" : ""}</text>`);
    if (icon) parts.push(`<text class="ticon" x="${t.cx}" y="${t.cy + 24}" text-anchor="middle">${icon}</text>`);
    if (!st.exact && st.units !== "?") parts.push(`<title>garrison: ${st.units}</title>`);
  }
  parts.push("</svg>");
  $("#map").innerHTML = parts.join("");
  for (const poly of document.querySelectorAll("#map .terr")) {
    poly.addEventListener("click", () => onTerritoryClick(poly.dataset.tid));
  }
}

/* ---------- order building ---------- */
function describeDraft(o) {
  switch (o.type) {
    case "march": return `MARCH ${o.units} — ${tname(o.src)} → ${tname(o.dst)}`;
    case "hold": return `HOLD — dig in at ${tname(o.src)}`;
    case "rally": return `RALLY — muster recruits at ${tname(o.src)}`;
    case "recon": return `RECON — scout ${tname(o.dst)}`;
  }
}

function renderOrders() {
  const box = $("#orders");
  box.innerHTML = draft.length
    ? draft.map((o, i) => `<div class="order-row"><span>${esc(describeDraft(o))}</span><span class="del" data-i="${i}" title="scrap this order">✕</span></div>`).join("")
    : `<div class="order-hint">No orders drafted. An idle clan is a dying clan.</div>`;
  for (const el of box.querySelectorAll(".del")) {
    el.onclick = () => { draft.splice(Number(el.dataset.i), 1); renderOrders(); renderMapSvg(); };
  }
  renderBuilder();
}

function renderBuilder() {
  const b = $("#builder");
  const cap = S.you.maxOrders;
  if (S.you.eliminated) { b.innerHTML = `<div class="order-hint">Your clan has fallen. You may only listen to the wire.</div>`; return; }
  if (draft.length >= cap) { b.innerHTML = `<div class="order-hint">Order book full (${cap}). Scrap one to change plans.</div>`; return; }

  if (!sel.src && !sel.mode) {
    b.innerHTML = `<div class="order-hint">Click one of <b>your territories</b> to give it an order &mdash; or</div>
      <div class="order-builder"><button class="ghost small" id="b-recon">Recon somewhere</button></div>`;
    $("#b-recon").onclick = () => { sel = { src: null, mode: "recon-dst" }; renderBuilder(); renderMapSvg(); };
    return;
  }
  if (sel.mode === "recon-dst") {
    b.innerHTML = `<div class="order-hint">Click any territory you <b>don't</b> hold to scout it.</div>
      <div class="order-builder"><button class="ghost small" id="b-cancel">Cancel</button></div>`;
    $("#b-cancel").onclick = resetSel;
    return;
  }
  if (sel.mode === "march-dst") {
    b.innerHTML = `<div class="order-hint">Marching from <b>${esc(tname(sel.src))}</b>. Click an <b>adjacent</b> territory to target.</div>
      <div class="order-builder"><button class="ghost small" id="b-cancel">Cancel</button></div>`;
    $("#b-cancel").onclick = resetSel;
    return;
  }
  if (sel.mode === "march-qty") {
    const garrison = S.territories[sel.src].units;
    const max = Math.max(1, garrison - 1);
    b.innerHTML = `
      <div class="order-hint">March from <b>${esc(tname(sel.src))}</b> to <b>${esc(tname(sel.dst))}</b>. Garrison: ${garrison} (one must stay).</div>
      <div class="qty"><input type="range" id="b-qty" min="1" max="${max}" value="${Math.max(1, Math.ceil(max * 0.66))}">
      <span class="mono" id="b-qty-out"></span></div>
      <div class="order-builder">
        <button class="small" id="b-march-ok">Confirm march</button>
        <button class="ghost small" id="b-cancel">Cancel</button>
      </div>`;
    const out = $("#b-qty-out"), rng = $("#b-qty");
    const upd = () => out.textContent = `${rng.value} warbands`;
    rng.oninput = upd; upd();
    $("#b-march-ok").onclick = () => {
      draft = draft.filter((o) => !(("src" in o) && o.src === sel.src && (o.type === "march" || o.type === "hold")));
      draft.push({ type: "march", src: sel.src, dst: sel.dst, units: Number(rng.value) });
      resetSel();
    };
    $("#b-cancel").onclick = resetSel;
    return;
  }
  // src selected, choose order type
  const already = draft.some((o) => (o.type === "march" || o.type === "hold") && o.src === sel.src);
  b.innerHTML = `
    <div class="order-hint">Selected: <b>${esc(tname(sel.src))}</b> (garrison ${S.territories[sel.src].units})${already ? " — replacing its current order" : ""}</div>
    <div class="order-builder">
      <button class="small" id="b-march">March</button>
      <button class="small" id="b-hold">Hold</button>
      <button class="small" id="b-rally">Rally here</button>
      <button class="ghost small" id="b-cancel">Cancel</button>
    </div>`;
  $("#b-march").onclick = () => { sel.mode = "march-dst"; renderBuilder(); renderMapSvg(); };
  $("#b-hold").onclick = () => {
    draft = draft.filter((o) => !((o.type === "march" || o.type === "hold") && o.src === sel.src));
    draft.push({ type: "hold", src: sel.src });
    resetSel();
  };
  $("#b-rally").onclick = () => {
    draft = draft.filter((o) => o.type !== "rally");
    draft.push({ type: "rally", src: sel.src });
    resetSel();
  };
  $("#b-cancel").onclick = resetSel;
}

function resetSel() { sel = { src: null, mode: null }; renderOrders(); renderMapSvg(); }

function onTerritoryClick(tid) {
  if (S.status !== "active" || S.you.eliminated) return;
  if (sel.mode === "recon-dst") {
    if (ownedByMe(tid)) return;
    if (draft.length < S.you.maxOrders) draft.push({ type: "recon", dst: tid });
    return resetSel();
  }
  if (sel.mode === "march-dst" && sel.src) {
    if (!tdef(sel.src).neighbors.includes(tid)) return;
    sel.dst = tid; sel.mode = "march-qty";
    renderBuilder(); renderMapSvg();
    return;
  }
  if (ownedByMe(tid)) {
    sel = { src: tid, mode: "type" };
    renderBuilder(); renderMapSvg();
  }
}

async function fileOrders() {
  try {
    $("#game-err").textContent = ""; $("#game-ok").textContent = "";
    const r = await api("orders", { code: S.code, token: session.token, orders: draft });
    $("#game-ok").textContent = r.resolved
      ? `All clans filed — TURN ${r.turn} RESOLVED. Redrawing the map…`
      : S.pace === "blitz"
        ? `Orders filed (${r.filed}). The turn fires when every clan has filed.`
        : `Orders filed and sealed (${r.filed}). You can refile any time before the deadline.`;
    refresh();
  } catch (ex) { $("#game-err").textContent = ex.message; }
}

/* ---------- countdown ---------- */
function renderCountdown() {
  const el = $("#cd");
  if (!el || !S?.deadline) return;
  let ms = new Date(S.deadline).getTime() - Date.now();
  if (ms <= 0) { el.textContent = "RESOLVING…"; return; }
  const d = Math.floor(ms / 864e5); ms -= d * 864e5;
  const h = Math.floor(ms / 36e5); ms -= h * 36e5;
  const m = Math.floor(ms / 6e4); ms -= m * 6e4;
  const s = Math.floor(ms / 1e3);
  el.textContent = d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${String(s).padStart(2, "0")}s`;
}

/* ============================== boot ============================== */
(async function boot() {
  await loadMap().catch(() => {});
  if (session?.code && session?.token) enterGame();
  else landing();
})();
