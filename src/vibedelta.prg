// vibedelta.prg — HTML delta helpers for VibeOS
// Each function returns a hash {id, op, ...} consumed by vibe.js applyDelta()

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
