import type { Config } from "@netlify/functions";
import { MAP, T, seedWorld, assignStarts, validateOrders, holdings, totalUnits, resourceTotals, recruitCount, maxOrders, nextChicago, hashSeed } from "../../lib/engine.mjs";
import { getGame, putGame, addToIndex, putOrders, getOrders, getAllOrders } from "../../lib/store.mjs";
import { runResolution, standingsOf, log, fmtDeadline } from "../../lib/run.mjs";
import { sendEmail, emailEnabled, renderWelcome } from "../../lib/email.mjs";
import { CLAN_COLORS } from "../../lib/engine.mjs";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const err = (message: string, status = 400) => json({ error: message }, status);

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const WORDS = ["RUST", "ASH", "BONE", "DUST", "SCRAP", "SALT", "GRIT", "SLAG"];
function makeCode() {
  const w = WORDS[Math.floor(Math.random() * WORDS.length)];
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let s = "";
  const rnd = crypto.getRandomValues(new Uint8Array(4));
  for (const b of rnd) s += chars[b % chars.length];
  return `${w}-${s}`;
}

function findPlayer(game: any, token: string) {
  return game.players.find((p: any) => p.token === token) || null;
}
function clean(s: unknown, max = 40) {
  return String(s ?? "").trim().slice(0, max);
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  try {
    if (req.method === "GET" && route === "state") return await getState(url);
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      switch (route) {
        case "create": return await create(body);
        case "join": return await join(body);
        case "login": return await login(body);
        case "orders": return await submitOrders(body);
        case "start": return await start(body);
        case "resolve": return await forceResolve(body);
      }
    }
    return err("not found", 404);
  } catch (e) {
    console.error("api error", route, e);
    return err("internal error", 500);
  }
};

async function create(b: any) {
  const gameName = clean(b.gameName, 60) || "The Ashline War";
  const playerName = clean(b.playerName);
  const clanName = clean(b.clanName, 30);
  const email = clean(b.email, 120).toLowerCase();
  const pin = clean(b.pin, 12);
  const pace = b.pace === "blitz" ? "blitz" : "weekly";
  if (!playerName || !clanName || pin.length < 4) return err("need name, clan name, and a PIN of 4+ characters");
  let code = makeCode();
  for (let i = 0; i < 5 && (await getGame(code)); i++) code = makeCode();
  const game: any = {
    code, name: gameName, createdAt: new Date().toISOString(), status: "recruiting",
    settings: { maxPlayers: 8, seasonTurns: 12, resolveDow: 1, resolveHour: 8, pace },
    turn: 0, deadline: null, players: [], log: [],
    world: seedWorld(hashSeed(code))
  };
  const player = await makePlayer(game, { playerName, clanName, email, pin }, true);
  log(game, "system", `${clanName} lit the first signal fire. The ledger is open — game code ${code}.`);
  await putGame(game);
  await addToIndex(code);
  if (player.email) sendWelcome(game, player);
  return json({ code, token: player.token, pid: player.id });
}

async function makePlayer(game: any, { playerName, clanName, email, pin }: any, isMaster = false) {
  const color = CLAN_COLORS[game.players.length];
  const player = {
    id: crypto.randomUUID(), token: crypto.randomUUID(),
    name: playerName, clanName, email: email || null,
    pinHash: await sha256(`${game.code}:${pin}`),
    color: color.key, colorHex: color.hex, colorLabel: color.label,
    isMaster, eliminated: false, capital: null, joinedAt: new Date().toISOString()
  };
  game.players.push(player);
  return player;
}

async function sendWelcome(game: any, player: any) {
  try { await sendEmail({ to: player.email, subject: `WASTELORDS — you're on the ledger (${game.code})`, text: renderWelcome({ game, player }) }); } catch {}
}

