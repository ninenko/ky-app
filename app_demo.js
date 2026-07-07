/* Кыргызча — app_demo.js: демо-режим: мини-курс в памяти (Tilchi open-source); аудио в demo_audio.js.
   Часть разбивки index.html (этап 2, 2026-07-07). Classic-скрипт (НЕ ES-модуль): общий глобальный scope, порядок тегов в index.html обязателен. */
'use strict';
/* ---------- Демо-режим: мини-курс в памяти (Tilchi open-source, реальные записи банка) ---------- */
/* DEMO_AUDIO вынесен в demo_audio.js (этап 1 разбивки, 2026-07-07) — грузится отдельным <script> выше */
const DEMO_WORDS=[
 {freq_rank:64,word:'мен',translation:'я'},
 {freq_rank:2051,word:'сен',translation:'ты'},
 {freq_rank:241,word:'ким',translation:'кто'},
 {freq_rank:34,word:'адам',translation:'человек'},
 {freq_rank:382,word:'ата',translation:'отец'},
 {freq_rank:1859,word:'эне',translation:'мать'},
 {freq_rank:1394,word:'тоо',translation:'гора'},
 {freq_rank:245,word:'суу',translation:'вода'},
 {freq_rank:189,word:'жер',translation:'земля, место'},
 {freq_rank:326,word:'үй',translation:'дом'},
 {freq_rank:199,word:'күн',translation:'день',translation2:'солнце'},
 {freq_rank:708,word:'ат',translation:'лошадь, конь',translation2:'имя'},
 {freq_rank:148,word:'жакшы',translation:'хороший, хорошо'},
 {freq_rank:1215,word:'жаман',translation:'плохой'},
 {freq_rank:130,word:'чоң',translation:'большой',translation2:'старший'},
 {freq_rank:2131,word:'ооба',translation:'да'},
 {freq_rank:16,word:'жок',translation:'нет, не имеется'},
 {freq_rank:197,word:'эмне',translation:'что'}];
const DEMO_UNITS=[
 {id:1,title:'Знакомство I',topic:'Люди и семья',
  lessons:[{id:'dm1-l1',word_ranks:[64,2051,241]},{id:'dm1-l2',word_ranks:[34,382,1859]}]},
 {id:2,title:'Мир вокруг I',topic:'Природа и окружающий мир',
  lessons:[{id:'dm2-l1',word_ranks:[1394,245,189]},{id:'dm2-l2',word_ranks:[326,199,708]}]},
 {id:3,title:'Первые слова I',topic:'Общая лексика',
  lessons:[{id:'dm3-l1',word_ranks:[148,1215,130]},{id:'dm3-l2',word_ranks:[2131,16,197]}]}];
function startDemo(){
  S.demo=true; S.user=null; S.mute=false;
  S.streak={count:0,last:null,freezes:2}; S.xp=0; S.goal=2; S.settings=null;
  S.doneLessons={}; S.confus={}; S.srs={}; S.doneToday=0; S.week=null; S.tipN=0;
  const units=DEMO_UNITS.map(u=>({...u,
    words:u.lessons.flatMap(l=>l.word_ranks).map(r=>({freq_rank:r,topic:u.topic}))}));
  S.wordbank={schema:'demo',words:DEMO_WORDS};
  S.course={meta:{v:'demo'},units};
  S.phrases=null; S.pcourse=null;
  UI.lvl=1; UI.cat=null; UI.unit=-1;
  index(); render(home);
}

const UNIT_COLORS=[['#58cc02','#46a302'],['#1cb0f6','#1899d6'],['#ce82ff','#a568cc'],
  ['#ff9600','#cc7800'],['#ff4b4b','#d33131'],['#2bc7c4','#22a09d']];

function goalRing(){
  const p=Math.min(1,S.doneToday/S.goal), C=2*Math.PI*10;
  return `<svg class="goalring" viewBox="0 0 26 26">
    <circle class="bgc" cx="13" cy="13" r="10"/>
    <circle class="fgc" cx="13" cy="13" r="10" stroke-dasharray="${C}"
      stroke-dashoffset="${C*(1-p)}"/></svg>`;
}

function firstUndone(){
  for(const u of S.course.units)
    for(const l of u.lessons)
      if(!S.doneLessons[l.id]) return {u,l};
  return null;
}

