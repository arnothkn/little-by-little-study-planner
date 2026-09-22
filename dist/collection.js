import {syncCompanion,companionStatus,finishCompanionDay} from './companion.js';

export const HATCH_COST=4, FEEDS_PER_LEVEL=3, MAX_LEVEL=5;
export const SPECIES={pip:{name:'Pip',species:'Chick'},minty:{name:'Minty',species:'Triceratops'}};
const EXAM='2026-10-15';
const owns=(o,k)=>Object.hasOwn(o,k);
const doneBy=(state,id,day)=>state.tasks.some(t=>t.id===id&&t.doneAt&&t.doneAt<=day);
function earnedDays(state,today){
 const days=Object.entries(state.companion.days).filter(([day,e])=>day<=today&&e.reward&&e.started&&e.required.length&&e.required.every(id=>doneBy(state,id,day))).map(([day])=>day);
 for(const [day,e] of Object.entries(state.collection?.careDays||{}))if(day<=today&&e.done&&e.claimed)days.push(day);
 return [...new Set(days)].sort();
}
function legacyStatus(state,today){
 const c=state.collection;
 const legacy={...state.companion,days:Object.fromEntries(Object.entries(state.companion.days).filter(([day])=>c.legacyDays.includes(day)))};
 return companionStatus({...state,companion:legacy},today);
}
// Replay spends against their original earning day. An undone checklist cannot
// keep a feeding, and a reward can never be redirected or spent twice.
function replay(state,today){
 const c=state.collection,legacy=legacyStatus(state,today);
 const roster=c.adopted.map(id=>({id,...SPECIES[id],warmth:id==='pip'?(legacy.hatched?4:Math.min(4,legacy.crack)):0,xp:id==='pip'?legacy.growth*12:0}));
 const days=earnedDays(state,today),used=new Set(c.legacyDays.filter(day=>days.includes(day))),accepted=[];
 for(const spend of c.spends){
  if(!days.includes(spend.day)||used.has(spend.day))continue;
  const pet=roster.find(p=>p.id===spend.target);
  if(!pet)continue;
  if(spend.kind==='warm'&&pet.warmth<4)pet.warmth++;
  else if(spend.kind==='feed'&&pet.warmth===4&&pet.xp<12)pet.xp=Math.min(12,pet.xp+1);
  else continue;
  used.add(spend.day);accepted.push(spend);
 }
 for(const p of roster){p.hatched=p.warmth===4;p.level=Math.min(5,1+Math.floor((p.xp+1e-8)/3));p.growth=p.xp/12;}
 return {roster,accepted,available:days.filter(day=>!used.has(day))};
}
export function syncCollection(state,today){
 syncCompanion(state,today);
 // Invalidate old claims as well as today's claim when study work is undone.
 for(const [day,e] of Object.entries(state.companion.days))if(e.reward&&!e.required.every(id=>doneBy(state,id,day))){e.reward=null;e.fed=false;}
 if(!state.collection){
  const old=companionStatus(state,today);
  state.collection={version:1,selected:'pip',adopted:['pip'],spends:[],legacyDays:old.hatched?earnedDays(state,today):[],careDays:{}};
 }
 let view=replay(state,today);
 state.collection.spends=view.accepted;
 // The first egg is guided onboarding: earned rewards warm Pip automatically.
 const pip=view.roster.find(p=>p.id==='pip');
 if(!pip.hatched){
  for(const day of view.available.slice(0,4-pip.warmth))state.collection.spends.push({day,target:'pip',kind:'warm'});
  view=replay(state,today);
 }
 if(!view.roster.find(p=>p.id==='pip').hatched)state.collection.selected='pip';
 return collectionStatus(state,today);
}
export function collectionStatus(state,today){
 const view=replay(state,today),unlocked=view.roster.find(p=>p.id==='pip').hatched;
 return {...view,unlocked,bank:view.available.length,selected:view.roster.find(p=>p.id===state.collection.selected)||view.roster[0]};
}
export function chooseCompanion(state,id,today){
 const s=syncCollection(state,today);
 if(!s.unlocked||!state.collection.adopted.includes(id))throw Error('Hatch Pip first, then choose a companion from your home.');
 state.collection.selected=id;
}
export function adoptEgg(state,id,today){
 const s=syncCollection(state,today);
 if(!s.unlocked||!owns(SPECIES,id))throw Error('Hatch Pip to unlock more eggs.');
 if(state.collection.adopted.includes(id))throw Error('This companion is already in your home.');
 if(s.roster.some(p=>!p.hatched))throw Error('Hatch your current egg before choosing another.');
 state.collection.adopted.push(id);state.collection.selected=id;
}
export function spendCare(state,today){
 const s=syncCollection(state,today),pet=s.selected;
 if(!s.unlocked)throw Error('Finish a study day to warm Pip’s egg.');
 if(!s.bank)throw Error('Finish a day to earn a care reward.');
 if(pet.hatched&&pet.level===MAX_LEVEL)throw Error('This companion is fully grown. Save your rewards for another egg.');
 state.collection.spends.push({day:s.available[0],target:pet.id,kind:pet.hatched?'feed':'warm'});
 return syncCollection(state,today).selected;
}
export function dailyRewardStatus(state,today){
 const study=companionStatus(state,today),care=state.collection?.careDays[today];
 // Outstanding study commitments and saved study rewards take priority.
 const careMode=today>EXAM&&!study.required.length&&!study.savedDay;
 if(!careMode)return {...study,careMode:false};
 const already=!!state.companion.days[today]?.reward||!!care?.claimed;
 return {...study,careMode:true,finished:already,canFinish:!!care?.done&&!already,dayProgress:care?.done?1:0,completed:care?.done?1:0,required:care?.goal?['care']:[],savedDay:null};
}
export function finishDailyReward(state,today){
 syncCollection(state,today);
 const s=dailyRewardStatus(state,today);
 if(!s.canFinish)throw Error('Complete today’s tasks before finishing the day.');
 if(s.careMode)state.collection.careDays[today].claimed=true;
 else finishCompanionDay(state,today);
 return syncCollection(state,today);
}
export function saveCareGoal(state,today,goal){
 syncCollection(state,today);
 if(today<=EXAM)throw Error('Daily care goals start after the exam.');
 if(typeof goal!=='string'||!goal.trim()||goal.trim().length>200)throw Error('Write a daily goal of 1–200 characters.');
 const previous=state.collection.careDays[today];
 if(previous?.done)throw Error('Undo today’s goal before editing it.');
 state.collection.careDays[today]={goal:goal.trim(),done:false,claimed:false};
}
export function toggleCareGoal(state,today){
 const e=state.collection.careDays[today];
 if(today<=EXAM||!e)throw Error('Set your daily goal first.');
 e.done=!e.done;if(!e.done)e.claimed=false;
 syncCollection(state,today);
}
export function validateCollection(c,tasks,companion){
 if(c===undefined)return;
 const fail=()=>{throw Error('The backup contains invalid companion collection progress.');};
 const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&d>='2026-09-18'&&d<='2030-12-31'&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
 const unique=a=>Array.isArray(a)&&new Set(a).size===a.length;
 if(!companion||!c||c.version!==1||!unique(c.adopted)||c.adopted[0]!=='pip'||c.adopted.some(id=>!owns(SPECIES,id))||!c.adopted.includes(c.selected)||!Array.isArray(c.spends)||c.spends.length>1600||!unique(c.legacyDays)||c.legacyDays.length>1600||c.legacyDays.some(d=>!date(d)||!owns(companion.days,d))||!c.careDays||Array.isArray(c.careDays)||typeof c.careDays!=='object'||Object.keys(c.careDays).length>1600)fail();
 const spent=new Set();
 for(const s of c.spends){if(!s||!date(s.day)||spent.has(s.day)||c.legacyDays.includes(s.day)||!c.adopted.includes(s.target)||!['warm','feed'].includes(s.kind))fail();spent.add(s.day);}
 for(const [day,e] of Object.entries(c.careDays)){if(!date(day)||day<=EXAM||!e||typeof e.goal!=='string'||!e.goal.trim()||e.goal.length>200||typeof e.done!=='boolean'||typeof e.claimed!=='boolean'||e.claimed&&!e.done)fail();}
 for(const s of c.spends)if(!owns(companion.days,s.day)&&!owns(c.careDays,s.day))fail();
}
