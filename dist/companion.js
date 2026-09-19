// Rewards use an observed daily commitment, never the passage of time alone.
import {START, LEARN_END, END, TOPICS} from './planner.js';
const completedBy = (task, day) => !!task?.doneAt && task.doneAt <= day;
const idsDone = (state, day, first) => state.tasks.filter(t => (t.stage === 0) === first && completedBy(t, day)).map(t => t.id);
const validIds = (state, ids, day) => ids.filter(id => completedBy(state.tasks.find(t => t.id === id), day));

export function syncCompanion(state, today) {
  if (!state.companion) {
    // Existing study progress is retained on upgrade; no past feedings are invented.
    state.companion = {version:1, since:today, baseline:{egg:idsDone(state,today,true).filter(id=>state.tasks.find(t=>t.id===id).doneAt<today),revision:idsDone(state,today,false).filter(id=>state.tasks.find(t=>t.id===id).doneAt<today)}, days:{}};
  }
  const c = state.companion;
  const due = state.tasks.filter(t => t.date && t.date <= today && (!t.doneAt || t.doneAt === today)).map(t => t.id);
  const entry = c.days[today] ||= {required:[], started:false, reward:null, fed:false};
  // Extra work added after claiming reopens the same daily reward, even when
  // that extra task is checked immediately. It never creates a second day.
  if(entry.reward && due.some(id=>!entry.required.includes(id))){entry.reward=null;entry.fed=false;}
  // The commitment locks when studying starts. Before that, the calendar is freely adjustable.
  entry.required = [...new Set([...entry.required,...due])];
  if (state.tasks.some(t => t.doneAt === today)) entry.started = true;
  const clear = isClear(state, today, entry);
  // A clear checklist unlocks the reward; only Finish the day may claim it.
  if (!clear) {entry.reward = null; entry.fed = false;}
  return c;
}

// Called after schedule changes, so an untouched day can adopt its new workload.
export function refreshCommitment(state, today) {
  const entry = state.companion?.days[today];
  if (entry && !entry.started) entry.required = [];
}
function isClear(state, day, entry) {
  return entry.required.length > 0 && entry.started && entry.required.every(id => completedBy(state.tasks.find(t => t.id === id),day));
}
export function companionStatus(state, today) {
  const c = state.companion;
  if (!c) throw Error('Initialize the companion before reading its progress.');
  const egg = new Set(validIds(state,c.baseline.egg,c.since));
  const revision = new Set(validIds(state,c.baseline.revision,c.since));
  const eggDays=new Set(validIds(state,c.baseline.egg,c.since).map(id=>state.tasks.find(t=>t.id===id).doneAt));
  let feeds = 0, hatchDate = egg.size === TOPICS.length ? c.since : null;
  for (const [day, entry] of Object.entries(c.days).sort(([a],[b]) => a.localeCompare(b))) {
    if (day > today || !entry.reward || !isClear(state,day,entry)) continue;
    const creditedEggs=validIds(state,entry.reward.egg,day);
    if(!hatchDate && creditedEggs.some(id=>!egg.has(id))) eggDays.add(day);
    creditedEggs.forEach(id => egg.add(id));
    if (!hatchDate && egg.size === TOPICS.length) hatchDate = day;
    if (entry.fed && hatchDate && day >= hatchDate) {
      validIds(state,entry.reward.revision,day).forEach(id => revision.add(id));
      feeds++;
    }
  }
  const entry = c.days[today];
  const required = entry?.required || [];
  const remaining = required.filter(id => !completedBy(state.tasks.find(t => t.id === id),today));
  const clear = !!entry && isClear(state,today,entry);
  const hatched = egg.size === TOPICS.length;
  const fed = hatched && clear && !!entry?.fed;
  const growth = hatched ? revision.size / (TOPICS.length * 2) : 0;
  const finished = clear && !!entry?.reward && (!hatched || fed);
  // An unclaimed final reward remains available on the next rest day.
  const savedDay = !required.length ? Object.entries(c.days).sort(([a],[b])=>b.localeCompare(a)).find(([day,e])=>day<today && isClear(state,day,e) && (!e.reward || (hatched && !e.fed && validIds(state,e.reward.revision,day).some(id=>!revision.has(id)))))?.[0] : null;
  const finishDay = clear && !finished ? today : savedDay;
  const completed = required.length-remaining.length;
  return {hatched,hatchDate,egg:egg.size,crack:eggDays.size,growth,revision:revision.size,feeds,fed,clear,required,remaining,completed,finished,
    dayProgress:required.length?completed/required.length:savedDay?1:0,
    canFinish:!!finishDay,finishDay,savedDay,complete:hatched && growth === 1,
    delayed:!hatched && today>LEARN_END || hatched && growth<1 && today>END};
}
export function finishCompanionDay(state, today) {
  syncCompanion(state,today);
  const status=companionStatus(state,today);
  if (!status.canFinish) throw Error(status.finished?'Today’s reward has already been claimed.':'Complete every session in today’s commitment before finishing the day.');
  const day=status.finishDay;
  const entry=state.companion.days[day];
  entry.reward={egg:idsDone(state,day,true),revision:idsDone(state,day,false)};
  // The same reward action hatches the egg or feeds the chick as appropriate.
  entry.fed=entry.reward.egg.length===TOPICS.length;
}
