// WASTELORDS core engine — pure functions, no I/O. Everything deterministic per (gameCode, turn).
import MAP from "./map.data.mjs";

export { MAP };

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const T = Object.fromEntries(MAP.territories.map((t) => [t.id, t]));

export const CLAN_COLORS = [
  { key: "oxide",   hex: "#a03c28", label: "Oxide Red" },
  { key: "tar",     hex: "#2b2b26", label: "Tar Black" },
  { key: "verdigris", hex: "#3d6b5e", label: "Verdigris" },
  { key: "dune",    hex: "#b8860b", label: "Dune Brass" },
  { key: "haze",    hex: "#5b6c8f", label: "Haze Blue" },
  { key: "sulfur",  hex: "#8a7a1e", label: "Sulfur" },
  { key: "plum",    hex: "#6e4257", label: "Bruise Plum" },
  { key: "bone",    hex: "#8d8371", label: "Bone Grey" }
];

// ---------- world setup ----------
export function seedWorld(rngSeed) {
  const rng = mulberry32(rngSeed);
  const territories = {};
  for (const t of MAP.territories) {
    territories[t.id] = {
      owner: null,
      units: 2 + Math.floor(rng() * 4) + (t.resource ? 2 : 0), // neutral garrisons 2-7
      fort: 0
    };
  }
  return { territories };
}

export function assignStarts(game, rngSeed) {
  const rng = mulberry32(rngSeed);
  const starts = [...MAP.startIds].sort(() => rng() - 0.5);
  game.players.forEach((p, i) => {
    const tid = starts[i];
    game.world.territories[tid] = { owner: p.id, units: 10, fort: 0 };
    p.capital = tid;
  });
}

// ---------- derived stats ----------
export function holdings(game, pid) {
  return Object.entries(game.world.territories).filter(([, s]) => s.owner === pid).map(([id]) => id);
}
export function resourceTotals(game, pid) {
  const tot = { water: 0, scrap: 0, fuel: 0 };
  for (const tid of holdings(game, pid)) {
    const t = T[tid];
    if (t.resource) tot[t.resource] += t.resourceValue;
  }
  return tot;
}
export function recruitCount(game, pid) {
  const held = holdings(game, pid);
  if (!held.length) return 0;
  const res = resourceTotals(game, pid);
  return 3 + Math.floor(held.length / 3) + res.water; // water = people follow water
}
export function maxOrders(game, pid) {
  const res = resourceTotals(game, pid);
  return Math.min(5, 3 + res.fuel); // fuel = convoys = more simultaneous operations
}
export function defenseMult(tid, state) {
  const t = T[tid];
  let m = 1;
  if (state.fort) m += 0.5;                              // HOLD order
  if (t.resource === "scrap") m += 0.15 * t.resourceValue; // scrap = fortifications
  return m;
}

// ---------- order validation (against current world) ----------
export function validateOrders(game, pid, orders) {
  if (!Array.isArray(orders)) return { ok: false, error: "orders must be a list" };
  const cap = maxOrders(game, pid);
  if (orders.length > cap) return { ok: false, error: `max ${cap} orders this week` };
  const held = new Set(holdings(game, pid));
  const seenSrc = new Set();
  let rallies = 0;
  const clean = [];
  for (const o of orders) {
    if (!o || typeof o !== "object") return { ok: false, error: "bad order" };
    const type = String(o.type || "");
    if (type === "march") {
      const src = String(o.src || ""), dst = String(o.dst || "");
      const units = Math.floor(Number(o.units));
      if (!held.has(src)) return { ok: false, error: `you don't hold ${T[src]?.name || src}` };
      if (!T[src].neighbors.includes(dst)) return { ok: false, error: `${T[dst]?.name || dst} is not adjacent to ${T[src].name}` };
      if (!Number.isFinite(units) || units < 1) return { ok: false, error: "march needs at least 1 warband" };
      if (units >= game.world.territories[src].units) return { ok: false, error: `must leave at least 1 warband behind in ${T[src].name}` };
      if (seenSrc.has(src)) return { ok: false, error: `only one order per source territory (${T[src].name})` };
      seenSrc.add(src);
      clean.push({ type, src, dst, units });
    } else if (type === "hold") {
      const src = String(o.src || "");
      if (!held.has(src)) return { ok: false, error: `you don't hold ${T[src]?.name || src}` };
      if (seenSrc.has(src)) return { ok: false, error: `only one order per source territory (${T[src].name})` };
      seenSrc.add(src);
      clean.push({ type, src });
    } else if (type === "rally") {
      const src = String(o.src || "");
      if (!held.has(src)) return { ok: false, error: `you don't hold ${T[src]?.name || src}` };
      if (++rallies > 1) return { ok: false, error: "only one rally point per week" };
      clean.push({ type, src });
    } else if (type === "recon") {
      const dst = String(o.dst || "");
      if (!T[dst]) return { ok: false, error: "unknown recon target" };
      if (held.has(dst)) return { ok: false, error: "recon targets enemy or neutral ground" };
      clean.push({ type, dst });
    } else {
      return { ok: false, error: `unknown order type: ${type}` };
    }
  }
  return { ok: true, orders: clean };
}

