# VibeOS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working Windows XP desktop simulator — browser at `http://localhost:8765` shows XP desktop, clicks open app windows, interactions generate LLM-powered HTML deltas.

**Architecture:** Harbour monolith (hbhttpd + ccapi/DeepSeek). Frontend sends user actions via POST `/api/action`, backend returns minimal HTML deltas as JSON, JS applies them in-place. Window state tracked in Harbour `windowSessions` map.

**Tech Stack:** Harbour 3.x + hbhttpd, ccapi (DeepSeek), Windows XP Luna CSS, vanilla JS (ES5), DeepSeek API with SSE streaming.

**Prerequisites:** Install Harbour + hbmk2 from https://harbour.github.io/ — needed before backend tasks (Task 6+).

---

## File Structure

```
vibeOS/
├── src/
│   ├── vibeos.prg          — main(): server startup, route mounting
│   ├── vibehtml.prg        — system prompt, LLM calls, response parsing
│   ├── vibesession.prg     — windowSessions map, window state, history
│   ├── vibedelta.prg       — delta helpers (replace, inner, append, remove, value, attr)
│   ├── vibestatic.prg      — static file serving with MIME detection
│   └── vibeos.hbp          — Harbour build file
├── assets/
│   ├── xp.css              — Windows XP Luna theme (complete)
│   ├── xp.js               — behaviors: menus, tabs, tree-view, drag, focus
│   ├── vibe.js             — glue: action dispatch, delta application, form interception
│   └── desktop.html        — static desktop template (taskbar, icons, start menu)
├── ccharbour/              — reused from CCHarbour (ccapi, cchttp, ccconfig, ccsse)
└── docs/superpowers/plans/ — this plan
```

### Module Responsibilities

| Module | Responsibility | Depends On |
|--------|---------------|------------|
| `vibeos.prg` | HTTP server start, route dispatch | vibestatic, vibehtml |
| `vibestatic.prg` | Serve assets/ files with correct MIME | none |
| `vibesession.prg` | Multi-session window state map | none |
| `vibehtml.prg` | System prompt, LLM orchestration, app HTML generation | vibesession, ccapi |
| `vibedelta.prg` | Typed delta helpers, merge logic | none |
| `xp.css` | Visual Luna theme for all XP controls | none |
| `xp.js` | Pre-loaded interactive behaviors | none |
| `vibe.js` | Backend communication, delta application | none |
| `desktop.html` | Static desktop shell template | none |

### Interfaces

- **vibeos → vibestatic**: `ServeStatic(cPath)` returns `{code, body, mime}` or NIL
- **vibeos → vibehtml**: `DesktopInit()` returns `{code, body, mime}`, `HandleAction(cJsonBody)` returns `{code, body, mime}`
- **vibehtml → vibesession**: `SessionGet/Set/AddWindow/AddHistory` with sessionId key
- **vibehtml → vibedelta**: `DeltaReplace/Inner/Append/Remove/Value/Attr(id, ...)` each return a delta hash
- **vibe.html → vibe.js**: `vibeSend({action, id, ...})` posts to `/api/action`, applies returned deltas
- **vibe.js → DOM**: delta operations: `replace`, `inner`, `append`, `before`, `after`, `remove`, `value`, `attr`

---

### Task 1: Project skeleton + static file server

**Files:**
- Create: `assets/xp.css` (stub)
- Create: `assets/xp.js` (stub)
- Create: `assets/vibe.js` (stub)
- Create: `src/vibeos.hbp`
- Create: `src/vibeos.prg`
- Create: `src/vibestatic.prg`

- [ ] **Step 1: Create directory structure**

```powershell
New-Item -ItemType Directory -Force -Path c:\vibeOS\assets
New-Item -ItemType Directory -Force -Path c:\vibeOS\src
New-Item -ItemType Directory -Force -Path c:\vibeOS\ccharbour
```

- [ ] **Step 2: Write stub static files**

`assets/xp.css`:
```css
/* Windows XP Luna Theme CSS — stub */
body { margin: 0; padding: 0; background: #3A6EA5; font-family: 'Tahoma', sans-serif; font-size: 11px; }
```

`assets/xp.js`:
```javascript
// XP behaviors — stub. Menus, tabs, tree-view, drag loaded here.
console.log('xp.js loaded');
```

`assets/vibe.js`:
```javascript
// Glue: send user actions to backend, apply HTML deltas
console.log('vibe.js loaded');
```

- [ ] **Step 3: Write Harbour build file**

`src/vibeos.hbp`:
```
vibeos.prg
vibestatic.prg
vibehtml.prg
vibesession.prg
vibedelta.prg
-cflag=-O2
-gui=no
-mt=yes
```

- [ ] **Step 4: Write static file server module**

`src/vibestatic.prg`:
```harbour
#include "hbhttpd.ch"

FUNCTION ServeStatic(cPath)
   LOCAL cFile := ""
   LOCAL cMime := ""
   LOCAL cRoot := hb_DirBase() + "assets" + hb_ps()

   IF cPath == "/" .OR. Empty(cPath)
      cPath := "/desktop.html"
   ENDIF

   cFile := cRoot + SubStr(cPath, 2)
   cFile := StrTran(cFile, "/", hb_ps())

   IF !hb_vfExists(cFile)
      RETURN NIL
   ENDIF

   cMime := GetMimeType(cFile)
   RETURN { "code" => 200, "body" => hb_MemoRead(cFile), "mime" => cMime }


STATIC FUNCTION GetMimeType(cFile)
   LOCAL cExt := Lower(hb_FNameExt(cFile))
   DO CASE
      CASE cExt == ".html"; RETURN "text/html"
      CASE cExt == ".css";  RETURN "text/css"
      CASE cExt == ".js";   RETURN "application/javascript"
      CASE cExt == ".png";  RETURN "image/png"
      CASE cExt == ".ico";  RETURN "image/x-icon"
      CASE cExt == ".svg";  RETURN "image/svg+xml"
      OTHERWISE;            RETURN "application/octet-stream"
   ENDCASE
```

