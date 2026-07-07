/* Кыргызча — app_boot.js: конфетти, модалки, sync прогресса, запуск (+история build-комментариев).
   Часть разбивки index.html (этап 2, 2026-07-07). Classic-скрипт (НЕ ES-модуль): общий глобальный scope, порядок тегов в index.html обязателен. */
'use strict';
/* ---------- Конфетти ---------- */
function confetti(){
  const cv=$('#confetti'), ctx=cv.getContext('2d');
  cv.width=innerWidth; cv.height=innerHeight;
  const cols=['#58cc02','#1cb0f6','#ffc400','#ff4b4b','#ce82ff'];
  const ps=Array.from({length:80},()=>({
    x:Math.random()*cv.width, y:-20-Math.random()*cv.height*0.5,
    vx:(Math.random()-0.5)*3, vy:2+Math.random()*4,
    s:5+Math.random()*6, c:cols[Math.floor(Math.random()*cols.length)],
    a:Math.random()*Math.PI, va:(Math.random()-0.5)*0.3}));
  let frames=0;
  (function tick(){
    ctx.clearRect(0,0,cv.width,cv.height);
    for(const p of ps){
      p.x+=p.vx; p.y+=p.vy; p.a+=p.va;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a);
      ctx.fillStyle=p.c; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s); ctx.restore();
    }
    if(++frames<130)requestAnimationFrame(tick);
    else ctx.clearRect(0,0,cv.width,cv.height);
  })();
}

/* ---------- Модалки: о приложении / письма Суура ---------- */
function showModal(html){
  const d=document.createElement('div'); d.className='ovl';
  d.innerHTML=`<div class="mcard">${html}</div>`;
  document.body.appendChild(d);
  d.onclick=e=>{if(e.target===d)d.remove();};
  return d;
}
function showAbout(){
  const d=showModal(`<h3>🐹 Ky App — о приложении</h3>
  <p class="small">Личное приложение для изучения кыргызского языка (на базе русского). Его построил Иван вместе с ИИ-ассистентом Claude (Anthropic): Claude собирал и вычищал языковые данные, писал код, курировал переводы; Иван ставил задачи, принимал решения и проверял результат.</p>
  <p class="small"><b>Данные</b> — из источников, открыто доступных в сети: словарь Tilchi (открытый код), частотные списки на основе корпуса новостей «Азаттык» (RFE/RL) и Mozilla Common Voice (CC0), предложения Tatoeba (CC-BY), самоучитель Исаева и Шнейдмана (1988), официальная терминология школьной реформы КР, академические тексты по педагогике.</p>
  <p class="small"><b>Честное предупреждение:</b> переводы и темы курированы ИИ и не проверены носителем языка — неточности возможны. Считай приложение тренажёром, а не эталоном.</p>
  <p class="small"><b>Озвучка:</b> синтезированная (OmniVoice — клонирование голоса носителя; два голоса, мужской и женский, чередуются случайно; 11 слов — живые записи Mozilla Common Voice). Произношение может слегка отличаться от живой речи. Подсказка: ударение в кыргызском почти всегда падает на последний слог.</p>
  <p class="small"><b>Механики:</b> интервальное повторение (SM-2), аудирование, четыре уровня (слова · фразы · предложения · чтение: тексты Belebele), XP, стрики и маскот-сурок Суур. Некоммерческий проект для личного обучения.</p>
  <button class="btn" id="mclose">Понятно</button>`);
  d.querySelector('#mclose').onclick=()=>d.remove();
}
function showRemind(){
  const st=S.settings||{email:(S.user&&S.user.email)||'',reminders:false};
  const d=showModal(`<h3>✉️ Письма от Суура</h3>
  <p class="small">Пропустил день — вечером (~20:00 по Бишкеку) Суур напомнит письмом. По воскресеньям пришлёт отчёт о прогрессе за неделю. Занимался — ежедневное письмо не приходит.</p>
  ${S.demo?`<p class="small" style="background:#fff7df;border:2px solid #ffe28a;border-radius:10px;padding:8px 10px">🐹 В демо-режиме письма не работают: я же не запоминаю ни твой прогресс, ни адрес. Подключишься по-настоящему — буду писать!</p>`:''}
  <label class="small" style="display:flex;gap:8px;align-items:center;margin:12px 0">
    <input type="checkbox" id="remOn" ${st.reminders?'checked':''} ${S.demo?'disabled':''}> Получать письма</label>
  <input type="email" id="remMail" value="${esc(st.email||'')}" placeholder="твой email"
    style="width:100%;box-sizing:border-box;padding:10px;border:2px solid var(--line);border-radius:10px;font:inherit">
  <br><br><button class="btn" id="remSave">Сохранить</button>`);
  d.querySelector('#remSave').onclick=async()=>{
    if(S.demo){toast('🐹 В демо письма не работают'); d.remove(); return;}
    const em=d.querySelector('#remMail').value.trim();
    const on=d.querySelector('#remOn').checked;
    if(on&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){toast('Проверь email');return;}
    S.settings={email:em,reminders:on};
    await kvSet('settings',S.settings); syncPush();
    toast(on?'✉️ Письма Суура включены':'Письма Суура выключены'); d.remove();};
}

