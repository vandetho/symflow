import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { WorkflowDefinition } from './workflow-definition';

/**
 * Supported workflow definition file types.
 */
const WORKFLOW_EXTENSIONS = ['.ts', '.json', '.yaml', '.yml'];

/**
 * Loads a workflow definition from the `config/workflows` folder.
 */
export function loadWorkflowDefinition<T extends Record<string, any>>(workflowName: string): WorkflowDefinition<T> {
    const workflowFolder = path.join(__dirname, '../config/workflows');

    for (const ext of WORKFLOW_EXTENSIONS) {
        const filePath = path.join(workflowFolder, `${workflowName}${ext}`);

        if (fs.existsSync(filePath)) {
            console.log(`✅ Loading workflow definition: ${filePath}`);
            return parseWorkflowDefinition<T>(filePath);
        }
    }

    throw new Error(`❌ No workflow definition found for '${workflowName}' in ${workflowFolder}`);
}

/**
 * Parses a workflow definition file based on its extension.
 */
function parseWorkflowDefinition<T extends Record<string, any>>(filePath: string): WorkflowDefinition<T> {
    const ext = path.extname(filePath).toLowerCase();
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    if (ext === '.json') {
        return JSON.parse(fileContent) as WorkflowDefinition<T>;
    }
    if (ext === '.yaml' || ext === '.yml') {
        return yaml.load(fileContent) as WorkflowDefinition<T>;
    }
    if (ext === '.ts') {
        return require(filePath).default as WorkflowDefinition<T>; // Import TypeScript module
    }

    throw new Error(`Unsupported workflow definition format: ${ext}`);
}
