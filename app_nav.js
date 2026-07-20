/* Кыргызча — app_nav.js: навигация, генерация упражнений, фразы, «Мои слова».
   Часть разбивки index.html (этап 2, 2026-07-07). Classic-скрипт (НЕ ES-модуль): общий глобальный scope, порядок тегов в index.html обязателен. */
'use strict';
/* ---------- Навигация: уровни → категории → юниты → дорожка ---------- */
let UI={cat:null,unit:-1,lvl:1}; // cat=null → авто-раскрыть к текущему уроку; lvl: 1 слова / 2 фразы / 3 предложения
const CAT_ICONS={'Служебные слова':'🔗','Местоимения и указатели':'👉','Числа и количество':'🔢',
 'Время и календарь':'🕐','Общество и народ':'👥','Государство и политика':'🏢','Люди и семья':'👪',
 'Качества и свойства':'✨','Речь и информация':'💬','Место и география':'🌍',
 'Природа и окружающий мир':'🌿','Абстрактные понятия':'💭','Тело и здоровье':'💪',
 'Работа и дело':'💼','Безопасность и закон':'🚨','Действия и процессы':'🏃',
 'Общая лексика':'📚','Экономика и деньги':'💰','Образование и культура':'🎓',
 'Техника и транспорт':'🚗'};
function dnU(u){return u.lessons.filter(l=>S.doneLessons[l.id]).length;}
const PH_ICONS={'Приветствия и вежливость':'👋','Здоровье':'💪','Еда и магазин':'🛒','Время':'🕐',
 'Учёба и школа':'🎓','Семья':'👪','Работа':'💼','Город и транспорт':'🚌','Природа и страна':'🌄',
 'Досуг и спорт':'⚽','Действия':'🏃','Пословицы':'🪶','Общие фразы':'💬'};
function pUnits(){return UI.lvl===2?(S.pcourse&&S.pcourse.level2||[]):(S.pcourse&&S.pcourse.level3||[]);}
function firstUndoneP(){
  for(const u of pUnits())
    for(const l of u.lessons)
      if(!S.doneLessons[l.id]) return {u,l};
  return null;
}
/* «Продолжить» = раздел последнего пройденного урока: недоделанные уроки
   от последнего юнита вперёд; если впереди всё пройдено — первый недоделанный. */
function contTarget(){
  if(S.lastPos&&S.lastPos.lvl===1&&S.course){
    const seq=S.course.units, i=seq.findIndex(u=>u.id===S.lastPos.uid);
    if(i>=0)for(let j=i;j<seq.length;j++){
      const l=seq[j].lessons.find(l=>!S.doneLessons[l.id]);
      if(l)return {u:seq[j],l};
    }
  }
  return firstUndone();
}
function contTargetP(){
  if(S.lastPos&&S.lastPos.lvl===UI.lvl){
    const seq=pUnits(), i=seq.findIndex(u=>u.id===S.lastPos.uid);
    if(i>=0)for(let j=i;j<seq.length;j++){
      const l=seq[j].lessons.find(l=>!S.doneLessons[l.id]);
      if(l)return {u:seq[j],l};
    }
  }
  return firstUndoneP();
}
function pPathHTML(u,nxt){
  const ci=(u.id-1)%UNIT_COLORS.length, [c,cd]=UNIT_COLORS[ci];
  let h=`<div class="path" style="--uc:${c};--ucd:${cd}">`;
  u.lessons.forEach((l,i)=>{
    const done=!!S.doneLessons[l.id];
    const cur=nxt&&nxt.l.id===l.id;
    const zig=['','zig-l','','zig-r',''][i%4]||'';
    h+=`<button class="node ${done?'done':''} ${cur?'cur':''} ${zig}" data-pl="${l.id}" data-pu="${u.id}">
      ${cur?'<span class="tip">НАЧАТЬ</span>':''}${done?'✓':(cur?'★':i+1)}</button>`;
  });
  return h+`</div>`;
}
function catGroups(){
  const gs=[],ix={};
  for(const u of S.course.units){
    const t=u.topic||u.title;
    if(!(t in ix)){ix[t]=gs.length; gs.push({t,units:[]});}
    gs[ix[t]].units.push(u);
  }
  return gs;
}
function pathHTML(u,nxt){
  const ci=(u.id-1)%UNIT_COLORS.length, [c,cd]=UNIT_COLORS[ci];
  let h=`<div class="path" style="--uc:${c};--ucd:${cd}">`;
  u.lessons.forEach((l,i)=>{
    const done=!!S.doneLessons[l.id];
    const cur=nxt&&nxt.l.id===l.id;
    const zig=['','zig-l','','zig-r',''][i%4]||'';
    h+=`<button class="node ${done?'done':''} ${cur?'cur':''} ${zig}" data-l="${l.id}" data-u="${u.id}">
      ${cur?'<span class="tip">НАЧАТЬ</span>':''}${done?'✓':(cur?'★':i+1)}</button>`;
  });
  return h+`</div>`;
}

