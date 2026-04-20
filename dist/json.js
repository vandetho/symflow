// src/json/export.ts
function exportWorkflowJson({
  definition,
  meta,
  indent = 2
}) {
  const payload = { definition, meta };
  return JSON.stringify(payload, null, indent);
}

// src/json/import.ts
function importWorkflowJson(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(
      `Invalid workflow JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid workflow JSON: expected an object");
  }
  const obj = parsed;
  const definition = obj.definition;
  const meta = obj.meta;
  if (!definition || typeof definition !== "object") {
    throw new Error("Invalid workflow JSON: missing 'definition'");
  }
  if (!meta || typeof meta !== "object") {
    throw new Error("Invalid workflow JSON: missing 'meta'");
  }
  if (!Array.isArray(definition.places) || !Array.isArray(definition.transitions)) {
    throw new Error(
      "Invalid workflow JSON: definition must have places and transitions arrays"
    );
  }
  return { definition, meta };
}

export { exportWorkflowJson, importWorkflowJson };
//# sourceMappingURL=json.js.map
//# sourceMappingURL=json.js.map