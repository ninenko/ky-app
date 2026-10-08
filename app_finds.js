/* Кыргызча — app_finds.js: «Встретил в жизни» — слова и словосочетания, встреченные вне курса.
   Данные: wordbank/finds = {meta, items:[{r,g,l,d,n}]} (r = ранг записи банка, g = группа, l = урок, d = дата, n = заметка).
   Сами слова и словосочетания — обычные записи банка (S.byRank), словосочетание = слово с пробелом.
   «Выучено» = общий SRS (S.srs[r].seen>0): если слово есть и в курсе, оно учится один раз, а здесь
   отмечается само. Classic-скрипт, общий scope: все имена начинаются с finds/find. 2026-10-08. */
'use strict';
function findsItems(){
  const f=S.wordbank&&S.wordbank.finds; if(!f||!f.items)return [];
  const a=Array.isArray(f.items)?f.items:Object.values(f.items);
  return a.filter(x=>x&&S.byRank[x.r]);
}
function findsSeen(r){const s=S.srs[r]; return !!(s&&s.seen>0);}
function findsStat(){const a=findsItems(); return {n:a.length,k:a.filter(x=>findsSeen(x.r)).length};}
/* заметка на карточке «Новое слово» (вызывается из app_session) */
function findNote(r){
  const it=findsItems().find(x=>x.r===r);
  return (it&&it.n)?`<div class="also">🌍 Встретил в жизни: ${esc(it.n)}</div>`:'';
}
function findsGroups(){
  const gs=[], gi={};
  for(const it of findsItems()){
    if(gi[it.g]==null){gi[it.g]=gs.length; gs.push({t:it.g,ls:[],li:{}});}
    const G=gs[gi[it.g]];
    if(G.li[it.l]==null){G.li[it.l]=G.ls.length; G.ls.push({t:it.l,d:it.d,items:[]});}
    const L=G.ls[G.li[it.l]];
    if(!L.items.some(x=>x.r===it.r))L.items.push(it);
  }
  return gs;
}
async function findsLesson(les){
  const ranks=les.items.map(x=>x.r), fresh=ranks.some(r=>!findsSeen(r));
  await prep(ranks);
  runSession(buildTasks(ranks,true),async(results,sess)=>{
    await finishSession(results,fresh?10:5,sess);
  });
}
function findsScreen(){
  const U=findsScreen.ui||(findsScreen.ui={g:null});
  const gs=findsGroups(), st=findsStat();
  if(U.g===null){U.g=gs.findIndex(g=>g.ls.some(l=>l.items.some(x=>!findsSeen(x.r)))); if(U.g<0)U.g=0;}
  let html=`<div class="wtop"><button class="wback" id="fback">←</button>
    <div><h1 style="margin:0">Встретил в жизни</h1>
    <div class="small muted">Слова и словосочетания из жизни. Что есть в курсе — отмечается само. Выучено ${st.k} из ${st.n}.</div></div></div>`;
  if(!gs.length)html+=`<p class="muted center" style="margin-top:24px">Пока пусто</p>`;
  gs.forEach((g,gi)=>{
    const all=g.ls.flatMap(l=>l.items), k=all.filter(x=>findsSeen(x.r)).length, open=U.g===gi;
    html+=`<button class="acc part ${open?'open':''} ${k===all.length?'fin':k>0?'go':''}" data-g="${gi}">
      <div class="grow"><div class="ttl">🌍 ${esc(g.t)}</div>
      <div class="sub">${all.length} · выучено ${k}/${all.length}</div>
      <div class="miniprog"><div style="width:${all.length?100*k/all.length:0}%"></div></div></div>
      ${k===all.length?('<span class="medal">'+marmotCup(46)+'</span>'):''}<span class="chev">▾</span></button>`;
    if(!open)return;
    g.ls.forEach((l,li)=>{
      const lk=l.items.filter(x=>findsSeen(x.r)).length, done=lk===l.items.length;
      html+=`<div class="fdlesson"><div class="fdhead"><div class="grow"><b>${esc(l.t)}</b>
        <div class="small muted">${esc(l.d)} · ${lk}/${l.items.length}</div></div>
        <button class="btn ${done?'ghost':''}" data-go="${gi}:${li}" style="width:auto;padding:8px 16px">${done?'🔁 Повторить':'Учить'}</button></div>
        <div class="wlist">`;
      for(const it of l.items){
        const w=S.byRank[it.r], seen=findsSeen(it.r), cy=seen?cycleInfo(S.srs[it.r]):null, crs=S.topicByRank[it.r];
        html+=`<div class="wrow fdrow"><div class="grow"><div class="wky">${kyW(w)}</div>
          <div class="wru small">${esc(shortTr(w))}</div>
          ${it.n?`<div class="small muted">${esc(it.n)}</div>`:''}
          ${crs?`<div class="small muted">в курсе: ${esc(crs)}</div>`:''}</div>
          ${it.r<9000?`<span class="spk" data-spk="${it.r}">🔊</span>`:''}
          <span class="cyb ${cy?cy.k:'short'}">${cy?cy.ic+' '+cy.lab:'🆕 новое'}</span></div>`;
      }
      html+=`</div></div>`;
    });
  });
  app.innerHTML=html;
  $('#fback').onclick=()=>render(home);
  document.querySelectorAll('.acc.part').forEach(b=>b.onclick=()=>{
    const g=+b.dataset.g; U.g=(U.g===g)?-1:g;
    const y=scrollY; findsScreen(); requestAnimationFrame(()=>scrollTo(0,y));});
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{
    const [g,l]=b.dataset.go.split(':').map(Number); findsLesson(gs[g].ls[l]);});
}
