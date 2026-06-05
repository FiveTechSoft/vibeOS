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
