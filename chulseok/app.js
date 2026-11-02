'use strict';
const KEY='lkt-qr-attendance-v1', PREFIX='LKTATT1:', LABEL={P:'출석',L:'지각',A:'결석'}, MARK={P:'○',L:'△',A:'✕'};
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>{const a='23456789ABCDEFGHJKMNPQRSTUVWXYZ';const r=crypto.getRandomValues(new Uint8Array(8));return Array.from(r,x=>a[x%a.length]).join('')};
const pad=n=>String(n).padStart(2,'0');
const today=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const nowHM=(d=new Date())=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;
const mins=hm=>{const[h,m]=hm.split(':').map(Number);return h*60+m};
const addMin=(hm,g)=>{const t=mins(hm)+Number(g||0);return `${pad(Math.floor(t/60)%24)}:${pad(t%60)}`};
let db=load(), tab='scan', cls=db.ui.cls||(db.classes[0]&&db.classes[0].id)||null, viewDate=today(), kiosk=false;
function blank(){return{v:1,classes:[],students:[],att:{},sessions:{},ui:{},lastBackup:null,pin:null}}
function load(){try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&j.v===1)return Object.assign(blank(),j)}catch(e){}return blank()}
function save(){db.ui.cls=cls;try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){alertBox('저장에 실패했어요. 브라우저의 개인정보 보호 모드를 끄고 다시 열어 주세요.')}}
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
const curClass=()=>db.classes.find(c=>c.id===cls)||null;
const members=(cid,date)=>db.students.filter(s=>!s.deleted&&s.classes[cid]&&(!date||s.classes[cid]<=date)).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
const akey=(d,c,s)=>`${d}|${c}|${s}`;
const session=(d,c)=>{const k=`${d}|${c.id}`;return db.sessions[k]||{start:c.start,grace:c.grace}};
const judge=(hm,ses)=>mins(hm)>mins(ses.start)+Number(ses.grace||0)?'L':'P';

/* 모달 */
function modal(html,buttons){return new Promise(res=>{const m=$('#modal'),b=$('#modalBox');
 b.innerHTML=html+'<div class="acts">'+buttons.map((x,i)=>`<button class="btn ${x.cls||''}" data-i="${i}">${esc(x.label)}</button>`).join('')+'</div>';
 m.style.display='flex';
 b.querySelectorAll('.acts button').forEach(el=>el.onclick=()=>{const x=buttons[+el.dataset.i];
  const inp=b.querySelector('input');const val=inp?inp.value:null;
  if(x.keep){x.onClick&&x.onClick();return}
  m.style.display='none';b.innerHTML='';res({v:x.value,input:val})})})}
const alertBox=t=>modal(`<p style="margin:0">${esc(t)}</p>`,[{label:'확인',cls:'p'}]);
const confirmBox=async(t,ok='확인',danger)=>(await modal(`<p style="margin:0">${esc(t)}</p>`,[{label:'취소',value:false},{label:ok,value:true,cls:danger?'d':'p'}])).v===true;

/* 파일 전달 — 버튼을 한 번 더 누르게 해서 아이폰에서도 저장·공유가 막히지 않게 함 */
async function deliver(blob,name){
 const file=new File([blob],name,{type:blob.type});
 const canShare=navigator.canShare&&navigator.canShare({files:[file]});
 const url=URL.createObjectURL(blob);
 const b=[{label:'닫기',value:0}];
 if(canShare)b.push({label:'공유·보내기',keep:true,onClick:()=>navigator.share({files:[file],title:name}).catch(()=>{})});
 b.push({label:'파일로 저장',cls:'p',keep:true,onClick:()=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()}});
 await modal(`<h2>파일이 준비됐어요</h2><p class="muted" style="margin:0;overflow-wrap:anywhere">${esc(name)}</p>`,b);
 setTimeout(()=>URL.revokeObjectURL(url),60000)}

