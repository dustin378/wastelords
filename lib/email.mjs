// Email layer. Sends via Resend when RESEND_API_KEY is set; otherwise everything
// still lands in the in-game radio log, so the game works without email.
const env = (k) => (globalThis.Netlify ? Netlify.env.get(k) : process.env[k]);

export function emailEnabled() {
  return Boolean(env("RESEND_API_KEY"));
}

export async function sendEmail({ to, subject, text }) {
  const key = env("RESEND_API_KEY");
  if (!key) return { skipped: true };
  const from = env("EMAIL_FROM") || "WASTELORDS <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text })
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, id: body?.id, error: body?.message };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

const BANNER = [
  "==========================================",
  "  W A S T E L O R D S  //  FIELD DISPATCH",
  "=========================================="
].join("\n");

export function renderDispatch({ game, player, report, leaks, reconRows, standings, deadline }) {
  const L = [];
  L.push(BANNER, "");
  L.push(`TURN ${report.turn} RESOLVED — ${report.event.headline}`);
  L.push(report.event.text, "");
  const myBattles = report.battles.filter((b) => b.attacker === player.id || b.defender === player.id);
  if (myBattles.length) {
    L.push("--- YOUR BATTLES ---");
    for (const b of myBattles) L.push("  " + describeBattle(b, game, player.id));
    L.push("");
  }
  const rec = report.recruits[player.id];
  if (rec) L.push(`Recruitment: +${rec} warbands mustered this week.`, "");
  if (reconRows.length) {
    L.push("--- SCOUT REPORTS ---");
    for (const r of reconRows) {
      L.push(`  ${r.tname}: held by ${r.ownerName}, garrison ${r.units} strong.`);
      if (r.interceptedOrder) L.push(`    Intercepted: ${r.interceptedOrder}.`);
    }
    L.push("");
  }
  if (leaks?.length) {
    L.push("--- WHISPERS ON THE WIRE ---");
    for (const x of leaks) L.push(`  ${x}`);
    L.push("");
  }
  if (report.headlines.length) {
    L.push("--- ACROSS THE WASTE ---");
    for (const h of report.headlines) L.push(`  ${h}`);
    L.push("");
  }
  L.push("--- STANDINGS ---");
  for (const s of standings) L.push(`  ${s.rank}. ${s.clanName} — ${s.territories} territories, ${s.units} warbands${s.eliminated ? " [FALLEN]" : ""}`);
  L.push("");
  if (report.winner) {
    const w = game.players.find((p) => p.id === report.winner);
    L.push(`*** ${w.clanName.toUpperCase()} HAS TAKEN THE WASTE. THE SEASON IS OVER. ***`);
  } else {
    L.push(`Orders for turn ${report.turn + 1} lock: ${deadline}.`);
    L.push(`File them at: ${env("SITE_URL") || "https://wastelords.netlify.app"}`);
  }
  L.push("", "— transmission ends —");
  return L.join("\n");
}

export function describeBattle(b, game, viewerPid) {
  const name = (pid) => pid ? (game.players.find((p) => p.id === pid)?.clanName || "Unknown clan") : "the locals";
  const t = b.tname;
  if (b.result === "captured") {
    if (b.attacker === viewerPid) return `You took ${t} from ${name(b.defender)} — ${b.atkUnits} marched, ${b.survivors} hold it now.`;
    if (b.defender === viewerPid) return `You LOST ${t} to ${name(b.attacker)}. The garrison of ${b.defUnits} was overrun.`;
    return `${name(b.attacker)} took ${t} from ${name(b.defender)}.`;
  } else {
    if (b.attacker === viewerPid) return `Your assault on ${t} was repelled by ${name(b.defender)} — the column of ${b.atkUnits} broke and scattered.`;
    if (b.defender === viewerPid) return `You held ${t} against ${name(b.attacker)} — their column of ${b.atkUnits} broke on your line (you lost ${b.defLoss ?? 0}).`;
    return `${name(b.defender)} held ${t} against ${name(b.attacker)}.`;
  }
}

export function renderRumor({ game, player, rumor, deadline }) {
  return [
    BANNER, "",
    "RUMOR ON THE WIND — midweek intercept", "",
    rumor, "",
    `Orders lock ${deadline}. Choose well.`,
    "", "— transmission ends —"
  ].join("\n");
}

export function renderReminder({ game, player, submitted, deadline, laggards }) {
  const L = [BANNER, ""];
  if (submitted) {
    L.push("Your orders are filed and sealed. This is a courtesy wire.", "");
    if (laggards.length) L.push(`Still silent as of this transmission: ${laggards.join(", ")}. Make of that what you will.`);
    else L.push("Every clan has filed. The waste holds its breath until Monday.");
  } else {
    L.push(`WARLORD — YOUR ORDERS ARE NOT FILED.`, "");
    L.push(`The turn resolves ${deadline} (Monday 8:00 AM Central). An idle clan is a dying clan.`);
    L.push(`File now: ${env("SITE_URL") || "https://wastelords.netlify.app"}`);
  }
  L.push("", "— transmission ends —");
  return L.join("\n");
}

export function renderWelcome({ game, player }) {
  return [
    BANNER, "",
    `${player.name} — your mark is on the ledger. ${player.clanName} rides under the ${player.colorLabel} banner.`, "",
    `Game code: ${game.code}`,
    `The season opens when the Overseer gives the word. You'll get a wire.`,
    "", `Watch the map: ${env("SITE_URL") || "https://wastelords.netlify.app"}`,
    "", "— transmission ends —"
  ].join("\n");
}
