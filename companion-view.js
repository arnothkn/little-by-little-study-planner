import {companionStatus} from './companion.js';
import {eggCracks} from './egg-cracks.js';
export function companionArt({hatched=false,crack=0,growth=0}) {
  const newborn=hatched&&growth===0;
  const label=!hatched ? crack ? `Pip’s egg after ${crack} completed study day${crack===1?'':'s'}. Tap to bounce.` : 'Pip’s uncracked egg. Tap to bounce.' : newborn ? 'Pip, a newly hatched chick. Tap to bounce.' : `Pip the chick, ${Math.round(growth*100)}% grown. Tap to bounce.`;
  const asset=!hatched?'egg':newborn?'hatching':'chick';
  return `<button type="button" class="companion-art ${hatched?'is-chick':'is-egg'}" data-bounce aria-label="${label}"><span class="companion-halo" aria-hidden="true"></span><span class="companion-ground" aria-hidden="true"></span><span class="companion-bouncer"><span class="companion-sprite" style="--chick-scale:${newborn ? .88 : .62+growth*.38}"><img src="./art/${asset}.png" width="256" height="256" alt="" draggable="false">${!hatched?eggCracks(crack):''}</span></span></button>`;
}
export function companionCard(state,today) {
  const s=companionStatus(state,today);
  const status=s.finished?'Day finished. Reward claimed.':s.canFinish?'All sessions complete. Finish the day to claim your reward.':`${s.completed} of ${s.required.length} daily sessions completed.`;
  const buttonLabel=s.finished?'Day finished ✓':s.savedDay?'Claim saved reward':'Finish the day';
  const progressLabel=s.required.length?`${s.completed} of ${s.required.length} sessions complete`:'No sessions due today';
  return `<section class="companion-card" aria-label="Your study companion">${companionArt(s)}<span class="sr-only" role="status">${status}</span><button class="finish-day-button ${s.finished?'is-finished':''}" data-reward-day="${today}" data-finish-day ${s.canFinish?'':'disabled'} style="--day-progress:${s.dayProgress*100}%" aria-label="${buttonLabel}. ${progressLabel}"><span class="finish-day-fill" aria-hidden="true"></span><svg class="finish-day-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 14.7 9.3 21.5 12 14.7 14.7 12 21.5 9.3 14.7 2.5 12 9.3 9.3Z"/><path d="M19 2v4M17 4h4"/></svg><span class="finish-day-label">${buttonLabel}</span><span class="finish-day-shine" aria-hidden="true"></span></button></section>`;
}

export function bounceCompanion(button) {
  const sprite=button.querySelector('.companion-bouncer');
  if(!sprite)return;
  sprite.getAnimations().forEach(animation=>animation.cancel());
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    sprite.animate([{opacity:1},{opacity:.75},{opacity:1}],{duration:180});
    return;
  }
  sprite.animate([
    {transform:'translateY(0) scale(1,1)',offset:0},
    {transform:'translateY(2px) scale(1.035,.96)',offset:.16},
    {transform:'translateY(-13px) scale(.985,1.015)',offset:.43},
    {transform:'translateY(0) scale(1.025,.975)',offset:.74},
    {transform:'translateY(-3px) scale(1,1)',offset:.88},
    {transform:'translateY(0) scale(1,1)',offset:1}
  ],{duration:650,easing:'ease-in-out'});
}

// A short, local celebration. Decorative particles never intercept a tap.
export function celebrateCompanion(button) {
  bounceCompanion(button);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const card=button.closest('.companion-card');
  if(!card)return;
  card.querySelector('.reward-confetti')?.remove();
  const burst=document.createElement('span');
  burst.className='reward-confetti';
  burst.setAttribute('aria-hidden','true');
  for(let i=0;i<14;i++){
    const piece=document.createElement('i');
    const angle=Math.PI+(i/13)*Math.PI;
    const distance=58+(i%4)*17;
    piece.style.setProperty('--confetti-x',`${Math.cos(angle)*distance}px`);
    piece.style.setProperty('--confetti-y',`${Math.sin(angle)*distance-22}px`);
    piece.style.setProperty('--confetti-turn',`${i%2?170:-130}deg`);
    piece.style.setProperty('--confetti-color',['#ec75a8','#f4bf64','#c88add','#db2777'][i%4]);
    piece.style.animationDelay=`${i%3*25}ms`;
    burst.append(piece);
  }
  card.append(burst);
  setTimeout(()=>burst.remove(),1200);
}

// Rendering replaces the card. Carry its on-screen fill across that replacement
// so rapid ticks (or an undo mid-animation) continue from the visible position.
export function captureRewardFill(root) {
  const button=root.querySelector('[data-finish-day]');
  const fill=button?.querySelector('.finish-day-fill');
  if(!fill || !button.clientWidth)return null;
  return {day:button.dataset.rewardDay,progress:Math.max(0,Math.min(100,fill.getBoundingClientRect().width/button.clientWidth*100))};
}
export function animateRewardFill(root,previous) {
  const button=root.querySelector('[data-finish-day]');
  const fill=button?.querySelector('.finish-day-fill');
  if(!fill || !previous || previous.day!==button.dataset.rewardDay || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const target=parseFloat(button.style.getPropertyValue('--day-progress'));
  if(!Number.isFinite(target) || Math.abs(previous.progress-target)<.1)return;
  fill.animate([{width:`${previous.progress}%`},{width:`${target}%`}],{
    duration:650,easing:'cubic-bezier(.22,1,.36,1)'
  });
}
