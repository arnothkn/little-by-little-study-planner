# Pip, the study companion

Run `npm start`, then open http://localhost:4173/companion-preview.html to inspect every crack stage and try a sample feeding. The preview never reads or writes the real app's storage.

## Rules

- First pass target: September 26, 2026, inclusive. Revision target: October 14, before the October 15 exam.
- A complete checklist unlocks **Finish the day**. The button fills with pink as tasks are checked, stays disabled until every required session is complete, and only banks progress when pressed. Each completed day with first-pass work advances the shell by exactly one cumulative crack stage, regardless of light or heavy workload. There are nine crack stages: the original eight plus one final branching variation. If catch-up extends past these stages, the egg holds its final cracked appearance until all 23 videos and the current day are complete, then hatches.
- After hatching, **Finish the day** also feeds Pip in the same action. One recorded feeding per day banks completed revisions; growth is the share of 46 reviews banked. Completing a partial day or simply opening the app does not advance Pip.
- Missed work is handled by the existing scheduler. The companion waits until a later complete catch-up day. Off days cannot create rewards. An unclaimed completed day can be collected on a later rest day, so forgetting the final button press cannot strand the chick. Targets do not force an unearned hatch or growth.
- Before studying, calendar/rhythm changes update the day's commitment. After the first completion, the day's task IDs stay in the commitment, including tasks subsequently moved away. New work due today joins it. Moved outstanding tasks remain accessible in Calendar and All topics.
- Rewards are checked against actual completion dates. Undoing work removes the affected day's reward; undone reviews cannot keep feeding credit. Progress travels in the existing JSON backups and Undo snapshots.
- Work completed on earlier days before this feature was installed is retained as a baseline. Work on the current day still needs the daily gate. No historical feeding streak is fabricated.
- Original 21-topic saved plans are upgraded to the current 23-topic list without discarding completions or pins.

## Implementation and checks

`dist/companion.js` owns the daily ledger and reward calculation; `dist/companion-view.js` renders the card. The existing scheduler still owns all study dates. Progress is stored in the existing localStorage record under its optional `companion` field.

The three bundled 3D PNGs are from Microsoft Fluent Emoji under MIT; source links and the license are in `dist/art/`. Progressive cracks are an independent SVG overlay: a thin line with a warm offset shadow, matching the simple original treatment. No generated raster crack artwork is used. The artwork is a keyboard-accessible button with a gentle tap bounce (opacity feedback for reduced-motion users). The companion card contains only the artwork and the daily reward button. After claiming, the button reads “Day finished ✓” and is disabled. Undoing work or adding new work reopens the same day’s reward. The service worker precaches all companion modules and artwork for offline use.

`npm test` covers incomplete days, catch-up, date targets, late finishes, schedule changes, undo, feed gating, repeat feeding, upgrades, and backup validation, alongside the existing planner tests. Browser verification covers milestone previews, feeding, image loading, and a 390px phone layout.

No push or deployment is part of local preview approval.