function home(){
  const due=S.demo?Object.keys(S.srs).filter(r=>(S.srs[r].seen||0)>0).length:reviewRanks().length;
  const lv=level();
  const nxt=contTarget();
  const nxtP=UI.lvl>1?contTargetP():null;
  const cats=catGroups();
  if(UI.cat===null){
    UI.cat=0; UI.unit=0;
    if(UI.lvl===1&&nxt){
      const gi=S.course.units.findIndex(u=>u.id===nxt.u.id);
      UI.unit=Math.max(0,gi);
      UI.cat=Math.max(0,cats.findIndex(g=>g.units.some(u=>u.id===nxt.u.id)));
    }
    if(UI.lvl>1)UI.cat=nxtP?pUnits().findIndex(u=>u.id===nxtP.u.id):0;
  }
  const tips={
    streak:`🔥 Стрик: ${S.streak.count} ${dayWord(S.streak.count)} занятий подряд. Проходи хотя бы один урок в день, чтобы он рос. Пропуск дня без заморозки обнуляет стрик.`,
    frz:`❄️ Заморозки: ${S.streak.freezes} из 2. Если пропустишь день, одна заморозка сгорит вместо стрика. Запас восстанавливается до 2 за каждые 7 дней стрика.${S.streak.burn?` Последний раз ${S.streak.burnN>1?S.streak.burnN+' заморозки сгорели':'заморозка сгорела'} ${S.streak.burn.slice(5).split('-').reverse().join('.')} — был пропуск.`:' Пока ни одна не сгорала (на этом устройстве).'}`,
    xp:`⚡ Опыт (XP): ${S.xp}. Даётся за уроки и повторения, бонус — за урок без ошибок. Уровень: ${lv.name}.${lv.next?` До «${lv.next[1]}» — ${lv.next[0]-S.xp} XP.`:''}`,
    goal:`🎯 Цель дня: пройдено ${S.doneToday} из ${S.goal}. Кольцо заполняется с каждым уроком. Изменить цель можно внизу страницы.`};
  let html=`
  <div class="statbar">
    <button class="stat streak-c" data-k="streak"><span class="ic">🔥</span>${S.streak.count}</button>
    <button class="stat frz-c" data-k="frz"><span class="ic">❄️</span>${S.streak.freezes}</button>
    <button class="stat xp-c" data-k="xp"><span class="ic">⚡</span>${S.xp}</button>
    <button class="stat" data-k="goal">${goalRing()}<span class="small muted">${S.doneToday}/${S.goal}</span></button>
    <button class="stat" id="mutebtn" title="тихий режим"><span class="ic">${S.mute?'🔇':'🔊'}</span></button>
  </div>
  <div class="tipbox" id="tipbox" hidden></div>
  ${S.demo?`<div class="gtip">🐹 <b>Это демо от Суура</b> — прогресс не сохраняется.
    Понравилось? Напиши Ивану на <a href="mailto:ivan.ninenko@gmail.com?subject=KY APP">ivan.ninenko@gmail.com</a>
    (тема «KY APP») — он подключит тебя, и я запомню каждый твой шаг!</div>`:''}
  <div style="display:flex; align-items:center; gap:12px">
    ${marmot(56)}
    <div><h1 style="margin:0">Кыргызча</h1>
    <div class="lvl" id="lvlbtn">${esc(lv.name)}${lv.next?` · до «${esc(lv.next[1])}» ${lv.next[0]-S.xp} XP`:''} <span style="opacity:.55">ⓘ</span></div></div>
  </div>`;
  const hasPh=!!(S.pcourse&&S.phrases);
  if(hasPh) html+=`<div class="lvltabs">
    <button class="lvltab ${UI.lvl===1?'on':''}" data-lvl="1"><span class="big">🔤</span>Слова</button>
    <button class="lvltab ${UI.lvl===2?'on':''}" data-lvl="2"><span class="big">💬</span>Фразы</button>
    <button class="lvltab ${UI.lvl===3?'on':''}" data-lvl="3"><span class="big">📜</span>Предложения</button>
    <button class="lvltab" data-lvl="4"><span class="big">📚</span>Чтение</button>
    <button class="lvltab" data-lvl="5"><span class="big">🎧</span>Диалоги</button>
  </div>`;
  if(UI.lvl===1&&nxt) html+=`<div class="continue"><button class="btn" id="cont">Продолжить · ${esc(nxt.u.title)}</button></div>`;
  if(UI.lvl>1&&nxtP) html+=`<div class="continue"><button class="btn" id="contp">Продолжить · ${esc(nxtP.u.title)}</button></div>`;
  if(due>0) html+=`<button class="btn blue" id="review" style="margin:8px 0">Повторение · ${due}</button>`;
  const known=Object.keys(S.srs).filter(k=>+k<PID0&&(S.srs[k].seen||0)>0).length;
  if(known>0) html+=`<button class="btn ghost" id="mywords" style="margin:8px 0">📖 Мои слова · ${known}</button>`;
  html+=questHTML();

  if(UI.lvl===1)
  cats.forEach((g,giCat)=>{
    const cd2=g.units.reduce((s,u)=>s+dnU(u),0), ct=g.units.reduce((s,u)=>s+u.lessons.length,0);
    const nw=g.units.reduce((s,u)=>s+u.words.length,0);
    const open=UI.cat===giCat;
    html+=`<button class="acc part ${open?'open':''} ${cd2===ct?'fin':cd2>0?'go':''}" data-c="${giCat}">
      <div class="grow"><div class="ttl">${CAT_ICONS[g.t]||'📁'} ${esc(g.t)}</div>
      <div class="sub">${nw} слов · ${cd2}/${ct} уроков</div>
      <div class="miniprog"><div style="width:${ct?100*cd2/ct:0}%"></div></div></div>
      ${cd2===ct?('<span class="medal">'+marmotCup(46)+'</span>'):''}<span class="chev">▾</span></button>`;
    if(!open)return;
    if(g.units.length===1){ html+=pathHTML(g.units[0],nxt); return; }
    g.units.forEach(u=>{
      const gi=S.course.units.indexOf(u);
      const ci=(u.id-1)%UNIT_COLORS.length, [c]=UNIT_COLORS[ci];
      const dN=dnU(u), uOpen=UI.unit===gi;
      html+=`<button class="acc unit ${uOpen?'open':''} ${dN===u.lessons.length?'fin':dN>0?'go':''}" data-un="${gi}" style="--uc:${c}">
        <div class="num" style="background:${c}">${u.title.split(' ').pop()}</div>
        <div class="grow"><div class="ttl">${esc(u.title)}</div>
        <div class="sub">${u.words.length} слов · ${dN}/${u.lessons.length} уроков</div>
        <div class="miniprog"><div style="width:${u.lessons.length?100*dN/u.lessons.length:0}%"></div></div></div>
        ${dN===u.lessons.length?('<span class="medal">'+marmotCup(46)+'</span>'):''}<span class="chev">▾</span></button>`;
      if(uOpen) html+=pathHTML(u,nxt);
    });
  });
  else
  pUnits().forEach((u,gi)=>{
    const dN=dnU(u), ct=u.lessons.length;
    const ci=(u.id-1)%UNIT_COLORS.length, [c]=UNIT_COLORS[ci];
    const open=UI.cat===gi;
    html+=`<button class="acc part ${open?'open':''} ${dN===ct?'fin':dN>0?'go':''}" data-c="${gi}" style="--uc:${c}">
      <div class="grow"><div class="ttl">${PH_ICONS[u.topic]||'📁'} ${esc(u.title)}</div>
      <div class="sub">${u.phrase_ids.length} фраз · ${dN}/${ct} уроков</div>
      <div class="miniprog"><div style="width:${ct?100*dN/ct:0}%"></div></div></div>
      ${dN===ct?('<span class="medal">'+marmotCup(46)+'</span>'):''}<span class="chev">▾</span></button>`;
    if(open) html+=pPathHTML(u,nxtP);
  });

  html+=`<div class="footer">
    <div class="frow">🎯 Цель дня: <select id="goal">${[1,2,3,4,5].map(n=>
      `<option ${n===S.goal?'selected':''}>${n}</option>`).join('')}</select> урок(а)</div>
    <div class="flinks"><a href="#" id="gram">💡 Грамматика</a><a href="#" id="remind">✉️ Письма Суура</a><a href="#" id="about">ℹ️ О приложении</a><a href="#" id="logout">Выйти</a></div>
    <div class="fnote">Переводы и темы составлены с помощью ИИ по словарям, учебникам и частотным спискам — возможны неточности.</div></div>`;
  app.innerHTML=html;

  /* подсказки — только для иконок статбара */
  const tb=$('#tipbox');
  document.querySelectorAll('.stat').forEach(b=>b.onclick=()=>{
    if(!tb.hidden&&tb.dataset.k===b.dataset.k){tb.hidden=true;return;}
    tb.textContent=tips[b.dataset.k]; tb.dataset.k=b.dataset.k; tb.hidden=false;});
  tb.onclick=()=>tb.hidden=true;
  $('#lvlbtn').onclick=()=>{
    if(!tb.hidden&&tb.dataset.k==='lvl'){tb.hidden=true;return;}
    tb.innerHTML='Уровни — шкала опыта (⚡ XP), всего их '+LEVELS.length+':<br><br>'
      +LEVELS.map(l=>(l[1]===lv.name?'<b>':'')+l[1]+' — от '+l[0]+' XP'+(l[1]===lv.name?' ← ты</b>':'')).join('<br>')
      +'<br><br><span style="opacity:.75">Пороги растут нелинейно — дальше каждый уровень даётся дольше, это нормально. Уровень отражает усердие, а не знание языка: за знание отвечают SRS-повторения.</span>';
    tb.dataset.k='lvl'; tb.hidden=false;};
  $('#mutebtn').onclick=async()=>{
    S.mute=!S.mute; await kvSet('mute',S.mute);
    toast(S.mute?'🔇 Тихий режим: аудио выключено, уроки — без упражнений на слух':'🔊 Аудио включено');
    home();};

  /* дерево */
  const keep=()=>{const y=scrollY; home(); requestAnimationFrame(()=>scrollTo(0,y));};
  document.querySelectorAll('.lvltab').forEach(b=>b.onclick=()=>{
    const lv=+b.dataset.lvl;
    if(lv===4){render(readingScreen);return;}
    if(lv===5){render(dialogScreen);return;}
    UI.lvl=lv; UI.cat=null; UI.unit=-1; home();});
  document.querySelectorAll('.acc.part').forEach(b=>b.onclick=()=>{
    const c2=+b.dataset.c;
    if(UI.cat===c2)UI.cat=-1; else {UI.cat=c2; UI.unit=-1;}
    keep();});
  document.querySelectorAll('.acc.unit').forEach(b=>b.onclick=()=>{
    const un=+b.dataset.un;
    UI.unit=UI.unit===un?-1:un;
    keep();});

  const open=(uid,lid)=>{
    const u=S.course.units.find(x=>x.id==uid);
    const l=u.lessons.find(x=>x.id===lid);
    render(lessonScreen,u,l);};
  const openP=(uid,lid)=>{
    const u=pUnits().find(x=>x.id==uid);
    const l=u.lessons.find(x=>x.id===lid);
    render(pLessonScreen,u,l);};
  document.querySelectorAll('.node').forEach(b=>b.onclick=()=>
    b.dataset.pl?openP(b.dataset.pu,b.dataset.pl):open(b.dataset.u,b.dataset.l));
  if(UI.lvl===1&&nxt)$('#cont').onclick=()=>open(nxt.u.id,nxt.l.id);
  if(UI.lvl>1&&nxtP)$('#contp').onclick=()=>openP(nxtP.u.id,nxtP.l.id);
  const rv=$('#review'); if(rv)rv.onclick=()=>render(reviewScreen);
  $('#goal').onchange=async e=>{S.goal=+e.target.value; await kvSet('goal',S.goal); syncPush();};
  $('#logout').onclick=e=>{e.preventDefault();
    if(S.demo){location.reload();return;}
    firebase.auth().signOut().then(()=>location.reload());};
  $('#about').onclick=e=>{e.preventDefault();showAbout();};
  $('#gram').onclick=e=>{e.preventDefault();render(tipsScreen);};
  $('#remind').onclick=e=>{e.preventDefault();showRemind();};
  const mw=$('#mywords'); if(mw)mw.onclick=()=>render(wordsScreen);
  document.querySelectorAll('.qclaim').forEach(b=>b.onclick=async()=>{
    const q=QUESTS.find(x=>x.k===b.dataset.q), w=wkState();
    if(!q||w.claimed[q.k])return;
    w.claimed[q.k]=true; S.xp+=q.bonus;
    await kvSet('week',S.week); await kvSet('xp',S.xp);
    syncPush(); confetti(); home();});
  const curEl=document.querySelector('.node.cur');
  if(curEl&&curEl.getBoundingClientRect().top>window.innerHeight*0.7)
    curEl.scrollIntoView({block:'center'});
}

