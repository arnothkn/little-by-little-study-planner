# Little by little

A private, device-local Eye & ENT study planner for the October 15, 2026 exam.

## Open the app

[Open Little by little](https://little-by-little-arnothkn.gentle-lotus-1147.chatgpt.site)

The app is hosted on Sites and accessible to anyone with its link. This GitHub repository remains private. Progress is stored only on the device.

## Run locally

Clone or download this repository, open a terminal in its folder, and run:

```sh
npm start
```

Then open **http://localhost:4173**.

Node.js 20 or later is required. There are no dependencies to install. Alternatively, serve `dist/` with any static web server. Do not open `index.html` directly with a file URL; the JavaScript modules and offline worker need an HTTP server.

## The plan

- 23 lecture videos: 14 Eye and 9 ENT.
- First viewing: September 18–26, 2026. Start date can be moved up to September 26.
- Two revision sessions for every topic: September 27–October 14.
- Default rhythm: normal weekdays and heavy weekends.
- Light = 0.5×, normal = 1×, heavy = 2×; off days receive no automatic work. These are relative weights, not hard daily caps. Sessions are counted equally because video durations were not supplied.
- The planner balances session counts against those weights. First-pass lecture order is preserved within each subject for automatically assigned sessions.
- First recall is at least one day after viewing and never before September 27. Second recall is at least three days after first recall, with a soft preference for a seven-day interval. Workload balance and the deadline can lengthen or shorten that interval.
- Late work redistributes when the app opens, returns to the foreground, or detects a new local calendar day. The plan never marks missed work complete.
- If the first-pass deadline is missed, unfinished videos remain and move into catch-up days. If the remaining dates cannot accommodate ordered reviews, the app flags the conflict and keeps sessions under **Needs a place**. Completing every session still depends on the student doing the work.

On upgrading from the original plan, saved schedules rebalance once to include September 26. Completed sessions and valid manual pins remain. The default September 19 workload is now three videos.

## Everyday use

**Today:** tick completed sessions. Tap a completed circle to undo. Revisions require the previous session to be complete and the minimum spacing to have elapsed.

**Calendar:** tap a date to see sessions. Change its workload to override the weekly default. Tap ↗ on a session to move it or choose another session on the destination date to swap. On desktop, drag sessions from the selected day's list onto calendar dates. Manual moves are pinned, including if intentionally placed on an off day. Later reviews adjust as needed. Moving sessions cannot put first-pass work beyond September 26 while that deadline is still achievable.

**All topics:** see every topic's three sessions and open them directly.

**Settings:** change weekly workloads and rebalance. Use **Release moves & rebalance** to also release manual pins. **Undo last change** reverses the most recent change. Export or restore a JSON backup to move progress between browsers/devices.

## Install on an iPhone

This project has an iOS web app manifest, home-screen icons, safe-area-aware layout, and an offline service worker. Your progress is stored on the device; there is no account, analytics, database, or cloud sync.

1. Open the app link above. You can also self-host the contents of `dist/` on any static HTTPS server.
2. Open that address in Safari on the iPhone.
3. Tap **Share → Add to Home Screen** and enable **Open as Web App** if shown.
4. Open the installed app once while online. Confirm the footer shows **LOCAL · OFFLINE READY** before disconnecting.

`localhost` on an iPhone means the iPhone itself, not this Mac. A plain HTTP local-network address can preview the page but does not provide the secure context needed for the offline service worker. See [Apple's installation instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios) and [MDN's secure-context requirements](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).

Saved progress is specific to the browser/app and origin. Safari and an installed app may have separate storage. Export a backup before switching origins, clearing browser data, or changing devices, then restore it in the destination. Restoring a backup replaces the current plan; the previous plan remains available through **Undo last change** when browser storage works. Offline caching covers this app, not lecture videos; video URLs or files were not supplied.

## Validation

Run `npm test` for scheduler tests. Tests cover the complete 69-session plan, weighted days, missed-work carry-forward, chronological constraints, invalid moves, atomic swaps, backup validation, completion/undo rules, full daily simulations, and 80 workload combinations.

The browser checks covered a 390 × 844 mobile layout, checklist persistence across reload, moving/swapping sessions, rhythm changes, undo, and opening the app with the local server stopped. Physical iPhone installation has not been tested.

## Files

- `dist/`: complete app, ready for any static HTTPS server.
- `dist/planner.js`: deterministic calendar-day scheduling and validation.
- `dist/app.js`: local persistence, views, interactions, backups, and optional WebMCP tools.
- `dist/sw.js`: same-origin offline app caching.
- `server.mjs`: dependency-free local preview server on port 4173.
- `tests/planner.test.mjs`: scheduler tests.
