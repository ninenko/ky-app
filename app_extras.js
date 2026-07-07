/* Кыргызча — app_extras.js: Чтение (Belebele), Диалоги (Peace Corps), квесты недели, грамм-подсказки.
   Часть разбивки index.html (этап 2, 2026-07-07). Classic-скрипт (НЕ ES-модуль): общий глобальный scope, порядок тегов в index.html обязателен. */
'use strict';
/* ---------- Чтение (Belebele, RTDB reading, лениво) ---------- */
let RD=null; const RUI={u:0};
async function loadReading(){
  if(RD)return RD;
  try{RD=await kvGet('reading');}catch(e){}
  if(!RD){
    try{
      const snap=await firebase.database().ref('reading').get();
      if(snap.exists()){RD=snap.val(); kvSet('reading',RD);}
    }catch(e){}
  }
  return RD;
}
async function readingScreen(){
  app.innerHTML=`<div class="wtop"><button class="wback" id="wback">←</button>
    <div><h1 style="margin:0">📚 Чтение</h1>
    <div class="small muted">короткие тексты · вопросы на кыргызском · от простых к сложным</div></div></div>
    <p class="muted center" id="rload">Жүктөлүүдө…</p>`;
  $('#wback').onclick=()=>render(home);
  const D=await loadReading();
  if(!D){const el=$('#rload');if(el)el.textContent='Не удалось загрузить тексты — нужен интернет при первом открытии.';return;}
  let html=`<div class="wtop"><button class="wback" id="wback">←</button>
    <div><h1 style="margin:0">📚 Чтение</h1>
    <div class="small muted">короткие тексты · вопросы на кыргызском · от простых к сложным</div></div></div>`;
  D.units.forEach((u,gi)=>{
    const dn=u.pids.filter(p=>S.doneLessons['r'+p]).length, ct=u.pids.length;
    const open=RUI.u===gi;
    html+=`<button class="acc part ${open?'open':''} ${dn===ct?'fin':dn>0?'go':''}" data-c="${gi}">
      <div class="grow"><div class="ttl">📚 ${esc(u.title)}</div>
      <div class="sub">${dn}/${ct} текстов</div>
      <div class="miniprog"><div style="width:${ct?100*dn/ct:0}%"></div></div></div>
      ${dn===ct?('<span class="medal">'+marmotCup(46)+'</span>'):''}<span class="chev">▾</span></button>`;
    if(open)html+=`<div class="rgrid">`+u.pids.map((p,i)=>
      `<button class="rles ${S.doneLessons['r'+p]?'done':''}" data-p="${p}">${gi*10+i+1}</button>`).join('')+`</div>`;
  });
  app.innerHTML=html;
  $('#wback').onclick=()=>render(home);
  const keep=()=>{const y=scrollY; readingScreen().then(()=>requestAnimationFrame(()=>scrollTo(0,y)));};
  document.querySelectorAll('.acc.part').forEach(b=>b.onclick=()=>{
    const c=+b.dataset.c; RUI.u=RUI.u===c?-1:c; keep();});
  document.querySelectorAll('.rles').forEach(b=>b.onclick=()=>readingLesson(b.dataset.p));
}
function readingLesson(pid){
  const P=RD&&RD.passages[pid]; if(!P)return;
  let qi=0, correct=0;
  const step=()=>{
    const q=P.q[qi];
    app.innerHTML=`<div class="topbar">
      <button class="xbtn" id="close">✕</button>
      <div class="bar"><div id="pbar" style="width:${100*qi/P.q.length}%"></div></div><span></span></div>
      <div class="wordcard rtext">${esc(P.t)}</div>
      <p class="prompt">${esc(q.q)}</p>
      ${shuffle(q.a.map((a,i)=>({a,i}))).map(o=>
        `<button class="opt" data-i="${o.i}">${esc(o.a)}</button>`).join('')}
      <div id="rnext"></div>`;
    $('#close').onclick=()=>{if(confirm('Выйти из текста? Прогресс текста не сохранится.'))render(readingScreen);};
    document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
      const ok=+b.dataset.i===q.c;
      b.classList.add(ok?'ok':'bad');
      if(ok){b.classList.add('pop');correct+=1;}
      else document.querySelectorAll('.opt').forEach(x=>{if(+x.dataset.i===q.c)x.classList.add('ok');});
      document.querySelectorAll('.opt').forEach(x=>x.disabled=true);
      const btn=document.createElement('button');
      btn.className='btn'; btn.style.marginTop='12px';
      btn.textContent=qi+1<P.q.length?'Дальше':'Готово';
      btn.onclick=()=>{qi+=1; if(qi<P.q.length)step(); else finishReading(pid,correct,P.q.length);};
      $('#rnext').appendChild(btn);
      requestAnimationFrame(()=>btn.scrollIntoView({block:'nearest',behavior:'smooth'}));});
  };
  step();
}
async function finishReading(pid,correct,total){
  const xp=10+2*correct+(correct===total?5:0);
  S.xp+=xp; await kvSet('xp',S.xp);
  S.doneLessons['r'+pid]=true; await kvSet('doneLessons',S.doneLessons);
  const newDay=await registerActivity();
  questBump(xp,correct===total);
  syncPush(); confetti();
  app.innerHTML=`<div class="finish"><div style="height:14px"></div>${marmot(130,'cheer')}
    <h1>${correct===total?'Идеально! 🏆':'Текст прочитан!'}</h1>
    ${newDay?`<p class="muted">🔥 Стрик продолжается: <b>${S.streak.count}</b> ${dayWord(S.streak.count)}!</p>`:''}
    ${S.doneToday===S.goal?`<p class="muted">🎯 Цель дня выполнена!</p>`:''}
    <div class="fstats">
      <div class="fstat y"><div class="h">Опыт</div><div class="v">⚡ ${xp}</div></div>
      <div class="fstat g"><div class="h">Точность</div><div class="v">${Math.round(100*correct/total)}%</div></div>
      <div class="fstat o"><div class="h">Стрик</div><div class="v">🔥 ${S.streak.count}</div></div></div>
    ${tipHTML()}
    <button class="btn" id="cont">Дальше</button></div>`;
  $('#cont').onclick=()=>render(readingScreen);
}

