// vibe.js — VibeOS client-side engine
// Windows XP simulator. App templates + DeepSeek hallucination.
(function () {
  'use strict';

  // ================================================================
  // API Key Management (localStorage)
  // ================================================================
  var API_KEY = '';
  try { API_KEY = localStorage.getItem('vibeos_ds_key') || ''; } catch(e) {}

  function saveKey(key) {
    API_KEY = key;
    try { localStorage.setItem('vibeos_ds_key', key); } catch(e) {}
  }

  function promptForKey() {
    var key = prompt('Enter your DeepSeek API key to hallucinate apps:\n\nGet one at https://platform.deepseek.com', API_KEY);
    if (key) { saveKey(key.trim()); return API_KEY; }
    return '';
  }

  // ================================================================
  // Delta Application
  // ================================================================
  function applyDelta(delta) {
    if (!delta || !delta.id || !delta.op) { console.warn('bad delta', delta); return; }
    var el = document.getElementById(delta.id);
    if (!el) { console.warn('element not found #' + delta.id); return; }
    switch (delta.op) {
      case 'inner':   el.innerHTML = delta.html || ''; break;
      case 'append':  el.insertAdjacentHTML('beforeend', delta.html || ''); break;
      case 'replace': el.outerHTML = delta.html || ''; break;
      case 'remove':  el.remove(); break;
      case 'value':   el.value = delta.value || ''; break;
      case 'attr':    el.setAttribute(delta.attr, delta.val); break;
    }
  }

  function openWindow(id, html) {
    applyDelta({ id: 'windows-container', op: 'append', html: html });
    // Bring to front
    setTimeout(function() {
      var win = document.getElementById(id);
      if (win) {
        var maxZ = 0;
        document.querySelectorAll('.window').forEach(function(w) {
          var z = parseInt(w.style.zIndex)||0; if (z>maxZ) maxZ=z;
        });
        win.style.zIndex = maxZ + 1;
      }
    }, 50);
  }

  // ================================================================
  // App Templates
  // ================================================================
  var appTemplates = {
    'open-notepad': function() {
      return '<div class="window" id="win-notepad" style="top:80px;left:120px;width:700px;height:450px;z-index:10">' +
      '<div class="title-bar"><span class="title-bar-icon">📝</span><div class="title-bar-text">Untitled - Notepad</div>' +
      '<div class="title-bar-controls"><button class="min-btn">─</button><button class="max-btn">□</button><button class="close-btn">✕</button></div></div>' +
      '<menu-bar><menu-item>File<menu-popup><menu-row id="np-new">New</menu-row><menu-row id="np-open">Open...</menu-row>' +
      '<menu-row id="np-save">Save</menu-row><menu-row id="np-saveas">Save As...</menu-row>' +
      '<menu-divider></menu-divider><menu-row id="np-exit">Exit</menu-row></menu-popup></menu-item>' +
      '<menu-item>Edit<menu-popup><menu-row id="np-undo">Undo</menu-row><menu-row id="np-cut">Cut</menu-row>' +
      '<menu-row id="np-copy">Copy</menu-row><menu-row id="np-paste">Paste</menu-row></menu-popup></menu-item></menu-bar>' +
      '<div class="window-body" style="flex:1;display:flex;flex-direction:column;padding:0">' +
      '<textarea id="np-textarea" style="flex:1;border:none;resize:none;font-family:Consolas,monospace;font-size:13px;padding:4px" rows="20"></textarea></div>' +
      '<div class="status-bar"><p class="status-bar-field" id="np-status">Ln 1, Col 1</p></div></div>';
    },
    'open-calc': function() {
      return '<div class="window" id="win-calc" style="top:100px;left:200px;width:280px;height:340px;z-index:10">' +
      '<div class="title-bar"><span class="title-bar-icon">🧮</span><div class="title-bar-text">Calculator</div>' +
      '<div class="title-bar-controls"><button class="min-btn">─</button><button class="max-btn">□</button><button class="close-btn">✕</button></div></div>' +
      '<div class="window-body" style="padding:8px;display:flex;flex-direction:column;gap:4px">' +
      '<input type="text" id="calc-display" style="text-align:right;font-size:16px;width:100%" value="0" readonly>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px">' +
      '<button>MC</button><button>MR</button><button>MS</button><button>M+</button>' +
      '<button>←</button><button>CE</button><button>C</button><button>±</button>' +
      '<button>7</button><button>8</button><button>9</button><button>/</button>' +
      '<button>4</button><button>5</button><button>6</button><button>*</button>' +
      '<button>1</button><button>2</button><button>3</button><button>-</button>' +
      '<button>0</button><button>.</button><button>=</button><button>+</button></div></div>' +
      '<div class="status-bar"><p class="status-bar-field">Ready</p></div></div>';
    },
    'open-explorer': function() {
      return '<div class="window" id="win-explorer" style="top:60px;left:140px;width:650px;height:420px;z-index:10">' +
      '<div class="title-bar"><span class="title-bar-icon">📁</span><div class="title-bar-text">My Documents</div>' +
      '<div class="title-bar-controls"><button class="min-btn">─</button><button class="max-btn">□</button><button class="close-btn">✕</button></div></div>' +
      '<menu-bar><menu-item>File<menu-popup><menu-row>New</menu-row><menu-row>Open</menu-row>' +
      '<menu-divider></menu-divider><menu-row>Close</menu-row></menu-popup></menu-item>' +
      '<menu-item>View<menu-popup><menu-row>Icons</menu-row><menu-row>Details</menu-row></menu-popup></menu-item></menu-bar>' +
      '<div class="toolbar"><button>🔙</button><button>🔜</button><button>⬆</button>' +
      '<span class="toolbar-separator"></span><button>🔍</button></div>' +
      '<div class="address-bar"><label>Address:</label><input type="text" value="C:\\Documents and Settings\\User\\My Documents"></div>' +
      '<div class="window-body" style="flex:1;display:flex">' +
      '<div style="width:180px;border-right:1px solid #ACA899;padding:8px;overflow:auto"><ul class="tree-view">' +
      '<li class="expanded">Desktop<ul><li class="expanded">My Documents<ul><li>Projects</li><li>Photos</li><li>Music</li></ul></li>' +
      '<li>My Computer<ul><li>Local Disk (C:)</li><li>CD Drive (D:)</li></ul></li><li>Recycle Bin</li></ul></li></ul></div>' +
      '<div style="flex:1;padding:8px"><div style="display:flex;flex-wrap:wrap;gap:12px">' +
      '<div class="desktop-icon" style="color:#000;width:80px"><span style="font-size:32px">📄</span>readme.txt</div>' +
      '<div class="desktop-icon" style="color:#000;width:80px"><span style="font-size:32px">📊</span>budget.xls</div>' +
      '<div class="desktop-icon" style="color:#000;width:80px"><span style="font-size:32px">🖼️</span>photo.jpg</div>' +
      '</div></div></div><div class="status-bar"><p class="status-bar-field">3 objects</p></div></div>';
    },
    'open-cmd': function() {
      return '<div class="window" id="win-cmd" style="top:100px;left:160px;width:600px;height:380px;z-index:10">' +
      '<div class="title-bar"><span class="title-bar-icon">⬛</span><div class="title-bar-text">Command Prompt</div>' +
      '<div class="title-bar-controls"><button class="min-btn">─</button><button class="max-btn">□</button><button class="close-btn">✕</button></div></div>' +
      '<div class="window-body" style="flex:1;display:flex;flex-direction:column;padding:4px;background:#000;color:#C0C0C0">' +
      '<div style="flex:1;font-family:Consolas,monospace;font-size:13px;overflow-y:auto;white-space:pre-wrap">' +
      'Microsoft Windows XP [Version 5.1.2600]\\n(C) Copyright 1985-2001 Microsoft Corp.\\n\\nC:\\Documents and Settings\\User></div>' +
      '<div style="display:flex;align-items:center;gap:4px"><span>C:\\></span>' +
      '<input type="text" style="flex:1;background:#000;color:#C0C0C0;border:1px solid #555;font-family:Consolas,monospace;font-size:13px"></div></div></div>';
    },
    'open-ie': function() {
      return '<div class="window" id="win-ie" style="top:50px;left:100px;width:750px;height:500px;z-index:10">' +
      '<div class="title-bar"><span class="title-bar-icon">🌐</span><div class="title-bar-text">Internet Explorer</div>' +
      '<div class="title-bar-controls"><button class="min-btn">─</button><button class="max-btn">□</button><button class="close-btn">✕</button></div></div>' +
      '<menu-bar><menu-item>File<menu-popup><menu-row>New Window</menu-row><menu-row>Open...</menu-row>' +
      '<menu-row>Save As...</menu-row><menu-divider></menu-divider><menu-row>Print...</menu-row>' +
      '<menu-row>Close</menu-row></menu-popup></menu-item>' +
      '<menu-item>Favorites<menu-popup><menu-row>⭐ Google</menu-row><menu-row>⭐ MSN</menu-row></menu-popup></menu-item></menu-bar>' +
      '<div class="toolbar"><button>🔙</button><button>🔜</button><button>⏹</button><button>🔄</button>' +
      '<span class="toolbar-separator"></span><span>Address:</span>' +
      '<input type="text" value="http://www.google.com" style="flex:1"></div>' +
      '<div class="window-body" style="flex:1;padding:8px;background:#FFFFFF;overflow:auto">' +
      '<h2 style="color:#0000CC;margin-top:0">Welcome to the World Wide Web!</h2>' +
      '<p>This is Internet Explorer 6.0 running inside VibeOS — a fully hallucinated Windows XP.</p>' +
      '<p><b>Try searching:</b> type in the address bar above and hit enter.</p>' +
      '<hr><small style="color:#888">Hallucinated page — content generated by AI</small></div>' +
      '<div class="status-bar"><p class="status-bar-field">Done</p></div></div>';
    }
  };

  // ================================================================
  // DeepSeek API (direct from browser)
  // ================================================================
  function hallucinateApp(appName, callback) {
    var key = API_KEY;
    if (!key) { key = promptForKey(); }
    if (!key) { callback(null, 'No API key provided'); return; }

    var systemPrompt = 'You are simulating a Windows XP application UI. ' +
      'You return ONLY raw HTML for an app window. ' +
      'CRITICAL: The HTML must be a <div class="window"> with a unique id. ' +
      'The window MUST include these EXACT elements inside a <div class="title-bar">: ' +
      '<div class="title-bar-text">App Name</div> ' +
      '<div class="title-bar-controls"><button class="min-btn">─</button><button class="max-btn">□</button><button class="close-btn">✕</button></div> ' +
      'After title-bar, include <div class="window-body"> with appropriate UI. ' +
      'Optionally add <div class="status-bar"> at the bottom. ' +
      'Use XP CSS classes: window, title-bar, title-bar-text, title-bar-controls, window-body, status-bar, field-row, menu-bar, tabs, tree-view, toolbar, address-bar. ' +
      'Buttons use <button>. Inputs use <input type="text"> or <textarea>. ' +
      'All interactive elements must have unique IDs. ' +
      'Do NOT include <script> tags or JavaScript. Do NOT wrap in markdown. Return raw HTML only. ' +
      'The window MUST be resizable by the user dragging edges, maximizable to fill the screen, and closable. ' +
      'This is improv comedy — go with whatever weird app the user asks for, but keep it as a real Windows XP application.';

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.deepseek.com/chat/completions', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + key);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var resp = JSON.parse(xhr.responseText);
          var html = resp.choices[0].message.content;
          // Strip markdown code fences if present
          html = html.replace(/^```html?\s*/i, '').replace(/\s*```$/i, '').trim();
          callback(html, null);
        } catch(e) { callback(null, 'Parse error: ' + e.message); }
      } else if (xhr.status === 401) {
        saveKey('');
        callback(null, 'Invalid API key. Try again.');
      } else {
        callback(null, 'DeepSeek HTTP ' + xhr.status + ': ' + xhr.responseText.substring(0, 200));
      }
    };
    xhr.onerror = function() { callback(null, 'Network error. Check your connection.'); };
    xhr.send(JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Create a Windows XP application: ' + appName + '. Make it fully functional with appropriate UI controls.' }
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

    // Check known app
    var known = isKnownApp(name);
    if (known && appTemplates[known]) {
      openWindow('win-' + known.replace('open-',''), appTemplates[known]());
      hideRunDialog();
      return;
    }

    // Hallucinate via DeepSeek
    document.getElementById('run-thinking').style.display = 'block';
    document.getElementById('run-error').style.display = 'none';

    hallucinateApp(name, function(html, err) {
      document.getElementById('run-thinking').style.display = 'none';
      if (err) {
        document.getElementById('run-error').style.display = 'block';
        document.getElementById('run-error').textContent = 'Error: ' + err;
        return;
      }
      // Generate a unique window id, inject center positioning
      var winId = 'win-hallucinated-' + Date.now();
      html = html.replace(/id="win-[^"]*"/, 'id="' + winId + '"');
      // Replace or add style attribute to center window
      if (/style="/.test(html)) {
        html = html.replace(/style="/, 'style="top:50%;left:50%;transform:translate(-50%,-50%);');
      } else {
        html = html.replace(/class="window"/, 'class="window" style="top:50%;left:50%;transform:translate(-50%,-50%)"');
      }
      applyDelta({ id: 'windows-container', op: 'append', html: html });
      hideRunDialog();
      // Center precisely after layout
      setTimeout(function() {
        var win = document.getElementById(winId);
        if (win) {
          win.style.zIndex = 1000;
          // Remove transform centering, use precise pixel position
          var r = win.getBoundingClientRect();
          var vw = window.innerWidth, vh = window.innerHeight;
          win.style.transform = '';
          win.style.top = Math.max(30, (vh - r.height) / 2) + 'px';
          win.style.left = Math.max(0, (vw - r.width) / 2) + 'px';
        }
      }, 100);
    });
  }

  // ================================================================
  // Click Handling
  // ================================================================
  document.addEventListener('click', function(e) {
    if (e.defaultPrevented) return;
    var el = e.target.closest('[id]');
    if (!el) return;
    var id = el.id;
    if (id === 'btn-start' || id === 'start-menu') return;

    // Run dialog
    if (id === 'start-run') { showRunDialog(); return; }

    // Desktop icon or start menu item
    var action = el.getAttribute('data-action');
    if (action && appTemplates[action]) {
      openWindow(action.replace('open-',''), appTemplates[action]());
      if (id.indexOf('start-') === 0) {
        document.getElementById('start-menu').style.display = 'none';
      }
      return;
    }

    // Other clicks (menu items, etc.) — handled by xp.js behaviors
  });

  // Double-click on desktop icons
  document.addEventListener('dblclick', function(e) {
    var icon = e.target.closest('.desktop-icon');
    if (!icon) return;
    var action = icon.getAttribute('data-action');
    if (action && appTemplates[action]) {
      openWindow(action.replace('open-',''), appTemplates[action]());
    }
  });

  // Run dialog button clicks
  document.addEventListener('click', function(e) {
    if (e.target.id === 'run-ok') { submitRun(); e.stopPropagation(); }
    if (e.target.id === 'run-cancel' || e.target.id === 'run-close') { hideRunDialog(); e.stopPropagation(); }
  });

  // Enter/Escape in Run dialog
  document.addEventListener('keydown', function(e) {
    if (document.getElementById('run-dialog').style.display === 'flex') {
      if (e.key === 'Enter') { submitRun(); e.preventDefault(); }
      if (e.key === 'Escape') { hideRunDialog(); e.preventDefault(); }
    }
  });

  // Clock update
  function updateClock() {
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    var clock = document.getElementById('clock');
    if (clock) clock.textContent = h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }
  updateClock();
  setInterval(updateClock, 30000);

  console.log('VibeOS ready — ' + Object.keys(appTemplates).length + ' apps, DeepSeek ' + (API_KEY ? '✓' : '(no key)'));
})();
