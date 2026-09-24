import {careCoin} from './companion-view.js';

// Owns only presentation. Progress and the seen marker stay in the app's save.
export function createCompanionIntro({nav,onSeen,navigate}){
 const dialog=document.createElement('dialog');
 dialog.id='companion-intro';
 dialog.setAttribute('aria-labelledby','reward-title');
 dialog.setAttribute('aria-describedby','reward-description');
 dialog.innerHTML=`<button class="intro-close" aria-label="Close reward introduction">×</button><div class="intro-scene"><span class="intro-spark one" aria-hidden="true">✧</span><span class="intro-spark two" aria-hidden="true">✦</span><span class="intro-spark three" aria-hidden="true">✧</span>${careCoin}<span class="coin-one"></span></div><h2 id="reward-title" tabindex="-1"></h2><p id="reward-description"></p><button class="button" id="reward-continue">Continue →</button>`;
 const nudge=document.createElement('aside');
 nudge.id='companion-nudge';nudge.hidden=true;
 nudge.setAttribute('role','dialog');nudge.setAttribute('aria-modal','false');nudge.setAttribute('aria-labelledby','nudge-title');
 nudge.innerHTML='<button id="nudge-close" aria-label="Dismiss introduction">×</button><span class="nudge-eyebrow">NEW</span><h2 id="nudge-title">Your companions<br>live here.</h2><button id="nudge-open">Take a look <span aria-hidden="true">→</span></button>';
 document.body.append(dialog,nudge);
 let previousUnlocked=null,shown=false;
 function position(){
  if(nudge.hidden)return;
  const r=nav.getBoundingClientRect();
  if(matchMedia('(max-width:600px)').matches){
   const left=Math.max(14,Math.min(innerWidth-nudge.offsetWidth-14,r.left+r.width/2-nudge.offsetWidth/2));
   nudge.style.left=left+'px';nudge.style.top=Math.max(14,r.top-nudge.offsetHeight-18)+'px';
   nudge.style.setProperty('--arrow-x',(r.left+r.width/2-left-6)+'px');
  }else{
   const top=Math.max(14,Math.min(innerHeight-nudge.offsetHeight-20,r.top-12));
   nudge.style.left=(r.right+20)+'px';nudge.style.top=top+'px';
   nudge.style.setProperty('--arrow-y',(r.top+r.height/2-top-6)+'px');
  }
 }
 function dismiss(){nudge.hidden=true;nav.classList.remove('is-introduced');}
 function finish(){
  onSeen();dialog.close();
  if(nav.hidden)return;
  nudge.hidden=false;nav.classList.add('is-introduced');position();
  nudge.querySelector('#nudge-open').focus({preventScroll:true});
 }
 dialog.querySelector('#reward-continue').addEventListener('click',finish);
 dialog.querySelector('.intro-close').addEventListener('click',finish);
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
 nudge.querySelector('#nudge-close').addEventListener('click',()=>{dismiss();nav.focus({preventScroll:true});});
 nudge.querySelector('#nudge-open').addEventListener('click',()=>{dismiss();navigate('companions');nav.focus({preventScroll:true});});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!nudge.hidden){dismiss();nav.focus({preventScroll:true});}});
 window.addEventListener('resize',position);
 window.addEventListener('scroll',position,{passive:true});
 new ResizeObserver(position).observe(nav.parentElement);
 return {dismiss,update(home,seen){
  const justHatched=previousUnlocked===false&&home.unlocked;
  previousUnlocked=home.unlocked;
  if(!home.unlocked){dialog.close();dismiss();shown=false;return;}
  if(seen||shown)return;
  // Do not stack this introduction over an existing edit dialog.
  if(document.querySelector('dialog[open]'))return;
  shown=true;
  dialog.querySelector('.coin-one').textContent=justHatched?'+1 care reward':home.bank?`${home.bank} care reward${home.bank===1?'':'s'} saved`:'Care rewards';
  dialog.querySelector('#reward-title').innerHTML=justHatched?'Pip has hatched.':home.bank?'A little care,<br>saved for later.':'A little care,<br>for your companions.';
  dialog.querySelector('#reward-description').textContent=justHatched?'This reward hatched Pip. Save the next ones to feed friends or warm eggs.':home.bank?'Feed a companion. Warm a new egg.':'Finish a day to earn care. Feed a friend or warm an egg.';
  dialog.showModal();dialog.querySelector('#reward-title').focus({preventScroll:true});
 }};
}
