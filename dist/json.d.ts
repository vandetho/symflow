import { WorkflowMeta } from './types.js';
import { i as WorkflowDefinition } from './types-CGhrS6jV.js';

interface WorkflowJson {
    definition: WorkflowDefinition;
    meta: WorkflowMeta;
}
interface ExportOptions {
    definition: WorkflowDefinition;
    meta: WorkflowMeta;
    indent?: number;
}
declare function exportWorkflowJson({ definition, meta, indent, }: ExportOptions): string;

declare function importWorkflowJson(jsonString: string): WorkflowJson;

export { type WorkflowJson, exportWorkflowJson, importWorkflowJson };
