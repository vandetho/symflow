"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadWorkflowDefinition = loadWorkflowDefinition;
exports.saveWorkflow = saveWorkflow;
const fs = require("fs-extra");
const path = require("path");
const yaml = require("js-yaml");
const config_1 = require("./config");
const WORKFLOW_EXTENSIONS = ['.ts', '.json', '.yaml', '.yml'];
function loadWorkflowDefinition(workflowName) {
    const workflowFolder = path.join(config_1.WORKFLOW_DIR);
    for (const ext of WORKFLOW_EXTENSIONS) {
        const filePath = path.join(workflowFolder, `${workflowName}${ext}`);
        if (fs.existsSync(filePath)) {
            console.log(`✅ Loading workflow definition: ${filePath}`);
            return parseWorkflowDefinition(filePath);
        }
    }
    throw new Error(`❌ No workflow definition found for '${workflowName}' in ${workflowFolder}`);
}
function parseWorkflowDefinition(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    if (ext === '.json') {
        return JSON.parse(fileContent);
    }
    if (ext === '.yaml' || ext === '.yml') {
        return yaml.load(fileContent);
    }
    if (ext === '.ts') {
        return require(filePath).default;
    }
    throw new Error(`Unsupported workflow definition format: ${ext}`);
}
function saveWorkflow(name, definition) {
    const filePath = path.join(config_1.WORKFLOW_DIR, `${name}.json`);
    fs.ensureDirSync(config_1.WORKFLOW_DIR);
    fs.writeJsonSync(filePath, definition, { spaces: 2 });
}
//# sourceMappingURL=workflow-loader.js.map