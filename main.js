// Consolidate Global Interactive Modules: Theme, Modals, 2D Game, and Presence

// ── 1. Unified Theme Controller ──
(function () {
  const KEY = 'theme';
  const root = document.documentElement;
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animT;

  window.isDark = function(p) { 
    return p === 'dark' || (p === 'system' && !!mq && mq.matches); 
  };

  window.setClass = function(p) {
    root.classList.toggle('dark', window.isDark(p));
    try {
      document.querySelectorAll('[data-theme-opt]').forEach(function (el) {
        el.classList.toggle('is-active', el.getAttribute('data-theme-opt') === p);
      });
    } catch (e) {}
  };

  function crossfade(p) {
    root.classList.add('theme-anim');
    window.setClass(p);
    clearTimeout(animT);
    animT = setTimeout(function () { root.classList.remove('theme-anim'); }, 520);
  }

  function reveal(p, x, y) {
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = root.__vt = document.startViewTransition(function () { window.setClass(p); });
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 540, easing: 'cubic-bezier(.32,.08,.24,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
  }

  window.setTheme = function (p, ev) {
    try { localStorage.setItem(KEY, p); } catch (e) {}
    if (window.isDark(p) === root.classList.contains('dark')) { window.setClass(p); return; }
    if (reduce || !document.startViewTransition) { crossfade(p); return; }
    const x = (ev && ev.clientX) || innerWidth, y = (ev && ev.clientY) || innerHeight;
    reveal(p, x, y);
  };

  // Sync active states on load
  const saved = localStorage.getItem(KEY) || 'system';
  window.setClass(saved);
  if (mq) mq.addEventListener('change', function () { if (localStorage.getItem(KEY) === 'system') crossfade('system'); });
})();


// ── 2. Ask console overlay (⌘K) ──
(function () {
  const askOverlay = document.getElementById('askOverlay');
  if (!askOverlay) return;
  const askInput = document.getElementById('askInput');
  const askText = document.getElementById('askText');
  const askTitle = askOverlay.querySelector('.ask-title');
  const askCaret = askOverlay.querySelector('.ask-caret');
  const askLoader = document.getElementById('askLoader');
  const askHead = askOverlay.querySelector('.ask-head');
  const askField = askOverlay.querySelector('.ask-field');
  const askBubble = document.getElementById('askBubble');
  const askBubbleText = document.getElementById('askBubbleText');
  const ASK_DEFAULT_TITLE = 'what do you want to ask?';
  let askSeq = 0;
  let askBusy = false;

  const askSleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function askResetState() {
    askBusy = false;
    askInput.removeAttribute('readonly');
    askInput.value = '';
    askText.textContent = '';
    askCaret.style.display = '';
    askField.style.display = '';
    askBubble.classList.remove('is-on');
    askBubbleText.textContent = '';
    askTitle.classList.remove('is-small');
    askHead.classList.remove('is-shimmer');
    askLoader.classList.remove('is-on');
    askTitle.textContent = ASK_DEFAULT_TITLE;
  }

  async function askSetTitle(text, pulse) {
    askTitle.style.opacity = '0';
    askTitle.style.transform = 'translateY(6px)';
    await askSleep(250);
    askTitle.textContent = text;
    if (pulse) {
      askTitle.classList.add('is-small');
      askLoader.classList.add('is-on');
      askHead.classList.add('is-shimmer');
    } else {
      askLoader.classList.remove('is-on');
      askHead.classList.remove('is-shimmer');
      askTitle.classList.add('is-small');
    }
    askTitle.style.opacity = '1';
    askTitle.style.transform = 'none';
    await askSleep(300);
  }

  async function collectData() {
    const ua = navigator.userAgent;
    const data = {
      os: /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : 'Linux',
      browser: /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Browser',
      ip: '127.0.0.1', city: 'Manila', country: 'Philippines', isp: 'Local Link',
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    try {
      const res = await fetch('https://ipwho.is/');
      const j = await res.json();
      if (j && j.success) {
        data.ip = j.ip;
        data.city = j.city;
        data.country = j.country;
        data.isp = j.connection.isp || j.org || '';
      }
    } catch(e) {}
    return data;
  }

  async function askSubmit() {
    if (askBusy) return;
    const query = askInput.value.trim();
    if (!query) return;

    askBusy = true;
    const mySeq = askSeq;
    askInput.setAttribute('readonly', '');
    askCaret.style.display = 'none';

    askBubbleText.textContent = query;
    askBubble.classList.add('is-on');
    askField.style.display = 'none';

    const dataPromise = collectData();

    await askSetTitle('thinking...', true);
    await askSleep(1500);
    if (mySeq !== askSeq) return;

    await askSetTitle('analyzing browser connection...', true);
    await askSleep(1500);
    if (mySeq !== askSeq) return;

    const data = await dataPromise;
    if (mySeq !== askSeq) return;

    // Reveal Plot twist
    askBubble.classList.remove('is-on');
    askLoader.classList.remove('is-on');
    askHead.classList.remove('is-shimmer');

    const messages = [
      'before i answer',
      'here is what your browser shared automatically',
      'you are in ' + data.city + ', ' + data.country,
      'your ip address is ' + data.ip,
      'connected via ' + data.isp,
      'operating on ' + data.os + ' with ' + data.browser,
      'none of this needed your permission',
      'your browser shares it with every website you open',
      'as for your question...',
      'i don\'t want to waste LLM tokens, search for it yourself :)'
    ];

    for (const m of messages) {
      await askSetTitle(m, false);
      if (mySeq !== askSeq) return;
      await askSleep(2200);
    }

    window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank');
    window.closeAsk();
  }

  window.openAsk = function() {
    askSeq++;
    askResetState();
    askOverlay.classList.add('is-visible');
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => askOverlay.classList.add('is-open'));
    setTimeout(() => askInput.focus(), 60);
  }
  
  window.closeAsk = function() {
    askSeq++;
    document.documentElement.style.overflow = '';
    askInput.blur();
    askOverlay.classList.remove('is-open');
    setTimeout(() => {
      askOverlay.classList.remove('is-visible');
      askResetState();
    }, 300);
  }

  window.focusAsk = function() { if (!askBusy) askInput.focus(); }
  
  askInput.addEventListener('input', () => { askText.textContent = askInput.value; });
  askInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); askSubmit(); }
  });
})();


