// Orchestration shared by the hourly tick and the master's force-resolve:
// resolve a turn, write the radio log, queue the week's transmissions.
import { T, resolveTurn, generateLeaks, holdings, totalUnits, nextChicago, describeOrder, mulberry32, hashSeed } from "./engine.mjs";
import { getAllOrders, putGame, getOutbox, putOutbox } from "./store.mjs";
import { renderDispatch, describeBattle, emailEnabled, sendEmail } from "./email.mjs";

export function standingsOf(game) {
  return game.players
    .map((p) => ({ pid: p.id, clanName: p.clanName, color: p.color, territories: holdings(game, p.id).length, units: totalUnits(game, p.id), eliminated: !!p.eliminated }))
    .sort((a, b) => b.territories - a.territories || b.units - a.units)
    .map((s, i) => ({ rank: i + 1, ...s }));
}

export function log(game, kind, text, pid = null, turn = null) {
  game.log.push({ ts: new Date().toISOString(), turn: turn ?? game.turn, kind, text, pid });
  if (game.log.length > 600) game.log = game.log.slice(-600);
}

export function fmtDeadline(d) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(d);
}

export async function runResolution(game) {
  const upcoming = game.turn + 1;
  const orders = await getAllOrders(game.code, upcoming, game.players.map((p) => p.id));
  const leaks = generateLeaks(game, orders, upcoming);
  const report = resolveTurn(game, orders); // mutates game, sets game.turn = upcoming
  for (const b of report.battles) b.tname = T[b.tid].name;

  // radio log — public
  log(game, "event", `${report.event.headline} — ${report.event.text}`);
  for (const b of report.battles) log(game, "battle", describeBattle(b, game, "public"));
  for (const h of report.headlines) log(game, "news", h);
  for (const pid of report.eliminated) { /* headline already covers it */ }

  // radio log — private whispers + recon
  for (const p of game.players) {
    for (const x of leaks[p.id] || []) log(game, "whisper", x, p.id);
    for (const r of report.recon.filter((r) => r.pid === p.id)) {
      let line = `Scout report — ${T[r.tid].name}: held by ${r.ownerName}, garrison ${r.units} strong.`;
      if (r.interceptedOrder) line += ` Intercepted: ${r.interceptedOrder}.`;
      log(game, "recon", line, p.id);
    }
  }

  const winner = report.winner ? game.players.find((p) => p.id === report.winner) : null;
  if (winner) {
    game.status = "finished";
    game.deadline = null;
    log(game, "victory", `${winner.clanName.toUpperCase()} HAS TAKEN THE WASTE. Season over after turn ${report.turn}.`);
  } else if (game.settings.pace === "blitz") {
    game.deadline = null; // next turn resolves when everyone has filed
  } else {
    const next = nextChicago(game.settings.resolveDow, game.settings.resolveHour);
    game.deadline = next.toISOString();
  }

  // queue transmissions
  const standings = standingsOf(game);
  const blitz = game.settings.pace === "blitz";
  const deadlineTxt = game.deadline ? fmtDeadline(new Date(game.deadline)) : blitz ? "as soon as every clan files" : "—";
  const outbox = await getOutbox(game.code);
  for (const p of game.players) {
    if (!p.email) continue;
    const reconRows = report.recon.filter((r) => r.pid === p.id).map((r) => ({ ...r, tname: T[r.tid].name }));
    const text = renderDispatch({ game, player: p, report, leaks: leaks[p.id] || [], reconRows, standings, deadline: deadlineTxt });
    outbox.push({ id: crypto.randomUUID(), template: "dispatch", pid: p.id, to: p.email, sendAt: new Date().toISOString(), sent: false, subject: `WASTELORDS — Turn ${report.turn} dispatch: ${report.event.headline}`, text });
    if (!winner && !p.eliminated && !blitz) {
      outbox.push({ id: crypto.randomUUID(), template: "rumor", pid: p.id, to: p.email, sendAt: nextChicago(3, 12).toISOString(), sent: false });
      outbox.push({ id: crypto.randomUUID(), template: "reminder", pid: p.id, to: p.email, sendAt: nextChicago(5, 17).toISOString(), sent: false });
    }
  }
  await putOutbox(game.code, outbox);
  await putGame(game);
  return report;
}

// A midweek rumor: one leak from rivals' DRAFT orders (they can still change them) + one hard map fact.
export function buildRumor(game, draftsByPlayer, pid) {
  const rng = mulberry32(hashSeed(`${game.code}:rumor:${game.turn + 1}:${pid}`));
  const me = game.players.find((p) => p.id === pid);
  const rivals = game.players.filter((p) => p.id !== pid && !p.eliminated);
  const lines = [];
  const filed = rivals.filter((r) => (draftsByPlayer[r.id] || []).length);
  if (filed.length && rng() < 0.85) {
    const r = filed[Math.floor(rng() * filed.length)];
    const theirs = draftsByPlayer[r.id];
    const o = theirs[Math.floor(rng() * theirs.length)];
    if (rng() < 0.65) lines.push(`A courier sold us paper: ${describeOrder(o, r.clanName)}. Orders can change — but that's what's written today.`);
    else lines.push(`A courier sold us paper on ${r.clanName}, but half of it burned. Something moves in their camp.`);
  } else {
    lines.push(`The wire is quiet. Too quiet. Nobody's showing their hand yet.`);
  }
  // hard fact: biggest garrison on the map
  let big = null;
  for (const [tid, s] of Object.entries(game.world.territories)) {
    if (s.owner && s.owner !== pid && (!big || s.units > big.units)) big = { tid, ...s };
  }
  if (big) {
    const owner = game.players.find((p) => p.id === big.owner);
    lines.push(`Confirmed by two scav crews: the heaviest garrison in the waste sits at ${T[big.tid].name} — ${owner.clanName}, ${big.units} warbands strong.`);
  }
  return lines.join("\n\n");
}