/* ---------- Генерация упражнений ---------- */
/* пересечение переводов: если у кандидата и цели есть общий значимый токен
   (или общий корень длинных слов), оба варианта могут быть «верными» — исключаем */
function trTokens(w){return shortTr(w).toLowerCase().split(/[^а-яёa-z]+/i)
  .filter(t=>t.length>=3);}
function similarMeaning(a,b){
  const A=trTokens(a),B=trTokens(b);
  return A.some(x=>B.some(y=>x===y||(x.length>=5&&y.length>=5&&x.slice(0,4)===y.slice(0,4))));}

function distractors(word,n,field){
  /* принципы (best practices MCQ-дистракторов):
     1) близки к ответу по длине/числу слов — верный вариант не выделяется визуально;
     2) ≥1 из той же темы — семантическая близость полезнее случайных слов;
     3) слова, которые раньше путались с этим (S.confus), приходят чаще — adaptive;
     4) кандидаты с пересекающимся переводом исключены — не бывает двух верных;
     5) ≥1 уже изученное слово — скрытое повторение; изученные вообще в приоритете.
     v2 (2026-07-20): вместо детерминированного top-n берём пул top-K (POOL) и
     сэмплируем n взвешенно — иначе при штрафах до 24 и джиттере 4 три лучших
     кандидата были одни и те же при каждом показе.
     Пул растёт сам собой: кандидаты берутся из S.wordbank.words, а бонус seen
     читается из S.srs, куда finishSession пишет srsOnResult (seen+=1) сразу по
     завершении урока — значит слова только что пройденного урока участвуют в
     дистракторах уже со следующего урока, без перезагрузки и без sync.
     Возвращает [{v,r}] — текст и freq_rank (rank нужен для учёта путаницы). */
  const ansV=field==='word'?word.word:shortTr(word);
  const topic=S.topicByRank[word.freq_rank]||'';
  const conf=S.confus[word.freq_rank]||{};
  const used=new Set([ansV]);
  const cand=[];
  for(const w of S.wordbank.words){
    if(w.freq_rank===word.freq_rank)continue;
    const v=field==='word'?w.word:shortTr(w);
    if(used.has(v))continue;
    if(similarMeaning(w,word))continue;
    used.add(v);
    /* близость длины — мягче, чем в v1 (была главная причина «замороженных»
       наборов): считаем в «шагах» по 3 символа и с потолком */
    const dLen=Math.min(Math.abs(v.length-ansV.length)/3,4);
    const dWords=Math.abs(v.split(/\s+/).length-ansV.split(/\s+/).length);
    const seen=!!(S.srs[w.freq_rank]&&S.srs[w.freq_rank].seen>0);
    const same=!!topic&&S.topicByRank[w.freq_rank]===topic;
    const cf=Math.min(conf[w.freq_rank]||0,3);
    cand.push({v,r:w.freq_rank,seen,same,
      score:dLen+dWords*3-(same?5:0)-(seen?4:0)-cf*8+Math.random()*2});
  }
  cand.sort((a,b)=>a.score-b.score);
  const out=sampleK(cand,n);
  /* гарантия: ≥1 из той же темы (если тема есть и кандидаты нашлись) */
  if(out.length>=2&&!out.some(c=>c.same)){
    const c=pickRnd(cand,x=>x.same&&!out.includes(x));
    if(c)out[out.length-1]=c;
  }
  /* гарантия: ≥1 уже изученное (не затирая единственный тематический слот) */
  if(out.length&&!out.some(c=>c.seen)){
    const c=pickRnd(cand,x=>x.seen&&!out.includes(x));
    if(c){let i=out.findIndex(o=>!o.same); if(i<0)i=0; out[i]=c;}
  }
  return out.map(c=>({v:c.v,r:c.r}));}

