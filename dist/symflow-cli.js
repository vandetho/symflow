#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadWorkflowData = loadWorkflowData;
exports.validateWorkflow = validateWorkflow;
const commander_1 = require("commander");
const fs = require("fs-extra");
const yaml = require("js-yaml");
const symflow_1 = require("./symflow");
const program = new commander_1.Command();
function loadWorkflowData(inputFile, jsonString) {
    if (jsonString) {
        try {
            return JSON.parse(jsonString);
        }
        catch (_error) {
            throw new Error('Invalid JSON string provided.');
        }
    }
    if (inputFile) {
        const fileContent = fs.readFileSync(inputFile, 'utf-8');
        if (inputFile.endsWith('.yaml') || inputFile.endsWith('.yml')) {
            return yaml.load(fileContent);
        }
        return JSON.parse(fileContent);
    }
    throw new Error('Either --input (file) or --json (JSON string) must be provided.');
}
function validateWorkflow(workflowDefinition) {
    const errors = [];
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
program
    .command('validate')
    .description('Validate a workflow for correctness')
    .option('-i, --input <path>', 'Path to the workflow JSON/YAML file')
    .option('-j, --json <json>', 'Workflow definition as a JSON string')
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!options.input && !options.json) {
            console.error('Either --input (file) or --json (JSON string) is required.');
        }
        const workflowDefinition = loadWorkflowData(options.input, options.json);
        const errors = validateWorkflow(workflowDefinition);
        if (errors.length > 0) {
            console.error('❌ Workflow validation failed:');
            errors.forEach((error) => console.error(`   - ${error}`));
            process.exit(1);
        }
        else {
            console.log('✅ Workflow is valid.');
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        }
        else {
            console.error('Error: An unknown error occurred.');
        }
        process.exit(1);
    }
}));
program
    .command('export')
    .description('Export a workflow to Graphviz (DOT) or Mermaid')
    .option('-i, --input <path>', 'Path to the workflow JSON/YAML file')
    .option('-j, --json <json>', 'Workflow definition as a JSON string')
    .option('-o, --output <path>', 'Output file path (e.g., workflow.dot, workflow.md)')
    .option('-f, --format <format>', 'Export format: graphviz (dot) or mermaid (md)', 'dot')
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
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
        const workflowDefinition = loadWorkflowData(options.input, options.json);
        const workflow = new symflow_1.Symflow(workflowDefinition);
        let outputContent = '';
        if (options.format === 'dot') {
            outputContent = workflow.toGraphviz();
        }
        else if (options.format === 'md') {
            outputContent = workflow.toMermaid();
        }
        else {
            console.error("Error: Invalid format. Use 'dot' for Graphviz or 'md' for Mermaid.");
            process.exit(1);
        }
        fs.writeFileSync(options.output, outputContent);
        console.log(`✅ Workflow exported successfully to ${options.output}`);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        }
        else {
            console.error('Error: An unknown error occurred.');
        }
        process.exit(1);
    }
}));
if (require.main === module) {
    program.parse(process.argv);
}
//# sourceMappingURL=symflow-cli.js.map