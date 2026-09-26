# Companions

Run `npm start`. The real app is at http://localhost:4173/. For a working demo of the same UI with isolated, in-memory progress, open http://localhost:4173/?preview=companions#today. The preview banner links to onboarding, a new egg, a growing companion, and post-exam care. Refresh resets the demo. It never reads or writes the real plan or its undo history.

## Rewards and onboarding

- Every complete study checklist unlocks **Finish the day**. Pressing it creates one reward for that date. Personal to-dos never count toward this gate. Off days and partial days create no rewards.
- Pip is the only companion at first. The first four rewards automatically warm Pip's egg; the fourth hatches Pip and reveals Companions. Later rewards bank for explicit spending. Study dates remain first pass through September 26, revision through October 14, exam October 15.
- Previously hatched Pip retains its growth. Previously credited days are consumed by migration, not duplicated as banked rewards. Credited days on an unhatched legacy save carry into the four-reward egg. Existing baseline work is retained.
- A completed but unclaimed study day can still be collected on a rest day. It credits its original date.
- Missed sessions still roll forward. Moving tasks away after starting does not bypass the committed checklist.

## Companion home

Choose Minty's triceratops egg after Pip hatches. Adoption is free. The current catalog has one of each species and supports one unhatched egg at a time. Select either companion whenever you like; the selection determines the Today artwork and the recipient of care. Each keeps its own progress.

One reward warms the selected egg or feeds the selected hatched companion. Four warmings hatch an egg. Every three feeds reaches another level, up to level five (12 feeds). A fully grown companion cannot consume further rewards. Banked rewards have no daily spending cap and never expire. Finish the day does not silently feed a companion after onboarding.

The artwork uses the existing pink-and-peach card. Tapping or keyboard-activating it bounces the character. Feeding and hatching trigger a short celebration. Reduced-motion preferences are respected.

## After the exam

From October 16, a day with no study commitment or unclaimed study reward can have one custom daily goal. Complete it and press Finish the day for one reward. Completion alone awards nothing. Undoing completion revokes its reward and any care funded by it. Personal to-dos remain independent. This is the provisional default pending the user's preference between a custom goal, timer, or check-in.

## Data and migration

`dist/companion.js` retains the study commitment ledger and its legacy calculations for migration compatibility. `dist/collection.js` adds collection, wallet, selection, explicit spending, and post-exam goals. `companion-view.js` renders the Today card and home; `app.js` connects the same persistence, backups, validation, cross-tab updates, and undo paths as study actions.

`state.collection` contains a schema version, selected companion, adopted species, historical legacy-day identifiers, spends, and daily goals. Each spend references its original earning date, recipient, and action (`warm` or `feed`). Balance and growth are derived rather than trusted counters.

Synchronization checks claims against actual completed task IDs and dates, including historical days. Invalid rewards lose their spends. If an earlier warming is undone, later feeding that no longer has a hatched recipient is refunded. Rechecking study work requires another explicit Finish the day claim. Selection, reload, and backup restoration cannot spend the same reward twice.

Legacy growth uses the original baseline and the frozen set of old claimed dates. New study days cannot automatically grow Pip after migration. The old ledger's `fed` flag serves compatibility only; new feeding uses the explicit care ledger.

Validation rejects unknown species, duplicate adoptions/spends, invalid selections/dates, malformed goals, and unknown schema versions. Collection data travels in the existing JSON backup. Service-worker cache v14 includes collection code, the introduction module/styles, and the atlas for offline use.

## Companion introduction

After Pip hatches, the main app shows the gold heart coin in a short glass dialog, then points to the newly unlocked Companions tab. The hatching reward remains spent on Pip; the message distinguishes it from banked rewards. Existing unlocked saves receive a one-time introduction showing their actual balance.

Continuing, closing, or pressing Escape records `collection.introSeen` in the existing save and backups. Undo preserves that preference, including undoing/reclaiming the hatch. Old backups without the flag remain compatible. The introduction does not award or spend currency. Available eggs appear as selectable grey artwork tiles, with adopted eggs remaining grey until hatched.

## Artwork

Pip's PNGs are Microsoft Fluent Emoji under MIT, with source links and license in `dist/art/`. Its cracks are code-drawn overlays. Minty's original ImageGen atlas has transparent background and a 5×2 grid: four egg frames, hatch, and five growth frames. CSS displays individual cells without additional image generation. The frame-map JSON and art brief remain available for future work.

## Verification

`npm test` includes the existing planner, personal to-do, and legacy companion tests plus collection tests for onboarding, banking, hatch costs, independent growth, undo/reclaim, migration, backup round-trips, post-exam care, level caps, and malformed data. The isolated app preview allows manual verification without changing saved progress.

This update remains local until publishing is approved.