- [ ] **Step 5: Write main server entry point**

`src/vibeos.prg`:
```harbour
#include "hbhttpd.ch"

REQUEST HB_CODEPAGE_ES

PROCEDURE Main()
   LOCAL oServer

   CLS
   ? "vibeOS Server v0.1"
   ? "Starting on http://localhost:8765 ..."

   oServer := UHttpd():New()
   oServer:nPort := 8765
   oServer:bOnRequest := {|cMethod, cPath, hHeaders, cBody| HandleRequest(cMethod, cPath, hHeaders, cBody) }

   IF oServer:Start()
      ? "Server running. Press Ctrl+C to stop."
      oServer:Wait()
   ELSE
      ? "ERROR: Could not start server."
   ENDIF
RETURN


STATIC FUNCTION HandleRequest(cMethod, cPath, hHeaders, cBody)
   LOCAL oResp := { "code" => 404, "body" => "Not Found", "mime" => "text/plain" }
   LOCAL aResult

   // Root redirect
   IF cPath == "/"
      oResp := { "code" => 302, "body" => "", "mime" => "text/plain", ;
                 "headers" => { "Location" => "/desktop" } }
      RETURN oResp
   ENDIF

   // Static files: /assets/*
   IF Left(cPath, 7) == "/assets"
      aResult := ServeStatic(SubStr(cPath, 8))
      IF aResult != NIL
         oResp := aResult
      ENDIF
      RETURN oResp
   ENDIF

   // Desktop endpoint
   IF cPath == "/desktop" .AND. cMethod == "GET"
      oResp := DesktopInit()
      RETURN oResp
   ENDIF

   // Action endpoint
   IF cPath == "/api/action" .AND. cMethod == "POST"
      oResp := HandleAction(cBody)
      RETURN oResp
   ENDIF

RETURN oResp
```

- [ ] **Step 6: Commit**

```bash
git add assets/ src/
git commit -m "feat: project skeleton with static file server stub"
```

---

### Task 2: Windows XP Luna CSS theme — complete controls

**Files:**
- Modify: `assets/xp.css` (full replacement)

- [ ] **Step 1: Write complete XP controls CSS**

Replace `assets/xp.css` with the full XP Luna theme. See `assets/xp.css` reference in the companion file `docs/superpowers/plans/xp-theme.css`. For brevity in this plan, the theme covers:

