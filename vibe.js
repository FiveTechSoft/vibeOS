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
    setTimeout(function() { centerWindow(winId); }, 50);
  }

  function openHallucinatedWindow(title, bodyHTML) {
    var winId = createWindowId();
    var html = buildWindowShell(winId, title, '🪟', bodyHTML, 650, 420);
    applyDelta({ id: 'windows-container', op: 'append', html: html });
    setTimeout(function() { centerWindow(winId); }, 80);
  }

  // ================================================================
  // App Bodies (content only, no window shell)
  // ================================================================
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
      }
    },
    'open-calc': {
      title: 'Calculator', icon: '🧮', w: 280, h: 360,
      body: function() {
        return '<input type="text" id="calc-display" style="text-align:right;font-size:16px;width:100%;margin-bottom:4px" value="0" readonly>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;flex:1">' +
        '<button>MC</button><button>MR</button><button>MS</button><button>M+</button>' +
        '<button>←</button><button>CE</button><button>C</button><button>±</button>' +
        '<button>7</button><button>8</button><button>9</button><button>/</button>' +
        '<button>4</button><button>5</button><button>6</button><button>*</button>' +
        '<button>1</button><button>2</button><button>3</button><button>-</button>' +
        '<button>0</button><button>.</button><button>=</button><button>+</button></div>';
      }
    },
    'open-explorer': {
      title: 'My Documents', icon: '📁', w: 650, h: 440,
      body: function() {
        return '<menu-bar><menu-item>File<menu-popup><menu-row>New</menu-row><menu-row>Open</menu-row>' +
        '<menu-divider></menu-divider><menu-row>Close</menu-row></menu-popup></menu-item>' +
        '<menu-item>View<menu-popup><menu-row>Icons</menu-row><menu-row>Details</menu-row></menu-popup></menu-item></menu-bar>' +
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
      }
    },
    'open-cmd': {
      title: 'Command Prompt', icon: '⬛', w: 600, h: 400,
      body: function() {
        return '<div style="flex:1;font-family:Consolas,monospace;font-size:13px;overflow-y:auto;white-space:pre-wrap;margin-bottom:4px;background:#000;color:#C0C0C0;padding:4px">' +
        'Microsoft Windows XP [Version 5.1.2601]\n(C) Copyright 1985-2001 Microsoft Corp.\n\nC:\\Documents and Settings\\User></div>' +
        '<div style="display:flex;align-items:center;gap:4px;background:#000;padding:2px 4px"><span style="color:#C0C0C0">C:\\></span>' +
        '<input type="text" style="flex:1;background:#000;color:#C0C0C0;border:1px solid #555;font-family:Consolas,monospace;font-size:13px"></div>';
      }
    },
    'open-ie': {
      title: 'Internet Explorer', icon: '🌐', w: 750, h: 500,
      body: function() {
        return '<menu-bar><menu-item>File<menu-popup><menu-row>New Window</menu-row><menu-row>Open...</menu-row>' +
        '<menu-row>Save As...</menu-row><menu-divider></menu-divider><menu-row>Print...</menu-row>' +
        '<menu-row>Close</menu-row></menu-popup></menu-item>' +
        '<menu-item>Favorites<menu-popup><menu-row>⭐ Google</menu-row><menu-row>⭐ MSN</menu-row></menu-popup></menu-item></menu-bar>' +
        '<div class="toolbar"><button>🔙</button><button>🔜</button><button>⏹</button><button>🔄</button>' +
        '<span class="toolbar-separator"></span><span style="font-size:11px">Address:</span>' +
        '<input type="text" value="http://www.google.com" style="flex:1"></div>' +
        '<div style="flex:1;padding:8px;background:#FFFFFF;overflow:auto">' +
        '<h2 style="color:#0000CC;margin-top:0">Welcome to the World Wide Web!</h2>' +
        '<p>This is Internet Explorer 6.0 running inside VibeOS.</p>' +
        '<hr><small style="color:#888">AI-hallucinated content — anything is possible</small></div>';
      }
    }
  };

  // ================================================================
  // DeepSeek API
  // ================================================================
  function hallucinateApp(appName, callback) {
    var key = API_KEY;
    if (!key) { key = promptForKey(); }
    if (!key) { callback(null, 'No API key provided'); return; }

    var systemPrompt = 'You are a Windows XP (2001 era) application content generator. ' +
      'You return ONLY the inner body HTML (NO outer window div, NO title bar, NO status bar). ' +
      'The system provides: title bar (min/max/close buttons) + status bar. ' +
      'Your HTML goes inside a <div class="window-body" style="flex:1;display:flex;flex-direction:column">. ' +
      '' +
      '## REQUIRED STRUCTURE ' +
      '1. <menu-bar> FIRST — at least File (New/Open/Save/separator/Exit) + Help (About). ' +
      '   Menus use: <menu-bar><menu-item>Label<menu-popup><menu-row id="...">Item</menu-row></menu-popup></menu-item></menu-bar> ' +
      '2. Optional <div class="toolbar"> with icon buttons below menu (use emoji for icons). ' +
      '3. Main content area with flex:1 — use these XP patterns: ' +
      '' +
      '## XP LAYOUT PATTERNS ' +
      '- Split pane: left panel (tree-view or list, 180-200px) + right panel (content, flex:1) inside display:flex ' +
      '- Tabbed interface: <section class="tabs"><button role="tab" aria-controls="p1" aria-selected="true">Tab1</button><button role="tab" aria-controls="p2">Tab2</button></section> + <div role="tabpanel" id="p1" class="active">content</div> ' +
      '- Form layout: <div class="field-row"><label>Name:</label><input type="text" id="..."></div> (label min-width:80px, right-aligned) ' +
      '- Group box: <fieldset><legend>Settings</legend>...content...</fieldset> ' +
      '- Tree navigation: <ul class="tree-view"><li>Item<ul><li>Child</li></ul></li></ul> ' +
      '- Grid layout: use display:grid with gap:3px for button grids ' +
      '' +
      '## VISUAL RULES ' +
      '- Colors: backgrounds #ECE9D8 or white, borders #ACA899 or #7F9DB9, text #000 ' +
      '- Font: Tahoma 11px (inherited from body) ' +
      '- Spacing: padding 8px on containers, 4px gap between elements ' +
      '- Buttons: min-height 23px, padding 4px 16px, 3px border-radius ' +
      '- Inputs: border 1px solid #7F9DB9, padding 2px 4px, min-height 21px ' +
      '- Scrollable areas: overflow:auto ' +
      '- NEVER use height:100% — use flex:1 instead ' +
      '' +
      '## FUNCTIONALITY ' +
      '- Every button, input, menu item MUST have a unique id ' +
      '- Use real emoji for icons (💾 Save, 📂 Open, ✂ Cut, 📋 Copy, 📌 Paste, 🔍 Search, ⚙ Settings) ' +
      '- Make the app feel like a REAL Windows XP program from 2001-2004 ' +
      '- Include realistic data/content appropriate to the app ' +
      '' +
      '## EXAMPLE — "Time Machine" app: ' +
      '<menu-bar><menu-item>File<menu-popup><menu-row id="tm-new">New Trip</menu-row><menu-row id="tm-save">Save</menu-row><menu-divider></menu-divider><menu-row id="tm-exit">Exit</menu-row></menu-popup></menu-item><menu-item>Help<menu-popup><menu-row id="tm-about">About Time Machine</menu-row></menu-popup></menu-item></menu-bar><div class="toolbar"><button>⏪</button><button>▶</button><button>⏩</button><span class="toolbar-separator"></span><button>📅</button></div><div style="flex:1;display:flex;padding:8px;gap:12px"><fieldset style="flex:1"><legend>Destination</legend><div class="field-row"><label>Year:</label><input type="text" id="tm-year" value="2001"></div><div class="field-row"><label>Location:</label><input type="text" id="tm-loc" value="Redmond, WA"></div><button id="tm-go" style="margin-top:8px">🌀 Engage</button></fieldset><fieldset style="flex:1"><legend>History</legend><div style="height:120px;overflow:auto;font-family:Consolas,monospace;font-size:12px">◉ 2001-10-25 — Windows XP launch\n◉ 1995-08-24 — Windows 95 launch\n◉ 1985-11-20 — Windows 1.0 launch</div></fieldset></div> ' +
      '' +
      'Do NOT include <script> tags. Do NOT wrap in markdown code blocks. Return raw HTML only. ' +
      'This is improv comedy — embrace weird/surreal requests, but render them as REAL XP applications. ' +
      'If the user asks for something impossible (e.g., "Microsoft in Ancient Egypt"), make it work as a believable XP program.';

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
    xhr.send(JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Create content for a Windows XP app: ' + appName + '. Return only the inner body HTML.' }
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
    if (id === 'btn-start' || id === 'start-menu') return;
    if (id === 'start-run') { showRunDialog(); return; }

    var action = el.getAttribute('data-action');
    if (action) {
      if (appRegistry[action]) {
        openWindow(action, appRegistry[action]);
        if (id.indexOf('start-') === 0) document.getElementById('start-menu').style.display = 'none';
      } else {
        // Unknown app — pre-fill Run dialog and hallucinate
        var label = (el.textContent || '').trim();
        if (label) {
          document.getElementById('run-input').value = label;
          showRunDialog();
          submitRun();
        }
      }
    }
  });

  document.addEventListener('dblclick', function(e) {
    var icon = e.target.closest('.desktop-icon');
    if (!icon) return;
    var action = icon.getAttribute('data-action');
    if (action && appRegistry[action]) { openWindow(action, appRegistry[action]); }
    else if (action) {
      var label = (icon.textContent || '').trim();
      if (label) { document.getElementById('run-input').value = label; showRunDialog(); submitRun(); }
    }
  });

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
