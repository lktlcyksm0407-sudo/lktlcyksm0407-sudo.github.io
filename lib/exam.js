/* 이경태T 시험 보기 모드 — 결과를 선생님 구글 시트(+메일)로 전송
   사용: <script>window.EXAM_CFG={app:'앱 이름',type:'quiz'|'ox'}</script><script src="../lib/exam.js"></script>
   DATA(문항 배열)는 앱 본문 스크립트의 전역 const DATA 를 사용 */
(function () {
  const URL = 'https://script.google.com/macros/s/AKfycbzmH4w4y5hAZzjo938SVsgaDHsly1Eu55h8HNSRDVKWaKGq9L8WdMCys1X9Uw_yOIFycQ/exec';
  const CFG = window.EXAM_CFG || {};
  const ALL = (typeof DATA !== 'undefined') ? DATA : [];
  const POOL = CFG.type === 'ox' ? ALL : ALL.filter(d => d.ch && d.ch.length);   // 단답·서술은 자동 채점 불가 → 제외
  const SECS = [...new Set(POOL.map(d => d.sec))];
  const CI = '①②③④⑤';
  const NKEY = 'lkt-exam-name';
  const css = `
#exBtn{background:var(--gold,#F5B731)!important;color:#1C2747!important;font-weight:800!important;border-color:transparent!important}
#exWrap{position:fixed;inset:0;z-index:9999;background:var(--bg,#F2F4F9);color:var(--ink,#16203A);overflow:auto;font-family:var(--sans,sans-serif);-webkit-overflow-scrolling:touch}
#exWrap *{box-sizing:border-box}
.ex-in{max-width:560px;margin:0 auto;padding:16px 16px 40px}
.ex-top{background:var(--band,#1C2747);color:#fff;margin:-16px -16px 16px;padding:16px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:2}
.ex-top b{font-size:17px;flex:1}.ex-top .ex-t{font-variant-numeric:tabular-nums;background:rgba(255,255,255,.14);padding:6px 10px;border-radius:10px;font-weight:700}
.ex-top .ex-t.warn{background:#E0453A}
.ex-x{background:none;border:0;color:#fff;font-size:22px;line-height:1;padding:4px 6px}
.ex-card{background:var(--surface,#fff);border-radius:18px;padding:18px;box-shadow:var(--shadow,0 6px 20px rgba(0,0,0,.08));margin-bottom:14px}
.ex-card h3{margin:0 0 12px;font-size:18px}
.ex-card label{display:block;font-size:14px;font-weight:700;margin:12px 0 6px;color:var(--muted,#6A7389)}
.ex-card input,.ex-card select{width:100%;font:inherit;font-size:16px;padding:12px;border:1.5px solid var(--line,#E1E5EE);border-radius:12px;background:var(--bg,#F2F4F9);color:inherit}
.ex-go{width:100%;font:inherit;font-size:17px;font-weight:800;padding:15px;border:0;border-radius:14px;background:var(--band,#1C2747);color:#fff;margin-top:16px}
.ex-go:disabled{opacity:.4}
.ex-note{font-size:13px;color:var(--muted,#6A7389);line-height:1.6;margin-top:12px}
.ex-err{color:#E0453A;font-size:14px;font-weight:700;margin-top:8px;min-height:1em}
.ex-bar{height:6px;background:var(--line,#E1E5EE);border-radius:6px;margin-bottom:14px;overflow:hidden}.ex-bar i{display:block;height:100%;background:var(--gold,#F5B731)}
.ex-qn{font-size:13px;color:var(--muted,#6A7389);margin-bottom:6px}
.ex-stem{font-size:17px;font-weight:700;line-height:1.55;margin-bottom:10px}
.ex-body img{max-width:100%;height:auto!important;max-height:220px}
.ex-body .dbox,.ex-body .bogi{border:1.5px solid var(--line,#E1E5EE);border-radius:12px;padding:12px 14px;margin:6px 0;background:var(--bg,#F2F4F9);font-size:15px;line-height:1.6}
.ex-body .bogi{position:relative;padding-top:18px}.ex-body .bogi .bt{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--surface,#fff);padding:0 10px;font-weight:700;font-size:13px;letter-spacing:.3em}
.ex-body .bogi p{margin:3px 0;padding-left:20px;text-indent:-20px}.ex-body table{width:100%;border-collapse:collapse;font-size:14px}.ex-body td,.ex-body th{border:1px solid var(--line,#ccc);padding:4px 6px}
.ex-body .qimg{text-align:center;margin:6px 0}.ex-body .pair2{display:flex;gap:8px}
.ex-ch{display:block;width:100%;text-align:left;font:inherit;font-size:15.5px;line-height:1.5;padding:12px 14px;margin:8px 0;border:1.5px solid var(--line,#E1E5EE);border-radius:14px;background:var(--surface,#fff);color:inherit}
.ex-ch.on{border-color:var(--o,#2563EB);background:rgba(37,99,235,.08);font-weight:700}
.ex-ox{display:flex;gap:12px;margin-top:8px}.ex-ox button{flex:1;font:inherit;font-size:40px;font-weight:800;padding:22px 0;border-radius:18px;border:3px solid transparent;color:#fff;opacity:.55}
.ex-ox .o{background:var(--o,#2563EB)}.ex-ox .x{background:var(--x,#E0453A)}.ex-ox button.on{opacity:1;border-color:var(--ink,#16203A);transform:scale(1.02)}
.ex-nav{display:flex;gap:10px;margin-top:6px}.ex-nav button{flex:1;font:inherit;font-size:16px;font-weight:700;padding:14px;border-radius:14px;border:1.5px solid var(--line,#E1E5EE);background:var(--surface,#fff);color:inherit}
.ex-nav .sub{background:#E0453A;color:#fff;border:0}
.ex-dots{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}.ex-dots button{width:34px;height:34px;border-radius:10px;border:1.5px solid var(--line,#E1E5EE);background:var(--surface,#fff);color:inherit;font:inherit;font-size:13px}
.ex-dots button.d{background:var(--band,#1C2747);color:#fff;border-color:transparent}.ex-dots button.c{outline:2px solid var(--gold,#F5B731)}
.ex-score{text-align:center}.ex-score .big{font-size:52px;font-weight:900;margin:6px 0}.ex-score .send{font-size:14px;font-weight:700;margin-top:6px}
.ex-w{border-top:1px solid var(--line,#E1E5EE);padding:12px 0;font-size:14.5px;line-height:1.6}.ex-w b.r{color:#E0453A}.ex-w .ok{color:var(--o,#2563EB);font-weight:800}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const $ = s => document.querySelector(s);
  let w = null, Q = [], ans = [], cur = 0, t0 = 0, limit = 0, tick = null, name = '', range = '', done = false;

  function addButton() {
    const ref = document.getElementById('wrong');
    if (!ref || document.getElementById('exBtn')) return;
    const b = document.createElement('button'); b.className = ref.className; b.id = 'exBtn'; b.type = 'button'; b.textContent = '시험 보기';
    b.onclick = setup; ref.parentNode.insertBefore(b, ref.nextSibling);
  }
  function open(html) {
    if (!w) { w = document.createElement('div'); w.id = 'exWrap'; document.body.appendChild(w); document.body.style.overflow = 'hidden'; }
    w.innerHTML = '<div class="ex-in">' + html + '</div>'; w.scrollTop = 0;
  }
  function close() { clearInterval(tick); if (w) { w.remove(); w = null; } document.body.style.overflow = ''; }
  function top(title, timer) {
    return `<div class="ex-top"><b>${title}</b>${timer ? '<span class="ex-t" id="exT"></span>' : ''}<button class="ex-x" id="exX" aria-label="닫기">✕</button></div>`;
  }
  function setup() {
    let saved = ''; try { saved = localStorage.getItem(NKEY) || ''; } catch (e) {}
    open(top('시험 보기') + `<div class="ex-card"><h3>📝 ${CFG.app || '시험'}</h3>
      <label>이름</label><input id="exN" maxlength="20" placeholder="예: 홍길동" value="${saved.replace(/"/g, '')}">
      <label>시험 범위</label><select id="exR"><option value="all">전체 (${POOL.length}문항)</option>${SECS.map((s, i) => `<option value="${i}">${s} (${POOL.filter(d => d.sec === s).length}문항)</option>`).join('')}</select>
      <label>문항 수</label><select id="exC"><option value="10">10문항</option><option value="20" selected>20문항</option><option value="30">30문항</option><option value="0">범위 전체</option></select>
      <label>제한 시간</label><select id="exL"><option value="0">없음</option><option value="10">10분</option><option value="15">15분</option><option value="20" selected>20분</option><option value="30">30분</option></select>
      <div class="ex-err" id="exE"></div>
      <button class="ex-go" id="exS">시험 시작</button>
      <div class="ex-note">• 시험 중에는 정답과 해설이 나오지 않아요.<br>• 끝까지 풀고 <b>제출</b>을 누르면 결과가 선생님께 자동으로 전송돼요.<br>• 문제는 무작위로 섞여서 나와요.${CFG.type === 'ox' ? '' : '<br>• 단답형·서술형은 시험에서 빠져요.'}</div></div>`);
    $('#exX').onclick = close;
    $('#exS').onclick = () => {
      name = $('#exN').value.trim();
      if (name.length < 2) { $('#exE').textContent = '이름을 정확히 입력해 주세요.'; return; }
      try { localStorage.setItem(NKEY, name); } catch (e) {}
      const r = $('#exR').value; range = r === 'all' ? '전체' : SECS[+r];
      let pool = r === 'all' ? POOL.slice() : POOL.filter(d => d.sec === SECS[+r]);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const c = +$('#exC').value; if (c) pool = pool.slice(0, c);
      Q = pool; ans = Q.map(() => null); cur = 0; done = false; limit = +$('#exL').value * 60; t0 = Date.now();
      clearInterval(tick); if (limit) tick = setInterval(timer, 500);
      show();
    };
  }
  function timer() {
    const left = limit - Math.floor((Date.now() - t0) / 1000), el = $('#exT');
    if (left <= 0) { clearInterval(tick); submit(true); return; }
    if (el) { el.textContent = '⏱ ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); el.classList.toggle('warn', left <= 60); }
  }
  function show() {
    const d = Q[cur], n = ans.filter(x => x !== null).length;
    let h = top(`${cur + 1} / ${Q.length}`, !!limit) + `<div class="ex-bar"><i style="width:${n / Q.length * 100}%"></i></div><div class="ex-card">`;
    h += `<div class="ex-qn">${range} · 답한 문제 ${n}/${Q.length}</div>`;
    if (CFG.type === 'ox') {
      h += `<div class="ex-stem">${d.q}</div><div class="ex-ox"><button class="o${ans[cur] === 'O' ? ' on' : ''}" data-v="O">O</button><button class="x${ans[cur] === 'X' ? ' on' : ''}" data-v="X">X</button></div>`;
    } else {
      h += `<div class="ex-stem">${d.stem}</div><div class="ex-body">${d.body || ''}</div>` + d.ch.map((c, i) => `<button class="ex-ch${ans[cur] === i + 1 ? ' on' : ''}" data-v="${i + 1}">${CI[i]} ${c}</button>`).join('');
    }
    h += `</div><div class="ex-nav"><button id="exP" ${cur ? '' : 'disabled'}>← 이전</button>${cur < Q.length - 1 ? '<button id="exF">다음 →</button>' : '<button id="exF" class="sub">제출하기</button>'}</div>`;
    h += `<div class="ex-dots">${Q.map((_, i) => `<button data-i="${i}" class="${ans[i] !== null ? 'd' : ''}${i === cur ? ' c' : ''}">${i + 1}</button>`).join('')}</div>`;
    open(h); if (limit) timer();
    $('#exX').onclick = () => { if (confirm('시험을 그만둘까요? 지금까지 푼 내용은 제출되지 않아요.')) close(); };
    w.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      const v = CFG.type === 'ox' ? b.dataset.v : +b.dataset.v; ans[cur] = v;
      if (cur < Q.length - 1) setTimeout(() => { cur++; show(); }, 180); else show();
    });
    w.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { cur = +b.dataset.i; show(); });
    $('#exP').onclick = () => { if (cur) { cur--; show(); } };
    $('#exF').onclick = () => { if (cur < Q.length - 1) { cur++; show(); } else submit(false); };
  }
  function submit(auto) {
    if (done) return;
    const left = ans.filter(x => x === null).length;
    if (!auto && left && !confirm(`아직 안 푼 문제가 ${left}개 있어요. 그래도 제출할까요?`)) return;
    done = true; clearInterval(tick);
    const wrong = [], rows = []; let score = 0;
    Q.forEach((d, i) => {
      const ok = ans[i] === d.a; if (ok) score++; else { wrong.push(d.n); rows.push([d, ans[i]]); }
    });
    const minutes = Math.round((Date.now() - t0) / 6000) / 10;
    const payload = { app: CFG.app, range, name, score, total: Q.length, wrong: wrong.sort((a, b) => a - b), minutes };
    let h = top('시험 결과') + `<div class="ex-card ex-score">${auto ? '<div class="ex-note" style="margin:0">⏱ 시간이 끝나서 자동으로 제출됐어요.</div>' : ''}
      <div>${name}</div><div class="big">${score} / ${Q.length}</div><div>정답률 ${Math.round(score / Q.length * 100)}% · ${minutes}분</div>
      <div class="send" id="exSend">선생님께 전송하는 중…</div></div>`;
    h += `<div class="ex-card"><h3>틀린 문제 다시 보기 (${rows.length})</h3>` + (rows.length ? rows.map(([d, a]) => CFG.type === 'ox'
      ? `<div class="ex-w"><b>${d.n}번</b> ${d.q}<br>정답 <span class="ok">${d.a}</span> · 내 답 <b class="r">${a || '안 풂'}</b>${d.e ? '<br>👉 ' + d.e : ''}</div>`
      : `<div class="ex-w"><b>${d.n}번</b> ${d.stem}<br>정답 <span class="ok">${CI[d.a - 1]} ${d.ch[d.a - 1]}</span><br>내 답 <b class="r">${a ? CI[a - 1] + ' ' + d.ch[a - 1] : '안 풂'}</b>${d.key ? '<br>👉 ' + d.key : ''}</div>`).join('') : '<div class="ex-note">모두 맞았어요! 🎉</div>') + '</div>';
    h += `<button class="ex-go" id="exC2">닫기</button>`;
    open(h); $('#exX').onclick = close; $('#exC2').onclick = close;
    send(payload, 0);
  }
  function send(p, tries) {
    const el = () => document.getElementById('exSend');
    fetch(URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) })
      .then(() => { if (el()) { el().textContent = '✅ 선생님께 결과를 보냈어요.'; el().style.color = '#16804c'; } })
      .catch(() => {
        if (tries < 2) { setTimeout(() => send(p, tries + 1), 2000); return; }
        if (el()) { el().innerHTML = '⚠️ 전송에 실패했어요. 인터넷 연결을 확인하고 <button id="exRe" style="font:inherit;font-weight:800">다시 보내기</button>'; document.getElementById('exRe').onclick = () => { el().textContent = '선생님께 전송하는 중…'; send(p, 0); }; }
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
  new MutationObserver(addButton).observe(document.body, { childList: true, subtree: true });
})();
