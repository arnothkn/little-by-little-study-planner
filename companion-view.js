import { companionStatus } from './companion.js';
import { collectionStatus, dailyRewardStatus, SPECIES } from './collection.js';
export const careCoin =
  '<span class="care-coin" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M20 7C8-2-2 15 20 31 42 15 32-2 20 7Z"/></svg></span>';
export function companionCard(state, today) {
  const s = state.collection ? dailyRewardStatus(state, today) : companionStatus(state, today);
  const home = state.collection ? collectionStatus(state, today) : null;
  const unit = s.careMode ? 'daily goal' : 'sessions';
  const status = s.finished
    ? 'Day finished. Reward claimed.'
    : s.canFinish
      ? 'All tasks complete. Finish the day to claim your reward.'
      : `${s.completed} of ${s.required.length} ${unit} completed.`;
  const buttonLabel = s.finished
    ? 'Day finished ✓'
    : s.savedDay
      ? 'Claim saved reward'
      : 'Finish the day';
  const progressLabel = s.required.length
    ? `${s.completed} of ${s.required.length} ${unit} complete`
    : s.careMode
      ? 'Set and complete a daily goal'
      : 'No sessions due today';
  return `<section class="companion-card" aria-label="Your study companion">${petArt(home ? home.selected : legacyPip(s))}<span class="sr-only" role="status">${status}</span><button class="finish-day-button ${s.finished ? 'is-finished' : ''}" data-reward-day="${today}" data-finish-day ${s.canFinish ? '' : 'disabled'} style="--day-progress:${s.dayProgress * 100}%" aria-label="${buttonLabel}. ${progressLabel}"><span class="finish-day-edge" aria-hidden="true"></span><span class="finish-day-track" aria-hidden="true"><span class="finish-day-fill"></span><span class="finish-day-shine"></span></span><svg class="finish-day-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 14.7 9.3 21.5 12 14.7 14.7 12 21.5 9.3 14.7 2.5 12 9.3 9.3Z"/><path d="M19 2v4M17 4h4"/></svg><span class="finish-day-label">${buttonLabel}</span></button>${home ? (home.unlocked ? `<div class="care-actions"><button class="text-button" data-page="companions">${home.bank} care reward${home.bank === 1 ? '' : 's'} · Companions →</button>${careButton(home)}</div>` : `<p class="companion-caption">${home.selected.warmth} of 4 cosy days · Pip’s egg</p>`) : ''}</section>`;
}

