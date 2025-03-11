import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Get the root directory of the user's project
 * (i.e., where `package.json` exists, not inside `node_modules/symflow`).
 */
export const PROJECT_ROOT = process.cwd();

/**
 * Determine workflow storage location.
 * - Production: `<project-root>/config/workflows/`
 * - Testing: `<project-root>/tests/workflows/`
 */
export const WORKFLOW_DIR =
    process.env.NODE_ENV === 'test'
        ? path.join(PROJECT_ROOT, 'tests/workflows')
        : path.join(PROJECT_ROOT, 'config/workflows');

// Ensure the workflow directory exists
fs.ensureDirSync(WORKFLOW_DIR);
