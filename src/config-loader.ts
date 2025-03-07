import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Supported config file types
 */
const CONFIG_EXTENSIONS = ['.ts', '.json', '.yaml', '.yml'];

/**
 * Default configuration (used if no config file is found)
 */
const DEFAULT_CONFIG = {
    auditTrail: { enabled: false },
    auditFolder: './audit-logs',
    logLevel: 'info',
};

/**
 * Loads configuration from the `config` folder, supporting TS, JSON, and YAML.
 */
export function loadConfig(configName: string): any {
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

/**
 * Parses the config file based on its extension.
 */
function parseConfig(filePath: string): any {
    const ext = path.extname(filePath).toLowerCase();
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    if (ext === '.json') {
        return JSON.parse(fileContent);
    }
    if (ext === '.yaml' || ext === '.yml') {
        return yaml.load(fileContent);
    }
    if (ext === '.ts') {
        return require(filePath).default; // Import the TS module
    }

    throw new Error(`Unsupported config format: ${ext}`);
}