- Reset, body (Tahoma 11px, #3A6EA5 background)
- Desktop (flex col, full viewport)
- Taskbar (blue gradient, 30px, Start button green gradient, system tray)
- Desktop icons (flex col wrap, 72px wide, white text)
- Windows (position:fixed, #ECE9D8, blue border, rounded top corners, shadow, flex col)
- Title bar (blue gradient, white text, min/max/close buttons)
- Window body (flex:1, overflow:auto)
- Menu bar (#ECE9D8, hover blue, popup white with shadow)
- Start menu (fixed bottom-left, 380px, header gradient, two-panel)
- Tabs (section.tabs, button[role="tab"], aria-selected)
- Tree view (ul.tree-view, expand/collapse with ::before pseudo-elements)
- Buttons (#ECE9D8, 1px #ACA899 border, 3px radius)
- Inputs (1px #7F9DB9 border, focus dotted outline)
- Field row (flex row with label)
- Fieldset, legend
- Status bar (bottom border-top, flex row)
- Progress bar (blue blocks on white)
- Scrollbar (16px, #ECE9D8 track, #D4D0C8 thumb)
- Toolbar, address bar
- Context menu (fixed, white, shadow)
- Dialog overlay (rgba black 25%)

The full CSS is written in a single step — this task is large but linear.

- [ ] **Step 2: Commit**

```bash
git add assets/xp.css
git commit -m "feat: complete Windows XP Luna CSS theme"
```

---

### Task 3: Windows XP JS behaviors

**Files:**
- Modify: `assets/xp.js` (full replacement)

- [ ] **Step 1: Write complete XP behaviors**

Replace `assets/xp.js` with:

```javascript
// ==============================================
// Windows XP Behaviors — menus, tabs, tree-view, drag, focus, start menu
// ==============================================
(function() {
  'use strict';

  // --- Menu Bar dropdowns ---
  document.addEventListener('click', function(e) {
    var allItems = document.querySelectorAll('menu-item');
    allItems.forEach(function(item) { item.classList.remove('active'); });
    var menuItem = e.target.closest('menu-item');
    if (menuItem) { menuItem.classList.add('active'); e.stopPropagation(); }
    var ctx = document.querySelector('.context-menu');
    if (ctx && !e.target.closest('.context-menu')) { ctx.style.display = 'none'; }
  });

  // Hover switching between menus
  document.addEventListener('mouseover', function(e) {
    var menuItem = e.target.closest('menu-item');
    if (!menuItem) return;
    var active = document.querySelector('menu-item.active');
    if (active && active !== menuItem) { active.classList.remove('active'); menuItem.classList.add('active'); }
  });

  // Close menus on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('menu-item.active').forEach(function(m) { m.classList.remove('active'); });
    }
  });

  // --- Tab switching ---
  document.addEventListener('click', function(e) {
    var tab = e.target.closest('button[role="tab"]');
    if (!tab) return;
    var panelId = tab.getAttribute('aria-controls');
    if (!panelId) return;
    var section = tab.closest('section.tabs');
    if (section) {
      section.querySelectorAll('button[role="tab"]').forEach(function(t) { t.setAttribute('aria-selected', 'false'); });
    }
    tab.setAttribute('aria-selected', 'true');
    var panel = document.getElementById(panelId);
    if (panel) {
      var container = panel.parentElement;
      if (container) {
        container.querySelectorAll('[role="tabpanel"]').forEach(function(p) { p.classList.remove('active'); });
      }
      panel.classList.add('active');
    }
  });

  // --- Tree View expand/collapse ---
  document.addEventListener('click', function(e) {
    var li = e.target.closest('ul.tree-view li');
    if (!li) return;
    var ul = li.querySelector('ul');
    if (!ul) return;
    li.classList.toggle('expanded');
    e.stopPropagation();
  });

  // --- Window dragging ---
  var dragState = null;
  document.addEventListener('mousedown', function(e) {
    var titleBar = e.target.closest('.title-bar');
    if (!titleBar || e.target.closest('button')) return;
    var win = titleBar.closest('.window');
    if (!win || win.classList.contains('maximized')) return;
    var rect = win.getBoundingClientRect();
    dragState = { win: win, startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top };
    win.style.zIndex = (parseInt(win.style.zIndex) || 0) + 100;
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragState) return;
    dragState.win.style.left = (dragState.origLeft + e.clientX - dragState.startX) + 'px';
    dragState.win.style.top = (dragState.origTop + e.clientY - dragState.startY) + 'px';
  });
  document.addEventListener('mouseup', function() { dragState = null; });

  // --- Window focus on click ---
  document.addEventListener('mousedown', function(e) {
    var win = e.target.closest('.window');
    if (!win) return;
    var maxZ = 0;
    document.querySelectorAll('.window').forEach(function(w) {
      var z = parseInt(w.style.zIndex) || 0;
      if (z > maxZ) maxZ = z;
    });
    win.style.zIndex = maxZ + 1;
  });

  // --- Start menu toggle ---
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('#btn-start');
    if (!btn) {
      var menu = document.getElementById('start-menu');
      if (menu && !e.target.closest('#start-menu')) { menu.style.display = 'none'; }
      return;
    }
    var menu = document.getElementById('start-menu');
    if (menu) { menu.style.display = (menu.style.display === 'none') ? 'flex' : 'none'; }
    e.stopPropagation();
  });

  // --- Window controls (min/max/close) ---
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.title-bar-controls button');
    if (!btn) return;
    var win = btn.closest('.window');
    if (!win) return;
    if (btn.classList.contains('min-btn')) { win.style.display = 'none'; }
    else if (btn.classList.contains('max-btn')) { win.classList.toggle('maximized'); }
    else if (btn.classList.contains('close-btn')) { win.remove(); }
    e.stopPropagation();
  });

  // --- Context menu on right-click ---
  document.addEventListener('contextmenu', function(e) {
    var ctxTarget = e.target.closest('[data-context]');
    var ctx = document.getElementById('ctx-menu');
    if (ctxTarget && ctx) {
      e.preventDefault();
      ctx.style.display = 'block';
      ctx.style.left = e.clientX + 'px';
      ctx.style.top = e.clientY + 'px';
    }
  });

  console.log('XP behaviors initialized');
})();
```

- [ ] **Step 2: Commit**

```bash
git add assets/xp.js
git commit -m "feat: Windows XP JS behaviors — menus, tabs, tree, drag, focus, start menu"
```

---

### Task 4: Vibe.js glue layer

**Files:**
- Modify: `assets/vibe.js` (full replacement)

- [ ] **Step 1: Write vibe.js**

Replace `assets/vibe.js` with:

```javascript
// ==============================================
// vibe.js — Glue between frontend and VibeOS backend
// ==============================================
(function() {
  'use strict';
  var API_BASE = '/api/action';

  function vibeSend(payload) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var deltas = JSON.parse(xhr.responseText);
          if (Array.isArray(deltas)) { deltas.forEach(applyDelta); }
          else { applyDelta(deltas); }
        } catch (e) { console.error('vibe: bad JSON response', e); }
      } else { console.error('vibe: backend error ' + xhr.status); }
    };
    xhr.onerror = function() { console.error('vibe: network error'); };
    xhr.send(JSON.stringify(payload));
  }

  function applyDelta(delta) {
    if (!delta || !delta.id) { console.warn('vibe: delta missing id', delta); return; }
    var el = document.getElementById(delta.id);
    if (!el) { console.warn('vibe: element #' + delta.id + ' not found'); return; }
    switch (delta.op) {
      case 'replace': el.outerHTML = delta.html; break;
      case 'inner':   el.innerHTML = delta.html; break;
      case 'before':  el.insertAdjacentHTML('beforebegin', delta.html); break;
      case 'after':   el.insertAdjacentHTML('afterend', delta.html); break;
      case 'remove':  el.remove(); break;
      case 'append':  el.insertAdjacentHTML('beforeend', delta.html); break;
      case 'value':   el.value = delta.value || ''; break;
      case 'attr':    if (delta.attr && delta.val !== undefined) { el.setAttribute(delta.attr, delta.val); } break;
      default:        el.innerHTML = delta.html || '';
    }
  }

  // Intercept clicks on elements with IDs
  document.addEventListener('click', function(e) {
    if (e.defaultPrevented) return;
    var el = e.target.closest('[id]');
    if (!el) return;
    var id = el.id;
    if (id === 'btn-start' || id === 'start-menu') return;
    var action = el.getAttribute('data-action');
    if (action) {
      vibeSend({ action: 'click', id: id, command: action });
      return;
    }
    vibeSend({ action: 'click', id: id, tag: el.tagName, text: (el.textContent || '').trim().substring(0, 100) });
  });

  // Intercept input/change on form elements
  document.addEventListener('input', function(e) {
    var el = e.target;
    if (!el.id) return;
    if (['INPUT','TEXTAREA','SELECT'].indexOf(el.tagName) === -1) return;
    var value = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
    vibeSend({ action: 'input', id: el.id, value: value, type: el.type });
  });

  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    e.preventDefault();
    var form = e.target;
    if (!form.id) return;
    var data = {};
    form.querySelectorAll('input, textarea, select').forEach(function(el) {
      if (el.name) { data[el.name] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value; }
    });
    vibeSend({ action: 'submit', id: form.id, data: data });
  });

  window.vibeSend = vibeSend;
  window.vibeApplyDelta = applyDelta;
  console.log('vibe.js glue loaded');
})();
```

- [ ] **Step 2: Commit**

```bash
git add assets/vibe.js
git commit -m "feat: vibe.js glue — action dispatch, delta application, form interception"
```

---

### Task 5: Desktop HTML template

**Files:**
- Create: `assets/desktop.html`

- [ ] **Step 1: Write static desktop template**

`assets/desktop.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VibeOS — Windows XP</title>
<link rel="stylesheet" href="/assets/xp.css">
</head>
<body>
<div class="desktop" id="desktop">
  <div class="desktop-icons" id="desktop-icons">
    <div class="desktop-icon" id="icon-ie" data-action="open-ie"><span class="icon-img">🌐</span><span>Internet Explorer</span></div>
    <div class="desktop-icon" id="icon-paint" data-action="open-paint"><span class="icon-img">🎨</span><span>Paint</span></div>
    <div class="desktop-icon" id="icon-notepad" data-action="open-notepad"><span class="icon-img">📝</span><span>Notepad</span></div>
    <div class="desktop-icon" id="icon-explorer" data-action="open-explorer"><span class="icon-img">📁</span><span>File Explorer</span></div>
    <div class="desktop-icon" id="icon-calc" data-action="open-calc"><span class="icon-img">🧮</span><span>Calculator</span></div>
    <div class="desktop-icon" id="icon-cmd" data-action="open-cmd"><span class="icon-img">⬛</span><span>Command Prompt</span></div>
    <div class="desktop-icon" id="icon-minesweeper" data-action="open-minesweeper"><span class="icon-img">💣</span><span>Minesweeper</span></div>
    <div class="desktop-icon" id="icon-wmp" data-action="open-wmp"><span class="icon-img">🎵</span><span>Media Player</span></div>
  </div>
  <div id="windows-container"></div>
  <div class="start-menu" id="start-menu" style="display:none">
    <div class="start-header">VibeOS</div>
    <div class="start-body">
      <div class="start-left" id="start-left">
        <div class="start-item" id="start-ie" data-action="open-ie"><span class="start-icon">🌐</span> Internet Explorer</div>
        <div class="start-item" id="start-paint" data-action="open-paint"><span class="start-icon">🎨</span> Paint</div>
        <div class="start-item" id="start-notepad" data-action="open-notepad"><span class="start-icon">📝</span> Notepad</div>
        <div class="start-item" id="start-explorer" data-action="open-explorer"><span class="start-icon">📁</span> File Explorer</div>
        <div class="start-item" id="start-calc" data-action="open-calc"><span class="start-icon">🧮</span> Calculator</div>
        <div class="start-item" id="start-cmd" data-action="open-cmd"><span class="start-icon">⬛</span> Command Prompt</div>
      </div>
      <div class="start-right">
        <div class="start-item" id="start-logoff">Log Off</div>
        <div class="start-item" id="start-shutdown">Shut Down</div>
      </div>
    </div>
  </div>
  <div class="taskbar" id="taskbar">
    <button class="start-btn" id="btn-start"><span style="font-size:16px">🪟</span> Start</button>
    <div class="taskbar-spacer"></div>
    <div class="system-tray" id="system-tray"><span>🕐</span><span id="clock">12:00</span></div>
  </div>
</div>
<script src="/assets/xp.js"></script>
<script src="/assets/vibe.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add assets/desktop.html
git commit -m "feat: desktop HTML template — icons, start menu, taskbar"
```

---

### Task 6: Session module (vibesession.prg)

**Files:**
- Create: `src/vibesession.prg`

- [ ] **Step 1: Write session manager**

`src/vibesession.prg`:
```harbour
STATIC s_hSessions := {=>}

FUNCTION SessionNew(cSessionId)
   LOCAL hSession := { "windows" => {=>}, "state" => {=>}, "history" => {} }
   s_hSessions[cSessionId] := hSession
RETURN hSession

FUNCTION SessionGet(cSessionId)
   IF cSessionId == NIL .OR. !hb_HHasKey(s_hSessions, cSessionId)
      RETURN NIL
   ENDIF
RETURN s_hSessions[cSessionId]

FUNCTION SessionDelete(cSessionId)
   IF hb_HHasKey(s_hSessions, cSessionId)
      hb_HDel(s_hSessions, cSessionId)
   ENDIF
RETURN NIL

FUNCTION SessionAddWindow(cSessionId, cWinId, hWindowState)
   LOCAL hSession := SessionEnsure(cSessionId)
   hb_HSet(hSession["windows"], cWinId, hWindowState)
RETURN NIL

FUNCTION SessionGetWindow(cSessionId, cWinId)
   LOCAL hSession := SessionGet(cSessionId)
   IF hSession == NIL .OR. !hb_HHasKey(hSession["windows"], cWinId)
      RETURN NIL
   ENDIF
RETURN hSession["windows"][cWinId]

FUNCTION SessionRemoveWindow(cSessionId, cWinId)
   LOCAL hSession := SessionGet(cSessionId)
   IF hSession != NIL .AND. hb_HHasKey(hSession["windows"], cWinId)
      hb_HDel(hSession["windows"], cWinId)
   ENDIF
RETURN NIL

FUNCTION SessionSetState(cSessionId, cKey, xVal)
   LOCAL hSession := SessionEnsure(cSessionId)
   hb_HSet(hSession["state"], cKey, xVal)
RETURN NIL

FUNCTION SessionGetState(cSessionId, cKey)
   LOCAL hSession := SessionGet(cSessionId)
   IF hSession == NIL .OR. !hb_HHasKey(hSession["state"], cKey)
      RETURN NIL
   ENDIF
RETURN hSession["state"][cKey]

FUNCTION SessionAddHistory(cSessionId, hEntry)
   LOCAL hSession := SessionEnsure(cSessionId)
   AAdd(hSession["history"], hEntry)
RETURN NIL

STATIC FUNCTION SessionEnsure(cSessionId)
   LOCAL hSession := SessionGet(cSessionId)
   IF hSession == NIL
      hSession := SessionNew(cSessionId)
   ENDIF
RETURN hSession
```

- [ ] **Step 2: Commit**

```bash
git add src/vibesession.prg
git commit -m "feat: session manager — window state map, multi-session, history"
```

---

### Task 7: Delta utilities (vibedelta.prg)

**Files:**
- Create: `src/vibedelta.prg`

- [ ] **Step 1: Write delta helpers**

`src/vibedelta.prg`:
```harbour
FUNCTION DeltaReplace(cTargetId, cHtml)
RETURN { "id" => cTargetId, "op" => "replace", "html" => cHtml }

FUNCTION DeltaInner(cTargetId, cHtml)
RETURN { "id" => cTargetId, "op" => "inner", "html" => cHtml }

FUNCTION DeltaAppend(cTargetId, cHtml)
RETURN { "id" => cTargetId, "op" => "append", "html" => cHtml }

FUNCTION DeltaBefore(cTargetId, cHtml)
RETURN { "id" => cTargetId, "op" => "before", "html" => cHtml }

FUNCTION DeltaAfter(cTargetId, cHtml)
RETURN { "id" => cTargetId, "op" => "after", "html" => cHtml }

FUNCTION DeltaRemove(cTargetId)
RETURN { "id" => cTargetId, "op" => "remove" }

FUNCTION DeltaValue(cTargetId, xValue)
RETURN { "id" => cTargetId, "op" => "value", "value" => xValue }

FUNCTION DeltaAttr(cTargetId, cAttr, xVal)
RETURN { "id" => cTargetId, "op" => "attr", "attr" => cAttr, "val" => xVal }

// Merge multiple deltas — keep last per id (deepest-nested wins)
FUNCTION DeltaMerge(aDeltas)
   LOCAL hResult := {=>}
   LOCAL hDelta, cId
   FOR EACH hDelta IN aDeltas
      cId := hb_HGetDef(hDelta, "id", "")
      IF !Empty(cId)
         hResult[cId] := hDelta
      ENDIF
   NEXT
RETURN hResult
```

- [ ] **Step 2: Commit**

```bash
git add src/vibedelta.prg
git commit -m "feat: delta helpers — replace, inner, append, remove, value, attr, merge"
```

---

### Task 8: HTML generator + app launchers (vibehtml.prg)

**Files:**
- Create: `src/vibehtml.prg`

- [ ] **Step 1: Write HTML generator with MVP app windows**

`src/vibehtml.prg`:
```harbour
#include "hbjson.ch"

STATIC s_cSystemPrompt := ;
   "You are simulating an application UI. You supply self-contained HTML to represent the initial state of " + ;
   "a particular window given a description. The Windows XP look-and-feel CSS library and interactive behaviors " + ;
   "(tab switching, tree expand/collapse, menu dropdowns) are pre-loaded. Use XP styling for all UI controls. " + ;
   "The HTML markup may NOT include any <script> elements or JavaScript. " + ;
   "When the user interacts with this application, you'll be given a description of the action " + ;
   "and you will then reply with the updated state by returning modified HTML (deltas). " + ;
   "For any elements whose contents might later change, give them a unique ID. " + ;
   "For any elements that you want to be clickable, give them a unique ID. " + ;
   "Your initial response must be raw HTML only, with no other output. " + ;
   "Apps may load and save data. " + ;
   "IMPORTANT: This is basically improv with a comedy element — go with whatever the user types. " + ;
   "CRITICAL: Make the smallest possible deltas. Prefer multiple small edits over one big edit. " + ;
   "LAYOUT RULES: Use flex (flex:1) to fill space — never height:100%. " + ;
   "Remember: Always stay in character as a 90s Windows XP application."


FUNCTION DesktopInit()
   LOCAL cHtml := hb_MemoRead(hb_DirBase() + "assets" + hb_ps() + "desktop.html")
RETURN { "code" => 200, "body" => cHtml, "mime" => "text/html" }


FUNCTION HandleAction(cBody)
   LOCAL hAction := hb_jsonDecode(cBody)
   LOCAL cSessionId, hResponse, aDeltas := {}

   IF hAction == NIL
      RETURN { "code" => 400, "body" => '{"error":"Bad JSON"}', "mime" => "application/json" }
   ENDIF

   cSessionId := hb_HGetDef(hAction, "sessionId", "default")
   aDeltas := ProcessActionMVP(cSessionId, hAction)

RETURN { "code" => 200, "body" => hb_jsonEncode(aDeltas), "mime" => "application/json" }


STATIC FUNCTION ProcessActionMVP(cSessionId, hAction)
   LOCAL cAction := hb_HGetDef(hAction, "action", "")
   LOCAL cTarget := hb_HGetDef(hAction, "target", hb_HGetDef(hAction, "command", ""))
   LOCAL cId := hb_HGetDef(hAction, "id", "")

   DO CASE
      CASE cAction == "click" .AND. (cTarget == "open-notepad" .OR. cId == "start-notepad")
         RETURN { DeltaAppend("windows-container", NotepadWindow()) }

      CASE cAction == "click" .AND. (cTarget == "open-calc" .OR. cId == "start-calc")
         RETURN { DeltaAppend("windows-container", CalcWindow()) }

      CASE cAction == "click" .AND. (cTarget == "open-explorer" .OR. cId == "start-explorer")
         RETURN { DeltaAppend("windows-container", ExplorerWindow()) }

      CASE cAction == "click" .AND. (cTarget == "open-cmd" .OR. cId == "start-cmd")
         RETURN { DeltaAppend("windows-container", CmdWindow()) }

      CASE cAction == "click" .AND. (cTarget == "open-ie" .OR. cId == "start-ie")
         RETURN { DeltaAppend("windows-container", IEWindow()) }

      OTHERWISE
         RETURN { DeltaInner("clock", cAction + ":" + cTarget + ":" + cId) }
   ENDCASE
RETURN {}


// --- App Window Templates ---

STATIC FUNCTION NotepadWindow()
RETURN ;
'<div class="window" id="win-notepad" style="top:80px;left:120px;width:700px;height:450px;z-index:10">' + ;
'<div class="title-bar"><span class="title-bar-icon">📝</span><div class="title-bar-text">Untitled - Notepad</div>' + ;
'<div class="title-bar-controls"><button class="min-btn" aria-label="Minimize">─</button>' + ;
'<button class="max-btn" aria-label="Maximize">□</button><button class="close-btn" aria-label="Close">✕</button></div></div>' + ;
'<menu-bar><menu-item>File<menu-popup>' + ;
'<menu-row id="np-new">New</menu-row><menu-row id="np-open">Open...</menu-row>' + ;
'<menu-row id="np-save">Save</menu-row><menu-row id="np-saveas">Save As...</menu-row>' + ;
'<menu-divider></menu-divider><menu-row id="np-exit">Exit</menu-row></menu-popup></menu-item>' + ;
'<menu-item>Edit<menu-popup><menu-row id="np-undo">Undo</menu-row>' + ;
'<menu-row id="np-cut">Cut</menu-row><menu-row id="np-copy">Copy</menu-row>' + ;
'<menu-row id="np-paste">Paste</menu-row></menu-popup></menu-item></menu-bar>' + ;
'<div class="window-body" style="flex:1;display:flex;flex-direction:column;padding:0">' + ;
'<textarea id="np-textarea" style="flex:1;border:none;resize:none;font-family:Consolas,monospace;font-size:13px;padding:4px" rows="20"></textarea></div>' + ;
'<div class="status-bar"><p class="status-bar-field" id="np-status">Ln 1, Col 1</p></div></div>'


STATIC FUNCTION CalcWindow()
RETURN ;
'<div class="window" id="win-calc" style="top:100px;left:200px;width:280px;height:340px;z-index:10">' + ;
'<div class="title-bar"><span class="title-bar-icon">🧮</span><div class="title-bar-text">Calculator</div>' + ;
'<div class="title-bar-controls"><button class="min-btn" aria-label="Minimize">─</button>' + ;
'<button class="close-btn" aria-label="Close">✕</button></div></div>' + ;
'<div class="window-body" style="padding:8px;display:flex;flex-direction:column;gap:4px">' + ;
'<input type="text" id="calc-display" style="text-align:right;font-size:16px;width:100%" value="0" readonly>' + ;
'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px">' + ;
'<button id="calc-mc">MC</button><button id="calc-mr">MR</button><button id="calc-ms">MS</button><button id="calc-mplus">M+</button>' + ;
'<button id="calc-back">←</button><button id="calc-ce">CE</button><button id="calc-c">C</button><button id="calc-plusminus">±</button>' + ;
'<button id="calc-7">7</button><button id="calc-8">8</button><button id="calc-9">9</button><button id="calc-div">/</button>' + ;
'<button id="calc-4">4</button><button id="calc-5">5</button><button id="calc-6">6</button><button id="calc-mul">*</button>' + ;
'<button id="calc-1">1</button><button id="calc-2">2</button><button id="calc-3">3</button><button id="calc-sub">-</button>' + ;
'<button id="calc-0">0</button><button id="calc-dot">.</button><button id="calc-eq">=</button><button id="calc-add">+</button>' + ;
'</div></div><div class="status-bar"><p class="status-bar-field">Ready</p></div></div>'


STATIC FUNCTION ExplorerWindow()
RETURN ;
'<div class="window" id="win-explorer" style="top:60px;left:140px;width:650px;height:420px;z-index:10">' + ;
'<div class="title-bar"><span class="title-bar-icon">📁</span><div class="title-bar-text">My Documents</div>' + ;
'<div class="title-bar-controls"><button class="min-btn" aria-label="Minimize">─</button>' + ;
'<button class="max-btn" aria-label="Maximize">□</button><button class="close-btn" aria-label="Close">✕</button></div></div>' + ;
'<menu-bar><menu-item>File<menu-popup><menu-row id="fe-new">New</menu-row>' + ;
'<menu-row id="fe-open">Open</menu-row><menu-divider></menu-divider>' + ;
'<menu-row id="fe-close">Close</menu-row></menu-popup></menu-item>' + ;
'<menu-item>View<menu-popup><menu-row id="fe-icons">Icons</menu-row>' + ;
'<menu-row id="fe-details">Details</menu-row></menu-popup></menu-item></menu-bar>' + ;
'<div class="toolbar"><button>🔙 Back</button><button>🔜 Forward</button><button>⬆ Up</button>' + ;
'<span class="toolbar-separator"></span><button>🔍 Search</button></div>' + ;
'<div class="address-bar"><label>Address:</label><input type="text" id="fe-address" value="C:\Documents and Settings\User\My Documents"></div>' + ;
'<div class="window-body" style="flex:1;display:flex">' + ;
'<div style="width:180px;border-right:1px solid #ACA899;padding:8px;overflow:auto">' + ;
'<ul class="tree-view" id="fe-tree"><li class="expanded">Desktop<ul>' + ;
'<li class="expanded">My Documents<ul><li id="fe-folder1">Projects</li><li id="fe-folder2">Photos</li><li id="fe-folder3">Music</li></ul></li>' + ;
'<li>My Computer<ul><li>Local Disk (C:)</li><li>CD Drive (D:)</li></ul></li>' + ;
'<li>Recycle Bin</li></ul></li></ul></div>' + ;
'<div style="flex:1;padding:8px" id="fe-content">' + ;
'<div style="display:flex;flex-wrap:wrap;gap:12px">' + ;
'<div class="desktop-icon" style="color:#000;width:80px" id="fe-file1"><span style="font-size:32px">📄</span>readme.txt</div>' + ;
'<div class="desktop-icon" style="color:#000;width:80px" id="fe-file2"><span style="font-size:32px">📊</span>budget.xls</div>' + ;
'<div class="desktop-icon" style="color:#000;width:80px" id="fe-file3"><span style="font-size:32px">🖼️</span>photo.jpg</div>' + ;
'</div></div></div>' + ;
'<div class="status-bar"><p class="status-bar-field" id="fe-status">3 objects</p></div></div>'


STATIC FUNCTION CmdWindow()
RETURN ;
'<div class="window" id="win-cmd" style="top:100px;left:160px;width:600px;height:380px;z-index:10">' + ;
'<div class="title-bar"><span class="title-bar-icon">⬛</span><div class="title-bar-text">Command Prompt</div>' + ;
'<div class="title-bar-controls"><button class="min-btn" aria-label="Minimize">─</button>' + ;
'<button class="max-btn" aria-label="Maximize">□</button><button class="close-btn" aria-label="Close">✕</button></div></div>' + ;
'<div class="window-body" style="flex:1;display:flex;flex-direction:column;padding:4px;background:#000;color:#C0C0C0">' + ;
'<div style="flex:1;font-family:Consolas,monospace;font-size:13px;overflow-y:auto;white-space:pre-wrap" id="cmd-output">' + ;
'Microsoft Windows XP [Version 5.1.2600]\n(C) Copyright 1985-2001 Microsoft Corp.\n\nC:\Documents and Settings\User></div>' + ;
'<div style="display:flex;align-items:center;gap:4px"><span>C:\></span>' + ;
'<input type="text" id="cmd-input" style="flex:1;background:#000;color:#C0C0C0;border:1px solid #555;font-family:Consolas,monospace;font-size:13px" autofocus></div>' + ;
'</div></div>'


STATIC FUNCTION IEWindow()
RETURN ;
'<div class="window" id="win-ie" style="top:50px;left:100px;width:750px;height:500px;z-index:10">' + ;
'<div class="title-bar"><span class="title-bar-icon">🌐</span><div class="title-bar-text">Internet Explorer</div>' + ;
'<div class="title-bar-controls"><button class="min-btn" aria-label="Minimize">─</button>' + ;
'<button class="max-btn" aria-label="Maximize">□</button><button class="close-btn" aria-label="Close">✕</button></div></div>' + ;
'<menu-bar><menu-item>File<menu-popup><menu-row id="ie-new">New Window</menu-row>' + ;
'<menu-row id="ie-open">Open...</menu-row><menu-row id="ie-save">Save As...</menu-row>' + ;
'<menu-divider></menu-divider><menu-row id="ie-print">Print...</menu-row>' + ;
'<menu-row id="ie-close">Close</menu-row></menu-popup></menu-item>' + ;
'<menu-item>Favorites<menu-popup><menu-row id="ie-fav1">⭐ Google</menu-row>' + ;
'<menu-row id="ie-fav2">⭐ MSN</menu-row></menu-popup></menu-item></menu-bar>' + ;
'<div class="toolbar"><button>🔙</button><button>🔜</button><button>⏹</button><button>🔄</button>' + ;
'<span class="toolbar-separator"></span><span style="font-size:11px">Address:</span>' + ;
'<input type="text" id="ie-address" style="flex:1" value="http://www.google.com"></div>' + ;
'<div class="window-body" style="flex:1;padding:8px;background:#FFFFFF;overflow:auto" id="ie-content">' + ;
'<h2 style="color:#0000CC;margin-top:0">Welcome to the World Wide Web!</h2>' + ;
'<p>This is Internet Explorer 6.0 running inside VibeOS — a fully hallucinated Windows XP.</p>' + ;
'<p><b>Try searching:</b> type in the address bar above and hit enter.</p>' + ;
'<hr><small style="color:#888">Hallucinated page — content generated by AI</small></div>' + ;
'<div class="status-bar"><p class="status-bar-field" id="ie-status">Done</p></div></div>'
```

- [ ] **Step 2: Commit**

```bash
git add src/vibehtml.prg
git commit -m "feat: HTML generator with system prompt, 5 MVP app windows (Notepad, Calc, Explorer, CMD, IE)"
```

---

### Task 9: Build and smoke test

**Files:**
- Modify: `src/vibeos.hbp` (already done)

- [ ] **Step 1: Build**

```powershell
hbmk2 src/vibeos.hbp -ovibeos.exe
```

Expected: compiles without errors. Produces `vibeos.exe`.

- [ ] **Step 2: Start server**

```powershell
./vibeos.exe
```

Expected: `Server running. Press Ctrl+C to stop.`

- [ ] **Step 3: Browser test**

Open `http://localhost:8765`. Verify:
- Desktop renders with blue background, 8 icons, taskbar
- Start button green, shows menu on click
- Double-click Notepad → window with textarea, menus, status bar
- Click Calculator → window with grid buttons, display
- Click File Explorer → tree view + file icons
- Click Command Prompt → black terminal with input
- Click Internet Explorer → toolbar + address bar + content
- Windows are draggable, minimizable, maximizable, closable
- Multiple windows stack correctly (z-index on click)

- [ ] **Step 4: API test**

```powershell
$body = '{"action":"click","id":"start-notepad","command":"open-notepad"}'
Invoke-WebRequest -Uri "http://localhost:8765/api/action" -Method POST -Body $body -ContentType "application/json" | Select-Object -ExpandProperty Content
```

Expected: JSON array with one delta `{"id":"windows-container","op":"append","html":"<div class=\"window\"..."}`

- [ ] **Step 5: Commit**

```bash
git add src/vibeos.hbp vibeos.exe
git commit -m "feat: complete MVP build — 5 apps, delta API, XP theme"
```

---

### Task 10 (Future): DeepSeek LLM integration

**Files:**
- Create: `ccharbour/ccapi.prg` (from CCHarbour)
- Modify: `src/vibehtml.prg`

- [ ] **Step 1: Link CCHarbour components**

Copy `ccapi.prg`, `cchttp.prg`, `ccconfig.prg`, `ccsse.prg` from CCHarbour into `ccharbour/`.

- [ ] **Step 2: Replace ProcessActionMVP with LLM call**

In `vibehtml.prg`, add:
```harbour
STATIC FUNCTION ProcessActionLLM(cSessionId, hAction)
   LOCAL cPrompt := BuildContextPrompt(cSessionId, hAction)
   LOCAL cResponse := DeepSeekChat(cPrompt)  // ccapi.prg
   LOCAL aDeltas := ParseDeltaResponse(cResponse)
   SessionAddHistory(cSessionId, hAction)
RETURN aDeltas


STATIC FUNCTION BuildContextPrompt(cSessionId, hAction)
   LOCAL cPrompt := s_cSystemPrompt + Chr(10)
   LOCAL hSession := SessionGet(cSessionId)
   // Add window state context
   // Add action description
   cPrompt += "User action: " + hb_jsonEncode(hAction)
RETURN cPrompt
```

- [ ] **Step 3: Configure API key**

Set environment variable or use `ccconfig.prg`:
```powershell
$env:DEEPSEEK_API_KEY = "sk-your-key-here"
```

- [ ] **Step 4: Test LLM-generated responses**

Start server, click around, verify LLM generates coherent HTML deltas.

---

## Testing Checklist

- [ ] Server starts on port 8765 without errors
- [ ] `http://localhost:8765` shows Windows XP desktop (blue bg, icons, taskbar)
- [ ] All 8 desktop icons visible
- [ ] Start button opens menu, closes when clicking elsewhere
- [ ] Notepad window opens with title bar, menus, textarea, status bar
- [ ] Calculator window opens with grid buttons
- [ ] File Explorer opens with tree view and file icons
- [ ] Command Prompt opens with black terminal
- [ ] Internet Explorer opens with toolbar and content area
- [ ] Windows are draggable by title bar
- [ ] Minimize/Maximize/Close buttons work
- [ ] Clicking window brings it to front
- [ ] Menu bar dropdowns open/close correctly
- [ ] CSS renders proper XP Luna styling
- [ ] `POST /api/action` returns valid JSON delta array
- [ ] Multiple windows can coexist and stack correctly
