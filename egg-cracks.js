/**
 * Small, friendly crack progression for the study egg.
 *
 * The paths are deliberately drawn as a set of short additions rather than a
 * single fracture illustration. This keeps the mark legible at the egg's
 * display size and makes each study day feel like a gentle continuation.
 */

export const MAX_CRACK_STAGES = 9;

// Every entry is one cumulative addition. Coordinates stay comfortably inside
// the supplied egg silhouette (x 57..199, y 32..225).
const CRACK_ADDITIONS = [
  'M126 72 l-7 13 9 9',
  'M128 94 l-13 12 14 12',
  'M129 118 l-9 13 12 12',
  'M132 143 l-8 14 12 12',
  'M115 106 l-17-5 -9 9 -10-3',
  'M132 143 l16-12 12 4 11-14',
  'M136 169 l-12 14 8 12-9 17',
  'M119 85 l-12-7 -4-13 M124 157 l-15-1 -12 14 M160 135 l13 17 14-1',
  'M173 152 l6 10 -5 8',
];

/**
 * Return the visible crack SVG for a study stage.
 * Stage zero intentionally returns an empty string so the caller can leave the
 * unmarked egg untouched. Values above the supported progression settle at the
 * final stage for delayed catch-up days.
 */
export function eggCracks(stage) {
  const numericStage = Number.isFinite(Number(stage)) ? Math.floor(Number(stage)) : 0;
  const count = Math.max(0, Math.min(MAX_CRACK_STAGES, numericStage));
  if (count === 0) return '';

  const paths = CRACK_ADDITIONS.slice(0, count)
    .map((d) => `<path d="${d}"/>`)
    .join('');

  return `<svg class="egg-cracks" viewBox="0 0 256 256" aria-hidden="true" focusable="false">` +
    `<g fill="none" stroke="#f5d9b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(1 1)">${paths}</g>` +
    `<g fill="none" stroke="#68452f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</g>` +
    `</svg>`;
}
