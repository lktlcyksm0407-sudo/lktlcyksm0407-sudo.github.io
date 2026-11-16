/* 이경태T 시험 보기 모드 v2 — 결과를 선생님 구글 시트(+메일)로 전송
   사용: <script>window.EXAM_CFG={app:'앱 이름',sets:[{label:'OX',type:'ox',v:'OXD'},{label:'객관식',type:'mcd',v:'MCD'}]}</script><script src="../lib/exam.js"></script>
   type: ox(q,a,e) · quiz(a 1-based) · mcd(a 0-based, 복수 정답 배열) · note(빈칸 {답} {정답* 또는 오답}) · geo(clue, opts) */
(function () {
  const URL = 'https://script.google.com/macros/s/AKfycbzmH4w4y5hAZzjo938SVsgaDHsly1Eu55h8HNSRDVKWaKGq9L8WdMCys1X9Uw_yOIFycQ/exec';
  const CFG = window.EXAM_CFG || {};
  if (!CFG.sets && CFG.type) CFG.sets = [{ label: CFG.type === 'ox' ? 'OX' : '객관식', type: CFG.type, v: 'DATA' }];
  const CI = '①②③④⑤⑥⑦', GJ = 'ㄱㄴㄷㄹㅁㅂ', NKEY = 'lkt-exam-name';
  const gv = n => { try { return new Function('return typeof ' + n + '!=="undefined"?' + n + ':null')(); } catch (e) { return null; } };
  const strip = s => String(s || '').replace(/<[^>]+>/g, '');

  /* ---------- 문항 정규화 ---------- */
  function noteItems(D) {
    const out = []; let k = 0;
    D.forEach(d => {
      let texts = [];
      if (d.tbl) texts = d.tbl.slice(1).map(r => r.join(' · '));
      else if (d.lines) texts = d.lines;
      else if (d.t) texts = [d.t];
      texts.forEach(t => {
        t = String(t).replace(/^\s*(\d+\.|·)\s*/, '');
        const toks = [...t.matchAll(/\{(.+?)\}/g)];
        toks.forEach((m, ti) => {
          k++;
          let idx = -1;
          const render = (mode) => t.replace(/\{(.+?)\}/g, (all, x) => {
            idx++;
            const ops = x.split('/'), right = (ops.find(o => o.endsWith('*')) || ops[0]).replace(/\*$/, '');
            if (idx === ti) return mode === 'q' ? '<span class="ex-blank">' + (ops.length > 1 ? '( ' + ops.map(o => o.replace(/\*$/, '')).join(' / ') + ' )' : '(&nbsp;&nbsp;?&nbsp;&nbsp;)') + '</span>' : '<b class="ex-ans">' + right + '</b>';
            return '<b>' + right + '</b>';
          }).replace(/_(.+?)_/g, '<u>$1</u>');
          idx = -1; const q = render('q'); idx = -1; const full = render('a');
          const ops = m[1].split('/');
          if (ops.length > 1) {
            const ch = ops.map(o => o.replace(/\*$/, '')), a = Math.max(0, ops.findIndex(o => o.endsWith('*')));
            out.push({ kind: 'mc', n: k, sec: d.h, stem: q, body: '', ch, a: [a], key: full, note: 1 });
          } else out.push({ kind: 'blank', n: k, sec: d.h, stem: q, ans: m[1], key: full });
        });
      });
    });
    return out;
  }
  function bogiHtml(b) { return b && b.length ? '<div class="bogi"><span class="bt">보기</span>' + b.map((x, i) => '<p>' + GJ[i] + '. ' + x + '</p>').join('') + '</div>' : ''; }
  function load(set) {
    const D = gv(set.v) || [];
    if (set.type === 'ox') return D.map(d => ({ kind: 'ox', n: d.n, sec: d.sec, stem: d.q, a: d.a, key: d.e }));
    if (set.type === 'quiz') return D.filter(d => d.ch && d.ch.length && d.a > 0).map(d => ({ kind: 'mc', n: d.n, sec: d.sec, stem: d.stem, body: d.body, ch: d.ch, a: [d.a - 1], key: d.key }));
    if (set.type === 'mcd') return D.filter(d => (d.kind || 'mc') === 'mc' && d.ch && d.ch.length).map(d => ({ kind: 'mc', n: d.n, sec: d.sec, stem: d.stem, body: (d.body || '') + bogiHtml(d.bogi), ch: d.ch, a: Array.isArray(d.a) ? d.a : [d.a], key: d.core }));
    if (set.type === 'geo') return D.map(d => ({ kind: 'mc', n: d.id, sec: d.cat, stem: d.clue, body: '', ch: d.opts.map(o => o.name), a: [Math.max(0, d.opts.findIndex(o => o.a || o.name === d.ans))], key: d.ans }));
    if (set.type === 'note') return noteItems(D);
    return [];
  }
  const SETS = (CFG.sets || []).map(s => Object.assign({}, s, { items: load(s) })).filter(s => s.items.length);

  /* ---------- 스타일 ---------- */
  const css = `
#exBtn{background:var(--gold,#F5B731)!important;color:#1C2747!important;font-weight:800!important;border-color:transparent!important}
#exFab{position:fixed;right:14px;bottom:18px;z-index:9000;background:#F5B731;color:#1C2747;border:0;border-radius:999px;padding:13px 18px;font:inherit;font-size:15px;font-weight:800;box-shadow:0 6px 18px rgba(0,0,0,.22)}
#exWrap{position:fixed;inset:0;z-index:9999;background:var(--bg,#F2F4F9);color:var(--ink,#16203A);overflow:auto;font-family:var(--sans,"Noto Sans KR",sans-serif);-webkit-overflow-scrolling:touch}
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
.ex-note{font-size:13px;color:var(--muted,#6A7389);line-height:1.6;margin-top:12px}
.ex-err{color:#E0453A;font-size:14px;font-weight:700;margin-top:8px;min-height:1em}
.ex-bar{height:6px;background:var(--line,#E1E5EE);border-radius:6px;margin-bottom:14px;overflow:hidden}.ex-bar i{display:block;height:100%;background:var(--gold,#F5B731)}
.ex-qn{font-size:13px;color:var(--muted,#6A7389);margin-bottom:6px}
.ex-stem{font-size:17px;font-weight:700;line-height:1.6;margin-bottom:10px}.ex-stem small{font-weight:400;color:var(--muted,#6A7389)}
.ex-stem.nt{font-weight:500}.ex-blank{display:inline-block;background:#FFF1BF;color:#1C2747;border-radius:6px;padding:0 6px;font-weight:800}
.ex-body img{max-width:100%;height:auto!important;max-height:220px}
.ex-body .dbox,.ex-body .box,.ex-body .bogi{border:1.5px solid var(--line,#E1E5EE);border-radius:12px;padding:12px 14px;margin:6px 0;background:var(--bg,#F2F4F9);font-size:15px;line-height:1.6}
.ex-body .bogi{position:relative;padding-top:18px;margin-top:14px}.ex-body .bogi .bt{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--surface,#fff);padding:0 10px;font-weight:700;font-size:13px;letter-spacing:.3em}
.ex-body .bogi p{margin:3px 0;padding-left:20px;text-indent:-20px}.ex-body table{width:100%;border-collapse:collapse;font-size:14px}.ex-body td,.ex-body th{border:1px solid var(--line,#ccc);padding:4px 6px}
.ex-body .qimg{text-align:center;margin:6px 0}.ex-body .pair2{display:flex;gap:8px}.ex-body .src{text-align:right;font-size:13px}
.ex-ch{display:block;width:100%;text-align:left;font:inherit;font-size:15.5px;line-height:1.5;padding:12px 14px;margin:8px 0;border:1.5px solid var(--line,#E1E5EE);border-radius:14px;background:var(--surface,#fff);color:inherit}
.ex-ch.on{border-color:var(--o,#2563EB);background:rgba(37,99,235,.08);font-weight:700}
.ex-in input.ex-type{width:100%;font:inherit;font-size:18px;padding:14px;border:2px solid var(--o,#2563EB);border-radius:14px;background:var(--surface,#fff);color:inherit;margin-top:6px}
.ex-ox{display:flex;gap:12px;margin-top:8px}.ex-ox button{flex:1;font:inherit;font-size:40px;font-weight:800;padding:22px 0;border-radius:18px;border:3px solid transparent;color:#fff;opacity:.55}
.ex-ox .o{background:var(--o,#2563EB)}.ex-ox .x{background:var(--x,#E0453A)}.ex-ox button.on{opacity:1;border-color:var(--ink,#16203A)}
.ex-nav{display:flex;gap:10px;margin-top:6px}.ex-nav button{flex:1;font:inherit;font-size:16px;font-weight:700;padding:14px;border-radius:14px;border:1.5px solid var(--line,#E1E5EE);background:var(--surface,#fff);color:inherit}
.ex-nav .sub{background:#E0453A;color:#fff;border:0}
.ex-dots{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}.ex-dots button{width:34px;height:34px;border-radius:10px;border:1.5px solid var(--line,#E1E5EE);background:var(--surface,#fff);color:inherit;font:inherit;font-size:13px}
.ex-dots button.d{background:var(--band,#1C2747);color:#fff;border-color:transparent}.ex-dots button.c{outline:2px solid var(--gold,#F5B731)}
.ex-score{text-align:center}.ex-score .big{font-size:52px;font-weight:900;margin:6px 0}.ex-score .send{font-size:14px;font-weight:700;margin-top:6px}
.ex-w{border-top:1px solid var(--line,#E1E5EE);padding:12px 0;font-size:14.5px;line-height:1.6}.ex-w b.r{color:#E0453A}.ex-w .ok,.ex-w .ex-ans{color:var(--o,#2563EB);font-weight:800}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const $ = s => document.querySelector(s);
  let w = null, Q = [], ans = [], cur = 0, t0 = 0, limit = 0, tick = null, name = '', range = '', done = false;

  /* ---------- 버튼 (입장 코드 통과 후에만) ---------- */
  function addButton() {
    if (!SETS.length) return;
    const g = document.getElementById('gate'), locked = !!g && !g.hidden && getComputedStyle(g).display !== 'none';
    const ref = document.getElementById('wrong');
    if (ref) {
      if (!document.getElementById('exBtn')) { const b = document.createElement('button'); b.className = ref.className; b.id = 'exBtn'; b.type = 'button'; b.textContent = '시험 보기'; b.onclick = setup; ref.parentNode.insertBefore(b, ref.nextSibling); }
      return;
    }
    let f = document.getElementById('exFab');
    if (!f) { f = document.createElement('button'); f.id = 'exFab'; f.type = 'button'; f.textContent = '📝 시험 보기'; f.onclick = setup; document.body.appendChild(f); }
    f.style.display = (locked || w) ? 'none' : '';
  }
  function open(html) {
    if (!w) { w = document.createElement('div'); w.id = 'exWrap'; document.body.appendChild(w); document.body.style.overflow = 'hidden'; }
    w.innerHTML = '<div class="ex-in">' + html + '</div>'; w.scrollTop = 0; addButton();
  }
  function close() { clearInterval(tick); if (w) { w.remove(); w = null; } document.body.style.overflow = ''; addButton(); }
  function top(title, timer) { return `<div class="ex-top"><b>${title}</b>${timer ? '<span class="ex-t" id="exT"></span>' : ''}<button class="ex-x" id="exX" aria-label="닫기">✕</button></div>`; }

  /* ---------- 시작 화면 ---------- */
  function secs(si) { return [...new Set(SETS[si].items.map(d => d.sec))]; }
  function setup() {
    let saved = ''; try { saved = localStorage.getItem(NKEY) || ''; } catch (e) {}
    const kindSel = SETS.length > 1 ? `<label>문제 종류</label><select id="exK">${SETS.map((s, i) => `<option value="${i}">${s.label} (${s.items.length}문항)</option>`).join('')}</select>` : '';
    const isNote = SETS.some(s => s.type === 'note');
    open(top('시험 보기') + `<div class="ex-card"><h3>📝 ${CFG.app || '시험'}</h3>
      <label>이름</label><input id="exN" maxlength="20" placeholder="예: 홍길동" value="${saved.replace(/"/g, '')}">
      ${kindSel}<label>시험 범위</label><select id="exR"></select>
      <label>문항 수</label><select id="exC"><option value="10">10문항</option><option value="20" selected>20문항</option><option value="30">30문항</option><option value="50">50문항</option><option value="0">범위 전체</option></select>
      <label>제한 시간</label><select id="exL"><option value="0">없음</option><option value="10">10분</option><option value="15">15분</option><option value="20" selected>20분</option><option value="30">30분</option><option value="40">40분</option></select>
      <div class="ex-err" id="exE"></div><button class="ex-go" id="exS">시험 시작</button>
      <div class="ex-note">• 시험 중에는 정답과 해설이 나오지 않아요.<br>• 끝까지 풀고 <b>제출</b>을 누르면 결과가 선생님께 자동으로 전송돼요.<br>• 문제는 무작위로 섞여서 나와요.${isNote ? '<br>• 빈칸은 직접 써요. 띄어쓰기와 가운뎃점(·)은 달라도 맞게 채점해요.' : ''}${SETS.some(s => s.type === 'quiz' || s.type === 'mcd') ? '<br>• 단답형·서술형은 시험에서 빠져요.' : ''}</div></div>`);
    const fillR = () => { const si = $('#exK') ? +$('#exK').value : 0, S = SETS[si]; $('#exR').innerHTML = `<option value="all">전체 (${S.items.length}문항)</option>` + secs(si).map((s, i) => `<option value="${i}">${strip(s)} (${S.items.filter(d => d.sec === s).length}문항)</option>`).join(''); };
    fillR(); if ($('#exK')) $('#exK').onchange = fillR;
    $('#exX').onclick = close;
    $('#exS').onclick = () => {
      name = $('#exN').value.trim();
      if (name.length < 2) { $('#exE').textContent = '이름을 정확히 입력해 주세요.'; return; }
      try { localStorage.setItem(NKEY, name); } catch (e) {}
      const si = $('#exK') ? +$('#exK').value : 0, S = SETS[si], r = $('#exR').value;
      range = (SETS.length > 1 ? S.label + ' · ' : '') + (r === 'all' ? '전체' : strip(secs(si)[+r]));
      let pool = r === 'all' ? S.items.slice() : S.items.filter(d => d.sec === secs(si)[+r]);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const c = +$('#exC').value; if (c) pool = pool.slice(0, c);
      Q = pool; ans = Q.map(d => d.kind === 'mc' && d.a.length > 1 ? [] : null); cur = 0; done = false; limit = +$('#exL').value * 60; t0 = Date.now();
      clearInterval(tick); if (limit) tick = setInterval(timer, 500);
      show();
    };
  }
  function timer() {
    const left = limit - Math.floor((Date.now() - t0) / 1000), el = $('#exT');
    if (left <= 0) { clearInterval(tick); submit(true); return; }
    if (el) { el.textContent = '⏱ ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); el.classList.toggle('warn', left <= 60); }
  }
  const answered = x => x !== null && x !== '' && !(Array.isArray(x) && !x.length);

  /* ---------- 문제 화면 ---------- */
  function show() {
    const d = Q[cur], n = ans.filter(answered).length, multi = d.kind === 'mc' && d.a.length > 1;
    let h = top(`${cur + 1} / ${Q.length}`, !!limit) + `<div class="ex-bar"><i style="width:${n / Q.length * 100}%"></i></div><div class="ex-card"><div class="ex-qn">${range} · 답한 문제 ${n}/${Q.length}</div>`;
    if (d.kind === 'ox') h += `<div class="ex-stem">${d.stem}</div><div class="ex-ox"><button class="o${ans[cur] === 'O' ? ' on' : ''}" data-v="O">O</button><button class="x${ans[cur] === 'X' ? ' on' : ''}" data-v="X">X</button></div>`;
    else if (d.kind === 'blank') h += `<div class="ex-stem nt">${d.stem}</div><input class="ex-type" id="exIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="빈칸에 들어갈 말" value="${(ans[cur] || '').replace(/"/g, '&quot;')}">`;
    else {
      h += `<div class="ex-stem${d.note ? ' nt' : ''}">${d.note ? '알맞은 말을 고르세요.<br>' : ''}${d.stem}${multi ? ' <small>(' + d.a.length + '개 고르기)</small>' : ''}</div><div class="ex-body">${d.body || ''}</div>`;
      h += d.ch.map((c, i) => { const on = multi ? ans[cur].includes(i) : ans[cur] === i; return `<button class="ex-ch${on ? ' on' : ''}" data-v="${i}">${d.note ? '' : CI[i] + ' '}${c}</button>`; }).join('');
    }
    h += `</div><div class="ex-nav"><button id="exP" ${cur ? '' : 'disabled'}>← 이전</button>${cur < Q.length - 1 ? '<button id="exF">다음 →</button>' : '<button id="exF" class="sub">제출하기</button>'}</div>`;
    h += `<div class="ex-dots">${Q.map((_, i) => `<button data-i="${i}" class="${answered(ans[i]) ? 'd' : ''}${i === cur ? ' c' : ''}">${i + 1}</button>`).join('')}</div>`;
    open(h); if (limit) timer();
    $('#exX').onclick = () => { if (confirm('시험을 그만둘까요? 지금까지 푼 내용은 제출되지 않아요.')) close(); };
    const next = () => { if (cur < Q.length - 1) setTimeout(() => { cur++; show(); }, 180); else show(); };
    w.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      if (d.kind === 'ox') { ans[cur] = b.dataset.v; next(); return; }
      const v = +b.dataset.v;
      if (multi) { const a = ans[cur], k = a.indexOf(v); if (k >= 0) a.splice(k, 1); else { a.push(v); if (a.length > d.a.length) a.shift(); } if (a.length === d.a.length) next(); else show(); }
      else { ans[cur] = v; next(); }
    });
    const inp = $('#exIn');
    if (inp) { inp.oninput = () => { ans[cur] = inp.value; }; inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ans[cur] = inp.value; if (cur < Q.length - 1) { cur++; show(); } else submit(false); } }; setTimeout(() => inp.focus(), 50); }
    w.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { if (inp) ans[cur] = inp.value; cur = +b.dataset.i; show(); });
    $('#exP').onclick = () => { if (inp) ans[cur] = inp.value; if (cur) { cur--; show(); } };
    $('#exF').onclick = () => { if (inp) ans[cur] = inp.value; if (cur < Q.length - 1) { cur++; show(); } else submit(false); };
  }

  /* ---------- 채점 · 전송 ---------- */
  const nz = s => String(s || '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[\s·・ㆍ.,\-()（）'"‘’“”「」『』]/g, '');
  function correct(d, a) {
    if (d.kind === 'ox') return a === d.a;
    if (d.kind === 'blank') return !!a && nz(a) === nz(d.ans);
    if (d.a.length > 1) return Array.isArray(a) && a.length === d.a.length && d.a.every(x => a.includes(x));
    return a === d.a[0];
  }
  function mine(d, a) {
    if (!answered(a)) return '안 풂';
    if (d.kind === 'ox' || d.kind === 'blank') return a;
    const L = Array.isArray(a) ? a : [a];
    return L.map(i => (d.note ? '' : CI[i] + ' ') + d.ch[i]).join(', ');
  }
  function right(d) { return d.kind === 'ox' ? d.a : d.kind === 'blank' ? d.ans : d.a.map(i => (d.note ? '' : CI[i] + ' ') + d.ch[i]).join(', '); }
  function submit(auto) {
    if (done) return;
    const left = ans.filter(x => !answered(x)).length;
    if (!auto && left && !confirm(`아직 안 푼 문제가 ${left}개 있어요. 그래도 제출할까요?`)) return;
    done = true; clearInterval(tick);
    const wrong = [], rows = []; let score = 0;
    Q.forEach((d, i) => { if (correct(d, ans[i])) score++; else { wrong.push(d.kind === 'blank' || d.note ? strip(right(d)) : d.n); rows.push([d, ans[i]]); } });
    const minutes = Math.round((Date.now() - t0) / 6000) / 10;
    const payload = { app: CFG.app, range, name, score, total: Q.length, wrong: wrong.every(x => typeof x === 'number') ? wrong.sort((a, b) => a - b) : wrong, minutes };
    let h = top('시험 결과') + `<div class="ex-card ex-score">${auto ? '<div class="ex-note" style="margin:0">⏱ 시간이 끝나서 자동으로 제출됐어요.</div>' : ''}
      <div>${name}</div><div class="big">${score} / ${Q.length}</div><div>정답률 ${Math.round(score / Q.length * 100)}% · ${minutes}분</div>
      <div class="send" id="exSend">선생님께 전송하는 중…</div></div>`;
    h += `<div class="ex-card"><h3>틀린 문제 다시 보기 (${rows.length})</h3>` + (rows.length ? rows.map(([d, a]) => d.kind === 'blank' || d.note
      ? `<div class="ex-w">${d.key}<br>내 답 <b class="r">${mine(d, a)}</b></div>`
      : `<div class="ex-w"><b>${d.n}번</b> ${d.stem}<br>정답 <span class="ok">${right(d)}</span><br>내 답 <b class="r">${mine(d, a)}</b>${d.key ? '<br>👉 ' + d.key : ''}</div>`).join('') : '<div class="ex-note">모두 맞았어요! 🎉</div>') + '</div>';
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
  let pend = false; new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; addButton(); }); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
})();