/* ---------- Диалоги (Peace Corps, RTDB dialogs + audio/d, лениво) ---------- */
let DG=null; const DGU={u:0};
async function loadDialogs(){
  if(DG)return DG;
  try{DG=await kvGet('dialogs');}catch(e){}
  if(!DG){
    try{
      const snap=await firebase.database().ref('dialogs').get();
      if(snap.exists()){DG=snap.val(); kvSet('dialogs',DG);}
    }catch(e){}
  }
  return DG;
}
async function getDialogAudio(id){
  let b=null;
  try{b=await kvGet('dlg:'+id,'audio');}catch(e){}
  if(!b){
    try{
      const snap=await firebase.database().ref('audio/d/'+id).get();
      if(!snap.exists())return null;
      b=snap.val(); kvSet('dlg:'+id,b,'audio');
    }catch(e){return null;}
  }
  return b;
}
async function playDialog(id){
  if(S.mute)return;
  const b=await getDialogAudio(id); if(!b)return;
  try{
    if(curAud){curAud.pause();curAud=null;}
    curAud=new Audio('data:audio/mpeg;base64,'+b);
    curAud.play().catch(()=>{});
  }catch(e){}
}
async function dialogScreen(){
  app.innerHTML=`<div class="wtop"><button class="wback" id="wback">←</button>
    <div><h1 style="margin:0">🎧 Диалоги</h1>
    <div class="small muted">живые диалоги носителей · слушай и отвечай</div></div></div>
    <p class="muted center" id="dload">Жүктөлүүдө…</p>`;
  $('#wback').onclick=()=>render(home);
  const D=await loadDialogs();
  if(!D){const el=$('#dload');if(el)el.textContent='Не удалось загрузить диалоги — нужен интернет при первом открытии.';return;}
  let html=`<div class="wtop"><button class="wback" id="wback">←</button>
    <div><h1 style="margin:0">🎧 Диалоги</h1>
    <div class="small muted">живые диалоги носителей · слушай и отвечай</div></div></div>`;
  let num=0;
  D.units.forEach((u,gi)=>{
    const dn=u.ids.filter(p=>S.doneLessons['g'+p]).length, ct=u.ids.length;
    const open=DGU.u===gi, start=num; num+=ct;
    html+=`<button class="acc part ${open?'open':''} ${dn===ct?'fin':dn>0?'go':''}" data-c="${gi}">
      <div class="grow"><div class="ttl">🎧 ${esc(u.title)}</div>
      <div class="sub">${dn}/${ct} диалогов</div>
      <div class="miniprog"><div style="width:${ct?100*dn/ct:0}%"></div></div></div>
      ${dn===ct?('<span class="medal">'+marmotCup(46)+'</span>'):''}<span class="chev">▾</span></button>`;
    if(open)html+=`<div class="rgrid">`+u.ids.map((p,i)=>
      `<button class="rles ${S.doneLessons['g'+p]?'done':''}" data-p="${p}">${start+i+1}</button>`).join('')+`</div>`;
  });
  html+=`<div class="footer">Диалоги: Peace Corps Basic Kyrgyz Lessons (public domain), голоса носителей.</div>`;
  app.innerHTML=html;
  $('#wback').onclick=()=>render(home);
  const keep=()=>{const y=scrollY; dialogScreen().then(()=>requestAnimationFrame(()=>scrollTo(0,y)));};
  document.querySelectorAll('.acc.part').forEach(b=>b.onclick=()=>{
    const c=+b.dataset.c; DGU.u=DGU.u===c?-1:c; keep();});
  document.querySelectorAll('.rles').forEach(b=>b.onclick=()=>dialogLesson(b.dataset.p));
}
function dialogLesson(id){
  const C=DG&&DG.clips[id]; if(!C)return;
  getDialogAudio(id); // префетч
  let qi=0, correct=0, played=false;
  const step=()=>{
    const q=C.q[qi];
    app.innerHTML=`<div class="topbar">
      <button class="xbtn" id="close">✕</button>
      <div class="bar"><div id="pbar" style="width:${100*qi/C.q.length}%"></div></div><span></span></div>
      <div class="wordcard center">
        <div class="small muted">${esc(C.who)}</div>
        ${S.mute?`<div style="text-align:left;white-space:pre-line;margin:8px 0">${esc(C.ky)}</div>
        <div class="small muted">🔇 тихий режим — читай диалог</div>`
        :`<div style="margin:8px 0"><span class="lisbtn" id="dspk">🔊</span></div>
        <div class="small muted">слушай диалог — можно переслушивать</div>`}</div>
      <p class="prompt">${esc(q.q)}</p>
      ${shuffle(q.a.map((a,i)=>({a,i}))).map(o=>
        `<button class="opt" data-i="${o.i}">${esc(o.a)}</button>`).join('')}
      <div id="dnext"></div>`;
    $('#close').onclick=()=>{if(confirm('Выйти из диалога? Прогресс не сохранится.'))render(dialogScreen);};
    const dspk=$('#dspk'); if(dspk)dspk.onclick=()=>playDialog(id);
    if(!played){played=true; playDialog(id);}
    document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
      const ok=+b.dataset.i===q.c;
      b.classList.add(ok?'ok':'bad');
      if(ok){b.classList.add('pop');correct+=1;}
      else document.querySelectorAll('.opt').forEach(x=>{if(+x.dataset.i===q.c)x.classList.add('ok');});
      document.querySelectorAll('.opt').forEach(x=>x.disabled=true);
      const btn=document.createElement('button');
      btn.className='btn'; btn.style.marginTop='12px';
      btn.textContent=qi+1<C.q.length?'Дальше':'Готово';
      btn.onclick=()=>{qi+=1; if(qi<C.q.length)step(); else finishDialog(id,correct,C);};
      $('#dnext').appendChild(btn);
      requestAnimationFrame(()=>btn.scrollIntoView({block:'nearest',behavior:'smooth'}));});
  };
  step();
}
async function finishDialog(id,correct,C){
  const total=C.q.length, xp=10+2*correct+(correct===total?5:0);
  S.xp+=xp; await kvSet('xp',S.xp);
  S.doneLessons['g'+id]=true; await kvSet('doneLessons',S.doneLessons);
  const newDay=await registerActivity();
  questBump(xp,correct===total);
  syncPush(); confetti();
  app.innerHTML=`<div class="finish"><div style="height:14px"></div>${marmot(130,'cheer')}
    <h1>${correct===total?'Идеально! 🏆':'Диалог разобран!'}</h1>
    ${newDay?`<p class="muted">🔥 Стрик продолжается: <b>${S.streak.count}</b> ${dayWord(S.streak.count)}!</p>`:''}
    ${S.doneToday===S.goal?`<p class="muted">🎯 Цель дня выполнена!</p>`:''}
    <div class="wordcard" style="text-align:left;white-space:pre-line">${esc(C.ky)}
      ${S.mute?'':`<div class="center" style="margin-top:8px"><span class="lisbtn" id="dspk">🔊</span></div>`}</div>
    <div class="fstats">
      <div class="fstat y"><div class="h">Опыт</div><div class="v">⚡ ${xp}</div></div>
      <div class="fstat g"><div class="h">Точность</div><div class="v">${Math.round(100*correct/total)}%</div></div>
      <div class="fstat o"><div class="h">Стрик</div><div class="v">🔥 ${S.streak.count}</div></div></div>
    <button class="btn" id="cont">Дальше</button></div>`;
  const dspk2=$('#dspk'); if(dspk2)dspk2.onclick=()=>playDialog(id);
  $('#cont').onclick=()=>render(dialogScreen);
}

