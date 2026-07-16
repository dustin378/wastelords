// One-time map generator for WASTELORDS — emits lib/map.json (committed, fixed forever).
import { Delaunay } from "d3-delaunay";
import { writeFileSync } from "node:fs";

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260716);

const W = 1200, H = 800, N = 26, PAD = 70;

// jittered grid points -> organic but evenly spread
const cols = 6, rows = 5; // 30 slots, take 26
let pts = [];
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const x = PAD + (c + 0.5) * ((W - 2 * PAD) / cols) + (rand() - 0.5) * 120;
    const y = PAD + (r + 0.5) * ((H - 2 * PAD) / rows) + (rand() - 0.5) * 90;
    pts.push([Math.min(W - PAD, Math.max(PAD, x)), Math.min(H - PAD, Math.max(PAD, y))]);
  }
}
// drop 4 random slots to break the grid feel
while (pts.length > N) pts.splice(Math.floor(rand() * pts.length), 1);

// relax once (Lloyd) for nicer cells
for (let iter = 0; iter < 2; iter++) {
  const d = Delaunay.from(pts);
  const v = d.voronoi([0, 0, W, H]);
  pts = pts.map((p, i) => {
    const poly = v.cellPolygon(i);
    if (!poly) return p;
    let cx = 0, cy = 0;
    for (const [x, y] of poly) { cx += x; cy += y; }
    return [cx / poly.length, cy / poly.length];
  });
}

const delaunay = Delaunay.from(pts);
const voronoi = delaunay.voronoi([8, 8, W - 8, H - 8]);

const NAMES = [
  "The Rustyards", "Cistern Nine", "Highway Graveyard", "Ash Flats", "The Silo Belt",
  "Glasslands", "Chokepoint Pass", "The Drowned Mall", "Pylon Ridge", "Salt Quarter",
  "The Boneworks", "Reactor Shadow", "Old Terminal", "Scrapper's Rise", "The Dry Docks",
  "Vulture Mesa", "The Undercroft", "Fuel Line Seven", "Widow's Span", "The Cinder Rows",
  "Radio Hill", "The Sump", "Quarantine Zone", "Gallows Junction", "The Last Orchard",
  "Static Fields"
];

// resources: water (recruits), scrap (defense), fuel (reach)
const RESOURCE_SLOTS = [
  ["water", 2], ["water", 2], ["water", 1],
  ["scrap", 2], ["scrap", 1], ["scrap", 1],
  ["fuel", 2], ["fuel", 1]
];

const territories = [];
for (let i = 0; i < pts.length; i++) {
  const poly = voronoi.cellPolygon(i);
  const neighbors = [...voronoi.neighbors(i)];
  territories.push({
    id: `t${i}`,
    name: NAMES[i],
    cx: Math.round(pts[i][0]),
    cy: Math.round(pts[i][1]),
    poly: poly.map(([x, y]) => [Math.round(x), Math.round(y)]),
    neighbors: neighbors.map((n) => `t${n}`),
    resource: null,
    resourceValue: 0
  });
}

// scatter resources on non-edge-hugging cells, spread apart
const shuffled = [...territories].sort(() => rand() - 0.5);
let slot = 0;
const resourced = new Set();
for (const t of shuffled) {
  if (slot >= RESOURCE_SLOTS.length) break;
  if (t.neighbors.some((n) => resourced.has(n))) continue; // spread out
  const [kind, val] = RESOURCE_SLOTS[slot++];
  t.resource = kind;
  t.resourceValue = val;
  resourced.add(t.id);
}

// start positions: 8 territories, pairwise far apart, no resources
function dist(a, b) { return Math.hypot(a.cx - b.cx, a.cy - b.cy); }
const starts = [];
const candidates = territories.filter((t) => !t.resource);
for (const t of candidates.sort(() => rand() - 0.5)) {
  if (starts.length >= 8) break;
  if (starts.every((s) => dist(s, t) > 260)) starts.push(t);
}
// relax the spacing if we came up short
let need = 8 - starts.length, minD = 220;
while (need > 0 && minD > 120) {
  for (const t of candidates) {
    if (need <= 0) break;
    if (!starts.includes(t) && starts.every((s) => dist(s, t) > minD)) { starts.push(t); need--; }
  }
  minD -= 30;
}

const map = {
  width: W,
  height: H,
  territories,
  startIds: starts.map((s) => s.id)
};
writeFileSync(new URL("../lib/map.json", import.meta.url), JSON.stringify(map, null, 1));
console.log(`territories=${territories.length} starts=${map.startIds.length}`);
for (const t of territories) console.log(`${t.id} ${t.name} [${t.resource ?? "-"}${t.resourceValue || ""}] -> ${t.neighbors.join(",")}`);
