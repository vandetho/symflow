"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const fs = require("fs-extra");
const path = require("path");
const yaml = require("js-yaml");
const CONFIG_EXTENSIONS = ['.ts', '.json', '.yaml', '.yml'];
const DEFAULT_CONFIG = {
    auditTrail: { enabled: false },
    auditFolder: './audit-logs',
    logLevel: 'info',
};
function loadConfig(configName) {
    const configFolder = path.join(__dirname, '../config');
    for (const ext of CONFIG_EXTENSIONS) {
        const filePath = path.join(configFolder, `${configName}${ext}`);
        if (fs.existsSync(filePath)) {
            console.log(`✅ Loading config: ${filePath}`);
            return parseConfig(filePath);
        }
    }
    console.warn(`⚠️ No config found for '${configName}', using default settings.`);
    return DEFAULT_CONFIG;
}
function parseConfig(filePath) {
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
    throw new Error(`Unsupported config format: ${ext}`);
}
//# sourceMappingURL=config-loader.js.map