// ── 3. Speed Typing Test Game (⌘J) ──
(function () {
  const typingOverlay = document.getElementById('typingOverlay');
  if (!typingOverlay) return;
  const wordsEl = document.getElementById('ttWords');
  const kbEl = document.getElementById('ttKeyboard');
  const elWpm = document.getElementById('ttWpm'), elAcc = document.getElementById('ttAcc'), elTime = document.getElementById('ttTime');
  const rWpm = document.getElementById('ttResWpm'), rAcc = document.getElementById('ttResAcc'), rRaw = document.getElementById('ttResRaw'), rTime = document.getElementById('ttResTime');
  const verdictEl = document.getElementById('ttVerdict');

  const WORD_BANK = 'the be of and a to in he have it that for they with as not on she at by this we you do but from or which one would all will there say who make when can more if no out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through long where much should well people down own just because good each those feel seem how high too place little world very still hand old life tell write become here show house both between need mean call under last right move thing school never same begin while number part turn real leave might want point form off child few small since against ask late home large person end open public follow during without again hold around possible head consider word program'.split(' ');
  const KB_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  
  let words = [], wordEls = [], wi = 0, ci = 0;
  let started = false, finished = false, startTime = 0, rafId = null;
  let raw = 0, correct = 0;
  let isOpen = false;
  const caretEl = document.createElement('span');
  caretEl.className = 'tt-caret';

  function rand(n) { return Math.floor(Math.random() * n); }
  function genWords() { words = Array.from({ length: 20 }, () => WORD_BANK[rand(WORD_BANK.length)]); }

  function buildKeyboard() {
    kbEl.innerHTML = '';
    KB_ROWS.forEach(row => {
      const r = document.createElement('div');
      r.className = 'tt-krow flex gap-1 justify-center';
      for (const ch of row) {
        const k = document.createElement('span');
        k.className = 'tt-key border border-gray-200 px-3 py-1.5 rounded bg-gray-50 text-[11px] font-mono min-w-[28px] text-center';
        k.dataset.key = ch;
        k.textContent = ch;
        r.appendChild(k);
      }
      kbEl.appendChild(r);
    });
    const r = document.createElement('div');
    r.className = 'tt-krow flex gap-1 justify-center mt-1';
    const sp = document.createElement('span');
    sp.className = 'tt-key border border-gray-200 px-8 py-1.5 rounded bg-gray-50 text-[10px] font-mono uppercase text-center space';
    sp.dataset.key = ' ';
    sp.textContent = 'space';
    r.appendChild(sp);
    kbEl.appendChild(r);
  }

  function keyEl(ch) { return kbEl.querySelector(`.tt-key[data-key="${ch}"]`); }
  
  function flashKey(ch) {
    const k = keyEl(ch);
    if (k) {
      k.classList.add('bg-gray-300', 'text-ink');
      setTimeout(() => k.classList.remove('bg-gray-300', 'text-ink'), 100);
    }
  }

  function highlightNext() {
    kbEl.querySelectorAll('.tt-key').forEach(k => k.classList.remove('ring-1', 'ring-ink'));
    if (finished) return;
    const cur = wordEls[wi];
    let nc = null;
    if (ci < cur.word.length) nc = cur.word[ci];
    else if (wi < words.length - 1) nc = ' ';
    if (nc) {
      const k = keyEl(nc);
      if (k) k.classList.add('ring-1', 'ring-ink');
    }
  }

  function buildText() {
    wordsEl.innerHTML = '';
    wordEls = [];
    words.forEach(w => {
      const wEl = document.createElement('span');
      wEl.className = 'tt-word inline-block mr-2 text-gray-400 font-mono text-xl';
      const chars = [];
      for (const ch of w) {
        const c = document.createElement('span');
        c.className = 'tt-char transition-colors';
        c.textContent = ch;
        wEl.appendChild(c);
        chars.push(c);
      }
      wordsEl.appendChild(wEl);
      wordEls.push({ el: wEl, chars, word: w });
    });
    wordsEl.appendChild(caretEl);
  }

  function moveCaret() {
    const cur = wordEls[wi];
    let left, top;
    if (ci < cur.chars.length) {
      const el = cur.chars[ci];
      left = el.offsetLeft;
      top = el.offsetTop;
    } else {
      const el = cur.chars[cur.chars.length - 1];
      left = el.offsetLeft + el.offsetWidth;
      top = el.offsetTop;
    }
    caretEl.style.left = left + 'px';
    caretEl.style.top = top + 'px';
  }

  function statsLoop() {
    if (!started || finished) return;
    const t = (Date.now() - startTime) / 1000;
    const wpm = t > 0.5 ? Math.round((correct / 5) / (t / 60)) : 0;
    const acc = raw ? Math.round(correct / raw * 100) : 100;
    
    elWpm.textContent = wpm;
    elAcc.textContent = acc;
    elTime.textContent = Math.floor(t);
    
    if (isOpen && !finished) requestAnimationFrame(statsLoop);
  }

  function handleChar(k) {
    if (finished) return;
    if (!started) {
      started = true;
      startTime = Date.now();
      requestAnimationFrame(statsLoop);
    }
    const cur = wordEls[wi];
    if (ci < cur.word.length) {
      const el = cur.chars[ci];
      const ok = (k === cur.word[ci]);
      el.className = 'tt-char ' + (ok ? 'text-ink font-semibold' : 'text-red-500 font-semibold');
      raw++;
      if (ok) correct++;
      ci++;
    }
    moveCaret();
    highlightNext();
    if (wi === words.length - 1 && ci >= cur.word.length) finish();
  }

  function handleSpace() {
    if (finished || !started) return;
    if (wi < words.length - 1) {
      wi++;
      ci = 0;
      moveCaret();
      highlightNext();
    }
  }

  function handleBackspace() {
    if (finished) return;
    if (ci > 0) {
      ci--;
      const cur = wordEls[wi];
      cur.chars[ci].className = 'tt-char text-gray-400';
    } else if (wi > 0) {
      wi--;
      ci = wordEls[wi].chars.length;
    }
    moveCaret();
    highlightNext();
  }

  function finish() {
    finished = true;
    const el = Math.max(0.001, (Date.now() - startTime) / 1000);
    const wpm = Math.round((correct / 5) / (el / 60));
    const acc = raw ? Math.round(correct / raw * 100) : 100;
    
    rWpm.textContent = wpm;
    rAcc.textContent = acc;
    rRaw.textContent = raw;
    rTime.textContent = el.toFixed(1);
    
    const beat = wpm >= 140;
    verdictEl.textContent = beat ? 'You beat Bryl\'s 140 WPM score!' : 'You missed Bryl\'s 140 WPM score. Try again!';
    verdictEl.className = 'tt-verdict font-mono text-[13px] ' + (beat ? 'text-ink font-bold' : 'text-gray-500');
    
    typingOverlay.classList.add('show-results');
  }

  function resetTyping() {
    finished = false; started = false; startTime = 0; wi = 0; ci = 0; raw = 0; correct = 0;
    elWpm.textContent = '0'; elAcc.textContent = '100'; elTime.textContent = '0';
    typingOverlay.classList.remove('show-results');
    genWords();
    buildText();
    requestAnimationFrame(() => { moveCaret(); highlightNext(); });
  }
  
  window.ttRestart = resetTyping;

  window.openTyping = function() {
    typingOverlay.classList.add('is-visible');
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => typingOverlay.classList.add('is-open'));
    isOpen = true;
    resetTyping();
  }

  window.closeTyping = function() {
    isOpen = false;
    document.documentElement.style.overflow = '';
    typingOverlay.classList.remove('is-open');
    setTimeout(() => {
      typingOverlay.classList.remove('is-visible');
    }, 300);
  }

  buildKeyboard();

  // Key Event bindings
  document.addEventListener('keydown', (e) => {
    // ⌘K Ask Shortcut
    if ((e.metaKey || e.altKey) && e.code === 'KeyK') {
      e.preventDefault();
      const ask = document.getElementById('askOverlay');
      if (ask) ask.classList.contains('is-visible') ? window.closeAsk() : window.openAsk();
      return;
    }
    // ⌘J Typing Shortcut
    if ((e.metaKey || e.altKey) && e.code === 'KeyJ') {
      e.preventDefault();
      typingOverlay.classList.contains('is-visible') ? window.closeTyping() : window.openTyping();
      return;
    }
    
    // Escape rules
    if (e.key === 'Escape') {
      const ask = document.getElementById('askOverlay');
      if (ask && ask.classList.contains('is-visible')) window.closeAsk();
      if (typingOverlay.classList.contains('is-visible')) window.closeTyping();
      return;
    }

    // Typing game session inputs
    if (isOpen && !finished) {
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        flashKey('backspace');
        handleBackspace();
      } else if (e.key === ' ') {
        e.preventDefault();
        flashKey(' ');
        handleSpace();
      } else if (e.key.length === 1) {
        const ch = e.key.toLowerCase();
        if (/[a-z]/.test(ch)) {
          e.preventDefault();
          flashKey(ch);
          handleChar(ch);
        }
      }
    }
  });
})();


