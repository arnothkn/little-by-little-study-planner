// Personal to-dos are deliberately separate from scheduled study sessions.
export const TODO_COLOURS=[['Rose','#db2777'],['Peach','#dc7846'],['Gold','#b68a20'],['Sage','#59856b'],['Blue','#507eb5'],['Lilac','#9362b5']];
export function validateTodos(todos){
 if(todos===undefined)return [];
 if(!Array.isArray(todos)||todos.length>1000)throw Error('The backup contains an invalid personal to-do list.');
 const ids=new Set();
 for(const t of todos){
  if(!t||typeof t.id!=='string'||!/^[\w-]{1,80}$/.test(t.id)||ids.has(t.id)||typeof t.title!=='string'||!t.title.trim()||t.title.length>200||typeof t.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))||new Date(t.date).toISOString().slice(0,10)!==t.date||typeof t.colour!=='string'||!/^#[\da-f]{6}$/i.test(t.colour)||typeof t.done!=='boolean')throw Error('The backup contains an invalid personal to-do.');
  ids.add(t.id);
 }
 return structuredClone(todos);
}
export function saveTodo(state,{id,title,date,colour}){
 const todos=state.todos||[],existing=id?todos.find(t=>t.id===id):null;
 if(id&&!existing)throw Error('This to-do could not be found.');
 const todo={id:id||crypto.randomUUID(),title:title.trim(),date,colour,done:existing?.done||false};
 state.todos=validateTodos(existing?todos.map(t=>t.id===id?todo:t):[...todos,todo]);
 return todo;
}
export function toggleTodo(state,id){
 const t=state.todos?.find(t=>t.id===id);
 if(!t)throw Error('This to-do could not be found.');
 t.done=!t.done;
}
export function deleteTodo(state,id){state.todos=(state.todos||[]).filter(t=>t.id!==id);}
