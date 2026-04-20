'use strict';

// src/typescript/export.ts
function exportWorkflowTs({
  definition,
  meta,
  exportName = "workflow",
  importFrom = "@symflow/core"
}) {
  const definitionLiteral = JSON.stringify(definition, null, 4);
  const metaLiteral = JSON.stringify(meta, null, 4);
  return `import type { WorkflowDefinition, WorkflowMeta } from "${importFrom}";

export const ${exportName}Definition: WorkflowDefinition = ${definitionLiteral};

export const ${exportName}Meta: WorkflowMeta = ${metaLiteral};
`;
}

exports.exportWorkflowTs = exportWorkflowTs;
//# sourceMappingURL=typescript.cjs.map
//# sourceMappingURL=typescript.cjs.map