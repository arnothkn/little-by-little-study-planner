import {validateTodos} from './todos.js';
export const START='2026-09-18', LEARN_END='2026-09-26', REV_START='2026-09-27', EXAM='2026-10-15', END='2026-10-14';
export const TITLES={Eye:['History taking','Common eye disease','Common retinal disease','Conjunctivitis','Common orbital disease','AVL','Strabismus','Ocular pharmacology','Chronic visual loss','Common external eye disease','Medication','Eye pain','Neuro-ophthalmology','The irritated eye'],ENT:['Anatomy','External disease','Epistaxis','Common laryngeal problem','Deep neck infection','Common problem in ENT','Chronic rhinitis','Vertigo','Neck mass']};
export const TOPICS=Object.entries(TITLES).flatMap(([subject,names])=>names.map((title,i)=>({id:`${subject.toLowerCase()}-${i+1}`,title,subject,number:i+1})));
// Interleave ENT topics evenly across the Eye sequence, however many topics either subject has, so both progress together.
export const ORDER=(()=>{const eye=TOPICS.filter(t=>t.subject==='Eye'),ent=TOPICS.filter(t=>t.subject==='ENT'),out=[];let e=0;eye.forEach((topic,i)=>{out.push(topic);const upTo=Math.floor((i+1)*ent.length/eye.length);for(;e<upTo;e++)out.push(ent[e]);});return out;})();
export const STAGES=['First pass','Revision 1','Revision 2'];
export const WEIGHTS={off:0,light:.5,normal:1,heavy:2};
export const TOTAL_TASKS=TOPICS.length*3;
export const dateObj=d=>new Date(d+'T12:00:00');
export const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const localToday=()=>iso(new Date());
export const addDays=(d,n)=>{const x=dateObj(d);x.setDate(x.getDate()+n);return iso(x);};
export const diffDays=(a,b)=>Math.round((dateObj(a)-dateObj(b))/86400000);
export const range=(a,b)=>{const out=[];for(let d=a;d<=b;d=addDays(d,1))out.push(d);return out;};
export const maxDate=(...ds)=>ds.filter(Boolean).sort().at(-1);
export const weightName=(s,d)=>s.overrides[d]||s.weekly[dateObj(d).getDay()];
export const weight=(s,d)=>WEIGHTS[weightName(s,d)];
export const topicOf=t=>TOPICS.find(x=>x.id===t.topicId);
export const prevTask=(s,t)=>s.tasks.find(x=>x.topicId===t.topicId&&x.stage===t.stage-1);
export function createState(today=localToday()){
 const s={version:1,start:START,weekly:['heavy','normal','normal','normal','normal','normal','heavy'],overrides:{},todos:[],tasks:ORDER.flatMap(topic=>[0,1,2].map(stage=>({id:`${topic.id}:${stage}`,topicId:topic.id,stage,date:null,firstDate:null,doneAt:null,pinned:false,rolledFrom:null}))),lastDay:today};
 replan(s,today);return s;
}
function bounds(s,t,today){
 if(t.stage===0)return [maxDate(s.start,today),today>LEARN_END?'2026-10-10':LEARN_END];
 const prev=prevTask(s,t);const base=prev?.doneAt||prev?.date;
 if(!base)return [null,null];
 const earliest=maxDate(today,REV_START,addDays(base,t.stage===1?1:3));
 return [earliest,t.stage===1?'2026-10-11':END];
}
export function replan(s,today=localToday(),{releasePins=false}={}){
 const load={};s.notices=[];
 for(const t of s.tasks){if(t.doneAt){t.date=t.doneAt;load[t.date]=(load[t.date]||0)+1;continue;}if(t.date&&t.date<today){t.rolledFrom=t.rolledFrom||t.date;t.pinned=false;}if(releasePins)t.pinned=false;if(!t.pinned)t.date=null;}
 for(let stage=0;stage<3;stage++){
  const pending=s.tasks.filter(t=>t.stage===stage&&!t.doneAt);
  // Reserve valid manual choices before assigning flexible sessions.
  for(const t of pending.filter(t=>t.pinned)){const [lo,hi]=bounds(s,t,today);if(!lo||t.date<lo||t.date>hi){t.pinned=false;t.date=null;s.notices.push('A moved session was adjusted to preserve the revision order.');}else load[t.date]=(load[t.date]||0)+1;}
  for(const t of pending.filter(t=>!t.pinned)){
   const [lo,hi]=bounds(s,t,today);if(!lo||lo>hi){t.date=null;continue;}
   const prev=prevTask(s,t);const base=prev?.doneAt||prev?.date;
   const ideal=stage===0?lo:stage===1?maxDate(REV_START,addDays(base,5)):addDays(base,7);
   // First reviews occupy the first half, leaving room for a second spaced pass.
   const preferredEnd=stage===1&&lo<='2026-10-05'?'2026-10-05':hi;
   let candidates=range(lo,preferredEnd).filter(d=>weight(s,d)>0);
   if(!candidates.length)candidates=range(lo,hi).filter(d=>weight(s,d)>0);
   if(stage===1){const viable=candidates.filter(d=>range(addDays(d,3),END).some(next=>weight(s,next)>0));if(viable.length)candidates=viable;}
   const score=d=>((load[d]||0)+.5)/weight(s,d)+(stage===0?0:Math.abs(diffDays(d,ideal))*.025);
   candidates.sort((a,b)=>score(a)-score(b)||a.localeCompare(b));
   t.date=candidates[0]||null;
   if(t.date){load[t.date]=(load[t.date]||0)+1;}
  }
  if(stage===0){const flexible=pending.filter(t=>!t.pinned&&t.date);const slots=flexible.map(t=>t.date).sort();flexible.forEach((t,i)=>{t.date=slots[i];});}
  for(const t of pending)if(t.date&&!t.firstDate)t.firstDate=t.date;
 }
 s.lastDay=today;s.scheduleRevision=2;
 const unassigned=s.tasks.filter(t=>!t.doneAt&&!t.date).length;
 const late=s.tasks.filter(t=>t.stage===0&&!t.doneAt&&(t.date>LEARN_END||!t.date)).length;
 if(late)s.notices.push('The first-pass deadline needs catch-up: unfinished videos are carried forward.');
 if(unassigned)s.notices.push(`${unassigned} session${unassigned===1?' cannot':'s cannot'} fit before the exam with the current study days and review gaps. Enable more study days or complete the prerequisite sessions; nothing has been discarded.`);
 s.notices=[...new Set(s.notices)];return s;
}
export function rollover(s,today=localToday()) {if(s.scheduleRevision!==2||s.lastDay!==today||s.tasks.some(t=>!t.doneAt&&t.date&&t.date<today)){replan(s,today);return true;}return false;}
export function toggleTask(s,id,today=localToday()){
 const t=s.tasks.find(x=>x.id===id);if(!t)throw Error('Session not found.');
 if(t.doneAt){if(s.tasks.some(x=>x.topicId===t.topicId&&x.stage>t.stage&&x.doneAt))throw Error('Undo the later reviews first.');t.doneAt=null;t.pinned=false;}
 else {const prev=prevTask(s,t);if(t.stage>0&&(!prev?.doneAt))throw Error(`Complete ${STAGES[t.stage-1].toLowerCase()} first.`);if(t.stage>0&&(today<REV_START||diffDays(today,prev.doneAt)<(t.stage===1?1:3)))throw Error(t.stage===1?'First revisions begin September 27, at least a day after watching.':'Leave at least 3 days between reviews to give recall some space.');t.doneAt=today;t.date=today;t.pinned=false;}
 // Preserve today's other sessions; rebalance only on rollover, manual scheduling, or rhythm changes.
 for(const x of s.tasks.filter(x=>x.topicId===t.topicId&&x.stage>t.stage&&!x.doneAt)){
  const [lo]=bounds(s,x,today);if(!lo||!x.date||x.date<lo){replan(s,today);break;}
 }
 return s;
}
export function moveTask(s,id,date,today=localToday(),swapId=null){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||iso(dateObj(date))!==date)throw Error('Choose a valid date.');
 const draft=structuredClone(s);const t=draft.tasks.find(x=>x.id===id);if(!t||t.doneAt)throw Error('Only unfinished sessions can be moved.');
 const other=swapId?draft.tasks.find(x=>x.id===swapId):null;const old=t.date;
 if(swapId&&(!other||other.doneAt||other.id===id||!old||other.date!==date))throw Error('Choose an unfinished session on the destination day.');
 t.date=date;t.pinned=true;if(other){other.date=old;other.pinned=true;}
 for(const item of [t,...(other?[other]:[])]){
  const [lo,hi]=bounds(draft,item,today);if(!lo||item.date<lo||item.date>hi)throw Error(`That date does not fit ${STAGES[item.stage].toLowerCase()}. ${lo&&lo<=hi?`Choose ${lo} to ${hi}.`:'Complete the previous session first.'}`);
  const next=draft.tasks.find(x=>x.topicId===item.topicId&&x.stage===item.stage+1);
  if(next?.doneAt&&diffDays(next.doneAt,item.date)<(next.stage===1?1:3))throw Error('That would put this session after a completed review.');
 }
 replan(draft,today);
 if(draft.tasks.find(x=>x.id===id).date!==date||(other&&draft.tasks.find(x=>x.id===other.id).date!==old))throw Error('This swap conflicts with the review order. Choose another session.');
 Object.assign(s,draft);return s;
}
function validateCompanion(value, tasks) {
  if (value === undefined) return;
  const ids = new Set(tasks.map(t => t.id));
  const date = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= START && d <= '2030-12-31' && new Date(d+'T12:00:00Z').toISOString().slice(0,10) === d;
  const list = a => Array.isArray(a) && a.length <= tasks.length && new Set(a).size === a.length && a.every(id => ids.has(id));
  const credit = c => c && list(c.egg) && list(c.revision) && c.egg.every(id => tasks.find(t => t.id === id).stage === 0) && c.revision.every(id => tasks.find(t => t.id === id).stage > 0);
  if (!value || value.version !== 1 || !date(value.since) || !credit(value.baseline) || !value.days || Array.isArray(value.days) || typeof value.days !== 'object' || Object.keys(value.days).length > 1600) throw Error('The backup contains invalid companion progress.');
  for (const [day, entry] of Object.entries(value.days)) {
    if (!date(day) || !entry || !list(entry.required) || typeof entry.started !== 'boolean' || typeof entry.fed !== 'boolean' || !(entry.reward === null || credit(entry.reward))) throw Error('The backup contains an invalid companion day.');
  }
}

