import { WorkflowMeta } from './types.cjs';
import { i as WorkflowDefinition } from './types-CGhrS6jV.cjs';

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
