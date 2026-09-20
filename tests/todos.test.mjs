import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,validateState,replan,rollover,toggleTask,range} from '../dist/planner.js';
import {saveTodo,toggleTodo,deleteTodo} from '../dist/todos.js';
import {syncCompanion,refreshCommitment,companionStatus,finishCompanionDay} from '../dist/companion.js';
const day='2026-09-18';
const add=s=>saveTodo(s,{title:'  Go for a walk  ',date:day,colour:'#59856b'});
test('personal to-dos persist through edits, completion and backup restore; old backups still load',()=>{
 const s=createState(day),a=add(s),b=add(s);assert.notEqual(a.id,b.id);assert.equal(a.title,'Go for a walk');
 toggleTodo(s,a.id);saveTodo(s,{...a,title:'Walk outside',date:'2026-09-19',colour:'#112233'});
 assert.deepEqual(s.todos.map(t=>t.id),[a.id,b.id]);assert.equal(s.todos[0].done,true);
 const restored=validateState(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.todos,s.todos);
 deleteTodo(restored,a.id);assert.equal(restored.todos.length,1);assert.equal(s.todos.length,2);
 delete s.todos;assert.deepEqual(validateState(s).todos,[]);
});
test('personal changes leave study plan and reward status unchanged; unfinished extras never block hatch or growth',()=>{
 const s=createState(day);syncCompanion(s,day);const tasks=structuredClone(s.tasks),before=companionStatus(s,day);
 const a=add(s);toggleTodo(s,a.id);syncCompanion(s,day);assert.deepEqual(companionStatus(s,day),before);assert.deepEqual(s.tasks,tasks);toggleTodo(s,a.id);
 for(const d of range(day,'2026-10-14')){
  rollover(s,d);refreshCommitment(s,d);syncCompanion(s,d);
  saveTodo(s,{title:'Optional extra',date:d,colour:'#ffffff'});
  for(const t of s.tasks.filter(t=>t.date===d&&!t.doneAt)){toggleTask(s,t.id,d);syncCompanion(s,d);}
  assert.equal(companionStatus(s,d).canFinish,true);finishCompanionDay(s,d);
  if(d==='2026-09-26')assert.equal(companionStatus(s,d).hatched,true);
 }
 assert.equal(companionStatus(s,'2026-10-14').growth,1);assert.ok(s.todos.every(t=>!t.done));
});
test('rebalancing and rollover leave personal dates, colours and completion alone',()=>{
 const s=createState(day);add(s);const before=structuredClone(s.todos);s.weekly.fill('light');replan(s,day);rollover(s,'2026-09-20');assert.deepEqual(s.todos,before);
});
test('invalid personal backups are rejected without mutating state',()=>{
 const s=createState(day);add(s);
 for(const patch of [{id:'bad"id'},{title:'  '},{title:'a'.repeat(201)},{date:'2026-02-30'},{colour:'red;display:none'},{done:'true'}]){
  const bad=structuredClone(s);Object.assign(bad.todos[0],patch);assert.throws(()=>validateState(bad),/personal to-do/);
 }
 const bad=structuredClone(s);bad.todos.push({...bad.todos[0]});assert.throws(()=>validateState(bad),/personal to-do/);
 assert.throws(()=>validateState({...s,todos:{}}),/personal to-do/);
 const before=structuredClone(s);assert.throws(()=>saveTodo(s,{title:'  ',date:day,colour:'#123456'}));assert.deepEqual(s,before);
});
