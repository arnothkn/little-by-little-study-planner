import {companionStatus} from './companion.js';
import {eggCracks} from './egg-cracks.js';
import {collectionStatus,dailyRewardStatus} from './collection.js';
export function companionArt({hatched=false,crack=0,growth=0,days=crack}) {
  const newborn=hatched&&growth===0;
  const label=!hatched ? crack ? `Pip’s egg after ${days} completed study day${days===1?'':'s'}. Tap to bounce.` : 'Pip’s uncracked egg. Tap to bounce.' : newborn ? 'Pip, a newly hatched chick. Tap to bounce.' : `Pip the chick, ${Math.round(growth*100)}% grown. Tap to bounce.`;
  const asset=!hatched?'egg':newborn?'hatching':'chick';
  return `<button type="button" class="companion-art ${hatched?'is-chick':'is-egg'}" data-bounce aria-label="${label}"><span class="companion-halo" aria-hidden="true"></span><span class="companion-ground" aria-hidden="true"></span><span class="companion-bouncer"><span class="companion-sprite" style="--chick-scale:${newborn ? .88 : .62+growth*.38}"><img src="./art/${asset}.png" width="256" height="256" alt="" draggable="false">${!hatched?eggCracks(crack):''}</span></span></button>`;
}
export function companionCard(state,today) {
  const s=state.collection?dailyRewardStatus(state,today):companionStatus(state,today);
  const home=state.collection?collectionStatus(state,today):null;
  const unit=s.careMode?'daily goal':'sessions';
  const status=s.finished?'Day finished. Reward claimed.':s.canFinish?'All tasks complete. Finish the day to claim your reward.':`${s.completed} of ${s.required.length} ${unit} completed.`;
  const buttonLabel=s.finished?'Day finished ✓':s.savedDay?'Claim saved reward':'Finish the day';
  const progressLabel=s.required.length?`${s.completed} of ${s.required.length} ${unit} complete`:s.careMode?'Set and complete a daily goal':'No sessions due today';
  return `<section class="companion-card" aria-label="Your study companion">${home?petArt(home.selected):companionArt(s)}<span class="sr-only" role="status">${status}</span><button class="finish-day-button ${s.finished?'is-finished':''}" data-reward-day="${today}" data-finish-day ${s.canFinish?'':'disabled'} style="--day-progress:${s.dayProgress*100}%" aria-label="${buttonLabel}. ${progressLabel}"><span class="finish-day-fill" aria-hidden="true"></span><svg class="finish-day-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 14.7 9.3 21.5 12 14.7 14.7 12 21.5 9.3 14.7 2.5 12 9.3 9.3Z"/><path d="M19 2v4M17 4h4"/></svg><span class="finish-day-label">${buttonLabel}</span><span class="finish-day-shine" aria-hidden="true"></span></button>${home?(home.unlocked?`<div class="care-actions"><button class="text-button" data-page="companions">${home.bank} care reward${home.bank===1?'':'s'} · Companions →</button>${careButton(home)}</div>`:`<p class="companion-caption">${home.selected.warmth} of 4 cosy days · Pip’s egg</p>`):''}</section>`;
}

export function petArt(p){
 if(p.id==='pip')return companionArt({hatched:p.hatched,crack:Math.round(p.warmth/4*9),days:p.warmth,growth:p.growth});
 const x=p.hatched?(p.xp===0?4:p.level-1):p.warmth,y=p.hatched&&p.xp>0?1:0;
 return `<button class="companion-art atlas-art" data-bounce aria-label="${p.name}${p.hatched?'': '’s egg'}. Tap to bounce."><span class="companion-halo" aria-hidden="true"></span><span class="companion-bouncer"><span class="atlas-frame" style="--sprite-x:${x*25}%;--sprite-y:${y*100}%" aria-hidden="true"></span></span></button>`;
}
function careButton(home){const p=home.selected;return p.hatched&&p.level===5?'<span class="companion-caption">Fully grown · keep your rewards for another friend</span>':`<button class="button care-button" data-spend-care ${home.bank?'':'disabled'}>${p.hatched?`Feed ${p.name}`:'Warm egg'} <span>· 1 reward</span></button>`;}
export function companionsPage(state,today){
 const h=collectionStatus(state,today),p=h.selected;
 const title=p.hatched?`${p.name} · Level ${p.level}`:`${p.name}’s egg`;
 const progress=p.hatched?p.level===5?'Fully grown':`${Math.ceil(3-p.xp%3)} feeds to level ${p.level+1}`:`${p.warmth} of 4 rewards to hatch`;
 return `<div class="page-heading"><div><div class="eyebrow">YOUR LITTLE COMPANION HOME</div><h1>Companions</h1><p>A little care goes a long way.</p></div><span class="phase-pill">${h.bank} care reward${h.bank===1?'':'s'}</span></div><section class="companion-card home-hero" aria-label="Selected companion">${petArt(p)}<h2>${title}</h2><p class="companion-caption">${progress}</p><div class="pet-progress" role="progressbar" aria-label="${p.hatched?'Growth':'Hatching'} progress" aria-valuenow="${p.hatched?Math.round(p.growth*100):p.warmth*25}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p.hatched?p.growth*100:p.warmth*25}%"></span></div>${careButton(h)}</section><div class="section-title"><h2>Your companions</h2></div><div class="pet-roster">${h.roster.map(pet=>`<button class="pet-tile ${pet.id===p.id?'selected':''}" data-choose-pet="${pet.id}" aria-pressed="${pet.id===p.id}"><span class="pet-tile-icon" aria-hidden="true">${pet.id==='pip'?`<img src="./art/${pet.hatched?'chick':'egg'}.png" alt="">`:`<span class="atlas-frame" style="--sprite-x:${pet.hatched?(pet.xp===0?100:(pet.level-1)*25):pet.warmth*25}%;--sprite-y:${pet.hatched&&pet.xp>0?'100':'0'}%"></span>`}</span><strong>${pet.name}</strong><small>${pet.hatched?`Level ${pet.level} · ${pet.species}`:`Egg · ${pet.warmth}/4`}</small><span class="pet-selected">${pet.id===p.id?'Selected':'Choose'}</span></button>`).join('')}</div>${!state.collection.adopted.includes('minty')?`<section class="egg-offer panel"><div><div class="eyebrow">YOUR NEXT LITTLE FRIEND</div><h2>A triceratops to treasure</h2><p>Meet Minty. Choose the egg, then warm it with four care rewards. You can switch back to Pip whenever you like.</p></div><button class="button secondary" data-adopt-egg="minty">Choose Minty’s egg</button></section>`:`<p class="subtle spacer">Pip and Minty share your home. Switch between them whenever you like.</p>`}<p class="subtle spacer">${today>'2026-10-15'?'Complete your daily goal and Finish the day':'Finish a full study day'} to earn one care reward. Rewards stay banked until you use them. Feeding and warming both cost one reward; personal to-dos stay separate.</p>`;
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