/* ---------- Sync прогресса: local-first, RTDB progress/<uid> ---------- */
/* Ключи srs/confus числовые -> префикс 'r', иначе RTDB превратит объект в гигантский массив */
function encProg(){
  const srs={},conf={};
  for(const[k,v]of Object.entries(S.srs))srs['r'+k]=v;
  for(const[k,v]of Object.entries(S.confus)){
    const o={};for(const[k2,c]of Object.entries(v))o['r'+k2]=c;conf['r'+k]=o;}
  return {updated:Date.now(),xp:S.xp,goal:S.goal,streak:S.streak,settings:S.settings||null,
    doneToday:{d:today(),n:S.doneToday},doneLessons:S.doneLessons,srs,confus:conf};
}
let syncBusy=false;
async function syncPush(){
  if(!S.user||syncBusy)return;
  syncBusy=true;
  try{await firebase.database().ref('progress/'+S.user.uid).set(encProg());}
  catch(e){/* оффлайн — локальный прогресс главный, дольёмся позже */}
  syncBusy=false;
}
async function syncPull(){
  if(!S.user)return;
  try{
    const snap=await firebase.database().ref('progress/'+S.user.uid).get();
    if(!snap.exists()){await syncPush();return;}
    const R=snap.val(); let ch=false;
    /* SRS: на каждый ключ берём запись с бОльшим seen (при равных — более поздний due) */
    for(const[rk,v]of Object.entries(R.srs||{})){
      const k=rk.slice(1), l=S.srs[k];
      if(!l||v.seen>l.seen||(v.seen===l.seen&&(v.due||'')>(l.due||''))){
        if(!l||JSON.stringify(l)!==JSON.stringify(v)){S.srs[k]=v; await kvSet(k,v,'srs'); ch=true;}
      }
    }
    if((R.xp||0)>S.xp){S.xp=R.xp; await kvSet('xp',S.xp); ch=true;}
    const rs=R.streak;
    if(rs&&rs.last&&(!S.streak.last||rs.last>S.streak.last||
       (rs.last===S.streak.last&&rs.count>S.streak.count))){
      S.streak=rs; await kvSet('streak',S.streak); ch=true;}
    const rdt=R.doneToday;
    if(rdt&&rdt.d===today()&&rdt.n>S.doneToday){
      S.doneToday=rdt.n; await kvSet('doneToday',{d:today(),n:S.doneToday}); ch=true;}
    let dlCh=false;
    for(const k of Object.keys(R.doneLessons||{}))
      if(!S.doneLessons[k]){S.doneLessons[k]=true; dlCh=true;}
    if(dlCh){await kvSet('doneLessons',S.doneLessons); ch=true;}
    let cfCh=false;
    for(const[rk,o]of Object.entries(R.confus||{})){
      const k=rk.slice(1); S.confus[k]=S.confus[k]||{};
      for(const[rk2,c]of Object.entries(o||{})){
        const k2=rk2.slice(1);
        if((S.confus[k][k2]||0)<c){S.confus[k][k2]=c; cfCh=true;}
      }
    }
    if(cfCh){await kvSet('confus',S.confus); ch=true;}
    if(R.settings&&!S.settings){S.settings=R.settings; await kvSet('settings',S.settings); ch=true;}
    if(ch)toast('☁️ Прогресс синхронизирован');
    await syncPush(); // записываем результат слияния
  }catch(e){/* оффлайн — работаем локально */}
}

