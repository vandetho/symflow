export interface AuditTrailEntry {
    entityId: string | number;
    eventType: string;
    transition: string;
    fromState?: string | string[];
    toState?: string | string[];
    metadata?: Record<string, any>;
    timestamp: string;
}
export declare class AuditTrail {
    static logEvent(workflowName: string, entry: AuditTrailEntry, auditEnabled: boolean): Promise<void>;
    static getAuditTrail(workflowName: string, entityId: string | number): Promise<AuditTrailEntry[]>;
    static clearAuditTrail(workflowName: string, entityId: string | number): Promise<void>;
}