/* top-K сэмплинг: из первых K отсортированных кандидатов выбираем n штук
   без повторов, взвешенно по позиции (ближе к началу — чаще). Даёт разные
   наборы при каждом показе, сохраняя качество (все K — хорошие дистракторы). */
const DPOOL=14;
function sampleK(cand,n){
  const pool=cand.slice(0,Math.max(n,Math.min(DPOOL,cand.length)));
  const out=[];
  while(out.length<n&&pool.length){
    /* вес позиции i: убывает линейно от pool.length до 1 */
    let tot=0; for(let i=0;i<pool.length;i++)tot+=pool.length-i;
    let x=Math.random()*tot, k=0;
    for(let i=0;i<pool.length;i++){x-=pool.length-i; if(x<=0){k=i;break;}}
    out.push(pool.splice(k,1)[0]);
  }
  return out;}
/* случайный кандидат по предикату (для гарантий — чтобы «тематический»/«изученный»
   слот тоже не был всегда одним и тем же словом) */
function pickRnd(cand,pred){
  const m=[];
  for(const c of cand){if(pred(c)){m.push(c); if(m.length>=DPOOL)break;}}
  return m.length?m[Math.floor(Math.random()*m.length)]:null;}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));
  [a[i],a[j]]=[a[j],a[i]];}return a;}

