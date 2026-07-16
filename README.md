# WASTELORDS

A slow-burn multiplayer territory war for 2–8 players. One turn a week.

- Players file secret orders any time during the week (march / hold / rally / recon).
- Every **Monday 8:00 AM America/Chicago** the turn resolves simultaneously.
- Dispatches, rumors, and half-true intel leaks go out **by email** between turns
  (and always to the in-game radio log).
- Win by holding 60% of the map, or the most territory when turn 12 ends.

## Stack

- Static front end (`public/`) — vanilla JS, SVG map.
- Netlify Functions (`netlify/functions/`):
  - `api.mts` — game API (create/join/login/state/orders/start/resolve).
  - `tick.mts` — hourly scheduled function: resolves due turns, sends due emails.
- Netlify Blobs — game state (`game:CODE`), per-player order keys, email outbox.
- Resend — outbound email. No key set → the game still runs, hints stay in the radio log.

## Environment variables

| Var | Purpose |
|---|---|
| `RESEND_API_KEY` | enables real email sending |
| `EMAIL_FROM` | e.g. `WASTELORDS <war@yourdomain.com>` (defaults to Resend's onboarding sender) |
| `SITE_URL` | absolute URL used in emails (e.g. `https://wastelords.netlify.app`) |

## Dev notes

- `node tools/sim.mjs` — 12-turn engine simulation with invariant checks.
- `node tools/gen-map.mjs` — regenerates `lib/map.json` + copy to `public/map.json`
  (fixed seed; don't regenerate mid-season).
- Deploys run from this repo via Netlify CI. The scheduled function only runs on
  published production deploys.