// Pre-collection saves map onto Pip the same way replay() in collection.js does.
function legacyPip({ hatched, crack, growth }) {
  const xp = growth * 12;
  return {
    id: 'pip',
    ...SPECIES.pip,
    hatched,
    warmth: hatched ? 4 : Math.min(4, crack),
    xp,
    level: Math.min(5, 1 + Math.floor((xp + 1e-8) / 3)),
  };
}
// Picks this companion's cell from its sheet in SPECIES.
export function atlasFrame(p) {
  const x = p.hatched ? (p.xp === 0 ? 4 : p.level - 1) : p.warmth,
    y = p.hatched && p.xp > 0 ? 1 : 0;
  return `<span class="atlas-frame" data-species="${p.id}" style="background-image:url('./art/${SPECIES[p.id].sheet}');--sprite-x:${x * 25}%;--sprite-y:${y * 100}%" aria-hidden="true"></span>`;
}
export function petArt(p) {
  return `<button class="companion-art atlas-art${p.hatched ? '' : ' is-egg'}" data-bounce aria-label="${p.name}${p.hatched ? '' : '’s egg'}. Tap to bounce."><span class="companion-halo" aria-hidden="true"></span><span class="companion-bouncer">${atlasFrame(p)}</span></button>`;
}
function careButton(home) {
  const p = home.selected;
  return p.hatched && p.level === 5
    ? '<span class="companion-caption">Fully grown · keep your rewards for another friend</span>'
    : `<button class="button care-button" data-spend-care ${home.bank ? '' : 'disabled'}>${p.hatched ? `Feed ${p.name}` : 'Warm egg'} <span>· 1 reward</span></button>`;
}
export function companionsPage(state, today) {
  const h = collectionStatus(state, today),
    p = h.selected;
  const title = p.hatched ? `${p.name} · Level ${p.level}` : `${p.name}’s egg`;
  const progress = p.hatched
    ? p.level === 5
      ? 'Fully grown'
      : `${Math.ceil(3 - (p.xp % 3))} feeds to level ${p.level + 1}`
    : `${p.warmth} of 4 rewards to hatch`;
  return `<div class="page-heading"><div><div class="eyebrow">YOUR LITTLE COMPANION HOME</div><h1>Companions</h1><p>A little care goes a long way.</p></div><span class="phase-pill wallet-pill" aria-label="${h.bank} care rewards available"><span class="wallet-token">${careCoin}<strong>${h.bank}</strong><span>care</span></span></span></div><section class="companion-card home-hero" aria-label="Selected companion">${petArt(p)}<h2>${title}</h2><p class="companion-caption">${progress}</p><div class="pet-progress" role="progressbar" aria-label="${p.hatched ? 'Growth' : 'Hatching'} progress" aria-valuenow="${p.hatched ? Math.round(p.growth * 100) : p.warmth * 25}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p.hatched ? p.growth * 100 : p.warmth * 25}%"></span></div>${careButton(h)}</section><div class="section-title"><h2>Your companions</h2></div><div class="pet-roster">${h.roster.map(pet => `<button class="pet-tile ${pet.hatched ? '' : 'unhatched'} ${pet.id === p.id ? 'selected' : ''}" data-choose-pet="${pet.id}" aria-pressed="${pet.id === p.id}"><span class="pet-tile-icon" aria-hidden="true">${atlasFrame(pet)}</span><strong>${pet.name}</strong><small>${pet.hatched ? `Level ${pet.level} · ${pet.species}` : `Egg · ${pet.warmth}/4`}</small><span class="pet-selected">${pet.id === p.id ? 'Selected' : 'Choose'}</span></button>`).join('')}${Object.entries(
    SPECIES,
  )
    .filter(([id]) => !state.collection.adopted.includes(id))
    .map(
      ([id, s]) =>
        `<button class="pet-tile available-egg" data-adopt-egg="${id}" aria-label="Choose ${s.name}’s ${s.species.toLowerCase()} egg. Four care rewards to hatch."><span class="pet-tile-icon" aria-hidden="true">${atlasFrame({ id, warmth: 0 })}</span><strong>${s.name}</strong><small>4 care to hatch</small><span class="pet-selected">Choose egg ＋</span></button>`,
    )
    .join('')}</div>`;
}

export function bounceCompanion(button) {
  const sprite = button.querySelector('.companion-bouncer');
  if (!sprite) return;
  sprite.getAnimations().forEach(animation => animation.cancel());
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sprite.animate([{ opacity: 1 }, { opacity: 0.75 }, { opacity: 1 }], { duration: 180 });
    return;
  }
  sprite.animate(
    [
      { transform: 'translateY(0) scale(1,1)', offset: 0 },
      { transform: 'translateY(2px) scale(1.035,.96)', offset: 0.16 },
      { transform: 'translateY(-13px) scale(.985,1.015)', offset: 0.43 },
      { transform: 'translateY(0) scale(1.025,.975)', offset: 0.74 },
      { transform: 'translateY(-3px) scale(1,1)', offset: 0.88 },
      { transform: 'translateY(0) scale(1,1)', offset: 1 },
    ],
    { duration: 650, easing: 'ease-in-out' },
  );
}