export function validateState(raw){
 const addedTopicIds=['ent-8','ent-9'];
 const legacy=Array.isArray(raw?.tasks)&&raw.tasks.length===63&&!raw.tasks.some(t=>addedTopicIds.includes(t.topicId));
 if(!raw||raw.version!==1||!/^2026-09-(18|19|2[0-6])$/.test(raw.start)||!Array.isArray(raw.weekly)||raw.weekly.length!==7||raw.weekly.some(w=>!(w in WEIGHTS))||!raw.overrides||typeof raw.overrides!=='object'||!Array.isArray(raw.tasks)||(raw.tasks.length!==TOTAL_TASKS&&!legacy))throw Error('This is not a valid Little by little backup.');
 const validDate=d=>d===null||(typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&iso(dateObj(d))===d&&d>=START&&d<='2030-12-31');
 const keys=new Set();
 for(const t of raw.tasks){if(!TOPICS.some(p=>p.id===t.topicId)||![0,1,2].includes(t.stage)||t.id!==`${t.topicId}:${t.stage}`||keys.has(t.id)||![t.date,t.doneAt,t.firstDate,t.rolledFrom].every(validDate)||typeof t.pinned!=='boolean')throw Error('The backup contains an invalid session.');keys.add(t.id);}
 for(const [d,w] of Object.entries(raw.overrides))if(!validDate(d)||!(w in WEIGHTS))throw Error('The backup contains an invalid day.');
 for(const t of raw.tasks.filter(t=>t.doneAt&&t.stage>0)){const prev=prevTask(raw,t);if(!prev?.doneAt||t.doneAt<'2026-09-26'||diffDays(t.doneAt,prev.doneAt)<(t.stage===1?1:3))throw Error('The backup has reviews in the wrong order.');}
 validateCompanion(raw.companion,raw.tasks);
 const restored=structuredClone(raw);
 restored.todos=validateTodos(raw.todos);
 if(legacy){
  // The expanded lecture list must not discard an older 21-topic saved plan.
  restored.tasks.push(...createState(START).tasks.filter(t=>addedTopicIds.includes(t.topicId)).map(t=>({...t,date:null,firstDate:null})));
  restored.scheduleRevision=1;
 }
 return restored;
}
