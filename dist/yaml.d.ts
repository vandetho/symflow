import { WorkflowMeta } from './types.js';
import { i as WorkflowDefinition } from './types-CGhrS6jV.js';

interface ExportOptions {
    definition: WorkflowDefinition;
    meta: WorkflowMeta;
}
declare function exportWorkflowYaml({ definition, meta }: ExportOptions): string;

interface ImportResult {
    definition: WorkflowDefinition;
    meta: WorkflowMeta;
}
declare function importWorkflowYaml(yamlString: string): ImportResult;

export { type ImportResult, exportWorkflowYaml, importWorkflowYaml };