function buildTasks(ranks,withIntro){
  const tasks=[];
  if(withIntro){
    for(const r of ranks){ if(!S.byRank[r])continue;
      if(!S.srs[r])tasks.push({type:'intro',r});
      tasks.push({type:'ky2ru',r});
    }
  } else {
    for(const r of ranks)if(S.byRank[r])tasks.push({type:'ky2ru',r});
  }
  const mr=ranks.filter(r=>S.byRank[r]);
  if(mr.length>=3)tasks.push({type:'match',ranks:mr.slice(0,5)});
  if(!S.mute)for(const r of shuffle([...ranks]))if(S.byRank[r])tasks.push({type:'lis',r});
  for(const r of shuffle([...ranks]))if(S.byRank[r])tasks.push({type:'ru2ky',r});
  for(const r of ranks)if(S.byRank[r])tasks.push({type:'type',r});
  return tasks;}

/* ---------- Фразы: дистракторы и задания ---------- */
function pdistract(ph,n){
  /* переводы других фраз: тот же уровень, приоритет — та же тема, близкая длина.
     v2 (2026-07-20): top-K сэмплинг, как в distractors() — наборы вариативны. */
  const conf=S.confus[ph.id]||{};
  const cand=[];
  for(const p of S.phrases.phrases){
    if(p.id===ph.id||p.ru===ph.ru)continue;
    if(similarMeaning({translation:p.ru},{translation:ph.ru}))continue;
    const dLen=Math.min(Math.abs(p.ru.length-ph.ru.length)/6,4);
    const same=p.topic===ph.topic&&p.level===ph.level;
    const cf=Math.min(conf[p.id]||0,3);
    cand.push({v:p.ru,r:p.id,same,score:dLen-(same?5:0)-cf*8+Math.random()*2});
  }
  cand.sort((a,b)=>a.score-b.score);
  const out=sampleK(cand,n);
  if(out.length>=2&&!out.some(c=>c.same)){
    const c=pickRnd(cand,x=>x.same&&!out.includes(x));
    if(c)out[out.length-1]=c;
  }
  return out.map(c=>({v:c.v,r:c.r}));
}
function pTiles(ph){
  /* плитки: слова фразы + 2-3 ложных из фраз той же темы (без пунктуации, без дублей) */
  const clean=w=>w.replace(/[.,!?«»:;]/g,'');
  const words=ph.ky.split(' ');
  const wset=new Set(words.map(w=>clean(w).toLowerCase()));
  const decoyPool=[];
  for(const p of S.phrases.phrases){
    if(p.id===ph.id||p.topic!==ph.topic)continue;
    for(let w of p.ky.split(' ')){
      w=clean(w);
      if(w.length>1&&!wset.has(w.toLowerCase()))decoyPool.push(w);
    }
  }
  const decoys=shuffle([...new Set(decoyPool)]).slice(0,Math.min(3,Math.max(2,Math.floor(words.length/2))));
  return {words,tiles:shuffle([...words,...decoys])};
}
function buildPTasks(pids,withIntro){
  const tasks=[];
  for(const id of pids){ if(!S.byPid[id])continue;
    if(withIntro&&!S.srs[id])tasks.push({type:'pintro',r:id});
    tasks.push({type:'pky2ru',r:id});
  }
  if(!S.mute)for(const id of shuffle([...pids]))if(S.byPid[id])tasks.push({type:'plis',r:id});
  for(const id of shuffle([...pids]))if(S.byPid[id]){
    const ph=S.byPid[id];
    if(ph.ky.split(' ').length<=9)tasks.push({type:'pbuild',r:id});
    else tasks.push({type:'pky2ru',r:id});
  }
  return tasks;
}