// ---------- wasteland events ----------
const EVENTS = [
  {
    key: "dust_storm", headline: "DUST STORM OVER THE WASTE",
    text: "A wall of red dust swallowed the region. Every marching column arrived thinned and coughing.",
    marchPenalty: 0.85
  },
  {
    key: "raider_swarm", headline: "RAIDER SWARM",
    text: "A rogue swarm out of the deep waste hit the largest unclaimed garrison and bled it white.",
    raiders: true
  },
  {
    key: "salvage_cache", headline: "SALVAGE CACHE UNEARTHED",
    text: "Diggers cracked open a pre-fall depot. Somebody's getting reinforcements.",
    cache: true
  },
  {
    key: "clear_skies", headline: "CLEAR SKIES",
    text: "A rare quiet week. The waste held its breath.",
  },
  {
    key: "cholera", headline: "BAD WATER",
    text: "Something got into the cisterns. Garrisons sitting on water territories lost fighters to the sickness.",
    badWater: true
  }
];

// ---------- resolution ----------
export function resolveTurn(game, ordersByPlayer) {
  const turn = game.turn + 1;
  const rng = mulberry32(hashSeed(`${game.code}:${turn}`));
  const world = game.world;
  const report = { turn, event: null, battles: [], moves: [], recon: [], recruits: {}, eliminated: [], winner: null, headlines: [] };

  const event = EVENTS[Math.floor(rng() * EVENTS.length)];
  report.event = { key: event.key, headline: event.headline, text: event.text };

  // 1. recruits + rally
  for (const p of game.players) {
    if (p.eliminated) continue;
    const n = recruitCount(game, p.id);
    report.recruits[p.id] = n;
    if (!n) continue;
    const held = holdings(game, p.id);
    const rally = (ordersByPlayer[p.id] || []).find((o) => o.type === "rally");
    const target = rally && world.territories[rally.src]?.owner === p.id ? rally.src
      : (held.includes(p.capital) ? p.capital : held[0]);
    world.territories[target].units += n;
    report.moves.push({ kind: "rally", pid: p.id, tid: target, units: n });
  }

  // 2. holds
  for (const p of game.players) {
    for (const o of (ordersByPlayer[p.id] || [])) {
      if (o.type === "hold" && world.territories[o.src]?.owner === p.id) {
        world.territories[o.src].fort = 1;
        report.moves.push({ kind: "hold", pid: p.id, tid: o.src });
      }
    }
  }

  // 3. marches — validate against live state, subtract departures
  const arrivals = {}; // dst -> [{pid, units}]
  const marchMult = event.marchPenalty || 1;
  for (const p of game.players) {
    for (const o of (ordersByPlayer[p.id] || [])) {
      if (o.type !== "march") continue;
      const src = world.territories[o.src];
      if (!src || src.owner !== p.id) continue;
      const units = Math.min(o.units, Math.max(0, src.units - 1));
      if (units < 1) continue;
      src.units -= units;
      const arriving = Math.max(1, Math.round(units * marchMult));
      (arrivals[o.dst] ||= []).push({ pid: p.id, units: arriving, from: o.src });
    }
  }

  // 4. battles per destination
  for (const [dst, forces] of Object.entries(arrivals)) {
    const state = world.territories[dst];
    // friendly transfers merge into garrison first
    for (const f of forces.filter((f) => f.pid === state.owner)) {
      state.units += f.units;
      report.moves.push({ kind: "transfer", pid: f.pid, tid: dst, units: f.units, from: f.from });
    }
    let hostiles = forces.filter((f) => f.pid !== state.owner);
    // merge same-player columns
    const merged = {};
    for (const f of hostiles) {
      merged[f.pid] = merged[f.pid] || { pid: f.pid, units: 0, from: f.from };
      merged[f.pid].units += f.units;
    }
    hostiles = Object.values(merged).sort((a, b) => b.units - a.units || (a.pid < b.pid ? -1 : 1));
    for (const atk of hostiles) {
      const defOwner = state.owner;
      const defMult = defenseMult(dst, state);
      const atkStr = atk.units * (0.9 + rng() * 0.2);
      const defStr = state.units * defMult * (0.9 + rng() * 0.2);
      const battle = { tid: dst, attacker: atk.pid, defender: defOwner, atkUnits: atk.units, defUnits: state.units };
      if (atkStr > defStr) {
        const survivors = Math.max(1, Math.round(atk.units - (defStr / (atkStr / atk.units)) * 0.7));
        state.owner = atk.pid;
        state.units = survivors;
        state.fort = 0;
        battle.result = "captured";
        battle.survivors = survivors;
      } else {
        const defLoss = Math.min(state.units - 1, Math.round((atkStr / (defStr / Math.max(1, state.units))) * 0.5));
        state.units = Math.max(1, state.units - defLoss);
        battle.result = "repelled";
        battle.defLoss = defLoss;
      }
      report.battles.push(battle);
    }
  }

  // 5. event side-effects
  if (event.raiders) {
    const neutrals = Object.entries(world.territories).filter(([, s]) => !s.owner).sort((a, b) => b[1].units - a[1].units);
    if (neutrals.length) {
      const [tid, s] = neutrals[0];
      s.units = Math.max(1, Math.ceil(s.units / 2));
      report.headlines.push(`Raiders gutted the garrison at ${T[tid].name}.`);
    }
  }
  if (event.cache) {
    const alive = game.players.filter((p) => !p.eliminated && holdings(game, p.id).length);
    if (alive.length) {
      const lucky = alive[Math.floor(rng() * alive.length)];
      const held = holdings(game, lucky.id).sort((a, b) => world.territories[a].units - world.territories[b].units);
      world.territories[held[0]].units += 3;
      report.headlines.push(`${lucky.clanName} dug a salvage cache out of ${T[held[0]].name}. +3 warbands.`);
    }
  }
  if (event.badWater) {
    for (const [tid, s] of Object.entries(world.territories)) {
      if (T[tid].resource === "water" && s.owner && s.units > 2) {
        s.units -= 1;
        report.headlines.push(`Sickness thinned the garrison at ${T[tid].name}.`);
      }
    }
  }

  // 6. recon (after battles — fresh intel on the new state)
  for (const p of game.players) {
    for (const o of (ordersByPlayer[p.id] || [])) {
      if (o.type !== "recon") continue;
      const s = world.territories[o.dst];
      const ownerP = game.players.find((x) => x.id === s.owner);
      const theirOrders = s.owner ? (ordersByPlayer[s.owner] || []) : [];
      const leak = theirOrders.length ? theirOrders[Math.floor(rng() * theirOrders.length)] : null;
      report.recon.push({
        pid: p.id, tid: o.dst, owner: s.owner, ownerName: ownerP?.clanName || "no clan", units: s.units,
        interceptedOrder: leak ? describeOrder(leak, ownerP?.clanName) : null
      });
    }
  }

  // 7. clear forts (one-week effect)
  for (const s of Object.values(world.territories)) s.fort = 0;

  // 8. eliminations + win check
  for (const p of game.players) {
    if (!p.eliminated && holdings(game, p.id).length === 0) {
      p.eliminated = true;
      report.eliminated.push(p.id);
      report.headlines.push(`${p.clanName} has been driven from the waste. Their banners burn.`);
    }
  }
  const total = MAP.territories.length;
  const alive = game.players.filter((p) => !p.eliminated);
  for (const p of alive) {
    if (holdings(game, p.id).length >= Math.ceil(total * 0.6)) report.winner = p.id;
  }
  if (!report.winner && turn >= game.settings.seasonTurns) {
    const ranked = [...alive].sort((a, b) =>
      holdings(game, b.id).length - holdings(game, a.id).length ||
      totalUnits(game, b.id) - totalUnits(game, a.id));
    if (ranked.length) report.winner = ranked[0].id;
  }
  if (!report.winner && alive.length === 1 && game.players.length > 1) report.winner = alive[0].id;

  game.turn = turn;
  return report;
}