/* ---------- Квесты недели (локально, без синка) ---------- */
const QUESTS=[
 {k:'xp',need:150,txt:'⚡ Набрать 150 XP',bonus:20},
 {k:'les',need:10,txt:'📚 Пройти 10 уроков',bonus:20},
 {k:'perf',need:3,txt:'🏆 3 идеальных урока',bonus:25}];
function wkId(){const d=new Date(),t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));
  const y=t.getUTCFullYear();
  return y+'-W'+String(Math.ceil(((t-Date.UTC(y,0,1))/864e5+1)/7)).padStart(2,'0');}
function wkState(){
  if(!S.week||S.week.id!==wkId())S.week={id:wkId(),xp:0,les:0,perf:0,claimed:{}};
  if(!S.week.claimed)S.week.claimed={};
  return S.week;}
function questBump(xp,perfect){
  const w=wkState(); w.xp+=xp; w.les+=1; if(perfect)w.perf+=1;
  kvSet('week',S.week);}
function questHTML(){
  const w=wkState();
  return `<div class="qcard"><div class="qh">🎯 Квесты недели</div>`+QUESTS.map(q=>{
    const raw=w[q.k]||0, v=Math.min(raw,q.need), done=raw>=q.need, cl=w.claimed[q.k];
    return `<div class="qrow"><div class="qt">${q.txt}${cl?' ✅':''}</div>`+
      (done&&!cl?`<button class="qclaim" data-q="${q.k}">+${q.bonus} ⚡</button>`
      :cl?'':`<div class="qbar"><div style="width:${100*v/q.need}%"></div></div><span class="qn">${v}/${q.need}</span>`)
      +`</div>`;}).join('')+`</div>`;}

