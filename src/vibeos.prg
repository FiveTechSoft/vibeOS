// vibeos.prg — VibeOS HTTP server using Harbour hbsocket
// Single-threaded, blocking. Serves XP desktop + API.

#include "hbsocket.ch"
#include "fileio.ch"

#define CRLF Chr(13)+Chr(10)
#define PORT 8765

PROCEDURE Main()
   LOCAL hListen, hSocket, cReq, cResp, nRecv
   LOCAL cRoot := hb_DirBase()

   hListen := hb_socketOpen()
   IF Empty(hListen); RETURN; ENDIF

   IF !hb_socketBind(hListen, { HB_SOCKET_AF_INET, "0.0.0.0", PORT })
      hb_socketClose(hListen); RETURN
   ENDIF

   IF !hb_socketListen(hListen, 5)
      hb_socketClose(hListen); RETURN
   ENDIF

   // Accept loop
   DO WHILE .T.
      hSocket := hb_socketAccept(hListen, NIL, 30000)
      IF Empty(hSocket); LOOP; ENDIF

      cReq := Space(8192)
      nRecv := hb_socketRecv(hSocket, @cReq, 8192,,, 5000)
      cReq := Left(cReq, nRecv)

      IF nRecv > 0
         cResp := HandleHTTP(cReq, cRoot)
         hb_socketSend(hSocket, cResp)
      ENDIF

      hb_socketClose(hSocket)
   ENDDO

   hb_socketClose(hListen)
RETURN


STATIC FUNCTION HandleHTTP(cRequest, cRoot)
   LOCAL aLines, aFirst, cMethod, cPath, cBody, cResp
   LOCAL cFile, cMime, cExt

   aLines := hb_ATokens(cRequest, CRLF)
   IF Len(aLines) < 1; RETURN "HTTP/1.1 400 Bad Request" + CRLF + CRLF; ENDIF

   aFirst := hb_ATokens(aLines[1], " ")
   IF Len(aFirst) < 2; RETURN "HTTP/1.1 400 Bad Request" + CRLF + CRLF; ENDIF

   cMethod := aFirst[1]
   cPath   := aFirst[2]

   // Parse body
   cBody := ""
   IF CRLF+CRLF $ cRequest
      cBody := SubStr(cRequest, At(CRLF+CRLF, cRequest) + 4)
   ENDIF

   DO CASE
   CASE cPath == "/" .OR. cPath == "/desktop"
      cFile := cRoot + "assets" + hb_ps() + "desktop.html"
      cResp := ServeFile(cFile)

   CASE Left(cPath, 7) == "/assets"
      cFile := cRoot + "assets" + hb_ps() + SubStr(cPath, 9)
      cFile := StrTran(cFile, "/", hb_ps())
      cResp := ServeFile(cFile)

   CASE cPath == "/api/action" .AND. cMethod == "POST"
      cResp := HandleAction(cBody)

   OTHERWISE
      cResp := "HTTP/1.1 404 Not Found" + CRLF
      cResp += "Content-Type: text/html" + CRLF
      cResp += "Connection: close" + CRLF + CRLF
      cResp += "<html><body><h1>404 Not Found</h1></body></html>"
   ENDCASE

RETURN cResp


STATIC FUNCTION ServeFile(cFile)
   LOCAL cBody, cMime, cExt, cResp

   IF !hb_vfExists(cFile)
      cResp := "HTTP/1.1 404 Not Found" + CRLF
      cResp += "Content-Type: text/html" + CRLF
      cResp += "Connection: close" + CRLF + CRLF
      cResp += "<html><body><h1>404 Not Found</h1></body></html>"
      RETURN cResp
   ENDIF

   cBody := hb_MemoRead(cFile)
   cExt  := Lower(hb_FNameExt(cFile))

   DO CASE
   CASE cExt == ".html"; cMime := "text/html"
   CASE cExt == ".css";  cMime := "text/css"
   CASE cExt == ".js";   cMime := "application/javascript"
   CASE cExt == ".png";  cMime := "image/png"
   CASE cExt == ".svg";  cMime := "image/svg+xml"
   CASE cExt == ".ico";  cMime := "image/x-icon"
   OTHERWISE;            cMime := "application/octet-stream"
   ENDCASE

   cResp := "HTTP/1.1 200 OK" + CRLF
   cResp += "Content-Type: " + cMime + CRLF
   cResp += "Content-Length: " + hb_ntos(Len(cBody)) + CRLF
   cResp += "Connection: close" + CRLF + CRLF
   cResp += cBody

RETURN cResp


STATIC FUNCTION HandleAction(cBody)
   LOCAL hAction, cAction, cTarget, cId, cJson

   hAction := hb_jsonDecode(cBody)
   IF hAction == NIL
      cJson := '[]'
   ELSE
      cAction := hb_HGetDef(hAction, "action", "")
      cTarget := hb_HGetDef(hAction, "target", hb_HGetDef(hAction, "command", ""))
      cId     := hb_HGetDef(hAction, "id", "")

      DO CASE
      CASE (cAction == "click" .OR. cAction == "dblclick") .AND. (cTarget == "open-notepad" .OR. cId == "start-notepad")
         cJson := '[' + DeltaAppendJS("windows-container", NotepadWindow()) + ']'

      CASE (cAction == "click" .OR. cAction == "dblclick") .AND. (cTarget == "open-calc" .OR. cId == "start-calc")
         cJson := '[' + DeltaAppendJS("windows-container", CalcWindow()) + ']'

      CASE (cAction == "click" .OR. cAction == "dblclick") .AND. (cTarget == "open-explorer" .OR. cId == "start-explorer")
         cJson := '[' + DeltaAppendJS("windows-container", ExplorerWindow()) + ']'

      CASE (cAction == "click" .OR. cAction == "dblclick") .AND. (cTarget == "open-cmd" .OR. cId == "start-cmd")
         cJson := '[' + DeltaAppendJS("windows-container", CmdWindow()) + ']'

      CASE (cAction == "click" .OR. cAction == "dblclick") .AND. (cTarget == "open-ie" .OR. cId == "start-ie")
         cJson := '[' + DeltaAppendJS("windows-container", IEWindow()) + ']'

      OTHERWISE
         cJson := '[{"id":"clock","op":"inner","html":"' + cAction + ':' + cTarget + ':' + cId + '"}]'
      ENDCASE
   ENDIF

RETURN "HTTP/1.1 200 OK" + CRLF + ;
       "Content-Type: application/json" + CRLF + ;
       "Content-Length: " + hb_ntos(Len(cJson)) + CRLF + ;
       "Connection: close" + CRLF + CRLF + cJson


// Minimal JSON builder (avoids hbjson.hbc dependency for simple cases)
STATIC FUNCTION DeltaAppendJS(cId, cHtml)
   LOCAL cEsc := StrTran(StrTran(cHtml, '\', '\\'), '"', '\"')
RETURN '{"id":"' + cId + '","op":"append","html":"' + cEsc + '"}'


// === App Window Templates ===

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
'<div style="flex:1;padding:8px" id="fe-content"><div style="display:flex;flex-wrap:wrap;gap:12px">' + ;
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
'<input type="text" id="cmd-input" style="flex:1;background:#000;color:#C0C0C0;border:1px solid #555;font-family:Consolas,monospace;font-size:13px"></div>' + ;
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
