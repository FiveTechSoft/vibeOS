// vibe.js — VibeOS client-side engine. Window shell + DeepSeek body.
(function () {
  'use strict';

  // ================================================================
  // API Key
  // ================================================================
  var API_KEY = '';
  try { API_KEY = localStorage.getItem('vibeos_ds_key') || ''; } catch(e) {}

  function saveKey(key) { API_KEY = key; try { localStorage.setItem('vibeos_ds_key', key); } catch(e) {} }

  function promptForKey() {
    var key = prompt('Enter your DeepSeek API key:\n\nGet one at https://platform.deepseek.com', API_KEY);
    if (key) { saveKey(key.trim()); return API_KEY; }
    return '';
  }

  // ================================================================
  // Delta
  // ================================================================
  function applyDelta(delta) {
    if (!delta || !delta.id || !delta.op) return;
    var el = document.getElementById(delta.id);
    if (!el) return;
    switch (delta.op) {
      case 'inner': el.innerHTML = delta.html || ''; break;
      case 'append': el.insertAdjacentHTML('beforeend', delta.html || ''); break;
      case 'replace': el.outerHTML = delta.html || ''; break;
      case 'remove': el.remove(); break;
      case 'value': el.value = delta.value || ''; break;
      case 'attr': el.setAttribute(delta.attr, delta.val); break;
    }
  }

  // ================================================================
  // Window Factory
  // ================================================================
  function createWindowId() { return 'win-' + Date.now() + '-' + Math.floor(Math.random()*1000); }

  function centerWindow(winId) {
    var win = document.getElementById(winId);
    if (!win) return;
    var vw = window.innerWidth, vh = window.innerHeight;
    var w = win.offsetWidth || 600, h = win.offsetHeight || 400;
    win.style.top  = Math.max(30, (vh - h) / 2) + 'px';
    win.style.left = Math.max(0,  (vw - w) / 2) + 'px';
    win.style.zIndex = 1000;
  }

  function buildWindowShell(winId, title, icon, bodyHTML, width, height) {
    return '<div class="window" id="' + winId + '" style="width:' + width + 'px;height:' + height + 'px;z-index:10">' +
      '<div class="title-bar"><span class="title-bar-icon">' + icon + '</span>' +
      '<div class="title-bar-text">' + title + '</div>' +
      '<div class="title-bar-controls"><button class="min-btn">─</button><button class="max-btn">□</button><button class="close-btn">✕</button></div></div>' +
      '<div class="window-body" style="flex:1;display:flex;flex-direction:column;overflow:auto">' +
      bodyHTML + '</div>' +
      '<div class="status-bar"><p class="status-bar-field">Ready</p></div></div>';
  }

  function openWindow(action, info) {
    var winId = 'win-' + action.replace('open-','');
    var ex = document.getElementById(winId);
    if (ex) ex.remove();
    var html = buildWindowShell(winId, info.title, info.icon, info.body(), info.w, info.h);
    applyDelta({ id: 'windows-container', op: 'append', html: html });
    setTimeout(function() {
      if (info.onOpen) info.onOpen();
      centerWindow(winId);
    }, 80);
  }

  function openHallucinatedWindow(title, bodyHTML) {
    var winId = createWindowId();
    var html = buildWindowShell(winId, title, '🪟', bodyHTML, 650, 420);
    applyDelta({ id: 'windows-container', op: 'append', html: html });
    runWindowScripts(winId);
    var win = document.getElementById(winId);
    if (win) {
      win._appName = title; win._html = bodyHTML;
      var controls = win.querySelector('.title-bar-controls');
      if (controls) {
        var b = document.createElement('button');
        b.className = 'improve-btn'; b.textContent = '✨';
        b.title = 'Ask AI to improve this app';
        b.setAttribute('data-improve', winId);
        controls.insertBefore(b, controls.firstChild);
      }
    }
    setTimeout(function() { centerWindow(winId); }, 80);
  }

  // Ask DeepSeek to refine an already-generated app in place
  function improveCurrentApp(winId) {
    var win = document.getElementById(winId);
    if (!win) return;
    var instruction = window.prompt('How should DeepSeek improve "' + win._appName + '"?\n\ne.g. "add a dark mode", "make the buttons bigger", "add a clear button"');
    if (!instruction) return;
    var status = win.querySelector('.status-bar-field');
    if (status) status.textContent = '🧠 Improving…';
    hallucinateApp(win._appName, function(html, err) {
      if (err) { if (status) status.textContent = 'Error: ' + err; return; }
      var body = win.querySelector('.window-body');
      if (body) { body.innerHTML = html; runWindowScripts(winId); }
      win._html = html;
      addRecentApp(win._appName, html);
      if (status) status.textContent = 'Ready';
    }, { prevHtml: win._html, instruction: instruction });
  }

  document.addEventListener('click', function(e) {
    var b = e.target.closest('[data-improve]');
    if (!b) return;
    e.stopPropagation();
    improveCurrentApp(b.getAttribute('data-improve'));
  });

  // innerHTML does NOT execute <script>. Re-create script nodes so generated
  // app logic runs, scoped to its own window via `root` / `$` / `$all`.
  function runWindowScripts(winId) {
    var win = document.getElementById(winId);
    if (!win) return;
    var body = win.querySelector('.window-body');
    if (!body) return;
    var bodyId = winId + '-body';
    body.id = bodyId;
    var scripts = body.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      var old = scripts[i];
      var code = old.textContent;
      var neo = document.createElement('script');
      neo.textContent =
        '(function(){\n' +
        '  var root = document.getElementById("' + bodyId + '");\n' +
        '  if(!root) return;\n' +
        '  function $(s){ return root.querySelector(s); }\n' +
        '  function $all(s){ return root.querySelectorAll(s); }\n' +
        '  try {\n' + code + '\n  } catch(e){ console.error("VibeOS app error:", e); }\n' +
        '})();';
      old.parentNode.replaceChild(neo, old);
    }
  }

  // ================================================================
  // Recent (AI-generated) apps — persisted in localStorage
  // ================================================================
  var RECENT_KEY = 'vibeos_recent_apps';
  var RECENT_MAX = 12;
  var recentApps = [];

  function loadRecentApps() {
    try {
      var raw = localStorage.getItem(RECENT_KEY);
      recentApps = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(recentApps)) recentApps = [];
    } catch(e) { recentApps = []; }
  }

  function persistRecentApps() {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recentApps)); }
    catch(e) {
      // quota exceeded — drop oldest until it fits
      while (recentApps.length > 1) {
        recentApps.pop();
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(recentApps)); return; } catch(e2) {}
      }
    }
  }

  function addRecentApp(name, html) {
    var key = name.toLowerCase();
    recentApps = recentApps.filter(function(a){ return a.key !== key; });
    recentApps.unshift({ key: key, name: name, html: html });
    if (recentApps.length > RECENT_MAX) recentApps.length = RECENT_MAX;
    persistRecentApps();
    renderRecentApps();
  }

  function openRecentApp(key) {
    for (var i = 0; i < recentApps.length; i++) {
      if (recentApps[i].key === key) { openHallucinatedWindow(recentApps[i].name, recentApps[i].html); return; }
    }
  }

  function clearRecentApps() {
    recentApps = [];
    try { localStorage.removeItem(RECENT_KEY); } catch(e) {}
    renderRecentApps();
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderRecentApps() {
    var sm = document.getElementById('start-recent');
    var sep = document.getElementById('start-recent-sep');
    if (sm) {
      if (!recentApps.length) { sm.innerHTML = ''; if (sep) sep.style.display = 'none'; }
      else {
        if (sep) sep.style.display = 'block';
        var h = '<div style="font-size:10px;color:#888;padding:2px 12px 1px">Recently used apps</div>';
        recentApps.forEach(function(a){
          h += '<div class="start-item" data-recent="' + escHtml(a.key) + '"><span class="start-icon">🪟</span><span>' + escHtml(a.name) + '</span></div>';
        });
        sm.innerHTML = h;
      }
    }
    var rs = document.getElementById('recent-submenu');
    if (rs) {
      if (!recentApps.length) { rs.innerHTML = '<div class="context-item" style="color:#999;cursor:default">(none yet)</div>'; }
      else {
        var c = '';
        recentApps.forEach(function(a){ c += '<div class="context-item" data-recent="' + escHtml(a.key) + '">🪟 ' + escHtml(a.name) + '</div>'; });
        c += '<div style="border-top:1px solid #ACA899;margin:3px 2px"></div>';
        c += '<div class="context-item" id="recent-clear">🗑 Clear recent apps</div>';
        rs.innerHTML = c;
      }
    }
    // Desktop icons — remove old generated ones, re-add from recentApps (keep built-ins)
    var di = document.getElementById('desktop-icons');
    if (di) {
      var old = di.querySelectorAll('.desktop-icon[data-recent]');
      for (var k = 0; k < old.length; k++) old[k].remove();
      recentApps.forEach(function(a){
        var el = document.createElement('div');
        el.className = 'desktop-icon';
        el.setAttribute('data-recent', a.key);
        el.innerHTML = '<div class="icon-img">🪟</div><div class="icon-label">' + escHtml(a.name) + '</div>';
        di.appendChild(el);
      });
    }
  }

  // ================================================================
  // App Bodies (content only, no window shell)
  // ================================================================
  // Shared helpers for wiring built-in apps
  function wire(id, fn) { var el = document.getElementById(id); if (el) el.onclick = fn; }
  function closeWin(winId) { var w = document.getElementById(winId); if (w) w.remove(); }
  function insertAtCursor(ta, text) {
    var s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
    ta.selectionStart = ta.selectionEnd = s + text.length;
  }

  // Command Prompt interpreter — inline terminal
  function cmdInit() {
    var term = document.getElementById('cmd-term');
    if (!term) return;
    var cwd = 'C:\\Documents and Settings\\User';
    var fs = {
      'C:\\Documents and Settings\\User': ['My Documents <DIR>', 'Desktop <DIR>', 'readme.txt', 'budget.xls', 'photo.jpg'],
      'C:\\': ['Documents and Settings <DIR>', 'Program Files <DIR>', 'WINDOWS <DIR>', 'autoexec.bat', 'config.sys']
    };
    var history = [], hi = -1, currentLine = '';

    function promptPrefix() { return '\n' + cwd + '> '; }

    // Force cursor to absolute end of contenteditable
    function cursorEnd() {
      var sel = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(term);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // Append text at cursor (which should be at end) and move cursor past it
    function appendText(s) {
      cursorEnd();
      var range = window.getSelection().getRangeAt(0);
      var node = document.createTextNode(s);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }

    // Read the current input line (text after last prompt prefix)
    function readLine() {
      var full = term.textContent;
      var pre = '\n' + cwd + '> ';
      var idx = full.lastIndexOf(pre);
      if (idx < 0) return '';
      return full.slice(idx + pre.length);
    }

    // Execute a command, return output string (no new prompt)
    function execute(line) {
      var parts = line.trim().split(/\s+/);
      var cmd = (parts[0] || '').toLowerCase();
      var arg = line.trim().slice(parts[0].length).trim();
      var out = '';

      if (cmd === '') { /* noop */ }
      else if (cmd === 'help') out = 'For more information on a specific command, type the command name.\n\nCLS DIR CD ECHO VER DATE TIME WHOAMI TYPE COLOR TITLE MKDIR\nNOTEPAD CALC PAINT EXPLORER START EXIT';
      else if (cmd === 'cls') { term.textContent = ''; return ''; }
      else if (cmd === 'echo') out = /^off$/i.test(arg) ? 'ECHO is off.' : (arg || 'ECHO is on.');
      else if (cmd === 'ver') out = '\nvibeOS v1.0';
      else if (cmd === 'whoami') out = 'vibeos\\user';
      else if (cmd === 'date') out = 'The current date is: ' + new Date().toDateString();
      else if (cmd === 'time') out = 'The current time is: ' + new Date().toLocaleTimeString();
      else if (cmd === 'dir') {
        var list = fs[cwd] || [];
        out = ' Volume in drive C has no label.\n Directory of ' + cwd + '\n';
        list.forEach(function(e){ var d = /<DIR>/.test(e); out += (d ? '<DIR>          ' : '               ') + e.replace(' <DIR>', '') + '\n'; });
        out += '     ' + list.length + ' File(s)';
      }
      else if (cmd === 'cd' || cmd === 'chdir') {
        if (!arg || arg === '.') { /* stay */ }
        else if (arg === '..') { cwd = cwd.replace(/\\[^\\]+$/, ''); if (!/\\/.test(cwd)) cwd = 'C:\\'; }
        else if (arg === '\\') cwd = 'C:\\';
        else cwd = /^[A-Za-z]:\\/.test(arg) ? arg : (cwd.replace(/\\$/, '') + '\\' + arg);
      }
      else if (cmd === 'type') out = arg ? ('Contents of ' + arg + ' (simulated).') : 'The syntax of the command is incorrect.';
      else if (cmd === 'mkdir' || cmd === 'md') { if (!arg) out = 'The syntax of the command is incorrect.'; }
      else if (cmd === 'title') { /* noop */ }
      else if (cmd === 'color') {
        var map = { '0':'#000','1':'#3a6ea5','2':'#0A0','3':'#0AA','4':'#A00','7':'#C0C0C0','a':'#5F5','b':'#5FF','c':'#F55','e':'#FF5','f':'#FFF' };
        var fg = map[(arg.slice(-1) || '7').toLowerCase()] || '#C0C0C0';
        term.style.color = fg;
      }
      else if (cmd === 'notepad') { openWindow('open-notepad', appRegistry['open-notepad']); }
      else if (cmd === 'calc') { openWindow('open-calc', appRegistry['open-calc']); }
      else if (cmd === 'paint') { openWindow('open-paint', appRegistry['open-paint']); }
      else if (cmd === 'explorer') { openWindow('open-explorer', appRegistry['open-explorer']); }
      else if (cmd === 'start') { if (arg) { document.getElementById('run-input').value = arg; showRunDialog(); submitRun(); } }
      else if (cmd === 'exit') { closeWin('win-cmd'); return 'EXIT'; }
      else out = "'" + cmd + "' is not recognized as an internal or external command,\noperable program or batch file.";
      return out;
    }

    term.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        cursorEnd();
        var line = readLine();
        // Save to history
        if (line.trim()) { history.push(line); }
        hi = history.length;
        // Append newline after command
        appendText('\n');
        // Execute
        var output = execute(line);
        if (output === 'EXIT') return;
        if (output) { appendText(output); }
        // New prompt
        appendText(promptPrefix());
        term.scrollTop = term.scrollHeight;
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (history.length && hi > 0) {
          // Save current line if navigating away
          if (hi === history.length) currentLine = readLine();
          hi--;
          replaceCurrentLine(history[hi]);
        }
      }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hi < history.length - 1) {
          hi++;
          replaceCurrentLine(history[hi]);
        } else if (hi === history.length - 1) {
          hi = history.length;
          replaceCurrentLine(currentLine);
        }
      }
      else if (e.key === 'Home' || e.key === 'PageUp') {
        // Prevent navigating into history
        e.preventDefault();
      }
    });

    // Prevent cursor from moving into history area
    term.addEventListener('click', function() { setTimeout(cursorEnd, 0); });
    term.addEventListener('keyup', function(e) {
      if (['ArrowUp','ArrowDown','Enter','Home','PageUp'].indexOf(e.key) < 0) {
        currentLine = readLine();
      }
    });

    // Replace text after last prompt prefix
    function replaceCurrentLine(newText) {
      var full = term.textContent;
      var pre = '\n' + cwd + '> ';
      var idx = full.lastIndexOf(pre);
      if (idx < 0) return;
      var before = full.slice(0, idx + pre.length);
      term.textContent = before + newText;
      cursorEnd();
      term.scrollTop = term.scrollHeight;
    }

    // Initialize: add first prompt
    appendText(promptPrefix());
    term.scrollTop = term.scrollHeight;
    term.focus();
  }

  // Media Player
  var wmpAudio = null;
  function wmpInit() {
    if (wmpAudio) { try { wmpAudio.pause(); } catch(e){} }
    var audio = new Audio();
    wmpAudio = audio;
    var viz = document.getElementById('wmp-viz');
    var titleEl = document.getElementById('wmp-title');
    var seek = document.getElementById('wmp-seek');
    var cur = document.getElementById('wmp-cur');
    var dur = document.getElementById('wmp-dur');
    var playBtn = document.getElementById('wmp-play');
    var vol = document.getElementById('wmp-vol');
    var bars = [];
    if (viz) { viz.innerHTML = ''; for (var i = 0; i < 24; i++) { var b = document.createElement('div'); b.style.cssText = 'width:8px;height:6px;background:linear-gradient(#6FF,#08F);transition:height .08s'; viz.appendChild(b); bars.push(b); } }
    var vizTimer = null;
    function startViz(){ if (vizTimer) return; vizTimer = setInterval(function(){ for (var k = 0; k < bars.length; k++) bars[k].style.height = (6 + Math.random() * 90) + 'px'; }, 90); }
    function stopViz(){ if (vizTimer) { clearInterval(vizTimer); vizTimer = null; } for (var k = 0; k < bars.length; k++) bars[k].style.height = '6px'; }
    function fmt(t){ if (!isFinite(t)) return '0:00'; var m = Math.floor(t/60), s = Math.floor(t%60); return m + ':' + (s < 10 ? '0' : '') + s; }
    function setIcon(){ if (playBtn) playBtn.textContent = audio.paused ? '▶' : '⏸'; }
    function openFile(){
      var i = document.createElement('input'); i.type = 'file'; i.accept = 'audio/*,video/*';
      i.onchange = function(){ var f = i.files[0]; if (!f) return; audio.src = URL.createObjectURL(f); if (titleEl) titleEl.textContent = f.name; audio.play().catch(function(){}); };
      i.click();
    }
    function toggle(){ if (!audio.src) { openFile(); return; } if (audio.paused) audio.play().catch(function(){}); else audio.pause(); }
    function stop(){ audio.pause(); try { audio.currentTime = 0; } catch(e){} }
    audio.volume = (vol ? vol.value : 80) / 100;
    wire('wmp-open', openFile);
    wire('wmp-exit', function(){ audio.pause(); stopViz(); closeWin('win-wmp'); });
    wire('wmp-about', function(){ alert('VibeOS Media Player'); });
    wire('wmp-play', toggle); wire('wmp-m-play', toggle);
    wire('wmp-stop', stop); wire('wmp-m-stop', stop);
    audio.onplay = function(){ setIcon(); startViz(); };
    audio.onpause = function(){ setIcon(); stopViz(); };
    audio.onended = function(){ setIcon(); stopViz(); };
    audio.ontimeupdate = function(){ if (cur) cur.textContent = fmt(audio.currentTime); if (seek && audio.duration) seek.value = (audio.currentTime / audio.duration) * 100; };
    audio.onloadedmetadata = function(){ if (dur) dur.textContent = fmt(audio.duration); };
    if (seek) seek.oninput = function(){ if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration; };
    if (vol) vol.oninput = function(){ audio.volume = vol.value / 100; };
    setIcon();
  }

  // Internet Explorer — real fetch via CORS proxy, rendered in sandboxed iframe
  function ieInit() {
    var addr = document.getElementById('ie-addr');
    var frame = document.getElementById('ie-content');
    if (!addr || !frame) return;
    var hist = [], pos = -1;
    function normalize(u){ u = (u || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) u = 'http://' + u; return u; }
    function show(html, base){ frame.srcdoc = '<base href="' + base + '"><base target="_blank">' + html; }
    function load(raw, push){
      var url = normalize(raw);
      if (!url) return;
      addr.value = url;
      frame.srcdoc = '<div style="font-family:Tahoma;padding:20px;color:#444">⏳ Loading ' + url + ' …</div>';
      var prox = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
      fetch(prox).then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function(html){ show(html, url); })
        .catch(function(e){ frame.srcdoc = '<div style="font-family:Tahoma;padding:24px"><h2 style="color:#C00">Cannot display the webpage</h2><p>' + url + '</p><p style="color:#888">' + e.message + ' — the CORS proxy may be down or the site refused the request.</p></div>'; });
      if (push) { hist = hist.slice(0, pos + 1); hist.push(url); pos = hist.length - 1; }
    }
    document.getElementById('ie-go').onclick = function(){ load(addr.value, true); };
    addr.addEventListener('keydown', function(e){ if (e.key === 'Enter') load(addr.value, true); });
    document.getElementById('ie-back').onclick = function(){ if (pos > 0) { pos--; load(hist[pos], false); } };
    document.getElementById('ie-fwd').onclick = function(){ if (pos < hist.length - 1) { pos++; load(hist[pos], false); } };
    document.getElementById('ie-refresh').onclick = function(){ if (hist[pos]) load(hist[pos], false); };
    var stopBtn = document.getElementById('ie-stop');
    if (stopBtn) stopBtn.onclick = function(){ frame.srcdoc = ''; };
    wire('ie-fav-google', function(){ load('https://www.google.com', true); });
    wire('ie-fav-msn', function(){ load('https://www.msn.com', true); });
    wire('ie-about', function(){ alert('VibeOS Internet Explorer 6.0'); });
    wire('ie-close', function(){ closeWin('win-ie'); });
    load(addr.value, true);
  }

  var appRegistry = {
    'open-notepad': {
      title: 'Untitled - Notepad', icon: '📝', w: 700, h: 450,
      body: function() {
        return '<menu-bar><menu-item>File<menu-popup><menu-row id="np-new">New</menu-row><menu-row id="np-open">Open...</menu-row>' +
        '<menu-row id="np-save">Save</menu-row><menu-row id="np-saveas">Save As...</menu-row>' +
        '<menu-divider></menu-divider><menu-row id="np-exit">Exit</menu-row></menu-popup></menu-item>' +
        '<menu-item>Edit<menu-popup><menu-row id="np-undo">Undo</menu-row><menu-row id="np-cut">Cut</menu-row>' +
        '<menu-row id="np-copy">Copy</menu-row><menu-row id="np-paste">Paste</menu-row></menu-popup></menu-item></menu-bar>' +
        '<textarea id="np-textarea" style="flex:1;border:none;resize:none;font-family:Consolas,monospace;font-size:13px;padding:4px" rows="20"></textarea>';
      },
      onOpen: function() {
        var ta = document.getElementById('np-textarea');
        if (!ta) return;
        function download() {
          var b = new Blob([ta.value], { type: 'text/plain' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(b); a.download = 'Untitled.txt'; a.click();
          setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
        }
        wire('np-new', function(){ ta.value = ''; ta.focus(); });
        wire('np-open', function(){
          var i = document.createElement('input'); i.type = 'file'; i.accept = '.txt,text/*';
          i.onchange = function(){ var f = i.files[0]; if (!f) return; var r = new FileReader(); r.onload = function(){ ta.value = r.result; }; r.readAsText(f); };
          i.click();
        });
        wire('np-save', download); wire('np-saveas', download);
        wire('np-exit', function(){ closeWin('win-notepad'); });
        wire('np-undo', function(){ ta.focus(); document.execCommand('undo'); });
        wire('np-cut',  function(){ ta.focus(); document.execCommand('cut'); });
        wire('np-copy', function(){ ta.focus(); document.execCommand('copy'); });
        wire('np-paste', function(){ ta.focus(); if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function(t){ insertAtCursor(ta, t); }).catch(function(){}); });
        ta.focus();
      }
    },
    'open-calc': {
      title: 'Calculator', icon: '🧮', w: 280, h: 390,
      body: function() {
        return '<menu-bar><menu-item>View<menu-popup><menu-row id="calc-standard">Standard</menu-row><menu-row id="calc-scientific">Scientific</menu-row><menu-divider></menu-divider><menu-row id="calc-digit">Digit Grouping</menu-row></menu-popup></menu-item><menu-item>Help<menu-popup><menu-row id="calc-help">Help Topics</menu-row><menu-divider></menu-divider><menu-row id="calc-about">About Calculator</menu-row></menu-popup></menu-item></menu-bar>' +
        '<input type="text" id="calc-display" style="text-align:right;font-size:16px;width:100%;margin:4px 0" value="0" readonly>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;flex:1">' +
        '<button id="calc-mc">MC</button><button id="calc-mr">MR</button><button id="calc-ms">MS</button><button id="calc-mplus">M+</button>' +
        '<button id="calc-back">←</button><button id="calc-ce">CE</button><button id="calc-c">C</button><button id="calc-plusminus">±</button>' +
        '<button id="calc-7">7</button><button id="calc-8">8</button><button id="calc-9">9</button><button id="calc-div">/</button>' +
        '<button id="calc-4">4</button><button id="calc-5">5</button><button id="calc-6">6</button><button id="calc-mul">*</button>' +
        '<button id="calc-1">1</button><button id="calc-2">2</button><button id="calc-3">3</button><button id="calc-sub">-</button>' +
        '<button id="calc-0">0</button><button id="calc-dot">.</button><button id="calc-eq">=</button><button id="calc-add">+</button></div>';
      },
      onOpen: function() {
        var disp = document.getElementById('calc-display');
        if (!disp) return;
        var cur = '0', prev = null, op = null, fresh = true, mem = 0;
        function show(){ disp.value = cur; }
        function inp(d){
          if (fresh) { cur = (d === '.') ? '0.' : d; fresh = false; }
          else { if (d === '.' && cur.indexOf('.') >= 0) return; cur = (cur === '0' && d !== '.') ? d : cur + d; }
          show();
        }
        function calc(){
          var b = parseFloat(cur), r = prev;
          if (op === '+') r += b; else if (op === '-') r -= b;
          else if (op === '*') r *= b; else if (op === '/') r = b ? r / b : NaN;
          return r;
        }
        function setOp(o){ if (op !== null && !fresh) { cur = String(+calc().toFixed(10)); show(); } prev = parseFloat(cur); op = o; fresh = true; }
        function equals(){ if (op === null || prev === null) return; cur = String(+calc().toFixed(10)); op = null; prev = null; fresh = true; show(); }
        for (var d = 0; d <= 9; d++) (function(n){ wire('calc-' + n, function(){ inp(String(n)); }); })(d);
        wire('calc-dot', function(){ inp('.'); });
        wire('calc-add', function(){ setOp('+'); }); wire('calc-sub', function(){ setOp('-'); });
        wire('calc-mul', function(){ setOp('*'); }); wire('calc-div', function(){ setOp('/'); });
        wire('calc-eq', equals);
        wire('calc-c',  function(){ cur='0'; prev=null; op=null; fresh=true; show(); });
        wire('calc-ce', function(){ cur='0'; fresh=true; show(); });
        wire('calc-back', function(){ cur = cur.length > 1 ? cur.slice(0,-1) : '0'; if (cur==='') cur='0'; show(); });
        wire('calc-plusminus', function(){ cur = String(parseFloat(cur) * -1); show(); });
        wire('calc-mc', function(){ mem = 0; });
        wire('calc-mr', function(){ cur = String(mem); fresh = true; show(); });
        wire('calc-ms', function(){ mem = parseFloat(cur); });
        wire('calc-mplus', function(){ mem += parseFloat(cur); });
        show();
      }
    },
    'open-explorer': {
      title: 'My Documents', icon: '📁', w: 650, h: 440,
      body: function() {
        return '<menu-bar><menu-item>File<menu-popup><menu-row id="fe-new">New</menu-row><menu-row id="fe-open">Open</menu-row>' +
        '<menu-divider></menu-divider><menu-row id="fe-close">Close</menu-row></menu-popup></menu-item>' +
        '<menu-item>Edit<menu-popup><menu-row id="fe-copy">Copy</menu-row><menu-row id="fe-paste">Paste</menu-row></menu-popup></menu-item>' +
        '<menu-item>View<menu-popup><menu-row id="fe-icons">Icons</menu-row><menu-row id="fe-details">Details</menu-row></menu-popup></menu-item></menu-bar>' +
        '<div class="toolbar"><button>🔙</button><button>🔜</button><button>⬆</button><span class="toolbar-separator"></span><button>🔍</button></div>' +
        '<div class="address-bar"><label>Address:</label><input type="text" value="C:\\Documents and Settings\\User\\My Documents" style="flex:1"></div>' +
        '<div style="flex:1;display:flex">' +
        '<div style="width:180px;border-right:1px solid #ACA899;padding:8px;overflow:auto"><ul class="tree-view">' +
        '<li class="expanded">Desktop<ul><li class="expanded">My Documents<ul><li>Projects</li><li>Photos</li><li>Music</li></ul></li>' +
        '<li>My Computer<ul><li>Local Disk (C:)</li><li>CD Drive (D:)</li></ul></li><li>Recycle Bin</li></ul></li></ul></div>' +
        '<div style="flex:1;padding:8px"><div style="display:flex;flex-wrap:wrap;gap:12px">' +
        '<div class="desktop-icon" style="color:#000;width:80px"><span style="font-size:32px">📄</span>readme.txt</div>' +
        '<div class="desktop-icon" style="color:#000;width:80px"><span style="font-size:32px">📊</span>budget.xls</div>' +
        '<div class="desktop-icon" style="color:#000;width:80px"><span style="font-size:32px">🖼️</span>photo.jpg</div></div></div></div>';
      },
      onOpen: function() {
        var win = document.getElementById('win-explorer');
        if (!win) return;
        function status(t){ var s = win.querySelector('.status-bar-field'); if (s) s.textContent = t; }
        // tree expand/collapse handled globally in xp.js; just show pointer affordance
        win.querySelectorAll('.tree-view li').forEach(function(li){ if (li.querySelector(':scope > ul')) li.style.cursor = 'pointer'; });
        win.querySelectorAll('.desktop-icon').forEach(function(ic){
          ic.style.cursor = 'pointer';
          ic.addEventListener('click', function(){ status('Selected: ' + (ic.textContent || '').trim()); });
          ic.addEventListener('dblclick', function(){
            var name = (ic.textContent || '').trim();
            if (/\.txt/i.test(name)) {
              openWindow('open-notepad', appRegistry['open-notepad']);
              setTimeout(function(){ var ta = document.getElementById('np-textarea'); if (ta) ta.value = 'This is ' + name + '\r\n\r\nA sample document on the VibeOS desktop.'; }, 120);
            } else { status('Cannot open ' + name + ' — no associated program'); }
          });
        });
      }
    },
    'open-cmd': {
      title: 'Command Prompt', icon: '⬛', w: 600, h: 400,
      body: function() {
        return '<div id="cmd-term" contenteditable="true" spellcheck="false" autocorrect="off" autocapitalize="off" ' +
        'style="flex:1;font-family:Consolas,monospace;font-size:13px;overflow-y:auto;white-space:pre-wrap;background:#000;color:#C0C0C0;padding:6px 8px;outline:none;line-height:1.4;caret-color:#C0C0C0" ' +
        '>vibeOS v1.0\n\n</div>';
      },
      onOpen: function() { cmdInit(); }
    },
    'open-minesweeper': {
      title: 'Minesweeper', icon: '💣', w: 210, h: 350,
      body: function() {
        return '<menu-bar><menu-item>Game<menu-popup><menu-row id="ms-new">New</menu-row><menu-divider></menu-divider><menu-row id="ms-beginner">Beginner</menu-row><menu-row id="ms-intermediate">Intermediate</menu-row><menu-row id="ms-expert">Expert</menu-row><menu-divider></menu-divider><menu-row id="ms-exit">Exit</menu-row></menu-popup></menu-item><menu-item>Help<menu-popup><menu-row id="ms-about">About Minesweeper</menu-row></menu-popup></menu-item></menu-bar>' +
        '<div style="background:#C0C0C0;padding:6px;flex:1;display:flex;flex-direction:column;gap:6px;border:2px outset #FFF">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px;border:2px inset #808080">' +
        '<div id="ms-mines" style="background:#000;color:#F00;font-family:Consolas,monospace;font-size:20px;font-weight:bold;padding:2px 6px;min-width:46px;text-align:center;letter-spacing:1px">010</div>' +
        '<button id="ms-face" style="width:36px;height:36px;padding:0;font-size:20px;min-height:0;line-height:1;border:2px outset #FFF;background:#C0C0C0">🙂</button>' +
        '<div id="ms-timer" style="background:#000;color:#F00;font-family:Consolas,monospace;font-size:20px;font-weight:bold;padding:2px 6px;min-width:46px;text-align:center;letter-spacing:1px">000</div>' +
        '</div>' +
        '<div style="border:2px inset #808080;flex:1;display:flex;align-items:center;justify-content:center">' +
        '<div id="ms-grid" style="display:grid;grid-template-columns:repeat(9,20px);grid-template-rows:repeat(9,20px);gap:0"></div>' +
        '</div></div>';
      },
      onOpen: function() { msRenderAll(); }
    },
    'open-paint': {
      title: 'untitled - Paint', icon: '🎨', w: 800, h: 550,
      body: function() {
        return '<menu-bar><menu-item>File<menu-popup><menu-row id="pt-new">New</menu-row><menu-row id="pt-open">Open...</menu-row><menu-row id="pt-save">Save</menu-row><menu-row id="pt-saveas">Save As...</menu-row><menu-divider></menu-divider><menu-row id="pt-exit">Exit</menu-row></menu-popup></menu-item><menu-item>Edit<menu-popup><menu-row id="pt-undo">Undo</menu-row><menu-row id="pt-cut">Cut</menu-row><menu-row id="pt-copy">Copy</menu-row><menu-row id="pt-paste">Paste</menu-row></menu-popup></menu-item><menu-item>View<menu-popup><menu-row id="pt-toolbox">Tool Box</menu-row><menu-row id="pt-colorbox">Color Box</menu-row><menu-row id="pt-statusbar">Status Bar</menu-row></menu-popup></menu-item><menu-item>Image<menu-popup><menu-row id="pt-flip">Flip/Rotate...</menu-row><menu-row id="pt-stretch">Stretch/Skew...</menu-row><menu-row id="pt-invert">Invert Colors</menu-row><menu-divider></menu-divider><menu-row id="pt-attrib">Attributes...</menu-row></menu-popup></menu-item><menu-item>Help<menu-popup><menu-row id="pt-help">Help Topics</menu-row><menu-divider></menu-divider><menu-row id="pt-about">About Paint</menu-row></menu-popup></menu-item></menu-bar>' +
        '<div style="flex:1;display:flex;gap:0">' +
        // Left toolbox
        '<div style="width:54px;background:#ECE9D8;border-right:1px solid #ACA899;padding:3px;display:flex;flex-direction:column;gap:2px;align-items:center">' +
        '<button id="pt-tool-freeform" style="width:24px;height:24px;padding:0;font-size:12px;min-height:0">⭐</button>' +
        '<button id="pt-tool-select" style="width:24px;height:24px;padding:0;font-size:12px;min-height:0">⬚</button>' +
        '<button id="pt-tool-eraser" style="width:24px;height:24px;padding:0;font-size:14px;min-height:0">🧹</button>' +
        '<button id="pt-tool-fill" style="width:24px;height:24px;padding:0;font-size:12px;min-height:0">🪣</button>' +
        '<button id="pt-tool-picker" style="width:24px;height:24px;padding:0;font-size:12px;min-height:0">💉</button>' +
        '<button id="pt-tool-zoom" style="width:24px;height:24px;padding:0;font-size:12px;min-height:0">🔍</button>' +
        '<button id="pt-tool-pencil" style="width:24px;height:24px;padding:0;font-size:14px;min-height:0">✏️</button>' +
        '<button id="pt-tool-brush" style="width:24px;height:24px;padding:0;font-size:14px;min-height:0">🖌️</button>' +
        '<button id="pt-tool-airbrush" style="width:24px;height:24px;padding:0;font-size:12px;min-height:0">💨</button>' +
        '<button id="pt-tool-text" style="width:24px;height:24px;padding:0;font-size:12px;min-height:0">A</button>' +
        '<button id="pt-tool-line" style="width:24px;height:24px;padding:0;font-size:14px;min-height:0">╱</button>' +
        '<button id="pt-tool-curve" style="width:24px;height:24px;padding:0;font-size:12px;min-height:0">〰</button>' +
        '<button id="pt-tool-rect" style="width:24px;height:24px;padding:0;font-size:12px;min-height:0">▬</button>' +
        '<button id="pt-tool-polygon" style="width:24px;height:24px;padding:0;font-size:10px;min-height:0">⬠</button>' +
        '<button id="pt-tool-ellipse" style="width:24px;height:24px;padding:0;font-size:12px;min-height:0">◯</button>' +
        '<button id="pt-tool-roundrect" style="width:24px;height:24px;padding:0;font-size:10px;min-height:0">▢</button>' +
        '</div>' +
        // Canvas
        '<div style="flex:1;display:flex;flex-direction:column">' +
        '<div id="pt-canvas" style="flex:1;background:#FFFFFF;border:2px inset #ACA899;margin:4px;overflow:hidden;position:relative;min-height:200px">' +
        '<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#ACA899;font-size:14px;pointer-events:none">Canvas — draw here</span>' +
        '</div>' +
        // Color palette
        '<div style="display:flex;gap:1px;padding:2px 4px;background:#ECE9D8;flex-wrap:wrap;align-items:center">' +
        '<div style="width:28px;height:22px;border:2px solid #000;background:#000;margin:1px"></div>' +
        '<div style="width:28px;height:22px;border:2px solid #000;background:#FFF;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#808080;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#C0C0C0;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#800000;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#FF0000;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#808000;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#FFFF00;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#008000;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#00FF00;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#008080;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#00FFFF;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#000080;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#0000FF;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#800080;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#FF00FF;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#FFA500;margin:1px"></div>' +
        '<div style="width:20px;height:18px;background:#A52A2A;margin:1px"></div>' +
        '</div></div></div>';
      },
      onOpen: function() {
        var host = document.getElementById('pt-canvas');
        if (!host) return;
        host.innerHTML = '';
        var cv = document.createElement('canvas');
        cv.width = host.clientWidth || 600; cv.height = host.clientHeight || 360;
        cv.style.cssText = 'display:block;cursor:crosshair;background:#fff';
        host.appendChild(cv);
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        var tool = 'pencil', color = '#000', drawing = false;
        var shapeStart = null, savedCanvas = null;
        function pos(e){ var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
        function saveState(){ try { savedCanvas = ctx.getImageData(0, 0, cv.width, cv.height); } catch(e){} }
        function restoreState(){ if (savedCanvas) try { ctx.putImageData(savedCanvas, 0, 0); } catch(e){} }
        function isShape(s){ return s === 'line' || s === 'rect' || s === 'ellipse' || s === 'roundrect'; }
        function drawShape(x1, y1, x2, y2, finalize) {
          var x = Math.min(x1, x2), y = Math.min(y1, y2);
          var w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
          if (finalize) { ctx.strokeStyle = color; ctx.lineWidth = tool === 'brush' ? 4 : 1; ctx.fillStyle = color; }
          else { ctx.strokeStyle = color; ctx.lineWidth = tool === 'brush' ? 4 : 1; }
          ctx.beginPath();
          if (tool === 'rect' || tool === 'roundrect') {
            var r = tool === 'roundrect' ? Math.min(8, w/4, h/4) : 0;
            if (r > 0) { ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); }
            else ctx.rect(x, y, w, h);
          } else if (tool === 'ellipse') {
            var rx = w/2, ry = h/2, cx = x+rx, cy = y+ry;
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
          } else if (tool === 'line') {
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          }
          ctx.stroke();
        }
        function sizeFor(){ return tool === 'brush' ? 4 : tool === 'eraser' ? 14 : tool === 'airbrush' ? 8 : 1; }
        function strokeColor(){ return tool === 'eraser' ? '#fff' : color; }
        // Flood fill using scanline algorithm
        function floodFill(sx, sy, fillColor) {
          var img = ctx.getImageData(0, 0, cv.width, cv.height);
          var d = img.data, w = cv.width, h = cv.height;
          var stack = [[sx, sy]];
          var targetIdx = (sy * w + sx) * 4;
          var tR = d[targetIdx], tG = d[targetIdx+1], tB = d[targetIdx+2], tA = d[targetIdx+3];
          // Parse fill color
          var fc = fillColor;
          var div = document.createElement('div'); div.style.color = fc; document.body.appendChild(div);
          var cs = getComputedStyle(div).color; document.body.removeChild(div);
          var m = cs.match(/[\d.]+/g); if (!m) return;
          var fR = +m[0], fG = +m[1], fB = +m[2];
          if (tR === fR && tG === fG && tB === fB) return;
          var visited = {}, key;
          while (stack.length > 0) {
            var p = stack.pop(), px = p[0], py = p[1];
            if (px < 0 || py < 0 || px >= w || py >= h) continue;
            key = py * w + px;
            if (visited[key]) continue;
            var idx = key * 4;
            if (Math.abs(d[idx]-tR) > 2 || Math.abs(d[idx+1]-tG) > 2 || Math.abs(d[idx+2]-tB) > 2) continue;
            visited[key] = true;
            d[idx] = fR; d[idx+1] = fG; d[idx+2] = fB;
            stack.push([px+1, py], [px-1, py], [px, py+1], [px, py-1]);
          }
          ctx.putImageData(img, 0, 0);
        }
        // Airbrush spray interval
        var airInterval = null;
        function startAir(e) {
          drawing = true;
          airInterval = setInterval(function() {
            if (!drawing) { clearInterval(airInterval); airInterval = null; return; }
            var p = pos(e); // approximate, uses last mousemove
            for (var k = 0; k < 6; k++) {
              var rx = p.x + (Math.random() - 0.5) * 16, ry = p.y + (Math.random() - 0.5) * 16;
              ctx.fillStyle = strokeColor();
              ctx.fillRect(rx, ry, 1.5, 1.5);
            }
          }, 30);
        }
        cv.addEventListener('mousemove', function(e){
          var p = pos(e);
          if (tool === 'airbrush') { /* position tracked for spray */ }
          if (!drawing) return;
          if (isShape(tool)) {
            restoreState();
            drawShape(shapeStart.x, shapeStart.y, p.x, p.y, false);
          } else if (tool !== 'airbrush') {
            ctx.lineTo(p.x, p.y); ctx.stroke();
          }
        });
        cv.addEventListener('mousedown', function(e){
          var p = pos(e);
          if (tool === 'fill') { floodFill(Math.round(p.x), Math.round(p.y), color); return; }
          if (tool === 'picker') {
            try { var px = ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data; color = '#' + ((1<<24)+(px[0]<<16)+(px[1]<<8)+px[2]).toString(16).slice(1); tool = 'pencil'; }
            catch(ex) {}
            return;
          }
          if (isShape(tool)) {
            drawing = true; shapeStart = p; saveState();
          } else if (tool === 'airbrush') {
            startAir(e);
          } else {
            drawing = true;
            ctx.strokeStyle = strokeColor(); ctx.lineWidth = sizeFor(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(p.x, p.y);
          }
        });
        window.addEventListener('mouseup', function(e){
          if (isShape(tool) && drawing && shapeStart) {
            restoreState(); drawShape(shapeStart.x, shapeStart.y, pos(e).x, pos(e).y, true);
          }
          drawing = false; shapeStart = null; savedCanvas = null;
          if (airInterval) { clearInterval(airInterval); airInterval = null; }
        });
        // tools
        var toolMap = {
          'pt-tool-pencil':'pencil', 'pt-tool-brush':'brush', 'pt-tool-eraser':'eraser',
          'pt-tool-fill':'fill', 'pt-tool-picker':'picker', 'pt-tool-airbrush':'airbrush',
          'pt-tool-line':'line', 'pt-tool-rect':'rect', 'pt-tool-ellipse':'ellipse',
          'pt-tool-roundrect':'roundrect'
        };
        Object.keys(toolMap).forEach(function(id){ wire(id, function(){ tool = toolMap[id]; }); });
        // color palette
        var win = document.getElementById('win-paint');
        var palette = win && Array.prototype.slice.call(win.querySelectorAll('div')).filter(function(d){ return /flex-wrap:wrap/.test(d.getAttribute('style') || ''); })[0];
        if (palette) Array.prototype.slice.call(palette.children).forEach(function(sw){
          var bg = (sw.style.background || sw.style.backgroundColor);
          if (!bg) return;
          sw.style.cursor = 'pointer';
          sw.addEventListener('click', function(){ color = bg; });
        });
        wire('pt-new', function(){ ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); });
        wire('pt-invert', function(){ var d = ctx.getImageData(0,0,cv.width,cv.height); for (var i=0;i<d.data.length;i+=4){ d.data[i]=255-d.data[i]; d.data[i+1]=255-d.data[i+1]; d.data[i+2]=255-d.data[i+2]; } ctx.putImageData(d,0,0); });
        wire('pt-exit', function(){ closeWin('win-paint'); });
      }
    },
    'open-wmp': {
      title: 'Windows Media Player', icon: '🎵', w: 460, h: 420,
      body: function() {
        return '<menu-bar><menu-item>File<menu-popup><menu-row id="wmp-open">Open...</menu-row><menu-divider></menu-divider><menu-row id="wmp-exit">Exit</menu-row></menu-popup></menu-item><menu-item>Play<menu-popup><menu-row id="wmp-m-play">Play/Pause</menu-row><menu-row id="wmp-m-stop">Stop</menu-row></menu-popup></menu-item><menu-item>Help<menu-popup><menu-row id="wmp-about">About</menu-row></menu-popup></menu-item></menu-bar>' +
        '<div style="flex:1;display:flex;flex-direction:column;background:#10243E;color:#CFE0F4;padding:8px;gap:8px">' +
        '<div id="wmp-viz" style="flex:1;display:flex;align-items:flex-end;justify-content:center;gap:3px;min-height:120px;background:#000;border:1px solid #1E3A5F;padding:8px;overflow:hidden"></div>' +
        '<div id="wmp-title" style="font-size:12px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">No media loaded — File &gt; Open...</div>' +
        '<div style="display:flex;align-items:center;gap:6px">' +
        '<span id="wmp-cur" style="font-size:11px;font-family:monospace">0:00</span>' +
        '<input id="wmp-seek" type="range" min="0" max="100" value="0" style="flex:1">' +
        '<span id="wmp-dur" style="font-size:11px;font-family:monospace">0:00</span></div>' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:6px">' +
        '<button id="wmp-play" style="min-width:46px">▶</button>' +
        '<button id="wmp-stop" style="min-width:38px">⏹</button>' +
        '<span style="margin-left:8px;font-size:13px">🔊</span>' +
        '<input id="wmp-vol" type="range" min="0" max="100" value="80" style="width:90px"></div>' +
        '</div>';
      },
      onOpen: function() { wmpInit(); }
    },
    'open-ie': {
      title: 'Internet Explorer', icon: '🌐', w: 750, h: 500,
      body: function() {
        return '<menu-bar><menu-item>File<menu-popup><menu-row id="ie-new">New Window</menu-row><menu-row id="ie-open">Open...</menu-row>' +
        '<menu-row id="ie-save">Save As...</menu-row><menu-divider></menu-divider><menu-row id="ie-print">Print...</menu-row>' +
        '<menu-divider></menu-divider><menu-row id="ie-close">Close</menu-row></menu-popup></menu-item>' +
        '<menu-item>Edit<menu-popup><menu-row id="ie-cut">Cut</menu-row><menu-row id="ie-copy">Copy</menu-row><menu-row id="ie-paste">Paste</menu-row></menu-popup></menu-item>' +
        '<menu-item>Favorites<menu-popup><menu-row id="ie-fav-google">⭐ Google</menu-row><menu-row id="ie-fav-msn">⭐ MSN</menu-row></menu-popup></menu-item>' +
        '<menu-item>Help<menu-popup><menu-row id="ie-about">About Internet Explorer</menu-row></menu-popup></menu-item></menu-bar>' +
        '<div class="toolbar"><button id="ie-back">🔙</button><button id="ie-fwd">🔜</button><button id="ie-stop">⏹</button><button id="ie-refresh">🔄</button>' +
        '<span class="toolbar-separator"></span><span style="font-size:11px">Address:</span>' +
        '<input id="ie-addr" type="text" value="http://example.com" style="flex:1"><button id="ie-go">Go</button></div>' +
        '<iframe id="ie-content" sandbox="allow-same-origin allow-popups" style="flex:1;border:none;background:#FFF;width:100%"></iframe>';
      },
      onOpen: function() { ieInit(); }
    }
  };

  // ================================================================
  // DeepSeek API
  // ================================================================
  function hallucinateApp(appName, callback, ctx) {
    var key = API_KEY;
    if (!key) { key = promptForKey(); }
    if (!key) { callback(null, 'No API key provided'); return; }

    var systemPrompt = 'You generate inner body HTML for vibeOS applications. ' +
      'CRITICAL: Return ONLY the HTML that goes INSIDE <div class="window-body">. ' +
      'NEVER include outer window div, title bar, or status bar. ' +
      'NEVER wrap in ```html code blocks. Raw HTML only. ' +
      '' +
      '=== CUSTOM HTML ELEMENTS (must use exactly as shown — these are real custom elements, NOT divs) === ' +
      'CRITICAL: Every menu item with a dropdown MUST contain a <menu-popup> with <menu-row> children. ' +
      'Without <menu-popup>, the menu will NOT open. This is how vibeOS menus work. ' +
      '' +
      'Menu bar (ALWAYS first element, exactly this structure): ' +
      '<menu-bar><menu-item>File<menu-popup><menu-row id="X-new">New</menu-row><menu-row id="X-open">Open...</menu-row><menu-row id="X-save">Save</menu-row><menu-divider></menu-divider><menu-row id="X-exit">Exit</menu-row></menu-popup></menu-item><menu-item>Edit<menu-popup><menu-row id="X-undo">Undo</menu-row><menu-row id="X-cut">Cut</menu-row><menu-row id="X-copy">Copy</menu-row><menu-row id="X-paste">Paste</menu-row></menu-popup></menu-item><menu-item>Help<menu-popup><menu-row id="X-about">About</menu-row></menu-popup></menu-item></menu-bar> ' +
      'EVERY <menu-item> with a dropdown needs: Label<menu-popup><menu-row id="...">Item</menu-row></menu-popup>. ' +
      'Separator is <menu-divider></menu-divider>. These are CUSTOM HTML ELEMENTS, not <div> tags. ' +
      '' +
      'Toolbar (optional, below menu): <div class="toolbar"><button>✂</button><button>📋</button><span class="toolbar-separator"></span><button>🔍</button></div> ' +
      '' +
      'Tabs: <section class="tabs"><button role="tab" aria-controls="tab1" aria-selected="true">Tab 1</button><button role="tab" aria-controls="tab2">Tab 2</button></section> + panels: <div role="tabpanel" id="tab1" class="active">content</div><div role="tabpanel" id="tab2">content</div> ' +
      '' +
      'Forms: <div class="field-row"><label>Name:</label><input type="text" id="..."></div> ' +
      'Groups: <fieldset><legend>Title</legend>...content...</fieldset> ' +
      'Tree: <ul class="tree-view"><li>Parent<ul><li>Child</li></ul></li></ul> ' +
      '' +
      '=== RULES === ' +
      '- EVERY button, input, menu-row MUST have unique id ' +
      '- Use emoji for icons (💾📂✂📋🔍⚙🎨🖌️✏️), never <img> tags ' +
      '- Colors: bg white or #ECE9D8, borders #ACA899/#7F9DB9, text #000 ' +
      '- Use flex:1 (NEVER height:100%), overflow:auto for scroll areas ' +
      '- No <style> tags (styles leak globally). Use inline style="" or set el.style.* in JS. ' +
      '- No markdown, no explanations. ' +
      '- MAKE IT ACTUALLY WORK — wire real behavior with JavaScript (see below), like a real 2001 XP program ' +
      '' +
      '=== MAKE IT WORK (JavaScript) === ' +
      'Put app logic in ONE <script> tag at the END of your HTML. It RUNS automatically. ' +
      'Your script is scoped to THIS window — you get 3 helpers, already defined: ' +
      'root = your app root element. $("#id") = root.querySelector. $all(".cls") = root.querySelectorAll (NodeList). ' +
      'ALWAYS query with $ / $all / root — NEVER document.getElementById (ids are not global). ' +
      'Wire every button/input/menu-row by id. Keep state in plain JS vars. No external network/fetch. ' +
      'Example wiring: var n=0; $("#inc").onclick=function(){ n++; $("#out").textContent=n; }; ' +
      '' +
      '=== EXAMPLE for "Paint" === ' +
      '<menu-bar><menu-item>File<menu-popup><menu-row id="pt-new">New</menu-row><menu-row id="pt-open">Open...</menu-row><menu-row id="pt-save">Save</menu-row><menu-divider></menu-divider><menu-row id="pt-exit">Exit</menu-row></menu-popup></menu-item><menu-item>Edit<menu-popup><menu-row id="pt-undo">Undo</menu-row><menu-row id="pt-cut">Cut</menu-row><menu-row id="pt-copy">Copy</menu-row><menu-row id="pt-paste">Paste</menu-row></menu-popup></menu-item><menu-item>View<menu-popup><menu-row id="pt-toolbox">Tool Box</menu-row><menu-row id="pt-colors">Color Box</menu-row></menu-popup></menu-item><menu-item>Help<menu-popup><menu-row id="pt-about">About Paint</menu-row></menu-popup></menu-item></menu-bar><div class="toolbar"><button>✏️</button><button>🖌️</button><button>🧹</button><button>💧</button><button>🔤</button><span class="toolbar-separator"></span><button>🔍</button></div><div style="flex:1;display:flex;gap:4px;padding:4px"><div style="display:flex;flex-direction:column;gap:2px;padding:4px;background:#ECE9D8;border:1px solid #ACA899"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2px"><button style="width:20px;height:20px;padding:0;background:#000"></button><button style="width:20px;height:20px;padding:0;background:#808080"></button><button style="width:20px;height:20px;padding:0;background:#800000"></button><button style="width:20px;height:20px;padding:0;background:#008000"></button><button style="width:20px;height:20px;padding:0;background:#000080"></button><button style="width:20px;height:20px;padding:0;background:#808000"></button><button style="width:20px;height:20px;padding:0;background:#800080"></button><button style="width:20px;height:20px;padding:0;background:#008080"></button><button style="width:20px;height:20px;padding:0;background:#C0C0C0"></button><button style="width:20px;height:20px;padding:0;background:#FFFF00"></button><button style="width:20px;height:20px;padding:0;background:#FF00FF"></button><button style="width:20px;height:20px;padding:0;background:#00FFFF"></button><button style="width:20px;height:20px;padding:0;background:#FFFFFF;border:1px solid #999"></button><button style="width:20px;height:20px;padding:0;background:#FFA500"></button></div></div><div style="flex:1;background:#FFFFFF;border:1px solid #7F9DB9;min-height:200px;overflow:auto;display:flex;align-items:center;justify-content:center"><span style="color:#ACA899;font-size:14px">Canvas — draw here</span></div></div> ' +
      '' +
      '=== EXAMPLE for a WORKING app "Counter" (note the <script> wiring real behavior) === ' +
      '<menu-bar><menu-item>File<menu-popup><menu-row id="ct-reset">Reset</menu-row><menu-divider></menu-divider><menu-row id="ct-exit">Exit</menu-row></menu-popup></menu-item><menu-item>Help<menu-popup><menu-row id="ct-about">About</menu-row></menu-popup></menu-item></menu-bar>' +
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">' +
      '<div id="ct-out" style="font-size:42px;font-weight:bold">0</div>' +
      '<div style="display:flex;gap:6px"><button id="ct-dec">−</button><button id="ct-inc">+</button></div></div>' +
      '<script>' +
      'var n=0; function draw(){ $("#ct-out").textContent=n; }' +
      '$("#ct-inc").onclick=function(){ n++; draw(); };' +
      '$("#ct-dec").onclick=function(){ n--; draw(); };' +
      '$("#ct-reset").onclick=function(){ n=0; draw(); };' +
      '$("#ct-about").onclick=function(){ alert("Counter 1.0"); };' +
      '</script> ' +
      '' +
      '=== REMINDERS === ' +
      '- <menu-item> without <menu-popup> = dead click (dropdown will NOT open) ' +
      '- Use EXACTLY these tags: <menu-bar> <menu-item> <menu-popup> <menu-row> <menu-divider> ' +
      '- ONE <script> at the end. Wire EVERY interactive id. Query via $ / $all / root, never document.getElementById. ' +
      '- Do NOT wrap in ```html. Return RAW HTML (one <script> allowed). No explanations. ' +
      '=== IMPROV COMEDY === ' +
      'Go with weird requests but render them as real, WORKING apps. "vibeOS in Ancient Egypt" = a functioning business app in 3000 BC with scrolls and pyramids — buttons still work via <script>. Raw HTML + one <script> only.';

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.deepseek.com/chat/completions', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + key);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var resp = JSON.parse(xhr.responseText);
          var html = resp.choices[0].message.content;
          html = html.replace(/^```html?\s*/i, '').replace(/\s*```$/i, '').trim();
          callback(html, null);
        } catch(e) { callback(null, 'Parse error: ' + e.message); }
      } else if (xhr.status === 401) { saveKey(''); callback(null, 'Invalid API key. Try again.'); }
      else { callback(null, 'DeepSeek HTTP ' + xhr.status); }
    };
    xhr.onerror = function() { callback(null, 'Network error'); };
    var userMsg;
    if (ctx && ctx.prevHtml) {
      userMsg = 'Here is the current inner body HTML of the "' + appName + '" app:\n\n' + ctx.prevHtml +
        '\n\nImprove it per this request: "' + ctx.instruction + '". ' +
        'Keep what already works, apply the change, and return the COMPLETE updated inner body HTML (with its one <script>). Return only the HTML.';
    } else {
      userMsg = 'Create content for a vibeOS app: ' + appName + '. Return only the inner body HTML.';
    }
    xhr.send(JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg }
      ],
      max_tokens: 4096
    }));
  }

  // ================================================================
  // Run Dialog
  // ================================================================
  function showRunDialog() {
    document.getElementById('run-overlay').style.display = 'block';
    document.getElementById('run-dialog').style.display = 'flex';
    document.getElementById('run-input').value = '';
    document.getElementById('run-thinking').style.display = 'none';
    document.getElementById('run-error').style.display = 'none';
    document.getElementById('start-menu').style.display = 'none';
    setTimeout(function() { document.getElementById('run-input').focus(); }, 100);
  }

  function hideRunDialog() {
    document.getElementById('run-overlay').style.display = 'none';
    document.getElementById('run-dialog').style.display = 'none';
  }

  function isKnownApp(name) {
    var map = {
      'notepad':'open-notepad','calculator':'open-calc','calc':'open-calc',
      'file explorer':'open-explorer','explorer':'open-explorer',
      'command prompt':'open-cmd','cmd':'open-cmd',
      'internet explorer':'open-ie','ie':'open-ie','browser':'open-ie',
      'paint':'open-paint','mspaint':'open-paint',
      'minesweeper':'open-minesweeper','media player':'open-wmp','wmp':'open-wmp'
    };
    return map[name.toLowerCase()] || null;
  }

  function submitRun() {
    var input = document.getElementById('run-input');
    var name = input.value.trim();
    if (!name) { hideRunDialog(); return; }

    var known = isKnownApp(name);
    if (known && appRegistry[known]) {
      openWindow(known, appRegistry[known]);
      hideRunDialog();
      return;
    }

    document.getElementById('run-thinking').style.display = 'block';
    document.getElementById('run-error').style.display = 'none';

    hallucinateApp(name, function(html, err) {
      document.getElementById('run-thinking').style.display = 'none';
      if (err) {
        document.getElementById('run-error').style.display = 'block';
        document.getElementById('run-error').textContent = 'Error: ' + err;
        return;
      }
      openHallucinatedWindow(name, html);
      addRecentApp(name, html);
      hideRunDialog();
    });
  }

  // ================================================================
  // Click / DblClick handlers
  // ================================================================
  document.addEventListener('click', function(e) {
    if (e.defaultPrevented) return;
    var el = e.target.closest('[id]');
    if (!el) return;
    var id = el.id;
    // Skip system elements and minesweeper cells
    if (id === 'btn-start' || id === 'start-menu') return;
    if (id && id.indexOf('ms-c-') === 0) return; // minesweeper cells
    if (id === 'start-run') { showRunDialog(); return; }

    var action = el.getAttribute('data-action');
    if (action) {
      if (appRegistry[action]) {
        openWindow(action, appRegistry[action]);
        if (id.indexOf('start-') === 0) document.getElementById('start-menu').style.display = 'none';
      } else {
        var label = (el.textContent || '').trim();
        if (label) {
          document.getElementById('run-input').value = label;
          showRunDialog();
          submitRun();
        }
      }
    }
  });

  // Desktop icons now open on single-click (see click handlers below).

  // Run dialog buttons
  document.addEventListener('click', function(e) {
    if (e.target.id === 'run-ok') { submitRun(); e.stopPropagation(); }
    if (e.target.id === 'run-cancel' || e.target.id === 'run-close') { hideRunDialog(); e.stopPropagation(); }
  });

  document.addEventListener('keydown', function(e) {
    if (document.getElementById('run-dialog').style.display === 'flex') {
      if (e.key === 'Enter') { submitRun(); e.preventDefault(); }
      if (e.key === 'Escape') { hideRunDialog(); e.preventDefault(); }
    }
  });

  // ================================================================
  // Theme Management
  // ================================================================
  var currentTheme = 'windows';
  try { currentTheme = localStorage.getItem('vibeos_theme') || 'windows'; } catch(e) {}
  function applyTheme(name) {
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    if (name !== 'windows') document.body.classList.add('theme-' + name);
    currentTheme = name;
    try { localStorage.setItem('vibeos_theme', name); } catch(e) {}
    // Update active indicator via CSS class
    var items = document.querySelectorAll('#style-submenu .context-item');
    for (var i = 0; i < items.length; i++) {
      var t = items[i].getAttribute('data-theme');
      if (t === name) { items[i].classList.add('active-theme'); }
      else { items[i].classList.remove('active-theme'); }
    }
  }
  if (currentTheme !== 'windows') {
    document.body.classList.add('theme-' + currentTheme);
  }

  // ================================================================
  // Minesweeper Engine
  // ================================================================
  var msGrid, msRevealed, msFlagged, msMineCount, msGameOver, msTimer, msTimerId;

  function msInit(rows, cols, mines) {
    msGrid = []; msRevealed = []; msFlagged = [];
    msMineCount = mines; msGameOver = false; msTimer = 0;
    if (msTimerId) clearInterval(msTimerId);
    // Init arrays
    var i, j, m = 0;
    for (i = 0; i < rows; i++) { msGrid[i] = []; msRevealed[i] = []; msFlagged[i] = []; for (j = 0; j < cols; j++) { msGrid[i][j] = 0; msRevealed[i][j] = false; msFlagged[i][j] = false; } }
    // Place mines
    while (m < mines) {
      var r = Math.floor(Math.random() * rows), c = Math.floor(Math.random() * cols);
      if (msGrid[r][c] !== -1) { msGrid[r][c] = -1; m++; }
    }
    // Count adjacent mines
    for (i = 0; i < rows; i++) for (j = 0; j < cols; j++) {
      if (msGrid[i][j] === -1) continue;
      var count = 0;
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        var ni = i+dr, nj = j+dc;
        if (ni>=0 && ni<rows && nj>=0 && nj<cols && msGrid[ni][nj] === -1) count++;
      }
      msGrid[i][j] = count;
    }
    msUpdateDisplay();
    // Timer
    if (msTimerId) clearInterval(msTimerId);
    msTimerId = setInterval(function() {
      if (!msGameOver) { msTimer++; msUpdateDisplay(); }
    }, 1000);
  }

  function msResetGame() {
    var grid = document.getElementById('ms-grid');
    if (!grid) return;
    // Generate cells if needed
    if (!document.getElementById('ms-c-0-0')) {
      var h = '';
      for (var i = 0; i < 9; i++) for (var j = 0; j < 9; j++) {
        h += '<button id="ms-c-'+i+'-'+j+'" style="width:20px;height:20px;padding:0;min-height:0;font-size:11px;line-height:18px;text-align:center;border:2px outset #FFF;background:#C0C0C0;font-family:Tahoma,sans-serif"></button>';
      }
      grid.innerHTML = h;
    }
    msInit(9, 9, 10);
  }

  function msReveal(r, c) {
    if (msGameOver || msRevealed[r][c] || msFlagged[r][c]) return;
    msRevealed[r][c] = true;
    if (msGrid[r][c] === -1) { msLose(); return; }
    if (msGrid[r][c] === 0) {
      var rows = msGrid.length, cols = msGrid[0].length;
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        var ni = r+dr, nj = c+dc;
        if (ni>=0 && ni<rows && nj>=0 && nj<cols) msReveal(ni, nj);
      }
    }
    msCheckWin();
  }

  function msCheckWin() {
    if (!msGrid.length) return;
    var rows = msGrid.length, cols = msGrid[0].length;
    var won = true;
    for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) {
      if (!msRevealed[i][j] && msGrid[i][j] !== -1) { won = false; break; }
    }
    if (won) { msGameOver = true; if (msTimerId) clearInterval(msTimerId); msUpdateDisplay(); }
  }

  function msLose() {
    msGameOver = true; if (msTimerId) clearInterval(msTimerId);
    if (!msGrid.length) return;
    var rows = msGrid.length, cols = msGrid[0].length;
    for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) msRevealed[i][j] = true;
    msUpdateDisplay();
  }

  function msUpdateDisplay() {
    if (!msGrid.length) return;
    var rows = msGrid.length, cols = msGrid[0].length;
    var face = document.getElementById('ms-face');
    var minesEl = document.getElementById('ms-mines');
    var timerEl = document.getElementById('ms-timer');
    var won = msGameOver;
    for (var i = 0; i < rows && won; i++) for (var j = 0; j < cols; j++) {
      if (msGrid[i][j] === -1 && !msFlagged[i][j]) { won = false; }
    }
    if (face) face.textContent = msGameOver ? (won ? '😎' : '💀') : '🙂';
    if (minesEl) minesEl.textContent = String('000' + msMineCount).slice(-3);
    if (timerEl) timerEl.textContent = String('000' + Math.min(msTimer, 999)).slice(-3);

    var colors = ['','#0000FF','#008000','#FF0000','#000080','#800000','#008080','#000','#808080'];
    for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) {
      var cell = document.getElementById('ms-c-'+i+'-'+j);
      if (!cell) continue;
      if (msRevealed[i][j]) {
        cell.style.border = '1px solid #808080';
        cell.style.background = '#C0C0C0';
        cell.textContent = '';
        if (msGrid[i][j] === -1) { cell.textContent = '💣'; cell.style.background = '#F00'; cell.style.fontSize = '12px'; }
        else if (msGrid[i][j] > 0) { cell.textContent = msGrid[i][j]; cell.style.color = colors[msGrid[i][j]]; cell.style.fontWeight = 'bold'; }
      } else {
        cell.style.border = '2px outset #FFF';
        cell.style.background = '#C0C0C0';
        cell.textContent = msFlagged[i][j] ? '🚩' : '';
        cell.style.color = '';
        cell.style.fontWeight = '';
        cell.style.fontSize = '12px';
      }
    }
  }

  function msRenderAll() {
    msResetGame();
  }

  // Minesweeper click handler (delegated)
  document.addEventListener('click', function(e) {
    var cell = e.target.closest('[id^="ms-c-"]');
    if (!cell) return;
    var parts = cell.id.split('-');
    var r = parseInt(parts[2]), c = parseInt(parts[3]);
    if (isNaN(r) || isNaN(c) || !msRevealed || !msRevealed[r]) return;
    msReveal(r, c);
    msUpdateDisplay();
    e.stopPropagation();
  });

  document.addEventListener('contextmenu', function(e) {
    var cell = e.target.closest('[id^="ms-c-"]');
    if (!cell) return;
    e.preventDefault();
    var parts = cell.id.split('-');
    var r = parseInt(parts[2]), c = parseInt(parts[3]);
    if (isNaN(r) || isNaN(c) || msGameOver || msRevealed[r][c]) return;
    msFlagged[r][c] = !msFlagged[r][c];
    msMineCount += msFlagged[r][c] ? -1 : 1;
    msUpdateDisplay();
  });

  // Handle minesweeper menu: New game
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[id]');
    if (!el) return;
    if (el.id === 'ms-new' || el.id === 'ms-beginner' || el.id === 'ms-face') {
      msResetGame(); e.stopPropagation();
    }
    if (el.id === 'ms-intermediate') { msResetGame(); e.stopPropagation(); }
  });
  // ================================================================
  var ctxMenu = document.getElementById('desktop-menu');
  var styleSub = document.getElementById('style-submenu');
  var recentSub = document.getElementById('recent-submenu');
  var styleHover = false, subHover = false;
  var recentHover = false, recentSubHover = false;

  document.addEventListener('contextmenu', function(e) {
    var onDesktop = e.target.closest('.desktop') && !e.target.closest('.window');
    if (!onDesktop) return;
    e.preventDefault();
    if (ctxMenu) {
      ctxMenu.style.display = 'block';
      ctxMenu.style.left = e.clientX + 'px';
      ctxMenu.style.top  = e.clientY + 'px';
      // Keep menu inside viewport
      var r = ctxMenu.getBoundingClientRect();
      if (r.right  > window.innerWidth)  ctxMenu.style.left = (e.clientX - r.width) + 'px';
      if (r.bottom > window.innerHeight) ctxMenu.style.top  = (e.clientY - r.height) + 'px';
      if (styleSub) styleSub.style.display = 'none';
      if (recentSub) recentSub.style.display = 'none';
      renderRecentApps(); // keep submenu fresh
      applyTheme(currentTheme); // refresh checkmarks
    }
  });

  // Style submenu hover behavior
  if (ctxMenu) {
    ctxMenu.addEventListener('mouseover', function(e) {
      var styleItem = e.target.closest('#ctx-style');
      if (styleItem && styleSub) { styleSub.style.display = 'block'; styleHover = true; }
      else if (styleSub && !e.target.closest('#style-submenu')) { styleSub.style.display = 'none'; styleHover = false; }
      var recentItem = e.target.closest('#ctx-recent');
      if (recentItem && recentSub) { recentSub.style.display = 'block'; recentHover = true; }
      else if (recentSub && !e.target.closest('#recent-submenu')) { recentSub.style.display = 'none'; recentHover = false; }
    });
    ctxMenu.addEventListener('mouseout', function(e) {
      if (!e.target.closest('#ctx-style') && !e.target.closest('#style-submenu') && styleSub) styleSub.style.display = 'none';
      if (!e.target.closest('#ctx-recent') && !e.target.closest('#recent-submenu') && recentSub) recentSub.style.display = 'none';
    });
  }
  if (styleSub) {
    styleSub.addEventListener('mouseover', function() { subHover = true; });
    styleSub.addEventListener('mouseout', function() {
      subHover = false;
      setTimeout(function() { if (!styleHover && !subHover && styleSub) styleSub.style.display = 'none'; }, 100);
    });
  }
  if (recentSub) {
    recentSub.addEventListener('mouseover', function() { recentSubHover = true; });
    recentSub.addEventListener('mouseout', function() {
      recentSubHover = false;
      setTimeout(function() { if (!recentHover && !recentSubHover && recentSub) recentSub.style.display = 'none'; }, 100);
    });
  }

  // Open / clear recent apps (Start menu + context submenu)
  document.addEventListener('click', function(e) {
    var clear = e.target.closest('#recent-clear');
    if (clear) {
      clearRecentApps();
      if (ctxMenu) ctxMenu.style.display = 'none';
      if (recentSub) recentSub.style.display = 'none';
      e.stopPropagation();
      return;
    }
    var r = e.target.closest('[data-recent]');
    if (!r) return;
    openRecentApp(r.getAttribute('data-recent'));
    var sm = document.getElementById('start-menu'); if (sm) sm.style.display = 'none';
    if (ctxMenu) ctxMenu.style.display = 'none';
    if (recentSub) recentSub.style.display = 'none';
  });

  document.addEventListener('click', function(e) {
    // Handle Style submenu theme selection
    var themeItem = e.target.closest('#style-submenu .context-item');
    if (themeItem) {
      var theme = themeItem.getAttribute('data-theme');
      if (theme) applyTheme(theme);
      if (ctxMenu) ctxMenu.style.display = 'none';
      if (styleSub) styleSub.style.display = 'none';
      return;
    }

    if (!e.target.closest('#desktop-menu')) {
      if (ctxMenu) ctxMenu.style.display = 'none';
      if (styleSub) styleSub.style.display = 'none';
    }
    // Handle context menu item clicks
    if (e.target.closest('#desktop-menu .context-item')) {
      var item = e.target.closest('.context-item');
      var id = item.id;
      var action = item.getAttribute('data-action');

      if (id === 'ctx-run') { showRunDialog(); }
      else if (id === 'ctx-refresh') { location.reload(); }
      else if (id === 'ctx-properties') {
        openHallucinatedWindow('Desktop Properties',
          '<fieldset><legend>Background</legend><div class="field-row"><label>Color:</label>' +
          '<select><option>Blue (#3A6EA5)</option><option>Silver</option><option>Olive Green</option></select></div>' +
          '<div class="field-row"><label>Wallpaper:</label><input type="text" value="None"></div></fieldset>' +
          '<fieldset><legend>Screen Saver</legend><div class="field-row"><label>Screen saver:</label>' +
          '<select><option>vibeOS</option><option>3D Pipes</option><option>Starfield</option></select></div>' +
          '<div class="field-row"><label>Wait:</label><input type="text" value="10" style="width:40px"> minutes</div></fieldset>' +
          '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">' +
          '<button class="primary">OK</button><button>Cancel</button><button>Apply</button></div>');
      }
      else if (action && appRegistry[action]) { openWindow(action, appRegistry[action]); }

      if (ctxMenu && !e.target.closest('#ctx-style') && !e.target.closest('#ctx-recent')) ctxMenu.style.display = 'none';
    }
  });

  // Load persisted recent apps on startup
  loadRecentApps();
  renderRecentApps();

  // Clock
  function updateClock() {
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes(), ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    var clock = document.getElementById('clock');
    if (clock) clock.textContent = h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }
  updateClock(); setInterval(updateClock, 30000);

  console.log('VibeOS ready — ' + Object.keys(appRegistry).length + ' apps, DeepSeek ' + (API_KEY ? '✓' : '(no key)'));
})();
