/* Кыргызча — app_core.js: ядро: IndexedDB, состояние, аудио, уровни, стрик, SM-2-lite, контент RTDB, маскот, экраны.
   Часть разбивки index.html (этап 2, 2026-07-07). Classic-скрипт (НЕ ES-модуль): общий глобальный scope, порядок тегов в index.html обязателен. */
/* ============ Кыргызча v0.3 — оболочка без контента.
   Микро-уроки, геймификация, маскот Суур, дизайн в духе Duolingo.
   Весь словарь/курс/фразы приходят из Firebase RTDB после входа. ============ */
'use strict';

const firebaseConfig = {
  apiKey: "AIzaSyAt9StrSkg4cxpvI-d5SmPba-nMiPXsEa8",
  authDomain: "ky-app-9c14d.firebaseapp.com",
  databaseURL: "https://ky-app-9c14d-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ky-app-9c14d",
  storageBucket: "ky-app-9c14d.firebasestorage.app",
  messagingSenderId: "576618146726",
  appId: "1:576618146726:web:c30d90621278208f80bd67"
};
firebase.initializeApp(firebaseConfig);

/* ---------- IndexedDB ---------- */
const DB_NAME='kyapp', DB_VER=2;
let idb;
function idbOpen(){return new Promise((res,rej)=>{
  const r=indexedDB.open(DB_NAME,DB_VER);
  r.onupgradeneeded=()=>{const d=r.result;
    if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');
    if(!d.objectStoreNames.contains('srs'))d.createObjectStore('srs');
    if(!d.objectStoreNames.contains('audio'))d.createObjectStore('audio');};
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);});}
function kvGet(k,store='kv'){if(S.demo)return Promise.resolve(undefined);return new Promise((res,rej)=>{
  const t=idb.transaction(store).objectStore(store).get(k);
  t.onsuccess=()=>res(t.result); t.onerror=()=>rej(t.error);});}
function kvSet(k,v,store='kv'){if(S.demo)return Promise.resolve();return new Promise((res,rej)=>{
  const t=idb.transaction(store,'readwrite').objectStore(store).put(v,k);
  t.onsuccess=()=>res(); t.onerror=()=>rej(t.error);});}
function srsAll(){return new Promise((res,rej)=>{
  const out={}; const c=idb.transaction('srs').objectStore('srs').openCursor();
  c.onsuccess=()=>{const cur=c.result; if(cur){out[cur.key]=cur.value;cur.continue();}else res(out);};
  c.onerror=()=>rej(c.error);});}

/* ---------- Состояние ---------- */
let S={user:null, wordbank:null, course:null, byRank:{}, topicByRank:{}, srs:{}, confus:{},
  phrases:null, byPid:{}, pcourse:null,
  streak:{count:0,last:null,freezes:2}, xp:0, goal:1, doneToday:0, doneLessons:{}, settings:null};
const PID0=20000; // id фраз начинаются с 20001 — не пересекаются с freq_rank слов

const $=s=>document.querySelector(s);
const app=$('#app');
function toast(m){const t=$('#toast');t.textContent=m;t.style.opacity=1;
  setTimeout(()=>t.style.opacity=0,2200);}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function today(){return new Date().toISOString().slice(0,10);}
function shortTr(w){ // основной перевод: часть до ';'
  let t=(w.translation||'').split(';')[0].trim();
  if(t.length>42){t=t.slice(0,42).replace(/[,\s]+\S*$/,'')+'…';}
  return t||w.translation;}

/* ---------- Аудио: RTDB audio/w|p, кэш в IndexedDB ---------- */
let curAud=null;
async function getAudio(r){
  if(S.demo)return DEMO_AUDIO[r]||null;   // демо: аудио вшито в оболочку
  let o=null;
  try{o=await kvGet(String(r),'audio');}catch(e){}
  if(typeof o==='string')o=null;              // старый плоский AkylAI-кэш → инвалидация
  if(!o){
    try{
      const snap=await firebase.database().ref((+r<PID0?'audio2/w/r':'audio2/p/r')+r).get();
      if(!snap.exists())return null;
      o=snap.val(); kvSet(String(r),o,'audio');
    }catch(e){return null;}
  }
  return o;
}
function pickVoice(o){
  if(!o)return null;
  if(o.cv)return o.cv;                         // живой клип Common Voice — единственный вариант
  const k=(Math.random()<0.5?'m':'f');         // случайное чередование м/ж при каждом плее
  return o[k]||o.m||o.f||null;
}
async function playAudio(r){
  if(S.mute)return;
  const b=pickVoice(await getAudio(r)); if(!b)return;
  try{
    if(curAud){curAud.pause();curAud=null;}
    curAud=new Audio('data:audio/mpeg;base64,'+b);
    curAud.play().catch(()=>{});
  }catch(e){}
}
function prefetchAudio(rs){for(const r of rs)getAudio(r);}
document.addEventListener('click',e=>{
  const s=e.target.closest('[data-spk]');
  if(s){e.stopPropagation();e.preventDefault();playAudio(+s.dataset.spk);}
},true);
/* Enter (десктоп) = «Дальше»: фидбек урока, интро, чтение/диалоги, финиш.
   Не срабатывает из полей ввода и с фокусом на кнопке (у них свой Enter). */
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  const tg=e.target&&e.target.tagName;
  if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||tg==='BUTTON')return;
  const b=$('#fnext')||document.querySelector('#rnext .btn')||document.querySelector('#dnext .btn')
    ||document.querySelector('.finish #cont')||$('#ok');
  if(b){e.preventDefault(); b.click();}
});