async function join(b: any) {
  const code = clean(b.code, 12).toUpperCase();
  const game: any = await getGame(code);
  if (!game) return err("no game under that code");
  if (game.status !== "recruiting") return err("that season has already started");
  if (game.players.length >= game.settings.maxPlayers) return err("the ledger is full (8 clans)");
  const playerName = clean(b.playerName), clanName = clean(b.clanName, 30);
  const email = clean(b.email, 120).toLowerCase(), pin = clean(b.pin, 12);
  if (!playerName || !clanName || pin.length < 4) return err("need name, clan name, and a PIN of 4+ characters");
  if (game.players.some((p: any) => p.clanName.toLowerCase() === clanName.toLowerCase())) return err("a clan already rides under that name");
  if (game.players.some((p: any) => p.name.toLowerCase() === playerName.toLowerCase())) return err("that name is already on the ledger");
  const player = await makePlayer(game, { playerName, clanName, email, pin });
  log(game, "system", `${clanName} joined the ledger. ${game.players.length} clans and counting.`);
  await putGame(game);
  if (player.email) sendWelcome(game, player);
  return json({ code, token: player.token, pid: player.id });
}

async function login(b: any) {
  const code = clean(b.code, 12).toUpperCase();
  const game: any = await getGame(code);
  if (!game) return err("no game under that code");
  const name = clean(b.playerName).toLowerCase();
  const player = game.players.find((p: any) => p.name.toLowerCase() === name);
  if (!player) return err("no such name on the ledger");
  if (player.pinHash !== (await sha256(`${code}:${clean(b.pin, 12)}`))) return err("wrong PIN");
  return json({ code, token: player.token, pid: player.id });
}

async function start(b: any) {
  const game: any = await getGame(clean(b.code, 12).toUpperCase());
  if (!game) return err("no game under that code");
  const me = findPlayer(game, clean(b.token, 40));
  if (!me?.isMaster) return err("only the Overseer can open the season", 403);
  if (game.status !== "recruiting") return err("season already underway");
  const blitz = game.settings.pace === "blitz";
  if (game.players.length < (blitz ? 1 : 2)) return err("need at least 2 clans");
  assignStarts(game, hashSeed(`${game.code}:starts`));
  game.status = "active";
  game.deadline = blitz ? null : nextChicago(game.settings.resolveDow, game.settings.resolveHour).toISOString();
  log(game, "system", blitz
    ? `THE SEASON OPENS AT BLITZ PACE. ${game.players.length} clan${game.players.length > 1 ? "s" : ""} staked. Each turn resolves the moment every clan has filed orders.`
    : `THE SEASON OPENS. ${game.players.length} clans stake their strongholds. First resolution: ${fmtDeadline(new Date(game.deadline))}.`);
  await putGame(game);
  // opening wire to everyone
  const lockLine = blitz
    ? "Blitz pace: each turn resolves as soon as every clan has filed."
    : `First orders lock ${fmtDeadline(new Date(game.deadline))}.`;
  for (const p of game.players) {
    if (!p.email) continue;
    sendEmail({
      to: p.email, subject: `WASTELORDS — the season opens (${game.code})`,
      text: `The Overseer has opened the season.\n\nYour stronghold: ${T[p.capital].name}, garrison 10 warbands.\n\n${lockLine}\nFile orders: ${(globalThis as any).Netlify?.env.get("SITE_URL") || "https://wastelords.netlify.app"}\n\n— transmission ends —`
    }).catch(() => {});
  }
  return json({ ok: true, deadline: game.deadline });
}

