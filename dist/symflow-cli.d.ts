#!/usr/bin/env node
import { WorkflowDefinition } from './workflow-definition';
export declare function loadWorkflowData(inputFile?: string, jsonString?: string): WorkflowDefinition<any>;
export declare function validateWorkflow(workflowDefinition: WorkflowDefinition<any>): string[];