/* ---------- Уровни ---------- */
const LEVELS=[[0,'Баштоочу 🌱'],[100,'Окуучу 📖'],[300,'Билгич 💡'],[700,'Чебер 🔨'],
  [1500,'Устат 🗻'],[3000,'Акын 🎵'],[6000,'Манасчы 🦅']];
function level(){let cur=LEVELS[0],next=null;
  for(const l of LEVELS){if(S.xp>=l[0])cur=l;else{next=l;break;}}
  return {name:cur[1],next};}

/* ---------- Стрик / цель ---------- */
async function loadMeta(){
  S.streak=await kvGet('streak')||{count:0,last:null,freezes:2};
  S.xp=await kvGet('xp')||0;
  S.goal=await kvGet('goal')||2;
  S.settings=await kvGet('settings')||null;
  S.doneLessons=await kvGet('doneLessons')||{};
  S.confus=await kvGet('confus')||{};
  S.week=await kvGet('week')||null;
  S.mute=await kvGet('mute')||false;
  S.tipN=await kvGet('tipn')||0;
  const dt=await kvGet('doneToday')||{d:null,n:0};
  S.doneToday=(dt.d===today())?dt.n:0;
  const st=S.streak;
  if(st.last && st.last!==today()){
    const missed=Math.floor((new Date(today())-new Date(st.last))/864e5)-1;
    if(missed>0){
      if(missed<=st.freezes){st.freezes-=missed; st.burn=today(); st.burnN=missed; toast(`❄️ Заморозка спасла стрик (осталось ${st.freezes})`);}
      else {st.count=0; st.freezes=2;}
      st.last=new Date(Date.now()-864e5).toISOString().slice(0,10);
      await kvSet('streak',st);
    }
  }
}
async function registerActivity(){
  const st=S.streak; let newDay=false;
  if(st.last!==today()){
    st.count+=1; st.last=today(); newDay=true;
    if(st.count%7===0 && st.freezes<2) st.freezes=2;
    await kvSet('streak',st);
  }
  S.doneToday+=1;
  await kvSet('doneToday',{d:today(),n:S.doneToday});
  return newDay;
}

/* ---------- SM-2-lite ---------- */
const STEPS=[1,3,7,16,35,80,180];
function srsInit(){return {step:-1,due:null,seen:0,lapses:0};}
function srsOnResult(st,allCorrect){
  st.seen+=1; st.ls=today();
  if(allCorrect){ st.step=Math.min(st.step+1,STEPS.length-1);
    let idx=st.step;
    /* «пиявки»: слово с высокой долей ошибок (≥3 ошибок и >1/3 показов) держим
       в коротком цикле ≤16 дней, пока доля ошибок не разбавится успехами */
    if(st.lapses>=3&&st.lapses*3>st.seen) idx=Math.min(idx,3);
    st.due=new Date(Date.now()+STEPS[idx]*864e5).toISOString().slice(0,10);}
  else { st.lapses+=1; st.step=Math.max(-1,st.step-2); st.due=today(); }
  return st;}
function dueRanks(){
  const t=today(), out=[];
  for(const[r,st]of Object.entries(S.srs))
    if(st.due && st.due<=t) out.push(+r);
  return out;}
/* повторение = только просроченные по сроку.
   слово, отвеченное сегодня правильно, уже получило будущий due (srsOnResult) и
   выпадает из очереди → уходит в длинный цикл; отвеченное неправильно имеет due=today
   и остаётся для доработки в тот же день. */
function reviewRanks(){ return dueRanks(); }