/* 화면 전환 */
const TABS=[['scan','QR 스캔'],['check','출결 확인'],['list','명단·QR'],['file','엑셀·백업']];
function render(){
 $('#tabs').innerHTML=TABS.map(t=>`<button class="${t[0]===tab?'on':''}" data-t="${t[0]}">${t[1]}</button>`).join('');
 $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;render()});
 if(tab!=='scan')stopCam();
 ({scan:vScan,check:vCheck,list:vList,file:vFile})[tab]();
}
const classSelect=()=>`<select id="clsSel">${db.classes.map(c=>`<option value="${c.id}" ${c.id===cls?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`;
function bindClass(){const s=$('#clsSel');if(s)s.onchange=()=>{cls=s.value;save();render()}}
function backupNotice(){
 if(!db.students.length)return'';
 const days=db.lastBackup?(Date.now()-db.lastBackup)/864e5:Infinity;
 return days>=7?`<div class="notice nokiosk"><b>백업할 때가 됐어요.</b> 기록은 이 핸드폰에만 저장돼요. <button class="btn s" onclick="tab='file';render()">백업하러 가기</button></div>`:''}

/* QR 스캔 */
function vScan(){
 const c=curClass();
 if(!c){stopCam();$('#view').innerHTML=`<div class="card"><h2>처음 시작하기</h2><p class="muted">먼저 ‘명단·QR’에서 수업과 학생을 등록해 주세요.</p><div class="row"><button class="btn p" onclick="tab='list';render()">수업 등록하기</button><button class="btn" id="demo">예시 수업으로 체험</button></div></div>`;$('#demo').onclick=addDemo;return}
 const d=today(),ses=session(d,c);
 $('#view').innerHTML=backupNotice()+`<div class="card nokiosk">${classSelect()}
  <div class="row" style="margin-top:8px;justify-content:space-between"><span class="muted">오늘 시작 <b>${ses.start}</b>, <b>${addMin(ses.start,ses.grace)}</b>까지 출석</span><button class="btn s" id="chgTime">오늘만 변경</button></div></div>
  <div class="card" style="padding:10px"><div style="font-weight:800;font-size:18px;margin:0 2px 8px">${esc(c.name)}</div>
  <div id="cam"><video id="vid" playsinline muted autoplay></video><div class="frame"></div><div class="msg" id="camMsg">카메라 켜는 중…</div></div>
  <div class="row" style="margin-top:10px;justify-content:space-between"><div class="stats" id="stats"></div><button class="btn s" id="flip">카메라 전환</button></div></div>
  <div class="card nokiosk"><h2>최근 체크</h2><div id="recent"></div></div>`;
 bindClass();
 const ct=$('#chgTime');if(ct)ct.onclick=changeTime;
 $('#flip').onclick=()=>{facing=facing==='environment'?'user':'environment';try{localStorage.setItem(KEY+'-cam',facing)}catch(e){}stopCam();startCam()};
 scanInfo();startCam();
}
function scanInfo(){
 const c=curClass();if(!c||!$('#stats'))return;const d=today(),ms=members(c.id,d);let n={P:0,L:0};
 const rows=[];ms.forEach(s=>{const r=db.att[akey(d,c.id,s.id)];if(r){if(n[r.s]!==undefined)n[r.s]++;if(r.s!=='A')rows.push({s,r})}});
 $('#stats').innerHTML=`<span class="P">출석 ${n.P}</span><span class="L">지각 ${n.L}</span><span class="muted" style="font-weight:600">미체크 ${ms.length-n.P-n.L}</span>`;
 rows.sort((a,b)=>(b.r.at||0)-(a.r.at||0));
 const re=$('#recent');if(re)re.innerHTML=rows.slice(0,8).map(x=>`<div class="st"><div class="nm">${esc(x.s.name)}</div><span class="${x.r.s}">${LABEL[x.r.s]}</span><span class="muted">${x.r.t||''}</span></div>`).join('')||'<span class="muted">아직 없어요.</span>'}
async function changeTime(){
 const c=curClass(),d=today(),ses=session(d,c);
 const r=await modal(`<h2>오늘 수업만 시작 시각 변경</h2><label class="f">시작 시각</label><input id="ti" type="time" value="${ses.start}"><p class="muted">이미 스캔한 학생의 출석·지각도 새 시각으로 다시 판정해요. 손으로 고친 학생은 그대로 둬요.</p>`,[{label:'취소',value:0},{label:'변경',value:1,cls:'p'}]);
 if(!r.v||!r.input)return;
 const ns={start:r.input,grace:ses.grace};db.sessions[`${d}|${c.id}`]=ns;
 Object.keys(db.att).forEach(k=>{if(k.startsWith(`${d}|${c.id}|`)){const a=db.att[k];if(!a.m&&a.t)a.s=judge(a.t,ns)}});
 save();render()}

/* 카메라 */
let stream=null,facing=(()=>{try{return localStorage.getItem(KEY+'-cam')||'environment'}catch(e){return'environment'}})(),raf=null,lastScan=0,lastCode={},wake=null,cv=document.createElement('canvas');
async function startCam(){
 const v=$('#vid'),m=$('#camMsg');if(!v||stream)return;
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){m.textContent='이 브라우저에서는 카메라를 쓸 수 없어요. 사파리나 크롬으로 열어 주세요.';return}
 try{
  const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:1280}},audio:false});
  if(tab!=='scan'||!$('#vid')){st.getTracks().forEach(t=>t.stop());return}
  stream=st;const vv=$('#vid');vv.srcObject=st;vv.style.transform=facing==='user'?'scaleX(-1)':'';await vv.play().catch(()=>{});$('#camMsg').style.display='none';
  try{wake=navigator.wakeLock?await navigator.wakeLock.request('screen'):null}catch(e){}
  loop();
 }catch(e){const mm=$('#camMsg');if(mm)mm.innerHTML='카메라를 켜지 못했어요.<br>브라우저 설정에서 카메라를 허용한 뒤 다시 열어 주세요.'}}
function stopCam(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}cancelAnimationFrame(raf);if(wake){wake.release().catch(()=>{});wake=null}}
function loop(){
 raf=requestAnimationFrame(loop);const v=$('#vid');if(!v||v.readyState<2||!v.videoWidth)return;
 const t=performance.now();if(t-lastScan<110)return;lastScan=t;
 const side=Math.min(v.videoWidth,v.videoHeight),sc=Math.min(1,720/side),w=Math.round(side*sc);
 cv.width=w;cv.height=w;const x=cv.getContext('2d',{willReadFrequently:true});
 x.drawImage(v,(v.videoWidth-side)/2,(v.videoHeight-side)/2,side,side,0,0,w,w);
 const q=jsQR(x.getImageData(0,0,w,w).data,w,w,{inversionAttempts:'dontInvert'});
 if(q&&q.data)onCode(q.data)}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCam();else if(tab==='scan')startCam()});
let ac;function beep(f,dur){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();ac.resume();const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;g.gain.value=.25;o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+dur)}catch(e){}}
document.addEventListener('click',()=>{try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();ac.resume()}catch(e){}},{passive:true});
let flashT;function flash(kind,name,text,ms=1600){const f=$('#flash');f.className=kind;f.innerHTML=`<div class="n">${esc(name)}</div><div class="t">${esc(text)}</div>`;f.style.display='flex';clearTimeout(flashT);flashT=setTimeout(()=>f.style.display='none',ms)}
function onCode(text){
 const t=Date.now();if(lastCode[text]&&t-lastCode[text]<4000){lastCode[text]=t;return}lastCode[text]=t;
 if($('#modal').style.display==='flex')return;
 const c=curClass();if(!c)return;
 if(!text.startsWith(PREFIX)){flash('E','출석 QR이 아니에요','출석 카드를 보여 주세요');beep(220,.3);return}
 const s=db.students.find(x=>x.id===text.slice(PREFIX.length)&&!x.deleted);
 if(!s){flash('E','등록되지 않은 QR','선생님께 알려 주세요');beep(220,.3);return}
 if(!s.classes[c.id]){beep(220,.3);
  if(kiosk){flash('E',s.name,`${c.name} 명단에 없어요`,2400);return}
  modal(`<h2>${esc(s.name)}</h2><p style="margin:0">‘${esc(c.name)}’ 명단에 없는 학생이에요. 이 수업에 추가하고 출석 처리할까요?</p>`,[{label:'아니요',value:0},{label:'추가하고 출석',value:1,cls:'p'}]).then(r=>{if(r.v){s.classes[c.id]=today();mark(c,s)}});return}
 mark(c,s)}
function mark(c,s){
 const d=today(),k=akey(d,c.id,s.id),ex=db.att[k];
 if(ex&&ex.s!=='A'){flash('D',s.name,`이미 ${LABEL[ex.s]} 처리됨${ex.t?' ('+ex.t+')':''}`);beep(520,.12);return}
 const hm=nowHM(),st=judge(hm,session(d,c));
 if(!db.sessions[`${d}|${c.id}`])db.sessions[`${d}|${c.id}`]={start:c.start,grace:c.grace};
 db.att[k]={s:st,t:hm,m:false,at:Date.now()};save();
 flash(st,s.name,`${LABEL[st]} ${hm}`);beep(st==='P'?880:620,.18);try{navigator.vibrate&&navigator.vibrate(120)}catch(e){}
 scanInfo()}

/* 출결 확인 */
function vCheck(){
 const c=curClass();if(!c){$('#view').innerHTML='<div class="card muted">먼저 수업을 등록해 주세요.</div>';return}
 const ms=members(c.id,viewDate);let n={P:0,L:0,A:0,N:0};
 const hasSes=Object.keys(db.att).some(k=>k.startsWith(`${viewDate}|${c.id}|`));
 const rows=ms.map(s=>{const r=db.att[akey(viewDate,c.id,s.id)];const st=r?r.s:null;n[st||'N']++;
  return`<div class="st"><div class="nm">${esc(s.name)}<small>${r&&r.t?r.t+(r.m?' 직접 입력':''):(r?'직접 입력':'미체크')}</small></div><div class="seg">${['P','L','A'].map(x=>`<button class="${x} ${st===x?'on':''}" data-s="${s.id}" data-v="${x}">${LABEL[x]}</button>`).join('')}</div></div>`}).join('');
 $('#view').innerHTML=`<div class="card"><div class="row"><div class="grow">${classSelect()}</div><div class="grow"><input type="date" id="dt" value="${viewDate}" max="${today()}"></div></div>
  <div class="stats" style="margin-top:12px"><span class="P">출석 ${n.P}</span><span class="L">지각 ${n.L}</span><span class="A">결석 ${n.A}</span><span class="muted" style="font-weight:600">미체크 ${n.N}</span></div>
  <p class="muted" style="margin:8px 0 0">카드를 안 가져온 학생은 여기서 눌러 주세요. 같은 버튼을 다시 누르면 취소돼요. ${hasSes?'수업이 끝난 뒤 미체크 학생은 엑셀에서 결석으로 집계돼요.':''}</p></div>
  <div class="card">${rows||'<span class="muted">이 날짜에 해당하는 학생이 없어요.</span>'}</div>`;
 bindClass();$('#dt').onchange=e=>{viewDate=e.target.value||today();render()};
 document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{const k=akey(viewDate,c.id,b.dataset.s),ex=db.att[k];
  if(ex&&ex.s===b.dataset.v)delete db.att[k];
  else{if(!db.sessions[`${viewDate}|${c.id}`])db.sessions[`${viewDate}|${c.id}`]={start:c.start,grace:c.grace};
   db.att[k]={s:b.dataset.v,t:viewDate===today()&&b.dataset.v!=='A'?nowHM():(ex&&ex.t&&b.dataset.v!=='A'?ex.t:''),m:true,at:Date.now()}}
  save();render()})}

/* 명단·QR */
function vList(){
 const c=curClass();
 $('#view').innerHTML=`<div class="card"><h2>수업</h2>${db.classes.length?`<div class="row"><div class="grow">${classSelect()}</div><button class="btn" id="edC">수정</button><button class="btn" id="newC">새 수업</button></div>
  ${c?`<p class="muted" style="margin:8px 0 0">시작 ${c.start}, ${c.grace?`${c.grace}분 후(${addMin(c.start,c.grace)})까지 출석`:'시작 시각까지 출석'}, 그 뒤 스캔은 지각</p>`:''}`:`<button class="btn p" id="newC">새 수업 만들기</button> <button class="btn" id="demo">예시 수업으로 체험</button>`}</div>
  ${c?`<div class="card"><h2>학생 추가</h2><label class="f">이름을 한 줄에 한 명씩 입력하거나 엑셀에서 복사해 붙여 넣으세요.</label><textarea id="names" placeholder="김서연&#10;이도윤"></textarea><button class="btn p" id="addS" style="margin-top:8px">‘${esc(c.name)}’에 추가</button></div>
  <div class="card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h2 style="margin:0">학생 ${members(c.id).length}명</h2><button class="btn p s" id="printC">QR 카드 인쇄</button></div>
  ${members(c.id).map(s=>`<div class="st"><div class="nm">${esc(s.name)}<small>카드 번호 ${s.id}${Object.keys(s.classes).length>1?` · ${Object.keys(s.classes).length}개 수업 수강`:''}</small></div><button class="btn s" data-img="${s.id}">QR 이미지</button><button class="btn s d" data-rm="${s.id}">빼기</button></div>`).join('')||'<span class="muted">아직 학생이 없어요.</span>'}</div>`:''}`;
 bindClass();
 const n=$('#newC');if(n)n.onclick=()=>editClass(null);
 const e=$('#edC');if(e)e.onclick=()=>editClass(c);
 const dm=$('#demo');if(dm)dm.onclick=addDemo;
 const a=$('#addS');if(a)a.onclick=addStudents;
 const p=$('#printC');if(p)p.onclick=()=>printCards(c);
 document.querySelectorAll('[data-img]').forEach(b=>b.onclick=()=>cardImage(db.students.find(s=>s.id===b.dataset.img)));
 document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=async()=>{const s=db.students.find(x=>x.id===b.dataset.rm);
  if(!await confirmBox(`${s.name} 학생을 ‘${c.name}’ 명단에서 뺄까요? 지난 출석 기록은 엑셀에 남아요.`,'빼기',true))return;
  s.left=s.left||{};s.left[c.id]=today();delete s.classes[c.id];save();render()})}
async function editClass(c){
 const box=`<h2>${c?'수업 수정':'새 수업'}</h2><label class="f">수업 이름</label><input id="cn" value="${c?esc(c.name):''}" placeholder="예: 한영외고 1학년 한국사·통합사회">
 <div class="row" style="margin-top:10px"><div class="grow"><label class="f">시작 시각</label><input id="cs" type="time" value="${c?c.start:'19:00'}"></div><div class="grow"><label class="f">시작 후 몇 분까지 출석?</label><input id="cg" type="number" inputmode="numeric" min="0" max="120" value="${c?c.grace:0}"></div></div>`;
 let vals={};const btns=[{label:'취소',value:0}];
 if(c)btns.unshift({label:'수업 삭제',value:'del',cls:'d'});btns.push({label:'저장',value:1,cls:'p'});
 const pr=modal(box,btns);
 const grab=()=>{const a=$('#cn');if(a)vals={n:a.value.trim(),s:$('#cs').value,g:Math.max(0,parseInt($('#cg').value)||0)}};
 $('#modalBox').addEventListener('input',grab);grab();
 const r=await pr;
 if(r.v==='del'){if(!await confirmBox(`‘${c.name}’ 수업과 출석 기록을 모두 지울까요? 되돌릴 수 없어요.`,'모두 지우기',true))return;
  db.classes=db.classes.filter(x=>x.id!==c.id);
  Object.keys(db.att).forEach(k=>{if(k.split('|')[1]===c.id)delete db.att[k]});
  Object.keys(db.sessions).forEach(k=>{if(k.split('|')[1]===c.id)delete db.sessions[k]});
  db.students.forEach(s=>{delete s.classes[c.id];if(s.left)delete s.left[c.id]});
  db.students=db.students.filter(s=>Object.keys(s.classes).length||(s.left&&Object.keys(s.left).length));
  cls=db.classes[0]?db.classes[0].id:null;save();render();return}
 if(r.v!==1)return;
 if(!vals.n||!vals.s){alertBox('수업 이름과 시작 시각을 입력해 주세요.');return}
 if(c){c.name=vals.n;c.start=vals.s;c.grace=vals.g}else{const nc={id:uid(),name:vals.n,start:vals.s,grace:vals.g};db.classes.push(nc);cls=nc.id}
 save();render()}
async function addStudents(){
 const c=curClass(),names=$('#names').value.split(/[\r\n\t,]+/).map(s=>s.trim()).filter(Boolean);if(!names.length)return;
 let added=0;
 for(const name of names){
  const same=db.students.filter(s=>s.name===name&&!s.deleted);
  const inThis=same.find(s=>s.classes[c.id]),other=same.find(s=>!s.classes[c.id]);
  if(inThis){const r=await modal(`<h2>${esc(name)}</h2><p style="margin:0">이 수업에 같은 이름이 이미 있어요.</p>`,[{label:'건너뛰기',value:0},{label:'동명이인으로 추가',value:1,cls:'p'}]);if(!r.v)continue}
  else if(other){const cn=Object.keys(other.classes).map(i=>(db.classes.find(x=>x.id===i)||{}).name).filter(Boolean).join(', ');
   const r=await modal(`<h2>${esc(name)}</h2><p style="margin:0">‘${esc(cn||'이전 수업')}’에 같은 이름이 있어요. 같은 학생이면 QR 카드 1장을 함께 써요.</p>`,[{label:'동명이인(새 카드)',value:0},{label:'같은 학생',value:1,cls:'p'}]);
   if(r.v){other.classes[c.id]=today();added++;continue}}
  db.students.push({id:uid(),name,classes:{[c.id]:today()}});added++}
 save();render()}
function addDemo(){
 const nc={id:uid(),name:'예시 수업',start:nowHM(),grace:5};db.classes.push(nc);cls=nc.id;
 ['김서연','이도윤','박지호'].forEach(name=>db.students.push({id:uid(),name,classes:{[nc.id]:today()}}));
 tab='list';save();render()}
const qrOf=s=>{const q=qrcode(0,'M');q.addData(PREFIX+s.id);q.make();return q};
function printCards(c){
 const ms=members(c.id);if(!ms.length){alertBox('학생을 먼저 추가해 주세요.');return}
 $('#printArea').innerHTML=ms.map(s=>`<div class="pc"><div class="qr">${qrOf(s).createSvgTag({scalable:true,margin:4})}</div><div><div class="nm">${esc(s.name)}</div><div class="sm">출석 카드<br>${s.id}</div></div></div>`).join('');
 setTimeout(()=>window.print(),50)}
async function cardImage(s){
 const q=qrOf(s),n=q.getModuleCount(),cell=Math.floor(560/(n+8)),size=cell*(n+8),W=size+40,H=size+150,cv2=document.createElement('canvas');cv2.width=W;cv2.height=H;
 const x=cv2.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.fillStyle='#000';x.textAlign='center';x.font='bold 54px -apple-system,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';x.fillText(s.name,W/2,72);
 for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))x.fillRect(20+(k+4)*cell,100+(r+4)*cell,cell,cell);
 cv2.toBlob(b=>deliver(b,`출석QR_${s.name}.png`),'image/png')}

/* 엑셀·백업 */
let rngFrom=today().slice(0,8)+'01',rngTo=today();
function vFile(){
 const pinLine=db.pin?'설정됨':'없음';
 $('#view').innerHTML=backupNotice()+`<div class="card"><h2>엑셀 출석부 내려받기</h2><div class="row"><div class="grow"><label class="f">시작일</label><input type="date" id="rf" value="${rngFrom}"></div><div class="grow"><label class="f">종료일</label><input type="date" id="rt" value="${rngTo}"></div></div>
  <div class="row" style="margin-top:8px"><button class="btn s" id="rm">이번 달</button><button class="btn s" id="ra">전체 기간</button></div>
  <button class="btn p" id="xl" style="margin-top:10px;width:100%">엑셀 만들기</button><p class="muted" style="margin:8px 0 0">수업마다 시트 1장: 날짜별 ○ 출석, △ 지각, ✕ 결석과 출석률. 스캔이 하나라도 있었던 날만 수업일로 집계해요.</p></div>
  <div class="card"><h2>백업</h2><p class="muted" style="margin-top:0">명단과 기록은 이 기기에만 있어요. 기기를 바꾸거나 데이터가 지워질 때를 대비해 파일로 보관하세요.${db.lastBackup?` 마지막 백업: ${today(new Date(db.lastBackup))}`:' 아직 백업한 적이 없어요.'}</p>
  <div class="row"><button class="btn p" id="bk">백업 파일 만들기</button><label class="btn" style="display:inline-flex;align-items:center">백업 불러오기<input type="file" id="rs" accept=".json,application/json" style="display:none"></label></div></div>
  <div class="card"><h2>입구 모드 비밀번호</h2><p class="muted" style="margin-top:0">입구 모드에서 빠져나올 때 쓰는 번호예요. 현재: ${pinLine}</p><button class="btn" id="pn">비밀번호 설정</button></div>`;
 $('#rf').onchange=e=>rngFrom=e.target.value;$('#rt').onchange=e=>rngTo=e.target.value;
 $('#rm').onclick=()=>{rngFrom=today().slice(0,8)+'01';rngTo=today();render()};
 $('#ra').onclick=()=>{const ds=Object.keys(db.att).map(k=>k.split('|')[0]).sort();rngFrom=ds[0]||today();rngTo=today();render()};
 $('#xl').onclick=makeExcel;
 $('#bk').onclick=async()=>{db.lastBackup=Date.now();save();await deliver(new Blob([JSON.stringify(db)],{type:'application/json'}),`출석부백업_${today()}.json`);render()};
 $('#rs').onchange=restore;$('#pn').onclick=setPin}
async function restore(e){
 const f=e.target.files[0];if(!f)return;let j;
 try{j=JSON.parse(await f.text());if(j.v!==1||!Array.isArray(j.students)||!Array.isArray(j.classes)||typeof j.att!=='object')throw 0}catch(x){alertBox('출석부 백업 파일이 아니에요.');return}
 if(!await confirmBox(`지금 이 기기의 내용을 백업 파일(학생 ${j.students.length}명, 수업 ${j.classes.length}개)로 바꿀까요?`,'바꾸기',true))return;
 db=Object.assign(blank(),j);cls=(db.classes[0]||{}).id||null;save();render()}
async function setPin(){const r=await modal(`<h2>비밀번호 설정</h2><label class="f">숫자 4자리</label><input id="pi" type="password" inputmode="numeric" maxlength="4">`,[{label:'취소',value:0},{label:'저장',value:1,cls:'p'}]);
 if(!r.v)return;if(!/^\d{4}$/.test(r.input||'')){alertBox('숫자 4자리로 입력해 주세요.');return}db.pin=r.input;save();render()}
function loadExcel(){return window.ExcelJS?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='exceljs.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
function sheetName(n,used){let b=n.replace(/[\[\]:*?\/\\]/g,' ').trim().slice(0,28)||'수업',x=b,i=2;while(used.has(x))x=`${b.slice(0,26)}_${i++}`;used.add(x);return x}
function colL(n){let s='';while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26}return s}
async function makeExcel(){
 if(rngFrom>rngTo){alertBox('시작일이 종료일보다 늦어요.');return}
 const inR=d=>d>=rngFrom&&d<=rngTo;
 const data=db.classes.map(c=>{const dates=[...new Set(Object.keys(db.att).filter(k=>{const[d,ci]=k.split('|');return ci===c.id&&inR(d)}).map(k=>k.split('|')[0]))].sort();return{c,dates}}).filter(x=>x.dates.length);
 if(!data.length){alertBox('이 기간에는 출석 기록이 없어요.');return}
 const btn=$('#xl');btn.disabled=true;btn.textContent='만드는 중…';
 try{
 await loadExcel();const wb=new ExcelJS.Workbook();wb.creator='QR 출석부';const used=new Set();
 const WD='일월화수목금토',thin={style:'thin',color:{argb:'FF999999'}},border={top:thin,left:thin,bottom:thin,right:thin};
 const fill=a=>({type:'pattern',pattern:'solid',bgColor:{argb:a},fgColor:{argb:a}});
 for(const{c,dates}of data){
  const ws=wb.addWorksheet(sheetName(c.name,used),{views:[{state:'frozen',xSplit:2,ySplit:3}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'3:3'}});
  const D=dates.length,first=3,last=first+D-1,cP=last+1,cL=last+2,cA=last+3,cR=last+4;
  ws.mergeCells(1,1,1,cR);const t=ws.getCell(1,1);t.value=`${c.name} 출석부 (${rngFrom} ~ ${rngTo})`;t.font={bold:true,size:14};
  ws.mergeCells(2,1,2,cR);ws.getCell(2,1).value='○ 출석   △ 지각   ✕ 결석   - 등록 전';ws.getCell(2,1).font={size:10,color:{argb:'FF555555'}};
  const head=['번호','이름',...dates.map(d=>{const x=new Date(d+'T00:00:00');return `${x.getMonth()+1}/${x.getDate()}\n(${WD[x.getDay()]})`}),'출석','지각','결석','출석률'];
  const hr=ws.getRow(3);head.forEach((v,i)=>{const e=hr.getCell(i+1);e.value=v;e.font={bold:true};e.fill=fill('FFE9EDF1');e.border=border;e.alignment={horizontal:'center',vertical:'middle',wrapText:true}});hr.height=32;
  const ids=new Set(Object.keys(db.att).filter(k=>{const[d,ci]=k.split('|');return ci===c.id&&inR(d)}).map(k=>k.split('|')[2]));
  const ppl=db.students.filter(s=>s.classes[c.id]||ids.has(s.id)).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  ppl.forEach((s,i)=>{const R=4+i,row=ws.getRow(R);let n={'○':0,'△':0,'✕':0};
   row.getCell(1).value=i+1;row.getCell(2).value=s.name+(s.classes[c.id]?'':' (퇴원)');
   dates.forEach((d,j)=>{const r=db.att[akey(d,c.id,s.id)],since=s.classes[c.id];
    let v=r?MARK[r.s]:(since&&d>=since)||(!since&&s.left&&s.left[c.id]&&d<s.left[c.id])?'✕':'-';if(n[v]!==undefined)n[v]++;row.getCell(first+j).value=v});
   const rg=`${colL(first)}${R}:${colL(last)}${R}`,tot=n['○']+n['△']+n['✕'];
   row.getCell(cP).value={formula:`COUNTIF(${rg},"○")`,result:n['○']};row.getCell(cL).value={formula:`COUNTIF(${rg},"△")`,result:n['△']};row.getCell(cA).value={formula:`COUNTIF(${rg},"✕")`,result:n['✕']};
   const P=colL(cP)+R,L=colL(cL)+R,A=colL(cA)+R;row.getCell(cR).value={formula:`IF(${P}+${L}+${A}=0,"",(${P}+${L})/(${P}+${L}+${A}))`,result:tot?(n['○']+n['△'])/tot:''};row.getCell(cR).numFmt='0%';
   for(let k=1;k<=cR;k++){const e=row.getCell(k);e.border=border;e.alignment={horizontal:k===2?'left':'center',vertical:'middle'}}});
  const rEnd=3+ppl.length,totR=ws.getRow(rEnd+1);totR.getCell(2).value='출석+지각 인원';
  dates.forEach((d,j)=>{const L=colL(first+j),rg=`${L}4:${L}${rEnd}`,res=ppl.reduce((a,s)=>{const r=db.att[akey(d,c.id,s.id)];return a+(r&&r.s!=='A'?1:0)},0);totR.getCell(first+j).value={formula:`COUNTIF(${rg},"○")+COUNTIF(${rg},"△")`,result:res}});
  for(let k=1;k<=cR;k++){const e=totR.getCell(k);e.border=border;e.font={bold:true};e.fill=fill('FFF3F5F7');e.alignment={horizontal:'center',vertical:'middle'}}
  if(ppl.length)ws.addConditionalFormatting({ref:`${colL(first)}4:${colL(last)}${rEnd}`,rules:[
   {type:'cellIs',operator:'equal',formulae:['"△"'],priority:1,style:{fill:fill('FFFDF0D6'),font:{bold:true,color:{argb:'FF9A5B00'}}}},
   {type:'cellIs',operator:'equal',formulae:['"✕"'],priority:2,style:{fill:fill('FFFBE6E4'),font:{bold:true,color:{argb:'FFB3261E'}}}}]});
  ws.getColumn(1).width=6;ws.getColumn(2).width=16;for(let k=first;k<=last;k++)ws.getColumn(k).width=7;[cP,cL,cA,cR].forEach(k=>ws.getColumn(k).width=7.5);
 }
 const det=wb.addWorksheet(sheetName('출결 상세',used),{views:[{state:'frozen',ySplit:1}]});
 det.columns=[{header:'날짜',width:13},{header:'수업',width:28},{header:'이름',width:14},{header:'출결',width:8},{header:'스캔 시각',width:11},{header:'입력 방식',width:11},{header:'수업 시작',width:11}];
 const rows=[];for(const{c,dates}of data)for(const d of dates){const ses=session(d,c);
  db.students.forEach(s=>{const r=db.att[akey(d,c.id,s.id)];const since=s.classes[c.id];
   if(r)rows.push([d,c.name,s.name,LABEL[r.s],r.t||'',r.m?'직접 입력':'QR',ses.start]);
   else if((since&&d>=since)||(!since&&s.left&&s.left[c.id]&&d<s.left[c.id]))rows.push([d,c.name,s.name,'결석','','미체크',ses.start])})}
 rows.sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1],'ko')||a[2].localeCompare(b[2],'ko'));det.addRows(rows);
 det.getRow(1).font={bold:true};det.getRow(1).fill=fill('FFE9EDF1');det.autoFilter={from:'A1',to:{row:rows.length+1,column:7}};
 const buf=await wb.xlsx.writeBuffer();
 await deliver(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`출석부_${rngFrom}_${rngTo}.xlsx`);
 }catch(e){console.error(e);alertBox('엑셀을 만들지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.')}
 const b2=$('#xl');if(b2){b2.disabled=false;b2.textContent='엑셀 만들기'}}

/* 입구 모드 */
$('#kioskBtn').onclick=async()=>{
 if(!kiosk){if(!curClass()){alertBox('먼저 수업을 등록해 주세요.');return}
  if(!db.pin){await setPin();if(!db.pin)return}
  kiosk=true;tab='scan';document.body.classList.add('kiosk');$('#kioskBtn').textContent='잠금 해제';render();return}
 const r=await modal(`<h2>잠금 해제</h2><input id="pi" type="password" inputmode="numeric" maxlength="4" placeholder="비밀번호 4자리">`,[{label:'취소',value:0},{label:'해제',value:1,cls:'p'}]);
 if(!r.v)return;if(r.input!==db.pin){alertBox('비밀번호가 달라요.');return}
 kiosk=false;document.body.classList.remove('kiosk');$('#kioskBtn').textContent='입구 모드';render()};
render();
