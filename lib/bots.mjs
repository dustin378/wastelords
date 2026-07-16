// Raider AI — order generation for bot clans. Deterministic per (game, bot, turn).
import { T, holdings, maxOrders, mulberry32, hashSeed } from "./engine.mjs";

export const BOT_CLANS = [
  { clanName: "The Locust Court", name: "Warden Six" },
  { clanName: "Rustplague Choir", name: "The Cantor" },
  { clanName: "The Hollow Men", name: "Mayor of Nothing" },
  { clanName: "Black Cistern Pact", name: "The Diviner" },
  { clanName: "The Grinning Salvage", name: "Toothy Pete" },
  { clanName: "Children of the Pylon", name: "The Electrician" },
  { clanName: "The Last Convoy", name: "Roadmother" }
];

export function generateBotOrders(game, pid, turn) {
  const rng = mulberry32(hashSeed(`${game.code}:bot:${pid}:${turn}`));
  const world = game.world.territories;
  const held = holdings(game, pid);
  if (!held.length) return [];
  const cap = maxOrders(game, pid);
  const orders = [];
  const usedSrc = new Set();

  const enemyAdj = (tid) =>
    T[tid].neighbors.some((n) => world[n].owner && world[n].owner !== pid);
  const frontier = held.filter((tid) =>
    T[tid].neighbors.some((n) => world[n].owner !== pid));

  // rally at the weakest frontier territory (or anywhere if boxed in)
  const rallyPool = (frontier.length ? frontier : held)
    .slice().sort((a, b) => world[a].units - world[b].units);
  orders.push({ type: "rally", src: rallyPool[0] });

  // score a march target from src
  function bestTarget(src) {
    let best = null, bestScore = -1;
    for (const n of T[src].neighbors) {
      const s = world[n];
      if (s.owner === pid) continue;
      const mine = world[src].units - 1;
      let score;
      if (!s.owner) {
        // neutral: value resources, easy garrisons
        score = 3 + (T[n].resource ? 2 * T[n].resourceValue : 0) - s.units * 0.4;
        if (mine <= s.units) score -= 4;
      } else {
        // enemy: only when clearly stronger
        score = mine > s.units * 1.5 ? 2 + (T[n].resource ? T[n].resourceValue : 0) - s.units * 0.25 : -5;
      }
      score += rng() * 1.5; // temperament
      if (score > bestScore) { bestScore = score; best = n; }
    }
    return bestScore > 0 ? best : null;
  }

  // marches from strongest territories
  const sources = held.filter((tid) => world[tid].units >= 4)
    .sort((a, b) => world[b].units - world[a].units);
  for (const src of sources) {
    if (orders.length >= cap) break;
    if (usedSrc.has(src)) continue;
    const dst = bestTarget(src);
    if (dst) {
      const units = Math.max(1, Math.floor((world[src].units - 1) * (0.6 + rng() * 0.3)));
      orders.push({ type: "march", src, dst, units });
      usedSrc.add(src);
    } else if (enemyAdj(src) && rng() < 0.5) {
      orders.push({ type: "hold", src });
      usedSrc.add(src);
    }
  }
  return orders.slice(0, cap);
}
