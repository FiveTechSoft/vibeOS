// vibesession.prg — Window session state manager for VibeOS
// Manages multi-session window state: windows hash, state hash, history array

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