/* ---------- Мои слова ---------- */
const WFILT=[['all','Все'],['learn','Учу'],['know','Знаю'],['hard','Сложные']];
function wCat(st){
  if((st.lapses||0)>=3&&st.lapses*3>st.seen)return 'hard';
  return st.step>=4?'know':'learn';}
/* «цикл повторения» слова: чем длиннее интервал, тем увереннее оно закреплено.
   long = step≥4 (интервал ≥35 дн., уверенно уходит в длинный цикл);
   mid = step 2–3; short = только начал; hard = «пиявка». */
function cycleInfo(st){
  const days=STEPS[Math.min(Math.max(st.step||0,0),STEPS.length-1)];
  const due=!!(st.due&&st.due<=today());
  if((st.lapses||0)>=3&&st.lapses*3>st.seen)return {k:'hard',ic:'🌀',lab:'трудное',days,due};
  if(st.step>=4)return {k:'long',ic:'🟢',lab:'длинный цикл',days,due};
  if(st.step>=2)return {k:'mid',ic:'🔵',lab:'закрепляю',days,due};
  return {k:'short',ic:'🟠',lab:'учу',days,due};}
function myWordsData(){
  const out={w:[],p:[]};
  for(const[k,st]of Object.entries(S.srs)){
    if(!st||!(st.seen>0))continue;
    const r=+k;
    if(r<PID0){const w=S.byRank[r];
      if(w)out.w.push({r,st,ky:w.word,ru:w.translation||'',topic:S.topicByRank[r]||w.topic||''});}
    else{const p=S.byPid[r];
      if(p)out.p.push({r,st,ky:p.ky,ru:p.ru||'',topic:''});}
  }
  const coll=(a,b)=>a.ky.localeCompare(b.ky,'ru');
  out.w.sort(coll); out.p.sort(coll);
  return out;}
