#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { Symflow } from './symflow';
import { WorkflowDefinition } from './workflow-definition';

const program = new Command();

/**
 * Loads workflow data from a file or JSON string.
 */
export function loadWorkflowData(inputFile?: string, jsonString?: string): WorkflowDefinition<any> {
    if (jsonString) {
        try {
            return JSON.parse(jsonString) as WorkflowDefinition<any>;
        } catch (_error) {
            throw new Error('Invalid JSON string provided.');
        }
    }

    if (inputFile) {
        const fileContent = fs.readFileSync(inputFile, 'utf-8');
        if (inputFile.endsWith('.yaml') || inputFile.endsWith('.yml')) {
            return yaml.load(fileContent) as WorkflowDefinition<any>;
        }
        return JSON.parse(fileContent) as WorkflowDefinition<any>;
    }

    throw new Error('Either --input (file) or --json (JSON string) must be provided.');
}

/**
 * Validates a workflow definition.
 */
export function validateWorkflow(workflowDefinition: WorkflowDefinition<any>): string[] {
    const errors: string[] = [];
    const states = new Set(Object.keys(workflowDefinition.places));

    for (const [transition, { from, to }] of Object.entries(workflowDefinition.transitions)) {
        const fromStates = Array.isArray(from) ? from : [from];
        const toStates = Array.isArray(to) ? to : [to];

        fromStates.forEach((state) => {
            if (!states.has(state)) {
                errors.push(`Transition "${transition}" refers to undefined state "${state}".`);
            }
        });

        toStates.forEach((state) => {
            if (!states.has(state)) {
                errors.push(`Transition "${transition}" results in undefined state "${state}".`);
            }
        });
    }

    return errors;
}

// **Command: Validate Workflow**
program
    .command('validate')
    .description('Validate a workflow for correctness')
    .option('-i, --input <path>', 'Path to the workflow JSON/YAML file')
    .option('-j, --json <json>', 'Workflow definition as a JSON string')
    .action(async (options) => {
        try {
            if (!options.input && !options.json) {
                console.error('Either --input (file) or --json (JSON string) is required.');
            }

            // Load workflow
            const workflowDefinition = loadWorkflowData(options.input, options.json);
            const errors = validateWorkflow(workflowDefinition);

            if (errors.length > 0) {
                console.error('❌ Workflow validation failed:');
                errors.forEach((error) => console.error(`   - ${error}`));
                process.exit(1);
            } else {
                console.log('✅ Workflow is valid.');
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Error: ${error.message}`);
            } else {
                console.error('Error: An unknown error occurred.');
            }
            process.exit(1);
        }
    });

// **Command: Export Workflow**
program
    .command('export')
    .description('Export a workflow to Graphviz (DOT) or Mermaid')
    .option('-i, --input <path>', 'Path to the workflow JSON/YAML file')
    .option('-j, --json <json>', 'Workflow definition as a JSON string')
    .option('-o, --output <path>', 'Output file path (e.g., workflow.dot, workflow.md)')
    .option('-f, --format <format>', 'Export format: graphviz (dot) or mermaid (md)', 'dot')
    .action(async (options) => {
        if (!options.input && !options.json) {
            console.error('Error: Either --input (file) or --json (JSON string) is required.');
            process.exit(1);
        }
        if (options.input && options.json) {
            console.error('Error: --input and --json cannot be used together.');
            process.exit(1);
        }
        if (!options.output) {
            console.error('Error: --output is required.');
            process.exit(1);
        }

        try {
            // Load workflow from either file or JSON string
            const workflowDefinition = loadWorkflowData(options.input, options.json);
            const workflow = new Symflow(workflowDefinition, false);

            let outputContent = '';
            if (options.format === 'dot') {
                outputContent = workflow.toGraphviz();
            } else if (options.format === 'md') {
                outputContent = workflow.toMermaid();
            } else {
                console.error("Error: Invalid format. Use 'dot' for Graphviz or 'md' for Mermaid.");
                process.exit(1);
            }

            // Write Output to File
            fs.writeFileSync(options.output, outputContent);
            console.log(`✅ Workflow exported successfully to ${options.output}`);
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Error: ${error.message}`);
            } else {
                console.error('Error: An unknown error occurred.');
            }
            process.exit(1); // Only exit if not in test mode
        }
    });

// **🔹 Prevent Auto Execution in Jest**
if (require.main === module) {
    program.parse(process.argv);
}
