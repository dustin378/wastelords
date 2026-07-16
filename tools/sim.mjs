// Offline simulation: 4 clans, 12 turns of random-ish orders. Checks invariants.
import { MAP, T, seedWorld, assignStarts, validateOrders, resolveTurn, holdings, recruitCount, maxOrders, hashSeed, mulberry32, generateLeaks, nextChicago, chicagoParts } from "../lib/engine.mjs";

const game = {
  code: "TEST-SIM1",
  settings: { maxPlayers: 8, seasonTurns: 12, resolveDow: 1, resolveHour: 8 },
  turn: 0,
  players: ["Rustborn", "The Meek", "Glass Choir", "Ash Dogs"].map((clanName, i) => ({
    id: `p${i}`, clanName, name: `player${i}`, eliminated: false, capital: null
  })),
  world: seedWorld(hashSeed("TEST-SIM1"))
};
assignStarts(game, hashSeed("TEST-SIM1:starts"));

const rng = mulberry32(42);
function randomOrders(pid) {
  const held = holdings(game, pid);
  if (!held.length) return [];
  const orders = [];
  const cap = maxOrders(game, pid);
  // rally somewhere
  if (rng() < 0.7) orders.push({ type: "rally", src: held[Math.floor(rng() * held.length)] });
  // a march or two
  for (let i = 0; i < cap - 1 && orders.length < cap; i++) {
    const src = held[Math.floor(rng() * held.length)];
    const st = game.world.territories[src];
    if (st.units < 3) { if (rng() < 0.4) orders.push({ type: "hold", src }); continue; }
    const dst = T[src].neighbors[Math.floor(rng() * T[src].neighbors.length)];
    const kind = rng();
    if (kind < 0.65) orders.push({ type: "march", src, dst, units: Math.max(1, Math.floor(st.units * (0.4 + rng() * 0.5))) });
    else if (kind < 0.8) orders.push({ type: "hold", src });
    else if (game.world.territories[dst].owner !== pid) orders.push({ type: "recon", dst });
  }
  // dedupe src
  const seen = new Set(); const out = [];
  for (const o of orders) {
    if ((o.type === "march" || o.type === "hold") && seen.has(o.src)) continue;
    if (o.type === "march" || o.type === "hold") seen.add(o.src);
    out.push(o);
  }
  return out.slice(0, cap);
}

let winner = null;
for (let t = 1; t <= 12 && !winner; t++) {
  const ordersByPlayer = {};
  for (const p of game.players) {
    if (p.eliminated) continue;
    const raw = randomOrders(p.id);
    const v = validateOrders(game, p.id, raw);
    if (!v.ok) throw new Error(`validation failed for ${p.id} turn ${t}: ${v.error} :: ${JSON.stringify(raw)}`);
    ordersByPlayer[p.id] = v.orders;
  }
  const leaks = generateLeaks(game, ordersByPlayer, t);
  const report = resolveTurn(game, ordersByPlayer);

  // invariants
  for (const [tid, s] of Object.entries(game.world.territories)) {
    if (!Number.isInteger(s.units) || s.units < 0) throw new Error(`bad units at ${tid}: ${s.units}`);
    if (s.units === 0 && s.owner) throw new Error(`owned territory with 0 units: ${tid}`);
    if (s.owner && !game.players.some((p) => p.id === s.owner)) throw new Error(`unknown owner ${s.owner}`);
  }
  const counts = game.players.map((p) => `${p.clanName}:${holdings(game, p.id).length}`).join(" ");
  console.log(`T${t} [${report.event.key}] battles=${report.battles.length} ${counts}${report.eliminated.length ? " ELIM:" + report.eliminated : ""}`);
  if (report.winner) { winner = report.winner; console.log(`WINNER: ${game.players.find((p) => p.id === winner).clanName}`); }
  const sampleLeak = Object.values(leaks).flat()[0];
  if (t === 1 && sampleLeak) console.log(`  leak sample: ${sampleLeak}`);
}
if (!winner) console.log("season ended without domination — engine picks leader at turn 12 (checked in report.winner)");

// scheduling check
const nxt = nextChicago(1, 8);
const p = chicagoParts(nxt);
console.log(`next resolution: ${nxt.toISOString()} -> Chicago dow=${p.dow} hour=${p.hour} (want dow=1 hour=8)`);
if (p.dow !== 1 || p.hour !== 8) throw new Error("nextChicago broken");
console.log("ALL INVARIANTS PASS");
