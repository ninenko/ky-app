/* Кыргызча — app_session.js: урок / повторение / сессия.
   Часть разбивки index.html (этап 2, 2026-07-07). Classic-скрипт (НЕ ES-модуль): общий глобальный scope, порядок тегов в index.html обязателен. */
'use strict';
/* ---------- Урок / повторение ---------- */
function lessonScreen(unit,lesson){
  runSession(buildTasks(lesson.word_ranks,true),async(results,sess)=>{
    const first=!S.doneLessons[lesson.id];
    S.doneLessons[lesson.id]=true;
    await kvSet('doneLessons',S.doneLessons);
    await saveLastPos(1,unit.id);
    await finishSession(results,first?10:5,sess);
  });
}
function pLessonScreen(unit,lesson){
  runSession(buildPTasks(lesson.phrase_ids,true),async(results,sess)=>{
    const first=!S.doneLessons[lesson.id];
    S.doneLessons[lesson.id]=true;
    await kvSet('doneLessons',S.doneLessons);
    /* уровень по принадлежности юнита (UI.lvl мог смениться) */
    const lvl=(S.pcourse&&(S.pcourse.level2||[]).some(u=>u.id===unit.id))?2:3;
    await saveLastPos(lvl,unit.id);
    await finishSession(results,first?10:5,sess);
  });
}
/* Свободное повторение из «Моих слов»: SRS не трогаем (due/step/seen не меняются) */
function practiceScreen(tab,ranks){
  const tasks=tab==='w'?buildTasks(ranks,false):buildPTasks(ranks,false);
  runSession(tasks,async(results,sess)=>{
    await finishSession(results,5,sess,true);
  });
}
function reviewScreen(){
  /* приоритет: сначала проблемные (больше ошибок), при равенстве — самые просроченные */
  /* в демо SRS-сроки не наступают (всё «на завтра») — повторяем всё изученное */
  const due=S.demo?Object.keys(S.srs).filter(r=>(S.srs[r].seen||0)>0).map(Number):reviewRanks();
  due.sort((a,b)=>{
    const A=S.srs[a]||{},B=S.srs[b]||{};
    return (B.lapses||0)-(A.lapses||0)
      ||String(A.due||'').localeCompare(String(B.due||''))
      ||Math.random()-0.5;
  });
  const wr=due.filter(r=>r<PID0).slice(0,7);
  const pr=due.filter(r=>r>PID0).slice(0,3);
  const tasks=[...buildTasks(wr,false),...buildPTasks(pr,false)];
  runSession(tasks,async(results,sess)=>{
    await finishSession(results,5,sess);
  });
}

async function finishSession(results,baseXP,sess,practice){
  let xp=baseXP, perfect=true, total=0, correct=0;
  for(const[r,errs]of Object.entries(results)){
    if(!practice){ /* свободное повторение не двигает SRS-циклы */
      const st=S.srs[r]||srsInit();
      S.srs[r]=srsOnResult(st,errs===0);
      await kvSet(r,S.srs[r],'srs');
    }
    total+=1; if(errs===0){correct+=1; xp+=2;} else {perfect=false; xp+=1;}
  }
  if(perfect) xp+=5;
  S.xp+=xp; await kvSet('xp',S.xp);
  const newDay=await registerActivity();
  questBump(xp,perfect);
  syncPush(); // прогресс в облако после каждого урока (fire-and-forget)
  const acc=(sess&&sess.ans)?Math.round(100*sess.ok/sess.ans):(total?Math.round(100*correct/total):100);
  confetti();
  const goalHit=S.doneToday===S.goal;
  app.innerHTML=`<div class="finish">
    <div style="height:14px"></div>${marmot(130,'cheer')}
    <h1>${perfect?'Идеально! 🏆':(practice?'Повторение пройдено!':'Урок пройден!')}</h1>
    ${newDay?`<p class="muted">🔥 Стрик продолжается: <b>${S.streak.count}</b> ${dayWord(S.streak.count)}!</p>`:''}
    ${goalHit?`<p class="muted">🎯 Цель дня выполнена!</p>`:''}
    <div class="fstats">
      <div class="fstat y"><div class="h">Опыт</div><div class="v">⚡ ${xp}</div></div>
      <div class="fstat g"><div class="h">Точность</div><div class="v">${acc}%</div></div>
      <div class="fstat o"><div class="h">Стрик</div><div class="v">🔥 ${S.streak.count}</div></div>
    </div>
    ${tipHTML()}
    <button class="btn" id="cont">Дальше</button></div>`;
  $('#cont').onclick=()=>{UI.cat=null; render(home);}; // раскрыть дерево к следующему уроку
}
function dayWord(n){const m=n%10,h=n%100;
  if(h>=11&&h<=14)return 'дней'; if(m===1)return 'день'; if(m>=2&&m<=4)return 'дня'; return 'дней';}

