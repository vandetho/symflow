import { WorkflowDefinition } from './workflow-definition';
export declare function loadWorkflowDefinition<T extends Record<string, any>>(workflowName: string): WorkflowDefinition<T>;
export declare function saveWorkflow<T extends Record<string, any>>(name: string, definition: WorkflowDefinition<T>): void;
