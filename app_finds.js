/* Кыргызча — app_finds.js: «Встретил в жизни» — слова и словосочетания, встреченные вне курса.
   Данные: wordbank/finds = {meta, items:[{r,g,l,d,n}]} (r = ранг записи банка, g = группа, l = урок, d = дата, n = заметка).
   Сами слова и словосочетания — обычные записи банка (S.byRank), словосочетание = слово с пробелом.
   Показ: как обычные темы на вкладке «Слова» (findsHomeHTML/findsHomeBind вызываются из home() в app_nav).
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
/* соседи словосочетания по уроку (для дистракторов): [{v,r}], v — кыргызский текст (field==='word') или перевод */
function findsPeers(r,field){
  const w0=S.byRank[r]; if(!w0||w0.type!=='collocation')return [];
  const all=findsItems(), it=all.find(x=>x.r===r); if(!it)return [];
  return all.filter(x=>x.g===it.g&&x.l===it.l&&x.r!==r&&S.byRank[x.r]&&S.byRank[x.r].type==='collocation')
    .map(x=>{const w=S.byRank[x.r]; return {v:field==='word'?w.word:shortTr(w),r:x.r};});
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
/* Темы «Встретил в жизни» — в дереве вкладки «Слова», оформление как у тем курса:
   заголовок (acc part) → дорожка уроков (path/node) → список слов темы. UI.cat = 'f<номер>'. */
function findsDone(l){return l.items.every(x=>findsSeen(x.r));}
function findsHomeHTML(){
  const gs=findsGroups(); let h='';
  gs.forEach((g,gi)=>{
    const all=g.ls.flatMap(l=>l.items), ld=g.ls.filter(findsDone).length, lt=g.ls.length;
    const open=UI.cat==='f'+gi;
    h+=`<button class="acc part ${open?'open':''} ${ld===lt?'fin':ld>0?'go':''}" data-c="f${gi}">
      <div class="grow"><div class="ttl">🌍 ${esc(g.t)}</div>
      <div class="sub">${all.length} слов · ${ld}/${lt} уроков · встретил в жизни</div>
      <div class="miniprog"><div style="width:${lt?100*ld/lt:0}%"></div></div></div>
      ${ld===lt?('<span class="medal">'+marmotCup(46)+'</span>'):''}<span class="chev">▾</span></button>`;
    if(!open)return;
    const cur=g.ls.findIndex(l=>!findsDone(l)), [c,cd]=UNIT_COLORS[gi%UNIT_COLORS.length];
    h+=`<div class="path" style="--uc:${c};--ucd:${cd}">`;
    g.ls.forEach((l,li)=>{
      const zig=['','zig-l','','zig-r',''][li%4]||'', done=findsDone(l), isCur=li===cur;
      h+=`<button class="node fnode ${done?'done':''} ${isCur?'cur':''} ${zig}" data-fl="${gi}:${li}" title="${esc(l.t)}">
        ${isCur?'<span class="tip">НАЧАТЬ</span>':''}${done?'✓':(isCur?'★':li+1)}</button>`;
    });
    h+=`</div>`;
    g.ls.forEach(l=>{
      h+=`<div class="small muted fdcap">${esc(l.t)}</div><div class="wlist">`;
      for(const it of l.items){
        const w=S.byRank[it.r], seen=findsSeen(it.r), cy=seen?cycleInfo(S.srs[it.r]):null, crs=S.topicByRank[it.r];
        h+=`<div class="wrow fdrow"><div class="grow"><div class="wky">${kyW(w)}</div>
          <div class="wru small">${esc(shortTr(w))}</div>
          ${it.n?`<div class="small muted">${esc(it.n)}</div>`:''}
          ${crs?`<div class="small muted">в курсе: ${esc(crs)}</div>`:''}</div>
          ${it.r<9000?`<span class="spk" data-spk="${it.r}">🔊</span>`:''}
          <span class="cyb ${cy?cy.k:'short'}">${cy?cy.ic+' '+cy.lab:'🆕 новое'}</span></div>`;
      }
      h+=`</div>`;
    });
  });
  return h;
}
function findsHomeBind(){
  document.querySelectorAll('.fnode').forEach(b=>b.onclick=()=>{
    const [g,l]=b.dataset.fl.split(':').map(Number), gs=findsGroups();
    if(gs[g]&&gs[g].ls[l])findsLesson(gs[g].ls[l]);});
}
