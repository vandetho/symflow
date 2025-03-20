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
exports.AuditTrail = void 0;
const fs = require("fs-extra");
const path = require("path");
const AUDIT_FOLDER = path.join(__dirname, '../audit-logs');
fs.ensureDirSync(AUDIT_FOLDER);
function toKebabCase(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}
function getAuditFileName(workflowName, entityId) {
    return `${toKebabCase(workflowName)}-${entityId}.json`;
}
class AuditTrail {
    static logEvent(workflowName, entry, auditEnabled) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!auditEnabled)
                return;
            const filePath = path.join(AUDIT_FOLDER, getAuditFileName(workflowName, entry.entityId));
            let auditLog = [];
            if (yield fs.pathExists(filePath)) {
                auditLog = yield fs.readJson(filePath);
            }
            auditLog.push(entry);
            yield fs.writeJson(filePath, auditLog, { spaces: 2 });
        });
    }
    static getAuditTrail(workflowName, entityId) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path.join(AUDIT_FOLDER, getAuditFileName(workflowName, entityId));
            if (!(yield fs.pathExists(filePath))) {
                return [];
            }
            return yield fs.readJson(filePath);
        });
    }
    static clearAuditTrail(workflowName, entityId) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = path.join(AUDIT_FOLDER, getAuditFileName(workflowName, entityId));
            if (yield fs.pathExists(filePath)) {
                yield fs.remove(filePath);
            }
        });
    }
}
exports.AuditTrail = AuditTrail;
//# sourceMappingURL=audit-trail.js.map