/* ---------- Запуск ---------- */
(async function(){
  idb=await idbOpen();
  await loadMeta();
  firebase.auth().onAuthStateChanged(async u=>{
    if(!u){render(loginScreen);return;}
    S.user=u;
    app.innerHTML=`<div class="center" style="padding-top:30vh">Загружаю курс…</div>`;
    S.srs=await srsAll();
    await syncPull();
    await loadContent();
    syncPush(); // migrateDone мог дополнить doneLessons
  });
  if('serviceWorker'in navigator)
    navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
/* build: v1.4.4 2026-07-07 — 📦 этап 2 разбивки: основной скрипт порезан на 6 classic-скриптов (core/demo/nav/extras/session/boot) по границам секций, байт-в-байт; 'use strict' в каждом; index.html = 20.9 КБ; SHELL +6. */
/* build: v1.4.3 2026-07-07 — 📦 этап 1 разбивки оболочки: DEMO_AUDIO (202 КБ base64) вынесен в demo_audio.js (обычный <script>, не ES-модуль); sw.js SHELL + demo_audio.js. index.html похудел ~318→~117 КБ. */
/* build: v1.4.2 2026-07-07 — 🐛 ФИКС повторения: слово, отвеченное ВЕРНО, теперь уходит в цикл. Баг: errors/results наполнялся только на ошибках (+intro/pintro), в повторении intro нет → идеальная сессия давала пустой results → finishSession не вызывал srsOnResult → due не двигался, слова возвращались. Фикс: runSession засеивает errors[r]=0 для всех изучаемых рангов (слова+фразы+match). В «Мои слова» добавлены пометки цикла: 🟢 длинный цикл / 🔵 закрепляю / 🟠 учу / 🌀 трудное + ⏰ «пора повторить» / «через N дн.» + интервал в деталях. Прежнее: v1.4.1 2026-07-07 — 🐹 демо озвучено: аудио 18 демо-слов (16 OmniVoice ×2 голоса + 2 живых CV) вшито в оболочку (DEMO_AUDIO), демо читает из памяти, тихий режим больше не форсится, плашка «звука нет» убрана; OmniVoice Apache-2.0 + CV CC0 → публиковать аудио можно; прежнее: v1.4.0 2026-07-07 — 🔊 переозвучка на OmniVoice (два голоса, случайное чередование м/ж при каждом воспроизведении); audio2/{w,p}/r* = {m,f} либо {cv}; старый строковый AkylAI-кэш инвалидируется (перезагрузка объекта); экран «о приложении» обновлён; прежнее: v1.3.7 2026-07-07 — повторение: слово, отвеченное сегодня правильно, уходит в длинный цикл (reviewRanks = только просроченные по due; убрано включение всего с ls===today; неправильные остаются, т.к. due=today); прежнее: v1.3.6 2026-07-06 — финальный Суур с кубком: рука горизонтально от края тела (зеркально правой), крупный кубок целиком левее головы, viewBox -14; прежнее: v1.3.5 2026-07-06 — кубок крупнее, в правой лапе над прогресс-баром (лапа поверх кубка); прежнее: v1.3.3 2026-07-06 — Суур с кубком вместо 🏆 на пройденных юнитах (marmotCup, 5 мест); повторение = просроченные + пройденное сегодня (srs.ls, reviewRanks); прежнее: v1.3.2 2026-07-06 — повторение в демо: все изученные слова (иначе кнопка не появлялась — SRS-сроки завтрашние); прежнее: v1.3.1 2026-07-06 — модалка писем в демо: плашка «письма не работают», галочка disabled, сохранение — тост; прежнее: v1.3 2026-07-06 — 🐹 демо-вход без регистрации: модалка Суура, мини-курс 18 слов/3 юнита в памяти (Tilchi open-source, реальные записи банка), тихий режим, kv отключён (ничего не сохраняется), баннер с mailto; прежнее: v1.2.10 2026-07-06 — экран Permission denied: приветствие Суура с маскотом и mailto ivan.ninenko@gmail.com (тема KY APP); прежнее: v1.2.9 2026-07-06 — откат P.S. в модалке писем (не нужен: письма включаются сами); прежнее: v1.2.8 2026-07-06 — модалка писем Суура: примечание про доступ по списку (Gmail сообщить Ивану); прежнее: v1.2.7 2026-07-06 — подсказка ❄️: дата последнего сгорания заморозки (streak.burn/burnN); прежнее: v1.2.6 2026-07-06 — Enter на десктопе жмёт «Дальше» (фидбек/интро/чтение/диалоги/финиш; из инпутов и с фокуса на кнопках не перехватывается); прежнее: v1.2.5 2026-07-06 — точность на финише = верные ответы/все ответы (sess в runSession; раньше — доля слов без единой ошибки, отсюда 0% при ошибке в каждом слове); прежнее: v1.2.4 2026-07-06 — фавиконка таба: мордочка Суура (SVG data-URI, голова маскота); прежнее: v1.2.3 2026-07-06 — клик по уровню на главной: подсказка со всеми 7 уровнями XP и позицией; прежнее: v1.2.2 2026-07-06 — футер: строки цель/ссылки/дисклеймер (flex), без упоминания источников фраз; прежнее: v1.2.1 2026-07-06 — 🔇 тихий режим (тумблер в статбаре: без автоплея и 🔊, lis/plis заменяются текстовыми, диалоги по транскрипту, kv mute); прежнее: v1.2 2026-07-06 — 🎧 Диалоги (Peace Corps: 10 аудио-диалогов носителей, RTDB dialogs + audio/d, ключи gd*), 🎯 квесты недели (XP/уроки/идеальные, локально, бонус-XP), 💡 грамм-подсказки (ротация на финише + экран «Грамматика» из футера); прежнее: v1.1.1 2026-07-06 — прогресс-бары у всех юнитов, подсветка начатых, 🏆 за пройденные (золотая карточка); прежнее: v1.1 2026-07-06 — аудирование (слово/фраза на слух, написание после ответа) + уровень «Чтение» (Belebele kir_Cyrl: 488 текстов / 900 вопросов, RTDB reading, лениво+кэш); прежнее: v1.0 2026-07-06 — озвучка всех слов и фраз (AkylAI TTS + 11 клипов Common Voice; RTDB audio/*, кэш IndexedDB, 🔊 и автоплей в упражнениях и «Моих словах»); прежнее: v0.3.5-words 2026-07-06 — экран «Мои слова» (изученный словарь: фильтры учу/знаю/сложные, поиск, детали по тапу); прежнее: v0.3.4-fb 2026-07-05 — leech-cap (проблемные слова не уходят дальше 16 дней) + приоритет проблемных/просроченных в повторении */