/* ---------- Контент из RTDB ---------- */
async function loadContent(){
  const cached=await kvGet('content');
  if(cached){S.wordbank=cached.wordbank; S.course=cached.course;
    S.phrases=cached.phrases||null; S.pcourse=cached.pcourse||null; index(); render(home);}
  try{
    const db=firebase.database();
    const [wb,co,ph,pc]=await Promise.all([db.ref('wordbank').get(), db.ref('course').get(),
      db.ref('phrases').get(), db.ref('pcourse').get()]);
    if(!wb.exists()||!co.exists()) throw new Error('нет данных в RTDB');
    const fresh={wordbank:wb.val(),course:co.val(),
      phrases:ph.exists()?ph.val():null, pcourse:pc.exists()?pc.val():null};
    const changed=!cached||JSON.stringify(cached.course.meta)!==JSON.stringify(fresh.course.meta)
      ||cached.wordbank.schema!==fresh.wordbank.schema
      ||JSON.stringify((cached.pcourse||{}).meta)!==JSON.stringify((fresh.pcourse||{}).meta);
    S.wordbank=fresh.wordbank; S.course=fresh.course;
    S.phrases=fresh.phrases; S.pcourse=fresh.pcourse; index();
    await kvSet('content',fresh);
    if(!cached){await migrateDone(); render(home);}
    else if(changed){const keep={};for(const k in S.doneLessons)if(k.slice(0,2)==='rb'||k.slice(0,2)==='gd')keep[k]=true;S.doneLessons=keep; await migrateDone(); UI.cat=null;
      toast('Контент обновлён'); render(home);}
  }catch(e){
    if(!cached){
      const denied=/permission.?denied/i.test(e.message||'');
      app.innerHTML=denied
        ?`<div class="center" style="padding-top:5vh">${marmot(140,'wave')}
          <h1>Салам! Я Суур</h1>
          <div class="wordcard" style="text-align:left">Я сурок, живу в горах и помогаю учить кыргызский.
          Но чтобы я начал помогать именно тебе, Иван должен включить тебя в список пользователей —
          а твоего адреса (<b>${esc(S.user?.email||'?')}</b>) я там не нашёл.
          <br><br>Напиши Ивану на <a href="mailto:ivan.ninenko@gmail.com?subject=KY APP">ivan.ninenko@gmail.com</a>
          с темой «KY APP» — он добавит тебя, и начнём! 🐹</div>
          <button class="btn ghost" onclick="firebase.auth().signOut().then(()=>location.reload())">Выйти</button></div>`
        :`<div class="wordcard">Не удалось загрузить контент: ${esc(e.message)}.
          <br><br>Проверь доступ (вход выполнен под ${esc(S.user?.email||'?')}).</div>
          <button class="btn ghost" onclick="firebase.auth().signOut().then(()=>location.reload())">Выйти</button>`;}
    else toast('Оффлайн: использую кэш');
  }
}

/* урок считается пройденным, если все его слова/фразы уже изучались (SRS) */
async function migrateDone(){
  let ch=false;
  for(const u of S.course.units)for(const l of u.lessons)
    if(!S.doneLessons[l.id]&&l.word_ranks.length&&
       l.word_ranks.every(r=>S.srs[r]&&S.srs[r].seen>0)){S.doneLessons[l.id]=true; ch=true;}
  if(S.pcourse)for(const lv of ['level2','level3'])for(const u of S.pcourse[lv]||[])
    for(const l of u.lessons)
      if(!S.doneLessons[l.id]&&l.phrase_ids.length&&
         l.phrase_ids.every(r=>S.srs[r]&&S.srs[r].seen>0)){S.doneLessons[l.id]=true; ch=true;}
  if(ch)await kvSet('doneLessons',S.doneLessons);
}
function index(){
  S.byRank={};
  for(const w of S.wordbank.words) S.byRank[w.freq_rank]=w;
  S.topicByRank={};
  if(S.course)for(const u of S.course.units)for(const w of u.words)
    S.topicByRank[w.freq_rank]=w.topic||u.topic||'';
  S.byPid={};
  if(S.phrases)for(const p of S.phrases.phrases) S.byPid[p.id]=p;
}

