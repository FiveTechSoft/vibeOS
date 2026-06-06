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
      centerWindow(winId);
      if (info.onOpen) info.onOpen();
    }, 50);
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
      }
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

    var systemPrompt = 'You generate inner body HTML for Windows XP applications. ' +
      'CRITICAL: Return ONLY the HTML that goes INSIDE <div class="window-body">. ' +
      'NEVER include outer window div, title bar, or status bar. ' +
      'NEVER wrap in ```html code blocks. Raw HTML only. ' +
      '' +
      '=== CUSTOM HTML ELEMENTS (must use exactly as shown — these are real custom elements, NOT divs) === ' +
      'CRITICAL: Every menu item with a dropdown MUST contain a <menu-popup> with <menu-row> children. ' +
      'Without <menu-popup>, the menu will NOT open. This is how Windows XP menus work. ' +
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
      '- No <script> tags. No <style> tags. No markdown. ' +
      '- Make it functional and realistic like a real 2001 XP program ' +
      '' +
      '=== EXAMPLE for "Paint" === ' +
      '<menu-bar><menu-item>File<menu-popup><menu-row id="pt-new">New</menu-row><menu-row id="pt-open">Open...</menu-row><menu-row id="pt-save">Save</menu-row><menu-divider></menu-divider><menu-row id="pt-exit">Exit</menu-row></menu-popup></menu-item><menu-item>Edit<menu-popup><menu-row id="pt-undo">Undo</menu-row><menu-row id="pt-cut">Cut</menu-row><menu-row id="pt-copy">Copy</menu-row><menu-row id="pt-paste">Paste</menu-row></menu-popup></menu-item><menu-item>View<menu-popup><menu-row id="pt-toolbox">Tool Box</menu-row><menu-row id="pt-colors">Color Box</menu-row></menu-popup></menu-item><menu-item>Help<menu-popup><menu-row id="pt-about">About Paint</menu-row></menu-popup></menu-item></menu-bar><div class="toolbar"><button>✏️</button><button>🖌️</button><button>🧹</button><button>💧</button><button>🔤</button><span class="toolbar-separator"></span><button>🔍</button></div><div style="flex:1;display:flex;gap:4px;padding:4px"><div style="display:flex;flex-direction:column;gap:2px;padding:4px;background:#ECE9D8;border:1px solid #ACA899"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2px"><button style="width:20px;height:20px;padding:0;background:#000"></button><button style="width:20px;height:20px;padding:0;background:#808080"></button><button style="width:20px;height:20px;padding:0;background:#800000"></button><button style="width:20px;height:20px;padding:0;background:#008000"></button><button style="width:20px;height:20px;padding:0;background:#000080"></button><button style="width:20px;height:20px;padding:0;background:#808000"></button><button style="width:20px;height:20px;padding:0;background:#800080"></button><button style="width:20px;height:20px;padding:0;background:#008080"></button><button style="width:20px;height:20px;padding:0;background:#C0C0C0"></button><button style="width:20px;height:20px;padding:0;background:#FFFF00"></button><button style="width:20px;height:20px;padding:0;background:#FF00FF"></button><button style="width:20px;height:20px;padding:0;background:#00FFFF"></button><button style="width:20px;height:20px;padding:0;background:#FFFFFF;border:1px solid #999"></button><button style="width:20px;height:20px;padding:0;background:#FFA500"></button></div></div><div style="flex:1;background:#FFFFFF;border:1px solid #7F9DB9;min-height:200px;overflow:auto;display:flex;align-items:center;justify-content:center"><span style="color:#ACA899;font-size:14px">Canvas — draw here</span></div></div> ' +
      '' +
      '=== REMINDERS === ' +
      '- <menu-item> without <menu-popup> = dead click (dropdown will NOT open) ' +
      '- Use EXACTLY these tags: <menu-bar> <menu-item> <menu-popup> <menu-row> <menu-divider> ' +
      '- Do NOT wrap in ```html. Return RAW HTML. No explanations. ' +
      '=== IMPROV COMEDY === ' +
      'Go with weird requests but render them as real XP apps. "Microsoft in Ancient Egypt" = business app in 3000 BC with scrolls and pyramids. No <script> ever. Raw HTML only.';

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
    // Place mines
    var i, j, m = 0;
    for (i = 0; i < rows; i++) { msGrid[i] = []; msRevealed[i] = []; msFlagged[i] = []; for (j = 0; j < cols; j++) { msGrid[i][j] = 0; msRevealed[i][j] = false; msFlagged[i][j] = false; } }
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
    msRenderAll();
    // Timer
    msTimerId = setInterval(function() {
      if (!msGameOver) { msTimer++; msUpdateDisplay(); }
    }, 1000);
  }

  function msReveal(r, c) {
    if (msGameOver || msRevealed[r][c] || msFlagged[r][c]) return;
    msRevealed[r][c] = true;
    if (msGrid[r][c] === -1) { msLose(); return; }
    if (msGrid[r][c] === 0) {
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        var ni = r+dr, nj = c+dc;
        if (ni>=0 && ni<9 && nj>=0 && nj<9) msReveal(ni, nj);
      }
    }
    msCheckWin();
  }

  function msCheckWin() {
    var won = true;
    for (var i = 0; i < 9; i++) for (var j = 0; j < 9; j++) {
      if (!msRevealed[i][j] && msGrid[i][j] !== -1) { won = false; break; }
    }
    if (won) { msGameOver = true; if (msTimerId) clearInterval(msTimerId); msUpdateDisplay(); }
  }

  function msLose() {
    msGameOver = true; if (msTimerId) clearInterval(msTimerId);
    for (var i = 0; i < 9; i++) for (var j = 0; j < 9; j++) msRevealed[i][j] = true;
    msUpdateDisplay();
  }

  function msUpdateDisplay() {
    var face = document.getElementById('ms-face');
    var minesEl = document.getElementById('ms-mines');
    var timerEl = document.getElementById('ms-timer');
    var won = msGameOver && !msGrid.some(function(r,i) { return r.some(function(c,j) { return c===-1 && !msFlagged[i][j]; }); });
    if (face) face.textContent = msGameOver ? (won ? '😎' : '💀') : '🙂';
    if (minesEl) minesEl.textContent = String('000' + msMineCount).slice(-3);
    if (timerEl) timerEl.textContent = String('000' + Math.min(msTimer, 999)).slice(-3);

    var colors = ['','#0000FF','#008000','#FF0000','#000080','#800000','#008080','#000','#808080'];
    for (var i = 0; i < 9; i++) for (var j = 0; j < 9; j++) {
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
    var grid = document.getElementById('ms-grid');
    if (!grid) return;
    var html = '';
    for (var i = 0; i < 9; i++) for (var j = 0; j < 9; j++) {
      html += '<button id="ms-c-'+i+'-'+j+'" style="width:20px;height:20px;padding:0;min-height:0;font-size:11px;line-height:18px;text-align:center;border:2px outset #FFF;background:#C0C0C0;font-family:Tahoma,sans-serif"></button>';
    }
    grid.innerHTML = html;
    msInit(9, 9, 10);
  }

  // Minesweeper click handler (delegated)
  document.addEventListener('click', function(e) {
    var cell = e.target.closest('[id^="ms-c-"]');
    if (!cell) return;
    var parts = cell.id.split('-');
    var r = parseInt(parts[2]), c = parseInt(parts[3]);
    if (isNaN(r) || isNaN(c) || !msRevealed || !msRevealed[r]) return;
    msReveal(r, c);
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
      msInit(9, 9, 10); e.stopPropagation();
    }
    if (el.id === 'ms-intermediate') { /* 16x16 if we resize */ msInit(9, 9, 10); e.stopPropagation(); }
  });
  // ================================================================
  var ctxMenu = document.getElementById('desktop-menu');
  var styleSub = document.getElementById('style-submenu');
  var styleHover = false, subHover = false;

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
      applyTheme(currentTheme); // refresh checkmarks
    }
  });

  // Style submenu hover behavior
  if (ctxMenu) {
    ctxMenu.addEventListener('mouseover', function(e) {
      var styleItem = e.target.closest('#ctx-style');
      if (styleItem && styleSub) { styleSub.style.display = 'block'; styleHover = true; }
    });
    ctxMenu.addEventListener('mouseout', function(e) {
      if (e.target.closest('#ctx-style') || e.target.closest('#style-submenu')) return;
      if (styleSub) styleSub.style.display = 'none';
    });
  }
  if (styleSub) {
    styleSub.addEventListener('mouseover', function() { subHover = true; });
    styleSub.addEventListener('mouseout', function() {
      subHover = false;
      setTimeout(function() { if (!styleHover && !subHover && styleSub) styleSub.style.display = 'none'; }, 100);
    });
  }

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
          '<select><option>Windows XP</option><option>3D Pipes</option><option>Starfield</option></select></div>' +
          '<div class="field-row"><label>Wait:</label><input type="text" value="10" style="width:40px"> minutes</div></fieldset>' +
          '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">' +
          '<button class="primary">OK</button><button>Cancel</button><button>Apply</button></div>');
      }
      else if (action && appRegistry[action]) { openWindow(action, appRegistry[action]); }

      if (ctxMenu && !e.target.closest('#ctx-style')) ctxMenu.style.display = 'none';
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
