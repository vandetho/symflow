"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_DIR = exports.PROJECT_ROOT = void 0;
const path = require("path");
const fs = require("fs-extra");
exports.PROJECT_ROOT = process.cwd();
exports.WORKFLOW_DIR = process.env.NODE_ENV === 'test'
    ? path.join(exports.PROJECT_ROOT, 'tests/workflows')
    : path.join(exports.PROJECT_ROOT, 'config/workflows');
fs.ensureDirSync(exports.WORKFLOW_DIR);
//# sourceMappingURL=config.js.map