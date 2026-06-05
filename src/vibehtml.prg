// vibehtml.prg — HTML generator for VibeOS
// System prompt, LLM orchestration, app window templates

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
   LOCAL cSessionId, aDeltas := {}

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
      CASE (cAction == "click" .OR. cAction == "dblclick") .AND. (cTarget == "open-notepad" .OR. cId == "start-notepad")
         RETURN { DeltaAppend("windows-container", NotepadWindow()) }

      CASE (cAction == "click" .OR. cAction == "dblclick") .AND. (cTarget == "open-calc" .OR. cId == "start-calc")
         RETURN { DeltaAppend("windows-container", CalcWindow()) }

      CASE (cAction == "click" .OR. cAction == "dblclick") .AND. (cTarget == "open-explorer" .OR. cId == "start-explorer")
         RETURN { DeltaAppend("windows-container", ExplorerWindow()) }

      CASE (cAction == "click" .OR. cAction == "dblclick") .AND. (cTarget == "open-cmd" .OR. cId == "start-cmd")
         RETURN { DeltaAppend("windows-container", CmdWindow()) }

      CASE (cAction == "click" .OR. cAction == "dblclick") .AND. (cTarget == "open-ie" .OR. cId == "start-ie")
         RETURN { DeltaAppend("windows-container", IEWindow()) }

      OTHERWISE
         RETURN { DeltaInner("clock", cAction + ":" + cTarget + ":" + cId) }
   ENDCASE
RETURN {}


// === App Window Templates ===

STATIC FUNCTION NotepadWindow()
RETURN ;
'<div class="window" id="win-notepad" style="top:80px;left:120px;width:700px;height:450px;z-index:10">' + ;
'<div class="title-bar"><span class="title-bar-icon">&#x1F4DD;</span><div class="title-bar-text">Untitled - Notepad</div>' + ;
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
'<div class="title-bar"><span class="title-bar-icon">&#x1F9EE;</span><div class="title-bar-text">Calculator</div>' + ;
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
'<div class="title-bar"><span class="title-bar-icon">&#x1F4C1;</span><div class="title-bar-text">My Documents</div>' + ;
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
'<div class="title-bar"><span class="title-bar-icon">&#x1F310;</span><div class="title-bar-text">Internet Explorer</div>' + ;
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