/* ---------- Сессия ---------- */
function runSession(tasks,onDone){
  prefetchAudio([...new Set(tasks.flatMap(t=>t.ranks||(t.r?[t.r]:[])))]);
  const queue=[...tasks];
  const errors={}, sess={ans:0,ok:0};
  /* Регистрируем КАЖДОЕ изучаемое слово/фразу в результатах (0 ошибок изначально),
     чтобы finishSession обновил SRS даже при 100% верных ответов и слово ушло в цикл.
     Раньше errors заполнялся только на ошибках (+intro/pintro) → идеальное повторение
     не двигало срок, и слова возвращались снова. Инцидент: 2026-07-07. */
  for(const t of tasks){const rs=t.ranks||(t.r!=null?[t.r]:[]);
    for(const rr of rs)if(errors[rr]==null)errors[rr]=0;}
  let total=queue.length, done=0, combo=0;
  const PRAISE=['Отлично!','Верно!','Азамат!','Точно!','Супер!','Мыкты!'];

  function head(){
    app.innerHTML=`<div class="topbar">
      <button class="xbtn" id="close">✕</button>
      <div class="bar"><div id="pbar" style="width:${100*done/total}%"></div></div>
      <span class="combo" id="combo">${combo>=2?'🔥'+combo:''}</span></div>
      <div id="ex" class="padfb"></div>`;
    $('#close').onclick=()=>{if(confirm('Выйти из урока? Прогресс урока не сохранится.'))render(home);};
  }
  function bump(){const p=$('#pbar'); if(p)p.style.width=`${100*done/total}%`;
    const c=$('#combo'); if(c)c.textContent=combo>=2?'🔥'+combo:'';}

  function feedback(ok,detail,onNext){
    const old=document.querySelector('.fb'); if(old)old.remove();
    const el=document.createElement('div');
    el.className='fb '+(ok?'ok':'bad');
    el.innerHTML=`<div class="in" style="display:flex; gap:14px; align-items:flex-start">
      <div style="flex-shrink:0; margin-top:2px">${marmot(52, ok?'happy':'sad')}</div>
      <div style="flex:1"><div class="t">${ok?PRAISE[Math.floor(Math.random()*PRAISE.length)]:'Не совсем…'}</div>
      ${detail?`<div class="d">${detail}</div>`:''}
      <button class="btn ${ok?'':'red'}" id="fnext">Дальше</button></div></div>`;
    const host=$('#ex')||document.body;
    host.appendChild(el);
    requestAnimationFrame(()=>el.scrollIntoView({block:'nearest',behavior:'smooth'}));
    $('#fnext').onclick=()=>{el.remove(); onNext();};
  }

  function finishTask(ok,detail){
    done+=1; sess.ans+=1; if(ok)sess.ok+=1;
    if(ok){combo+=1;} else {combo=0;
      errors[curR()]=(errors[curR()]||0)+1; total+=1; queue.push(queue[0]);}
    bump();
    feedback(ok,detail,()=>{queue.shift(); next();});
  }
  function curR(){return queue[0].r;}

  function next(){
    if(!queue.length){onDone(errors,sess);return;}
    head();
    const t=queue[0];
    const ex=$('#ex');

    /* -- match -- */
    if(t.type==='match'){
      const pairs=t.ranks.map(r=>S.byRank[r]);
      let sel=null, left=pairs.length, err=0;
      const ky=shuffle(pairs.map(w=>({k:w.freq_rank,txt:w.word})));
      const ru=shuffle(pairs.map(w=>({k:w.freq_rank,txt:shortTr(w)})));
      ex.innerHTML=`<p class="prompt">Соедини пары</p><div class="match">
        ${ru.map((o,i)=>`<button class="mbtn" data-k="${o.k}" data-s="ru">${esc(o.txt)}</button>`+
          `<button class="mbtn" data-k="${ky[i].k}" data-s="ky">${esc(ky[i].txt)}</button>`).join('')}
      </div>`;
      document.querySelectorAll('.mbtn').forEach(b=>b.onclick=()=>{
        if(b.classList.contains('done'))return;
        if(sel===b){b.classList.remove('sel');sel=null;return;}
        if(!sel||sel.dataset.s===b.dataset.s){
          if(sel)sel.classList.remove('sel');
          sel=b; b.classList.add('sel'); return;}
        if(sel.dataset.k===b.dataset.k){
          playAudio(+b.dataset.k);
          sel.classList.remove('sel'); sel.classList.add('done'); b.classList.add('done');
          sel=null; left-=1;
          if(!left){
            done+=1; sess.ans+=1; if(err===0){sess.ok+=1; combo+=1;}else combo=0; bump();
            feedback(err===0,null,()=>{queue.shift(); next();});
          }
        } else {
          err+=1;
          sel.classList.add('err'); b.classList.add('err');
          const a=sel; sel=null;
          setTimeout(()=>{a.classList.remove('err','sel');b.classList.remove('err');},450);
        }
      });
      return;
    }

    /* -- фразы -- */
    if(t.type==='pintro'||t.type==='pky2ru'||t.type==='pbuild'||t.type==='plis'){
      const ph=S.byPid[t.r];
      if(t.type==='pintro'){
        errors[t.r]=errors[t.r]||0;
        playAudio(ph.id);
        ex.innerHTML=`<p class="prompt">Новая фраза</p>
          <div class="wordcard">
          <div class="ruword" style="font-size:24px">${esc(ph.ky)} <span class="spk" data-spk="${ph.id}">🔊</span></div>
          <div class="tr">${esc(ph.ru)}</div>
          <div><span class="topic-pill">${esc(ph.topic)}</span></div></div>
          <button class="btn" id="ok">Понятно</button>`;
        $('#ok').onclick=()=>{done+=1;bump();queue.shift();next();};
        return;
      }
      if(t.type==='pky2ru'){
        const opts=shuffle([{v:ph.ru,r:ph.id},...pdistract(ph,3)]);
        playAudio(ph.id);
        ex.innerHTML=`<p class="prompt">Выбери перевод</p>
          <div class="ruword" style="font-size:22px">${esc(ph.ky)} <span class="spk" data-spk="${ph.id}">🔊</span></div>
          ${opts.map(o=>`<button class="opt" data-r="${o.r}">${esc(o.v)}</button>`).join('')}`;
        document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
          const ok=+b.dataset.r===ph.id;
          b.classList.add(ok?'ok':'bad');
          if(ok)b.classList.add('pop');
          if(!ok){
            document.querySelectorAll('.opt').forEach(x=>{
              if(+x.dataset.r===ph.id)x.classList.add('ok');});
            const cr=+b.dataset.r;
            if(cr){const m=S.confus[t.r]=S.confus[t.r]||{};
              m[cr]=(m[cr]||0)+1; kvSet('confus',S.confus);}
          }
          document.querySelectorAll('.opt').forEach(x=>x.disabled=true);
          finishTask(ok, ok?null:`${esc(ph.ky)} — ${esc(ph.ru)}`);});
        return;
      }
      if(t.type==='plis'){
        playAudio(ph.id);
        const opts=shuffle([{v:ph.ru,r:ph.id},...pdistract(ph,3)]);
        ex.innerHTML=`<p class="prompt">${S.mute?'Что это значит?':'Что ты услышал?'}</p>
          <div class="center">${S.mute?`<div class="kyword" style="font-size:22px">${esc(ph.ky)}</div>`:`<span class="lisbtn" data-spk="${ph.id}">🔊</span>`}</div>
          ${opts.map(o=>`<button class="opt" data-r="${o.r}">${esc(o.v)}</button>`).join('')}`;
        document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
          const ok=+b.dataset.r===ph.id;
          b.classList.add(ok?'ok':'bad');
          if(ok)b.classList.add('pop');
          if(!ok){
            document.querySelectorAll('.opt').forEach(x=>{if(+x.dataset.r===ph.id)x.classList.add('ok');});
            const cr=+b.dataset.r;
            if(cr){const m=S.confus[t.r]=S.confus[t.r]||{};m[cr]=(m[cr]||0)+1;kvSet('confus',S.confus);}
          }
          document.querySelectorAll('.opt').forEach(x=>x.disabled=true);
          finishTask(ok,`<b>${esc(ph.ky)}</b> — ${esc(ph.ru)}`);});
        return;
      }
      /* pbuild: собери фразу из плиток */
      const {words,tiles}=pTiles(ph);
      const picked=[];
      ex.innerHTML=`<p class="prompt">Собери фразу по-кыргызски</p>
        <div class="ruword">${esc(ph.ru)}</div>
        <div class="answer" id="ans"></div>
        <div class="tiles" id="tiles">${tiles.map((w,i)=>
          `<button class="tile" data-i="${i}">${esc(w)}</button>`).join('')}</div>
        <button class="btn" id="check" disabled>Проверить</button>`;
      const redraw=()=>{
        $('#ans').innerHTML=picked.map(i=>
          `<button class="tile" data-p="${i}">${esc(tiles[i])}</button>`).join('');
        document.querySelectorAll('#tiles .tile').forEach(b=>
          b.classList.toggle('used',picked.includes(+b.dataset.i)));
        $('#check').disabled=picked.length===0;
        document.querySelectorAll('#ans .tile').forEach(b=>b.onclick=()=>{
          picked.splice(picked.indexOf(+b.dataset.p),1); redraw();});
      };
      document.querySelectorAll('#tiles .tile').forEach(b=>b.onclick=()=>{
        if(!picked.includes(+b.dataset.i)){picked.push(+b.dataset.i); redraw();}});
      $('#check').onclick=()=>{
        const got=picked.map(i=>tiles[i]).join(' ');
        const norm=s=>s.toLowerCase().replace(/[.,!?«»]/g,'').replace(/\s+/g,' ').trim();
        const ok=norm(got)===norm(ph.ky);
        playAudio(ph.id);
        $('#check').disabled=true;
        document.querySelectorAll('.tile').forEach(x=>x.disabled=true);
        finishTask(ok, ok?null:`Правильно: <b>${esc(ph.ky)}</b>`);};
      return;
    }

    const w=S.byRank[t.r];

    /* -- аудирование: слово на слух -- */
    if(t.type==='lis'){
      playAudio(w.freq_rank);
      const opts=shuffle([{v:shortTr(w),r:w.freq_rank},...distractors(w,3,'tr')]);
      ex.innerHTML=`<p class="prompt">${S.mute?'Что это значит?':'Что ты услышал?'}</p>
        <div class="center">${S.mute?`<div class="kyword">${esc(w.word)}</div>`:`<span class="lisbtn" data-spk="${w.freq_rank}">🔊</span>`}</div>
        ${opts.map(o=>`<button class="opt" data-r="${o.r}">${esc(o.v)}</button>`).join('')}`;
      document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
        const ok=+b.dataset.r===w.freq_rank;
        b.classList.add(ok?'ok':'bad');
        if(ok)b.classList.add('pop');
        if(!ok){
          document.querySelectorAll('.opt').forEach(x=>{if(+x.dataset.r===w.freq_rank)x.classList.add('ok');});
          const cr=+b.dataset.r;
          if(cr){const m=S.confus[t.r]=S.confus[t.r]||{};m[cr]=(m[cr]||0)+1;kvSet('confus',S.confus);}
        }
        document.querySelectorAll('.opt').forEach(x=>x.disabled=true);
        finishTask(ok,`<b>${esc(w.word)}</b> — ${esc(shortTr(w))}`);});
      return;
    }

    /* -- intro -- */
    if(t.type==='intro'){
      errors[t.r]=errors[t.r]||0;
      playAudio(w.freq_rank);
      ex.innerHTML=`<p class="prompt">Новое слово</p>
        <div class="wordcard">
        <div class="kyword">${esc(w.word)} <span class="spk" data-spk="${w.freq_rank}">🔊</span></div>
        <div class="tr">${esc(w.translation)}</div>
        ${w.translation2?`<div class="also">также: ${esc(w.translation2)}</div>`:''}
        ${findTopic(t.r)?`<div><span class="topic-pill">${esc(findTopic(t.r))}</span></div>`:''}</div>
        <button class="btn" id="ok">Понятно</button>`;
      $('#ok').onclick=()=>{done+=1;bump();queue.shift();next();};
      return;
    }

    /* -- выбор варианта -- */
    if(t.type==='ky2ru'||t.type==='ru2ky'){
      const q=t.type==='ky2ru'?w.word:shortTr(w);
      const ans=t.type==='ky2ru'?shortTr(w):w.word;
      const field=t.type==='ky2ru'?'tr':'word';
      const opts=shuffle([{v:ans,r:w.freq_rank},...distractors(w,3,field==='word'?'word':'tr')]);
      ex.innerHTML=`<p class="prompt">${t.type==='ky2ru'?'Выбери перевод':'Выбери кыргызское слово'}</p>
        <div class="${t.type==='ky2ru'?'kyword':'ruword'}">${esc(q)}${t.type==='ky2ru'?` <span class="spk" data-spk="${w.freq_rank}">🔊</span>`:''}</div>
        ${opts.map(o=>`<button class="opt" data-r="${o.r}">${esc(o.v)}</button>`).join('')}`;
      if(t.type==='ky2ru')playAudio(w.freq_rank);
      document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
        const ok=+b.dataset.r===w.freq_rank;
        b.classList.add(ok?'ok':'bad');
        if(ok)b.classList.add('pop');
        if(!ok){
          document.querySelectorAll('.opt').forEach(x=>{
            if(+x.dataset.r===w.freq_rank)x.classList.add('ok');});
          /* запомнить, с чем перепутал — это слово будет чаще приходить дистрактором */
          const cr=+b.dataset.r;
          if(cr){const m=S.confus[t.r]=S.confus[t.r]||{};
            m[cr]=(m[cr]||0)+1; kvSet('confus',S.confus);}
        }
        document.querySelectorAll('.opt').forEach(x=>x.disabled=true);
        if(t.type==='ru2ky')playAudio(w.freq_rank);
        finishTask(ok, ok?null:`${esc(w.word)} — ${esc(shortTr(w))}`);});
      return;
    }

    /* -- набор текста -- */
    if(t.type==='type'){
      ex.innerHTML=`<p class="prompt">Напиши по-кыргызски</p>
        <div class="ruword">${esc(shortTr(w))}</div>
        <input type="text" id="inp" autocomplete="off" autocapitalize="off" lang="ky">
        <div class="kyletters">${['ө','ү','ң'].map(c=>
          `<button data-c="${c}">${c}</button>`).join('')}</div>
        <button class="btn" id="check">Проверить</button>`;
      const inp=$('#inp'); inp.focus();
      document.querySelectorAll('.kyletters button').forEach(b=>b.onclick=()=>{
        const s=inp.selectionStart||inp.value.length;
        inp.value=inp.value.slice(0,s)+b.dataset.c+inp.value.slice(s);
        inp.focus(); inp.selectionStart=inp.selectionEnd=s+1;});
      const check=()=>{
        if(!inp.value.trim())return;
        const norm=s=>s.toLowerCase().replace(/ё/g,'е').trim().replace(/\s+/g,' ');
        const ok=norm(inp.value)===norm(w.word);
        playAudio(w.freq_rank);
        $('#check').disabled=true; inp.disabled=true;
        finishTask(ok, ok?null:`Правильно: <b>${esc(w.word)}</b>`);};
      $('#check').onclick=check;
      inp.onkeydown=e=>{if(e.key==='Enter'&&!$('#check').disabled)check();};
      return;
    }
  }
  next();
}
function findTopic(r){return S.topicByRank[r]||'';}