// Now and then the companion hops, or its egg wobbles, on its own so it feels
// alive. It never interrupts a tap or celebration and stays still for
// reduced motion. Renders replace the art, so each tick looks it up afresh.
export function idleCompanion(button) {
  const sprite = button.querySelector('.companion-bouncer');
  if (
    !sprite ||
    sprite.getAnimations().length ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return;
  if (button.classList.contains('is-egg')) {
    sprite.animate(
      [
        { transform: 'rotate(0)' },
        { transform: 'rotate(-5deg)', offset: 0.2 },
        { transform: 'rotate(4deg)', offset: 0.45 },
        { transform: 'rotate(-2deg)', offset: 0.7 },
        { transform: 'rotate(0)' },
      ],
      { duration: 700, easing: 'ease-in-out' },
    );
    return;
  }
  sprite.animate(
    [
      { transform: 'translateY(0) scale(1,1)' },
      { transform: 'translateY(1px) scale(1.03,.97)', offset: 0.18 },
      { transform: 'translateY(-8px) scale(.99,1.01)', offset: 0.45 },
      { transform: 'translateY(0) scale(1.02,.98)', offset: 0.75 },
      { transform: 'translateY(0) scale(1,1)' },
    ],
    { duration: 560, easing: 'ease-in-out', iterations: Math.random() < 0.3 ? 2 : 1 },
  );
}
export function startIdleBounce() {
  const tick = () => {
    if (!document.hidden)
      document.querySelectorAll('.companion-art[data-bounce]').forEach(idleCompanion);
    setTimeout(tick, 6000 + Math.random() * 8000);
  };
  setTimeout(tick, 6000 + Math.random() * 8000);
}

// A short, local celebration. Decorative particles never intercept a tap.
export function celebrateCompanion(button) {
  bounceCompanion(button);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const card = button.closest('.companion-card');
  if (!card) return;
  card.querySelector('.reward-confetti')?.remove();
  const burst = document.createElement('span');
  burst.className = 'reward-confetti';
  burst.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const piece = document.createElement('i');
    const angle = Math.PI + (i / 13) * Math.PI;
    const distance = 58 + (i % 4) * 17;
    piece.style.setProperty('--confetti-x', `${Math.cos(angle) * distance}px`);
    piece.style.setProperty('--confetti-y', `${Math.sin(angle) * distance - 22}px`);
    piece.style.setProperty('--confetti-turn', `${i % 2 ? 170 : -130}deg`);
    piece.style.setProperty(
      '--confetti-color',
      ['#ec75a8', '#f4bf64', '#c88add', '#db2777'][i % 4],
    );
    piece.style.animationDelay = `${(i % 3) * 25}ms`;
    burst.append(piece);
  }
  card.append(burst);
  setTimeout(() => burst.remove(), 1200);
}

// Rendering replaces the card. Carry its on-screen fill across that replacement
// so rapid ticks (or an undo mid-animation) continue from the visible position.
export function captureRewardFill(root) {
  const button = root.querySelector('[data-finish-day]');
  const fill = button?.querySelector('.finish-day-fill');
  if (!fill || !button.clientWidth) return null;
  return {
    day: button.dataset.rewardDay,
    progress: Math.max(
      0,
      Math.min(100, (fill.getBoundingClientRect().width / button.clientWidth) * 100),
    ),
  };
}
export function animateRewardFill(root, previous) {
  const button = root.querySelector('[data-finish-day]');
  const fill = button?.querySelector('.finish-day-fill');
  if (
    !fill ||
    !previous ||
    previous.day !== button.dataset.rewardDay ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return;
  const target = parseFloat(button.style.getPropertyValue('--day-progress'));
  if (!Number.isFinite(target) || Math.abs(previous.progress - target) < 0.1) return;
  // Animate the shared property so the fill and its edge move together.
  button.animate(
    [{ '--day-progress': `${previous.progress}%` }, { '--day-progress': `${target}%` }],
    {
      duration: 650,
      easing: 'cubic-bezier(.22,1,.36,1)',
    },
  );
}
