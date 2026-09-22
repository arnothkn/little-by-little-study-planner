import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,range,rollover,toggleTask,validateState} from '../dist/planner.js';
import {syncCompanion,refreshCommitment,finishCompanionDay,companionStatus} from '../dist/companion.js';
import {syncCollection,collectionStatus,finishDailyReward,adoptEgg,chooseCompanion,spendCare,saveCareGoal,toggleCareGoal,dailyRewardStatus} from '../dist/collection.js';
const START='2026-09-18';
function fresh(){const s=createState(START);syncCollection(s,START);return s;}
function advance(s,day){rollover(s,day);refreshCommitment(s,day);syncCollection(s,day);}
function clear(s,day){for(const t of s.tasks.filter(t=>t.date===day&&!t.doneAt)){toggleTask(s,t.id,day);syncCollection(s,day);}}
function journey(end){const s=fresh();for(const d of range(START,end)){advance(s,d);clear(s,d);finishDailyReward(s,d);}return s;}
test('Pip opens the home after four complete days, then rewards bank without auto feeding',()=>{
 const s=fresh();assert.throws(()=>adoptEgg(s,'minty',START));
 for(const [i,d] of range(START,'2026-09-22').entries()){
  advance(s,d);assert.throws(()=>finishDailyReward(s,d));clear(s,d);
  assert.equal(collectionStatus(s,d).selected.warmth,Math.min(i,4));
  finishDailyReward(s,d);assert.throws(()=>finishDailyReward(s,d));
  const h=collectionStatus(s,d);assert.equal(h.unlocked,i>=3);assert.equal(h.bank,Math.max(0,i-3));assert.equal(h.selected.xp,0);
 }
});
test('four banked rewards hatch Minty; selection is free; feeding grows only the selected pet',()=>{
 const day='2026-09-29',s=journey(day),bank=collectionStatus(s,day).bank;
 adoptEgg(s,'minty',day);assert.throws(()=>adoptEgg(s,'minty',day));
 for(let i=0;i<4;i++){const p=spendCare(s,day);assert.equal(p.warmth,i+1);assert.equal(p.hatched,i===3);}
 assert.equal(collectionStatus(s,day).bank,bank-4);
 chooseCompanion(s,'pip',day);spendCare(s,day);assert.equal(collectionStatus(s,day).selected.xp,1);
 chooseCompanion(s,'minty',day);assert.equal(collectionStatus(s,day).selected.xp,0);
 for(let i=0;i<3;i++)spendCare(s,day);
 assert.equal(collectionStatus(s,day).selected.level,2);assert.equal(collectionStatus(s,day).bank,0);assert.throws(()=>spendCare(s,day));
 const restored=validateState(JSON.parse(JSON.stringify(s)));syncCollection(restored,day);assert.deepEqual(restored,s);
});
test('partial days, missed days, personal extras and switching pets cannot create rewards',()=>{
 const s=fresh();s.todos=[{id:'walk',title:'Walk',date:START,colour:'#abcdef',done:true}];
 toggleTask(s,s.tasks.find(t=>t.date===START).id,START);syncCollection(s,START);
 assert.equal(collectionStatus(s,START).bank,0);assert.throws(()=>finishDailyReward(s,START));
 advance(s,'2026-09-19');clear(s,'2026-09-19');finishDailyReward(s,'2026-09-19');
 assert.equal(collectionStatus(s,'2026-09-19').selected.warmth,1);
});
test('undoing the earning day removes its spent feeding and rechecking needs an explicit new claim',()=>{
 const day='2026-09-22',s=journey(day);spendCare(s,day);
 const t=s.tasks.find(t=>t.doneAt===day);toggleTask(s,t.id,day);syncCollection(s,day);
 assert.equal(collectionStatus(s,day).selected.xp,0);assert.equal(collectionStatus(s,day).bank,0);
 toggleTask(s,t.id,day);syncCollection(s,day);assert.equal(collectionStatus(s,day).bank,0);
 finishDailyReward(s,day);assert.equal(collectionStatus(s,day).bank,1);assert.equal(collectionStatus(s,day).selected.xp,0);
});
test('undoing an earlier hatch reward reconciles the egg and refunds invalid later feedings',()=>{
 const day='2026-09-26',s=journey(day);adoptEgg(s,'minty',day);
 for(let i=0;i<5;i++)spendCare(s,day);
 const spent=s.collection.spends.find(x=>x.target==='minty'&&x.kind==='warm');
 const next='2026-09-27';advance(s,next);
 const t=s.tasks.find(t=>t.doneAt===spent.day);toggleTask(s,t.id,next);syncCollection(s,next);
 const h=collectionStatus(s,next);assert.equal(h.selected.hatched,false);assert.equal(h.selected.warmth,3);assert.equal(h.selected.xp,0);
 assert.ok(h.bank>0);assert.equal(s.collection.spends.filter(x=>x.target==='minty'&&x.kind==='feed').length,0);
});
test('old Pip saves preserve grown progress without duplicating previously spent rewards',()=>{
 const s=createState(START);syncCompanion(s,START);
 for(const d of range(START,'2026-10-01')){rollover(s,d);refreshCommitment(s,d);syncCompanion(s,d);for(const t of s.tasks.filter(t=>t.date===d&&!t.doneAt)){toggleTask(s,t.id,d);syncCompanion(s,d);}finishCompanionDay(s,d);}
 const original=companionStatus(s,'2026-10-01');assert.ok(original.growth>0);
 syncCollection(s,'2026-10-01');let h=collectionStatus(s,'2026-10-01');assert.ok(Math.abs(h.selected.growth-original.growth)<1e-10);assert.equal(h.bank,0);assert.equal(h.unlocked,true);
 const first=JSON.stringify(s.collection);syncCollection(s,'2026-10-01');assert.equal(JSON.stringify(s.collection),first);
 advance(s,'2026-10-02');clear(s,'2026-10-02');finishDailyReward(s,'2026-10-02');h=collectionStatus(s,'2026-10-02');assert.equal(h.bank,1);assert.ok(Math.abs(h.selected.growth-original.growth)<1e-10);
});
test('post-exam daily goal banks only after completion and Finish the day; undo revokes care',()=>{
 const s=journey('2026-10-14'),day='2026-10-16';advance(s,day);const old=collectionStatus(s,day).bank;
 assert.equal(dailyRewardStatus(s,day).careMode,true);assert.throws(()=>finishDailyReward(s,day));
 saveCareGoal(s,day,'Read a page');toggleCareGoal(s,day);assert.equal(collectionStatus(s,day).bank,old);
 finishDailyReward(s,day);assert.equal(collectionStatus(s,day).bank,old+1);assert.throws(()=>finishDailyReward(s,day));assert.throws(()=>saveCareGoal(s,day,'Another goal'));
 toggleCareGoal(s,day);assert.equal(collectionStatus(s,day).bank,old);toggleCareGoal(s,day);assert.equal(collectionStatus(s,day).bank,old);
 finishDailyReward(s,day);assert.equal(collectionStatus(s,day).bank,old+1);
});
test('growth caps at level five and preserves excess rewards',()=>{
 const s=journey('2026-10-14'),day='2026-10-14';for(let i=0;i<12;i++)spendCare(s,day);
 const h=collectionStatus(s,day);assert.equal(h.selected.level,5);assert.equal(h.selected.growth,1);assert.ok(h.bank>0);assert.throws(()=>spendCare(s,day));assert.equal(collectionStatus(s,day).bank,h.bank);
});
test('malformed collection backups are rejected before restoration',()=>{
 const day='2026-09-22',s=journey(day);spendCare(s,day);
 for(const change of [c=>c.selected='unknown',c=>c.adopted.push('pip'),c=>c.spends.push({...c.spends[0]}),c=>c.spends[0].kind='money',c=>c.legacyDays=['bad-date'],c=>c.careDays[day]={goal:'x',done:true,claimed:true},c=>c.version=9]){const bad=structuredClone(s);change(bad.collection);assert.throws(()=>validateState(bad),/collection/);}
});