/* ---------- Маскот: суур ---------- */
function marmot(size,cls=''){
  return `<span class="marmot ${cls}" style="width:${size}px;height:${Math.round(size*1.12)}px">
  <svg viewBox="0 0 120 134" width="${size}" height="${Math.round(size*1.12)}" aria-label="суур">
    <ellipse cx="96" cy="108" rx="14" ry="8" fill="#8a6a42" transform="rotate(-30 96 108)"/>
    <ellipse cx="60" cy="94" rx="37" ry="38" fill="#c9a15e"/>
    <ellipse cx="60" cy="100" rx="25" ry="29" fill="#ecd3a1"/>
    <g class="arm-l"><ellipse cx="90" cy="90" rx="7.5" ry="16" fill="#b58c4e"/>
      <ellipse cx="90" cy="104" rx="6" ry="5" fill="#9a7648"/></g>
    <g class="arm-r"><ellipse cx="30" cy="90" rx="7.5" ry="16" fill="#b58c4e"/>
      <ellipse cx="30" cy="104" rx="6" ry="5" fill="#9a7648"/></g>
    <ellipse cx="42" cy="128" rx="11" ry="6" fill="#8a6a42"/>
    <ellipse cx="78" cy="128" rx="11" ry="6" fill="#8a6a42"/>
    <g class="head">
      <circle cx="26" cy="26" r="9" fill="#8a6a42"/><circle cx="26" cy="26" r="5" fill="#6b4f2f"/>
      <circle cx="94" cy="26" r="9" fill="#8a6a42"/><circle cx="94" cy="26" r="5" fill="#6b4f2f"/>
      <circle cx="60" cy="42" r="30" fill="#c9a15e"/>
      <ellipse cx="60" cy="56" rx="15" ry="11" fill="#ecd3a1"/>
      <ellipse cx="60" cy="49" rx="5.5" ry="4" fill="#4a3423"/>
      <rect x="55" y="55" width="4.6" height="8" rx="1.5" fill="#fff"/>
      <rect x="60.4" y="55" width="4.6" height="8" rx="1.5" fill="#fff"/>
      <circle cx="42" cy="52" r="5" fill="#d98a6a" opacity=".3"/>
      <circle cx="78" cy="52" r="5" fill="#d98a6a" opacity=".3"/>
      <g class="eye"><circle cx="47" cy="40" r="4.6" fill="#2e2018"/>
        <circle cx="48.6" cy="38.4" r="1.5" fill="#fff"/></g>
      <g class="eye"><circle cx="73" cy="40" r="4.6" fill="#2e2018"/>
        <circle cx="74.6" cy="38.4" r="1.5" fill="#fff"/></g>
    </g>
  </svg></span>`;
}

function marmotCup(size){ /* Суур с кубком в вытянутой левой лапе (итерации Ивана) */
  const cup=`<g>
    <path d="M-7 38 h30 v12 a15 15 0 0 1 -30 0 z" fill="#ffc400" stroke="#d9a600" stroke-width="3"/>
    <path d="M-7 41 c-6 1 -6 13 3 13" fill="none" stroke="#d9a600" stroke-width="3"/>
    <path d="M23 41 c6 1 6 13 -3 13" fill="none" stroke="#d9a600" stroke-width="3"/>
    <path d="M-1 41 q-1 8 3 12" stroke="#fff" stroke-width="2.5" fill="none" opacity=".75" stroke-linecap="round"/>
    <rect x="4" y="65" width="8" height="8" fill="#d9a600"/>
    <rect x="-3" y="73" width="22" height="6" rx="2" fill="#b8860b"/>
    <ellipse cx="8" cy="80" rx="7" ry="5.5" fill="#9a7648"/></g>`;
  return marmot(size)
    .replace('viewBox="0 0 120 134"','viewBox="-14 0 134 134"')
    .replace(/<g class="arm-r">[\s\S]*?<\/g>/,
      '<g class="arm-r"><path d="M30 86 L7 84" stroke="#b58c4e" stroke-width="12" stroke-linecap="round" fill="none"/></g>')
    .replace('</svg>',cup+'</svg>');
}

/* ---------- Экраны ---------- */
function render(fn,...a){window.scrollTo(0,0); fn(...a);}

function loginScreen(){
  app.innerHTML=`<div class="center" style="padding-top:12vh">
    ${marmot(150,'wave')}<h1>Кыргызча</h1>
    <p class="muted">Салам! Я Суур, гималайский сурок.<br>Научу тебя кыргызскому!</p>
    <div style="height:20px"></div>
    <button class="btn blue" id="login">Войти через Google</button>
    <div style="height:10px"></div>
    <button class="btn ghost" id="demo">🐹 Демо-вход</button></div>`;
  $('#demo').onclick=()=>{
    const d=showModal(`<h3>🐹 Салам! Я Суур</h3>
      <p class="small">Демо — это просто попробовать: несколько уроков со словами, упражнения,
      опыт и комбо — всё как по-настоящему, только без регистрации и без звука.</p>
      <p class="small"><b>Прогресс я запоминать не буду</b> — закроешь страницу, и всё обнулится.
      Такие правила: серьёзные вещи я храню только для своих.</p>
      <p class="small">Понравится — заходи через Google и напиши Ивану на
      <a href="mailto:ivan.ninenko@gmail.com?subject=KY APP">ivan.ninenko@gmail.com</a>
      (тема «KY APP»), он подключит тебя, и начнём по-настоящему!</p>
      <button class="btn" id="demogo">Попробовать</button>`);
    d.querySelector('#demogo').onclick=()=>{d.remove(); startDemo();};};
  $('#login').onclick=async()=>{
    const p=new firebase.auth.GoogleAuthProvider();
    try{await firebase.auth().signInWithPopup(p);}
    catch(e){ try{await firebase.auth().signInWithRedirect(p);}
      catch(e2){toast('Ошибка входа: '+e2.code);} }
  };
}