/* ---------- Грамматические подсказки (ротация на финише + экран) ---------- */
const GRAMMAR_TIPS=[
 {t:'Ты и вы',b:'-сың — «ты», -сыз — вежливое «вы»: <b>Кандайсың?</b> / <b>Кандайсыз?</b>'},
 {t:'Вопрос «-бы?»',b:'Вопрос делает частица на конце слова: <b>болобу?</b>, <b>туурабы?</b>, <b>Саламатсызбы?</b> Её гласная подстраивается: бы/би/бу/бү.'},
 {t:'«Откуда» — суффикс -дан',b:'<b>Америкадан келдим</b> — «я приехал из Америки». -дан/-ден/-тан = «из, от».'},
 {t:'«Я — волонтёр» без «есть»',b:'Вместо глагола «быть» — личное окончание: <b>Мен волонтёрмун</b>. Мен = я, -мун = «я есть».'},
 {t:'Моё имя',b:'<b>Менин атым</b> — «моё имя», <b>сиздин атыңыз</b> — «ваше имя». Принадлежность видна и в местоимении, и в окончании слова.'},
 {t:'Нравится / не нравится',b:'<b>Мага тоолор жагат</b> — «мне нравятся горы». Отрицание — внутри глагола: <b>жакпайт</b> — «не нравится».'},
 {t:'Гармония гласных',b:'Суффикс повторяет гласную корня: тоо → <b>тоолор</b> (горы), кел → <b>келдиңиз</b>. Поэтому у каждого суффикса несколько вариантов.'},
 {t:'Глагол — в конце',b:'Порядок слов SOV: <b>Мен Америкадан келдим</b> — дословно «я из Америки приехал».'},
 {t:'Ни рода, ни артиклей',b:'В кыргызском нет грамматического рода и артиклей: «он», «она» и «оно» — одно слово <b>ал</b>.'},
 {t:'Отрицание «эмес»',b:'Для имён и прилагательных: <b>туура эмес</b> — «неправильно», <b>бул жерден эмесмин</b> — «я не отсюда».'},
 {t:'Прошедшее время -ды',b:'<b>келди</b> — «пришёл», <b>келдим</b> — «я пришёл», <b>келдиңиз</b> — «вы пришли». Лицо видно по окончанию.'},
 {t:'«Можно?»',b:'-са + болобу: <b>Сурасам болобу?</b> — «можно спросить?» Ответ: <b>Ооба, болот</b> — «да, можно».'},
 {t:'Ударение',b:'Обычно на последний слог: салАм, рахмАт, жакшЫ (совет носителя языка).'},
 {t:'Вопросительные слова',b:'<b>ким</b> — кто, <b>эмне</b> — что, <b>кайда</b> — где/куда, <b>кайдан</b> — откуда, <b>кандай</b> — какой/как.'}];
function tipHTML(){
  const t=GRAMMAR_TIPS[(S.tipN||0)%GRAMMAR_TIPS.length];
  S.tipN=(S.tipN||0)+1; kvSet('tipn',S.tipN);
  return `<div class="gtip">💡 <b>${t.t}</b> · ${t.b}</div>`;}
function tipsScreen(){
  app.innerHTML=`<div class="wtop"><button class="wback" id="wback">←</button>
    <div><h1 style="margin:0">💡 Грамматика</h1>
    <div class="small muted">короткие заметки · примеры из курса и диалогов</div></div></div>`
    +GRAMMAR_TIPS.map(t=>`<div class="gtip"><b>${t.t}</b> · ${t.b}</div>`).join('');
  $('#wback').onclick=()=>render(home);
}

