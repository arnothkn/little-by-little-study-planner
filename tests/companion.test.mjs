import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,rollover,replan,toggleTask,moveTask,validateState,range,TOPICS} from '../dist/planner.js';
import {syncCompanion,refreshCommitment,companionStatus,finishCompanionDay} from '../dist/companion.js';
import {companionCard} from '../dist/companion-view.js';
const start='2026-09-18';
function fresh(){const s=createState(start);syncCompanion(s,start);return s;}
function tick(s,t,day){toggleTask(s,t.id,day);syncCompanion(s,day);}
function advance(s,day){rollover(s,day);refreshCommitment(s,day);syncCompanion(s,day);}
function checklist(s,day){for(const t of s.tasks.filter(t=>t.date===day&&!t.doneAt))tick(s,t,day);}
function finish(s,day){checklist(s,day);if(companionStatus(s,day).canFinish)finishCompanionDay(s,day);}

test('button fills with the checklist; only an explicit press awards a stage',()=>{
 const s=fresh(),tasks=s.tasks.filter(t=>t.date===start);
 assert.ok(tasks.length>1);assert.equal(companionStatus(s,start).dayProgress,0);assert.equal(companionStatus(s,start).canFinish,false);
 assert.throws(()=>finishCompanionDay(s,start));
 tick(s,tasks[0],start);let x=companionStatus(s,start);
 assert.equal(x.dayProgress,1/tasks.length);assert.equal(x.crack,0);assert.equal(x.canFinish,false);
 checklist(s,start);x=companionStatus(s,start);assert.equal(x.dayProgress,1);assert.equal(x.canFinish,true);assert.equal(x.crack,0);
 syncCompanion(s,start);assert.equal(companionStatus(s,start).crack,0,'Reload never auto-claims');
 finishCompanionDay(s,start);x=companionStatus(s,start);assert.equal(x.crack,1);assert.equal(x.finished,true);assert.equal(x.canFinish,false);assert.throws(()=>finishCompanionDay(s,start));
});
test('button markup communicates partial, available, and claimed states accessibly',()=>{
 const s=fresh();let html=companionCard(s,start);assert.match(html,/data-finish-day disabled/);assert.match(html,/--day-progress:0%/);
 checklist(s,start);html=companionCard(s,start);assert.doesNotMatch(html,/data-finish-day disabled/);assert.match(html,/--day-progress:100%/);assert.match(html,/Finish the day/);
 finishCompanionDay(s,start);html=companionCard(s,start);assert.match(html,/Day finished ✓/);assert.match(html,/data-finish-day disabled/);
});
test('partial and missed days cannot be claimed retroactively or auto-advance',()=>{
 const s=fresh(),tasks=s.tasks.filter(t=>t.date===start);tick(s,tasks[0],start);
 advance(s,'2026-09-19');assert.equal(companionStatus(s,'2026-09-19').crack,0);
 finish(s,'2026-09-19');assert.equal(companionStatus(s,'2026-09-19').crack,1);assert.equal(s.companion.days[start].reward,null);
});
test('moving work away after starting cannot unlock Finish the day',()=>{
 const s=fresh(),tasks=s.tasks.filter(t=>t.date===start);tick(s,tasks[0],start);
 for(const t of tasks.slice(1))moveTask(s,t.id,'2026-09-20',start);
 refreshCommitment(s,start);syncCompanion(s,start);
 assert.equal(companionStatus(s,start).canFinish,false);assert.ok(companionStatus(s,start).remaining.includes(tasks[1].id));assert.throws(()=>finishCompanionDay(s,start));
});
test('an untouched off day remains grey and cannot grant a reward',()=>{
 const s=fresh();s.overrides[start]='off';replan(s,start);refreshCommitment(s,start);syncCompanion(s,start);
 const x=companionStatus(s,start);assert.equal(x.required.length,0);assert.equal(x.dayProgress,0);assert.equal(x.canFinish,false);assert.throws(()=>finishCompanionDay(s,start));
});
test('all dates complete with explicit daily rewards: Sep 26 hatch and Oct 14 full growth',()=>{
 const s=fresh();let hatch=null,cracks=0,growth=0,feeds=0;
 for(const day of range(start,'2026-10-14')){
  advance(s,day);const before=companionStatus(s,day);checklist(s,day);
  let x=companionStatus(s,day);assert.equal(x.crack,cracks);assert.equal(x.growth,growth);assert.equal(x.hatched,before.hatched);assert.equal(x.canFinish,true);
  finishCompanionDay(s,day);x=companionStatus(s,day);
  if(day<='2026-09-26')assert.equal(x.crack,cracks+1);
  if(x.hatched){feeds++;if(!hatch)hatch=day;assert.equal(x.fed,true);}
  assert.equal(x.finished,true);assert.throws(()=>finishCompanionDay(s,day));
  cracks=x.crack;growth=x.growth;assert.doesNotThrow(()=>validateState(JSON.parse(JSON.stringify(s))));
 }
 const x=companionStatus(s,'2026-10-14');assert.equal(hatch,'2026-09-26');assert.equal(x.egg,TOPICS.length);assert.equal(x.revision,TOPICS.length*2);assert.equal(x.growth,1);assert.equal(x.feeds,feeds);
});
test('all first-pass videos checked does not hatch the egg until Finish the day is pressed',()=>{
 const s=fresh();for(const day of range(start,'2026-09-25')){advance(s,day);finish(s,day);}
 advance(s,'2026-09-26');checklist(s,'2026-09-26');assert.equal(s.tasks.filter(t=>t.stage===0&&t.doneAt).length,TOPICS.length);assert.equal(companionStatus(s,'2026-09-26').hatched,false);
 finishCompanionDay(s,'2026-09-26');assert.equal(companionStatus(s,'2026-09-26').hatched,true);
});
test('a missed final first-pass day delays hatching until a claimed catch-up day',()=>{
 const s=fresh();for(const day of range(start,'2026-09-25')){advance(s,day);finish(s,day);}
 advance(s,'2026-09-26');advance(s,'2026-09-27');assert.equal(companionStatus(s,'2026-09-27').delayed,true);
 for(const t of s.tasks.filter(t=>t.stage===0&&!t.doneAt))tick(s,t,'2026-09-27');assert.equal(companionStatus(s,'2026-09-27').canFinish,false);
 checklist(s,'2026-09-27');assert.equal(companionStatus(s,'2026-09-27').hatched,false);finishCompanionDay(s,'2026-09-27');assert.equal(companionStatus(s,'2026-09-27').hatched,true);
});
test('undoing work revokes the reward; rechecking requires a new explicit claim',()=>{
 const s=fresh();finish(s,start);const t=s.tasks.find(t=>t.doneAt===start);assert.equal(companionStatus(s,start).crack,1);
 tick(s,t,start);assert.equal(companionStatus(s,start).crack,0);assert.equal(companionStatus(s,start).finished,false);
 tick(s,t,start);assert.equal(companionStatus(s,start).crack,0);assert.equal(companionStatus(s,start).canFinish,true);finishCompanionDay(s,start);assert.equal(companionStatus(s,start).crack,1);
});
test('revision undo revokes feeding and growth; claims persist through a backup roundtrip',()=>{
 const s=fresh();for(const day of range(start,'2026-09-27')){advance(s,day);finish(s,day);}
 const t=s.tasks.find(t=>t.stage===1&&t.doneAt==='2026-09-27');assert.ok(companionStatus(s,'2026-09-27').growth>0);
 tick(s,t,'2026-09-27');const copy=validateState(JSON.parse(JSON.stringify(s)));syncCompanion(copy,'2026-09-27');assert.equal(companionStatus(copy,'2026-09-27').growth,0);
 tick(copy,copy.tasks.find(x=>x.id===t.id),'2026-09-27');assert.equal(companionStatus(copy,'2026-09-27').growth,0);finishCompanionDay(copy,'2026-09-27');
 const restored=validateState(JSON.parse(JSON.stringify(copy)));syncCompanion(restored,'2026-09-27');assert.ok(companionStatus(restored,'2026-09-27').growth>0);assert.equal(companionStatus(restored,'2026-09-27').finished,true);
});
test('undoing the reward alone keeps checkmarks and allows reclaiming',()=>{
 const s=fresh();checklist(s,start);const before=structuredClone(s);finishCompanionDay(s,start);
 const restored=validateState(before);syncCompanion(restored,start);assert.equal(companionStatus(restored,start).dayProgress,1);assert.equal(companionStatus(restored,start).crack,0);assert.equal(companionStatus(restored,start).canFinish,true);
});
test('an unclaimed final day can be rewarded later instead of stranding Pip',()=>{
 const s=fresh();for(const day of range(start,'2026-10-13')){advance(s,day);finish(s,day);}
 advance(s,'2026-10-14');checklist(s,'2026-10-14');assert.equal(companionStatus(s,'2026-10-14').complete,false);
 advance(s,'2026-10-15');assert.equal(companionStatus(s,'2026-10-15').savedDay,'2026-10-14');finishCompanionDay(s,'2026-10-15');assert.equal(companionStatus(s,'2026-10-15').complete,true);assert.equal(s.companion.days['2026-10-15'].reward,null);assert.throws(()=>finishCompanionDay(s,'2026-10-15'));
});
test('existing progress is retained but installing during a partial day grants nothing',()=>{
 const s=createState(start);for(const day of range(start,'2026-09-27')){rollover(s,day);for(const t of s.tasks.filter(t=>t.date===day&&!t.doneAt))toggleTask(s,t.id,day);}
 syncCompanion(s,'2026-09-28');assert.equal(companionStatus(s,'2026-09-28').hatched,true);assert.ok(companionStatus(s,'2026-09-28').growth>0);assert.equal(companionStatus(s,'2026-09-28').feeds,0);
 const partial=createState(start);toggleTask(partial,partial.tasks.find(t=>t.date===start).id,start);syncCompanion(partial,start);checklist(partial,start);assert.equal(companionStatus(partial,start).crack,0);finishCompanionDay(partial,start);assert.equal(companionStatus(partial,start).crack,1);
});
test('original 21-topic saved plans retain completed work and manual choices',()=>{
 const old=createState(start);old.tasks=old.tasks.filter(t=>!['ent-8','ent-9'].includes(t.topicId));const done=old.tasks.find(t=>t.stage===0);done.doneAt=start;done.date=start;
 const pinned=old.tasks.find(t=>t.stage===0&&!t.doneAt);pinned.pinned=true;const restored=validateState(old);assert.equal(restored.tasks.length,69);assert.equal(restored.tasks.find(t=>t.id===done.id).doneAt,start);assert.equal(restored.tasks.find(t=>t.id===pinned.id).pinned,true);
 advance(restored,'2026-09-19');assert.equal(companionStatus(restored,'2026-09-19').egg,1);
});
test('malformed companion backups are rejected',()=>{
 for(const mutate of [c=>c.days[start].required.push('missing'),c=>c.days[start].fed='yes',c=>c.baseline.egg.push('eye-1:1'),c=>c.days[start].reward={egg:[],revision:'bad'},c=>c.version=2]){const s=fresh();mutate(s.companion);assert.throws(()=>validateState(s),/companion/);}
});
test('extra work after claiming reopens the same day so no completed work is stranded',()=>{
 const s=fresh();finish(s,start);const earned=companionStatus(s,start).egg;
 const extra=s.tasks.find(t=>t.stage===0&&!t.doneAt&&t.date>start);tick(s,extra,start);
 assert.equal(companionStatus(s,start).finished,false);assert.equal(companionStatus(s,start).canFinish,true);
 finishCompanionDay(s,start);assert.equal(companionStatus(s,start).crack,1);assert.equal(companionStatus(s,start).egg,earned+1);assert.throws(()=>finishCompanionDay(s,start));
});