// ── 4. 2D Canvas mini game (lg+) ──
(function () {
  const wrap = document.getElementById('pgWrap');
  const box = document.getElementById('pgBox');
  const canvas = document.getElementById('pgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const TILE = 30;
  const MOVE_SPEED = 120;
  const MAP_W = 14, MAP_H = 12;

  let player = { x: 5, y: 5, direction: 'down' };
  let keys = { w: false, a: false, s: false, d: false };
  let running = false;

  function theme() {
    const dark = document.documentElement.classList.contains('dark');
    return dark
      ? { grid: 'rgba(240,240,245,0.09)', player: '#f4f4f5', text: '#8a8a92' }
      : { grid: 'rgba(10,10,12,0.08)', player: '#0a0a0a', text: '#525252' };
  }

  function draw() {
    const c = theme();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += TILE) {
      ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += TILE) {
      ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Draw desk obstacle
    ctx.fillStyle = 'rgb(var(--g200))';
    ctx.fillRect(4 * TILE, 3 * TILE, TILE * 3, TILE * 2);
    
    ctx.fillStyle = c.text;
    ctx.font = '8px monospace';
    ctx.fillText("DEV_DESK", 4 * TILE + 8, 3 * TILE + 16);

    // Draw Player (as a neat pixel circle/head)
    ctx.fillStyle = c.player;
    ctx.beginPath();
    ctx.arc(player.x * TILE + TILE / 2, player.y * TILE + TILE / 2, 8, 0, Math.PI * 2);
    ctx.fill();

    // Eyes for direction indicators
    ctx.fillStyle = 'rgb(var(--bg))';
    let ex1, ey1, ex2, ey2;
    if (player.direction === 'down') {
      ex1 = player.x * TILE + TILE / 2 - 3; ey1 = player.y * TILE + TILE / 2 + 1;
      ex2 = player.x * TILE + TILE / 2 + 3; ey2 = player.y * TILE + TILE / 2 + 1;
    } else if (player.direction === 'up') {
      ex1 = player.x * TILE + TILE / 2 - 3; ey1 = player.y * TILE + TILE / 2 - 3;
      ex2 = player.x * TILE + TILE / 2 + 3; ey2 = player.y * TILE + TILE / 2 - 3;
    } else if (player.direction === 'left') {
      ex1 = player.x * TILE + TILE / 2 - 4; ey1 = player.y * TILE + TILE / 2 - 2;
      ex2 = player.x * TILE + TILE / 2 - 4; ey2 = player.y * TILE + TILE / 2 + 2;
    } else {
      ex1 = player.x * TILE + TILE / 2 + 4; ey1 = player.y * TILE + TILE / 2 - 2;
      ex2 = player.x * TILE + TILE / 2 + 4; ey2 = player.y * TILE + TILE / 2 + 2;
    }
    ctx.fillRect(ex1 - 1, ey1 - 1, 2, 2);
    ctx.fillRect(ex2 - 1, ey2 - 1, 2, 2);

    // Draw label
    ctx.fillStyle = c.player;
    ctx.font = '700 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("Bryl", player.x * TILE + TILE / 2, player.y * TILE + TILE / 2 - 12);
  }

  function update() {
    let dx = 0, dy = 0;
    if (keys.w) { dy = -1; player.direction = 'up'; }
    else if (keys.s) { dy = 1; player.direction = 'down'; }
    else if (keys.a) { dx = -1; player.direction = 'left'; }
    else if (keys.d) { dx = 1; player.direction = 'right'; }

    if (dx !== 0 || dy !== 0) {
      const nx = player.x + dx;
      const ny = player.y + dy;

      if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H) {
        const onDesk = (nx >= 4 && nx < 7 && ny >= 3 && ny < 5);
        if (!onDesk) {
          player.x = nx;
          player.y = ny;
        }
      }
    }
  }

  let lastTime = 0;
  function loop(t) {
    if (!running) return;
    if (t - lastTime > MOVE_SPEED) {
      update();
      lastTime = t;
    }
    draw();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener('keydown', (e) => {
    if (['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = true;
  });

  canvas.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.w = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.s = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.a = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false;
  });

  canvas.addEventListener('focus', () => {
    box.classList.add('is-playing');
    running = true;
    lastTime = performance.now();
    loop(lastTime);
  });

  canvas.addEventListener('blur', () => {
    box.classList.remove('is-playing');
    running = false;
    keys = { w: false, a: false, s: false, d: false };
  });

  wrap.classList.add('is-on');
  draw();
})();


// ── 5. Presence Heartbeat Simulator ──
(function () {
  const AV_SEEDS = ['Maria', 'Leo', 'Zoe', 'Kai'];
  function avatarImg(seed) {
    return '<img class="presence-avatar" alt="" src="https://api.dicebear.com/9.x/notionists/svg?seed=' + seed + '&radius=50&backgroundColor=f1f1f1">';
  }
  function updatePresence() {
    const count = Math.floor(Math.random() * 5) + 1;
    let html = '';
    for (let i = 0; i < Math.min(count, 3); i++) {
      html += avatarImg(AV_SEEDS[i % AV_SEEDS.length]);
    }
    if (count > 3) {
      html += '<span class="presence-more">+' + (count - 3) + '</span>';
    }
    document.querySelectorAll('.presence-icons').forEach(el => el.innerHTML = html);
    document.querySelectorAll('.presence-num').forEach(el => el.textContent = count);
  }
  updatePresence();
  setInterval(updatePresence, 15000);
})();


// ── 6. Mobile nav utilities ──
window.openMobileNav = function() {
  const m = document.getElementById('mobileNav');
  if (!m) return;
  m.classList.remove('hidden');
  m.classList.add('flex');
  document.documentElement.style.overflow = 'hidden';
  requestAnimationFrame(() => m.classList.add('is-open'));
}

window.closeMobileNav = function() {
  const m = document.getElementById('mobileNav');
  if (!m) return;
  m.classList.remove('is-open');
  document.documentElement.style.overflow = '';
  setTimeout(() => { m.classList.add('hidden'); m.classList.remove('flex'); }, 300);
}


function openImage(src, title, desc) {

    document.getElementById("modalImg").src = src;

    var titleEl = document.getElementById("modalTitle");
    var descEl = document.getElementById("modalDesc");
    if (titleEl) titleEl.textContent = title || '';
    if (descEl) descEl.textContent = desc || '';

    document.getElementById("imageModal").classList.remove("hidden");
    document.getElementById("imageModal").classList.add("flex");

    document.body.style.overflow = "hidden";

}

function closeImage() {

    document.getElementById("imageModal").classList.add("hidden");
    document.getElementById("imageModal").classList.remove("flex");

    document.body.style.overflow = "auto";

}

// ── 7. Sound Manager ──
(function () {
  const HOVER_SOUND = './hover.mp3';
  const CLICK_SOUND = './click.mp3';
  const SOUND_WAV = './sound.wav';
  const KEY = 'soundEnabled';
  let soundEnabled = localStorage.getItem(KEY) !== 'false';

  var audioCtx = null;
  var buffers = {};

  function ensureCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function loadBuffer(src, cb) {
    if (buffers[src]) { cb(buffers[src]); return; }
    var req = new XMLHttpRequest();
    req.open('GET', src, true);
    req.responseType = 'arraybuffer';
    req.onload = function () {
      ensureCtx().decodeAudioData(req.response, function (buf) {
        buffers[src] = buf;
        cb(buf);
      }, function () {});
    };
    req.send();
  }

  function playBuffer(src, vol) {
    if (!soundEnabled) return;
    loadBuffer(src, function (buf) {
      var ctx = ensureCtx();
      var source = ctx.createBufferSource();
      source.buffer = buf;
      var gain = ctx.createGain();
      gain.gain.value = vol;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    });
  }

  function playClick() { playBuffer(CLICK_SOUND, 0.2); }
  function playHover() { playBuffer(HOVER_SOUND, 0.15); }
  function playWav()   { playBuffer(SOUND_WAV, 0.25); }

  window.playHoverSound = playHover;
  window.playClickSound = playClick;
  window.playWavSound = playWav;

  function updateSoundBtns() {
    document.querySelectorAll('[data-sound-toggle]').forEach(function (btn) {
      btn.classList.toggle('sound-off', !soundEnabled);
      btn.setAttribute('aria-label', soundEnabled ? 'Disable sounds' : 'Enable sounds');
    });
  }

  window.toggleSound = function (ev) {
    if (ev) ev.stopPropagation();
    soundEnabled = !soundEnabled;
    try { localStorage.setItem(KEY, soundEnabled); } catch (e) {}
    updateSoundBtns();
    if (soundEnabled) playWav();
  };

  function unlock() {
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('keydown', unlock);
    ensureCtx();
  }
  document.addEventListener('click', unlock);
  document.addEventListener('touchstart', unlock);
  document.addEventListener('keydown', unlock);

  document.addEventListener('DOMContentLoaded', function () {
    updateSoundBtns();

    var selectors = 'a, button, .deck-card, .cert-card, .proj-card, .mnav-group a, .mnav-group button, [onclick], [data-sound-hover]';
    document.querySelectorAll(selectors).forEach(function (el) {
      if (!el.hasAttribute('data-sound-hover')) el.setAttribute('data-sound-hover', 'true');
      if (!el.hasAttribute('data-sound-click')) el.setAttribute('data-sound-click', 'true');
      el.addEventListener('mouseenter', function () { if (el.getAttribute('data-sound-hover') === 'true') playHover(); });
      el.addEventListener('click', function (e) {
        if (el.getAttribute('data-sound-click') !== 'true') return;
        playClick();
        if (el.tagName === 'A' && el.href && el.hostname === location.hostname && el.getAttribute('href') !== '#' && !el.getAttribute('href').startsWith('#')) {
          e.preventDefault();
          var href = el.href;
          setTimeout(function () { location.href = href; }, 180);
        }
      });
    });
  });
})();