export function totalUnits(game, pid) {
  return holdings(game, pid).reduce((n, tid) => n + game.world.territories[tid].units, 0);
}

export function describeOrder(o, clanName = "They") {
  switch (o.type) {
    case "march": return `${clanName} marching ${o.units} warbands from ${T[o.src].name} against ${T[o.dst].name}`;
    case "hold": return `${clanName} digging in at ${T[o.src].name}`;
    case "rally": return `${clanName} massing fresh recruits at ${T[o.src].name}`;
    case "recon": return `${clanName} running scouts through ${T[o.dst].name}`;
    default: return `${clanName} up to something`;
  }
}

// ---------- intel leaks (the email hints) ----------
// Each player hears one leak per rival whose territory borders theirs. 70% true, 30% garbled.
export function generateLeaks(game, ordersByPlayer, turn) {
  const rng = mulberry32(hashSeed(`${game.code}:leaks:${turn}`));
  const leaks = {}; // pid -> [text]
  for (const p of game.players) {
    if (p.eliminated) continue;
    leaks[p.id] = [];
    const mine = new Set(holdings(game, p.id));
    const borderRivals = new Set();
    for (const tid of mine) {
      for (const n of T[tid].neighbors) {
        const owner = game.world.territories[n].owner;
        if (owner && owner !== p.id) borderRivals.add(owner);
      }
    }
    for (const rid of borderRivals) {
      const rival = game.players.find((x) => x.id === rid);
      const theirs = ordersByPlayer[rid] || [];
      if (!theirs.length) {
        leaks[p.id].push(`${rival.clanName} went quiet this week. No columns on the roads. That's never good.`);
        continue;
      }
      const o = theirs[Math.floor(rng() * theirs.length)];
      if (rng() < 0.7) {
        leaks[p.id].push(`Word from a scav crew: ${describeOrder(o, rival.clanName)}.`);
      } else {
        // garbled: wrong target
        const fake = { ...o };
        if (o.type === "march") fake.dst = T[o.src].neighbors[Math.floor(rng() * T[o.src].neighbors.length)];
        leaks[p.id].push(`Half-heard on a dying radio: ${describeOrder(fake, rival.clanName)}. Could be noise.`);
      }
    }
  }
  return leaks;
}

// ---------- scheduling (America/Chicago, DST-safe) ----------
export function chicagoParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", weekday: "short", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return { dow: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(parts.weekday), hour: +parts.hour % 24, minute: +parts.minute, y: +parts.year, m: +parts.month, d: +parts.day };
}

// next occurrence of (dow, hour) in America/Chicago, as a real Date
export function nextChicago(dow, hour, from = new Date()) {
  const d = new Date(from.getTime());
  for (let i = 0; i < 8 * 24 * 4; i++) { // scan 15-min steps up to 8 days
    d.setTime(d.getTime() + 15 * 60 * 1000);
    const p = chicagoParts(d);
    if (p.dow === dow && p.hour === hour && p.minute < 15) {
      d.setTime(d.getTime() - p.minute * 60 * 1000); // snap to top of hour
      d.setSeconds(0, 0);
      return d;
    }
  }
  return new Date(from.getTime() + 7 * 864e5);
}
