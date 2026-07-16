// The clock of the waste. Runs hourly: resolves any game past its deadline
// (Monday 8:00 AM America/Chicago) and sends any transmissions that have come due.
import type { Config } from "@netlify/functions";
import { getIndex, getGame, putGame, getOutbox, putOutbox, getAllOrders } from "../../lib/store.mjs";
import { runResolution, buildRumor, log, fmtDeadline } from "../../lib/run.mjs";
import { sendEmail, emailEnabled, renderRumor, renderReminder } from "../../lib/email.mjs";

export default async (req: Request) => {
  const codes = await getIndex();
  for (const code of codes) {
    try {
      await tickGame(code);
    } catch (e) {
      console.error(`tick failed for ${code}`, e);
    }
  }
};

async function tickGame(code: string) {
  let game: any = await getGame(code);
  if (!game) return;

  // 1. resolve if due
  if (game.status === "active" && game.deadline && new Date(game.deadline).getTime() <= Date.now()) {
    console.log(`resolving ${code} turn ${game.turn + 1}`);
    await runResolution(game); // saves game + outbox
    game = await getGame(code);
  }

  // 2. process due transmissions
  const outbox = await getOutbox(code);
  const due = outbox.filter((x: any) => !x.sent && new Date(x.sendAt).getTime() <= Date.now());
  if (!due.length) return;

  const deadlineTxt = game.deadline ? fmtDeadline(new Date(game.deadline)) : "—";
  const drafts = game.status === "active"
    ? await getAllOrders(code, game.turn + 1, game.players.map((p: any) => p.id))
    : {};
  let logDirty = false;

  for (const item of due) {
    const player = game.players.find((p: any) => p.id === item.pid);
    if (!player) { item.sent = "orphaned"; continue; }
    let subject = item.subject, text = item.text;

    if (item.template === "rumor") {
      if (game.status !== "active" || player.eliminated) { item.sent = "stale"; continue; }
      const rumor = buildRumor(game, drafts, player.id);
      subject = `WASTELORDS — rumor on the wind (turn ${game.turn + 1} brews)`;
      text = renderRumor({ game, player, rumor, deadline: deadlineTxt });
      log(game, "whisper", rumor.replace(/\n\n/g, " "), player.id);
      logDirty = true;
    } else if (item.template === "reminder") {
      if (game.status !== "active" || player.eliminated) { item.sent = "stale"; continue; }
      const submitted = Boolean(drafts[player.id]?.length);
      const laggards = game.players
        .filter((p: any) => !p.eliminated && !p.isBot && !(drafts[p.id]?.length))
        .map((p: any) => p.clanName);
      subject = submitted
        ? `WASTELORDS — orders filed. Others are silent.`
        : `WASTELORDS — YOUR ORDERS ARE NOT FILED`;
      text = renderReminder({ game, player, submitted, deadline: deadlineTxt, laggards });
    }

    if (player.email && emailEnabled()) {
      const r = await sendEmail({ to: player.email, subject, text });
      item.sent = r.ok ? "sent" : `failed:${r.error || r.status}`;
    } else {
      item.sent = "radio-only";
    }
    item.sentAt = new Date().toISOString();
  }

  // prune anything older than 30 days that's been handled
  const cutoff = Date.now() - 30 * 864e5;
  const kept = outbox.filter((x: any) => !x.sent || new Date(x.sendAt).getTime() > cutoff);
  await putOutbox(code, kept);
  if (logDirty) await putGame(game);
}

export const config: Config = { schedule: "@hourly" };