async function submitOrders(b: any) {
  const game: any = await getGame(clean(b.code, 12).toUpperCase());
  if (!game) return err("no game under that code");
  const me = findPlayer(game, clean(b.token, 40));
  if (!me) return err("bad token", 403);
  if (game.status !== "active") return err("the season isn't live");
  if (me.eliminated) return err("your clan has fallen — you can only watch");
  if (game.deadline && new Date(game.deadline).getTime() <= Date.now()) return err("orders are locked — resolution imminent");
  const v = validateOrders(game, me.id, b.orders);
  if (!v.ok) return err(v.error!);
  await putOrders(game.code, game.turn + 1, me.id, { orders: v.orders, submittedAt: new Date().toISOString() });

  // blitz pace: the turn resolves the moment every living clan has filed
  if (game.settings.pace === "blitz") {
    const alive = game.players.filter((p: any) => !p.eliminated);
    const all = await getAllOrders(game.code, game.turn + 1, alive.map((p: any) => p.id));
    if (alive.every((p: any) => all[p.id]?.length)) {
      const report = await runResolution(game);
      return json({ ok: true, filed: v.orders.length, resolved: true, turn: report.turn });
    }
  }
  return json({ ok: true, filed: v.orders.length });
}

async function forceResolve(b: any) {
  const game: any = await getGame(clean(b.code, 12).toUpperCase());
  if (!game) return err("no game under that code");
  const me = findPlayer(game, clean(b.token, 40));
  if (!me?.isMaster) return err("only the Overseer can force a resolution", 403);
  if (game.status !== "active") return err("the season isn't live");
  const report = await runResolution(game);
  return json({ ok: true, turn: report.turn, event: report.event.headline, battles: report.battles.length });
}

async function getState(url: URL) {
  const code = clean(url.searchParams.get("code"), 12).toUpperCase();
  const token = clean(url.searchParams.get("token"), 40);
  const game: any = await getGame(code);
  if (!game) return err("no game under that code");
  const me = findPlayer(game, token);
  if (!me) return err("bad token", 403);

  const upcoming = game.turn + 1;
  const myAdj = new Set<string>();
  for (const tid of holdings(game, me.id)) for (const n of T[tid].neighbors) myAdj.add(n);

  const submittedBy: Record<string, boolean> = {};
  if (game.status === "active") {
    const all = await getAllOrders(game.code, upcoming, game.players.map((p: any) => p.id));
    for (const p of game.players) submittedBy[p.id] = Boolean(all[p.id]?.length);
  }

  const territories: Record<string, any> = {};
  for (const [tid, s] of Object.entries<any>(game.world.territories)) {
    const mine = s.owner === me.id;
    const visible = mine || myAdj.has(tid) || game.status === "finished";
    territories[tid] = {
      owner: s.owner,
      units: mine || game.status === "finished" ? s.units : visible ? band(s.units) : "?",
      exact: mine || game.status === "finished"
    };
  }

  const myOrdersRec = game.status === "active" ? await getOrders(game.code, upcoming, me.id) : null;
  const res = resourceTotals(game, me.id);

  return json({
    code: game.code, name: game.name, status: game.status, turn: game.turn,
    pace: game.settings.pace || "weekly",
    seasonTurns: game.settings.seasonTurns, deadline: game.deadline,
    deadlineText: game.deadline ? fmtDeadline(new Date(game.deadline)) : null,
    emailEnabled: emailEnabled(),
    you: {
      pid: me.id, name: me.name, clanName: me.clanName, color: me.color, colorHex: me.colorHex,
      isMaster: me.isMaster, eliminated: me.eliminated, capital: me.capital,
      recruitsNext: recruitCount(game, me.id), maxOrders: maxOrders(game, me.id), resources: res
    },
    players: standingsOf(game).map((s) => ({
      ...s, colorHex: game.players.find((p: any) => p.id === s.pid)?.colorHex,
      isMaster: game.players.find((p: any) => p.id === s.pid)?.isMaster || false,
      submitted: submittedBy[s.pid] || false
    })),
    territories,
    myOrders: myOrdersRec?.orders || [],
    log: game.log.filter((e: any) => !e.pid || e.pid === me.id).slice(-150).reverse()
  });
}

function band(u: number) {
  if (u <= 3) return "light";
  if (u <= 7) return "manned";
  if (u <= 12) return "heavy";
  return "fortress";
}

export const config: Config = { path: "/api/*" };
