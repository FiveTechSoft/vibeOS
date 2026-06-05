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