function wordsScreen(){
  const D=myWordsData();
  const U=wordsScreen.ui||(wordsScreen.ui={tab:'w',f:'all',q:''});
  if(!D.p.length)U.tab='w';
  const list=D[U.tab];
  const counts={all:list.length,learn:0,know:0,hard:0};
  for(const it of list)counts[wCat(it.st)]++;
  const q=U.q.trim().toLowerCase();
  const rows=list.filter(it=>(U.f==='all'||wCat(it.st)===U.f)
    &&(!q||(it.ky+' '+it.ru).toLowerCase().includes(q)));
  let html=`<div class="wtop"><button class="wback" id="wback">←</button>
    <div><h1 style="margin:0">Мои слова</h1>
    <div class="small muted">🟢 длинный цикл · 🔵 закрепляю · 🟠 учу · 🌀 трудное · ⏰ пора повторить</div></div></div>`;
  if(D.p.length)html+=`<div class="lvltabs">
    <button class="lvltab ${U.tab==='w'?'on':''}" data-t="w"><span class="big">🔤</span>Слова · ${D.w.length}</button>
    <button class="lvltab ${U.tab==='p'?'on':''}" data-t="p"><span class="big">💬</span>Фразы · ${D.p.length}</button></div>`;
  html+=`<div class="wchips">`+WFILT.map(([k,t])=>
    `<button class="wchip ${U.f===k?'on':''}" data-f="${k}">${t} · ${counts[k]}</button>`).join('')+`</div>`;
  html+=`<input class="wsearch" id="wq" placeholder="🔍 поиск (кыргызча / по-русски)" value="${esc(U.q)}">`;
  if(rows.length)html+=`<button class="btn blue" id="wpract" style="margin:10px 0 4px">🔁 Повторить · случайные из «${WFILT.find(x=>x[0]===U.f)[1]}»</button>
    <div class="small muted" style="margin-bottom:6px">Свободная тренировка: SRS-циклы и сроки повторения не меняются.</div>`;
  if(!rows.length)html+=`<p class="muted center" style="margin-top:24px">Пока пусто</p>`;
  html+=`<div class="wlist">`+rows.map(it=>{
    const c=wCat(it.st), pct=Math.round(100*(Math.max(it.st.step,-1)+1)/STEPS.length);
    const cy=cycleInfo(it.st);
    return `<button class="wrow ${c==='hard'?'hard':''}" data-r="${it.r}"
      data-s="${esc((it.ky+' '+it.ru).toLowerCase())}">
      <div class="grow"><div class="wky">${esc(it.ky)}</div>
      <div class="wru small">${esc(U.tab==='w'?shortTr({translation:it.ru}):it.ru)}</div>
      <div class="wdet small" hidden></div></div>
      <span class="spk" data-spk="${it.r}">🔊</span>
      <div class="wst"><span class="cyb ${cy.k}">${cy.ic} ${cy.lab}</span>
      <div class="wbar"><div style="width:${pct}%"></div></div>
      <span class="cynote${cy.due?' due':''}">${cy.due?'⏰ пора повторить':'через '+cy.days+' дн.'}</span></div>
    </button>`;}).join('')+`</div>`;
  app.innerHTML=html;
  $('#wback').onclick=()=>render(home);
  document.querySelectorAll('.lvltab').forEach(b=>b.onclick=()=>{
    U.tab=b.dataset.t; U.f='all'; render(wordsScreen);});
  document.querySelectorAll('.wchip').forEach(b=>b.onclick=()=>{
    U.f=b.dataset.f; render(wordsScreen);});
  const wq=$('#wq');
  wq.oninput=()=>{U.q=wq.value; const s=wq.value.trim().toLowerCase();
    document.querySelectorAll('.wrow').forEach(el=>{el.hidden=!!s&&!el.dataset.s.includes(s);});};
  const wp=$('#wpract'); if(wp)wp.onclick=()=>{
    const s=U.q.trim().toLowerCase();
    const pool=list.filter(it=>(U.f==='all'||wCat(it.st)===U.f)
      &&(!s||(it.ky+' '+it.ru).toLowerCase().includes(s))
      &&(U.tab==='w'?S.byRank[it.r]:S.byPid[it.r]));
    const picks=shuffle(pool).slice(0,U.tab==='w'?7:5).map(it=>it.r);
    if(!picks.length){toast('Под этот фильтр слов нет');return;}
    render(practiceScreen,U.tab,picks);};
  document.querySelectorAll('.wrow').forEach(el=>el.onclick=()=>{
    const d=el.querySelector('.wdet');
    if(!d.hidden){d.hidden=true;return;}
    const it=list.find(x=>x.r===+el.dataset.r); if(!it)return;
    const st=it.st;
    const nd=st.due?(st.due<=today()?'повтор сегодня':'повтор '+st.due.slice(5).split('-').reverse().join('.')):'';
    const cy=cycleInfo(st);
    d.innerHTML=(U.tab==='w'?esc(it.ru)+(it.topic?` · <span class="muted">${esc(it.topic)}</span>`:'')+'<br>':'')
      +`<span class="muted">видел ${st.seen}× · ошибок ${st.lapses||0} · цикл ${cy.days} дн.${nd?' · '+nd:''}</span>`;
    d.hidden=false;});
}

