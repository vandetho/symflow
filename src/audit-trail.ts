import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Configuration for audit logging storage.
 */
const AUDIT_FOLDER = path.join(__dirname, '../audit-logs');
fs.ensureDirSync(AUDIT_FOLDER);

/**
 * Utility to convert strings to kebab-case filenames.
 */
function toKebabCase(str: string): string {
    return str.replace(/\s+/g, '-').toLowerCase();
}

/**
 * Utility to get the audit log filename using workflow name and entity ID.
 */
function getAuditFileName(workflowName: string, entityId: string | number): string {
    return `${toKebabCase(workflowName)}-${entityId}.json`;
}

/**
 * Audit trail entry interface.
 */
export interface AuditTrailEntry {
    entityId: string | number;
    eventType: string;
    transition: string;
    fromState?: string | string[];
    toState?: string | string[];
    timestamp: string;
}

/**
 * Audit trail service for logging workflow transitions persistently.
 */
export class AuditTrail {
    /**
     * Logs an event to the audit trail if auditing is enabled for this workflow.
     */
    static async logEvent(workflowName: string, entry: AuditTrailEntry, auditEnabled: boolean): Promise<void> {
        if (!auditEnabled) return; // 🔹 Skip logging if disabled

        const filePath = path.join(AUDIT_FOLDER, getAuditFileName(workflowName, entry.entityId));
        let auditLog: AuditTrailEntry[] = [];

        if (await fs.pathExists(filePath)) {
            auditLog = await fs.readJson(filePath);
        }

        auditLog.push(entry);
        await fs.writeJson(filePath, auditLog, { spaces: 2 });
    }

    /**
     * Retrieves the audit trail for a specific entity.
     */
    static async getAuditTrail(workflowName: string, entityId: string | number): Promise<AuditTrailEntry[]> {
        const filePath = path.join(AUDIT_FOLDER, getAuditFileName(workflowName, entityId));

        if (!(await fs.pathExists(filePath))) {
            return [];
        }

        return await fs.readJson(filePath);
    }

    /**
     * Clears the audit trail for a specific entity.
     */
    static async clearAuditTrail(workflowName: string, entityId: string | number): Promise<void> {
        const filePath = path.join(AUDIT_FOLDER, getAuditFileName(workflowName, entityId));

        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
        }
    }
}
