import{FlatPreview,PREVIEW_STYLES,PREVIEW_DURATION,paintFlatPreview}from'./flat-preview-model.mjs?v=0581627ae3b8';
const $=id=>document.getElementById(id),grid=$('styles'),dialog=$('detail'),storageKey='flat-style-choices-v83';
let choices={};try{choices=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}catch{}
const cards=PREVIEW_STYLES.map(style=>{
 const card=document.createElement('article');card.className='card';card.innerHTML=`<div class="card-head"><h2><span class="number">${style.number}</span>${style.name}</h2><button class="expand" type="button" aria-label="放大查看 ${style.number} ${style.name}">放大查看</button></div><canvas width="720" height="630" aria-label="${style.number} ${style.name} 动态预览"></canvas><div class="choices" aria-label="${style.number} 选择"><button type="button" data-choice="keep" aria-pressed="false">保留</button><button type="button" data-choice="remove" aria-pressed="false">不要</button></div>`;grid.append(card);
 return{...style,card,canvas:card.querySelector('canvas'),preview:new FlatPreview(style.pattern),visible:true};
});
let time=0,playing=true,previous=0,lastDraw=-Infinity,detail=null,disposed=false,frame=0;
function report(error){$('error').hidden=false;$('error').textContent='预览暂时无法播放，请刷新重试。';console.error(error);}
function selectionText(){const groups=[['keep','保留'],['remove','不要']].map(([key,label])=>{const list=cards.filter(c=>choices[c.number]===key).map(c=>`${c.number} ${c.name}`);return list.length?label+'：'+list.join('、'):'';});return groups.filter(Boolean).join('；');}
function updateChoices(){for(const c of cards){const choice=choices[c.number];c.card.dataset.choice=['keep','remove'].includes(choice)?choice:'';for(const button of c.card.querySelectorAll('[data-choice]'))button.setAttribute('aria-pressed',String(choice===button.dataset.choice));}const text=selectionText();$('selection').textContent=text||'可在卡片下方标记，也可以直接告诉我编号。';$('copy').disabled=!text;$('copy').textContent='复制选择';try{localStorage.setItem(storageKey,JSON.stringify(choices));}catch{}}
function render(){for(const c of cards){c.preview.advance(time);if(c.visible)paintFlatPreview(c.canvas,c.preview);}if(detail)paintFlatPreview($('detail-canvas'),detail.preview);$('timeline').value=String(time);$('clock').value=time.toFixed(2)+' s';}
function setPlaying(value){playing=value;$('toggle').textContent=value?'暂停':'播放';previous=performance.now();}
function replay(){time=0;for(const c of cards)c.preview.reset();setPlaying(true);render();}
for(const c of cards){
 c.card.querySelector('.expand').onclick=()=>{detail=c;$('detail-title').textContent=c.number+' '+c.name;paintFlatPreview($('detail-canvas'),c.preview);dialog.showModal();};
 for(const button of c.card.querySelectorAll('[data-choice]'))button.onclick=()=>{choices[c.number]=choices[c.number]===button.dataset.choice?null:button.dataset.choice;updateChoices();};
}
$('toggle').onclick=()=>setPlaying(!playing);$('replay').onclick=replay;$('detail-replay').onclick=replay;
$('timeline').oninput=()=>{setPlaying(false);time=+$('timeline').value;try{render();}catch(error){report(error);}};
$('close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{detail=null;});
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(selectionText());$('copy').textContent='已复制';}catch{$('selection').textContent=selectionText()+'（可直接选中此文字复制）';}};
if(typeof IntersectionObserver!=='undefined'){const observer=new IntersectionObserver(entries=>{for(const entry of entries){const c=cards.find(c=>c.card===entry.target);c.visible=entry.isIntersecting;if(c.visible)paintFlatPreview(c.canvas,c.preview);}},{rootMargin:'80px'});for(const c of cards)observer.observe(c.card);window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});}
document.addEventListener('visibilitychange',()=>{previous=performance.now();});window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);});window.addEventListener('pageshow',()=>{if(disposed){disposed=false;previous=performance.now();frame=requestAnimationFrame(tick);}});
function tick(now){if(disposed)return;const dt=previous?Math.min(.10,(now-previous)/1000):0;previous=now;if(playing&&!document.hidden){time+=dt;if(time>PREVIEW_DURATION){time=0;for(const c of cards)c.preview.reset();}if(now-lastDraw>=1000/30){try{render();}catch(error){setPlaying(false);report(error);}lastDraw=now;}}frame=requestAnimationFrame(tick);}
updateChoices();try{render();frame=requestAnimationFrame(tick);}catch(error){report(error);}
