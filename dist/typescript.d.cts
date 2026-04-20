import { WorkflowMeta } from './types.cjs';
import { i as WorkflowDefinition } from './types-CGhrS6jV.cjs';

interface ExportOptions {
    definition: WorkflowDefinition;
    meta: WorkflowMeta;
    /** Variable prefix used for the emitted exports. Defaults to `"workflow"`. */
    exportName?: string;
    /** Module specifier the emitted file imports types from. Defaults to `"@symflow/core"`. */
    importFrom?: string;
}
/**
 * Emit a TypeScript module string that re-declares the workflow as typed
 * `WorkflowDefinition` and `WorkflowMeta` literals. Save the result as a
 * `.ts` file and import the named exports normally — no runtime parsing
 * needed.
 */
declare function exportWorkflowTs({ definition, meta, exportName, importFrom, }: ExportOptions): string;

export { exportWorkflowTs };
