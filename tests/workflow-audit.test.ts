import * as fs from 'fs-extra';
import * as path from 'path';
import { AuditTrail, Symflow, WorkflowDefinition } from '../src';

const AUDIT_FOLDER = path.join(__dirname, '../audit-logs');

describe('Workflow Audit Trail with Unique Names', () => {
    let workflow: Symflow<{ id: number; state: string[] }>;
    let orderEntity: { id: number; state: string[] };

    const workflowDefinition: WorkflowDefinition<{ id: number; state: string[] }> = {
        name: 'Order Processing', // 🔹 Workflow name
        auditTrail: true, // 🔹 Enable audit trail
        metadata: { description: 'Order workflow', version: '1.0' },
        stateField: 'state',
        initialState: ['draft'],
        places: {
            draft: {},
            pending: {},
            confirmed: {},
        },
        transitions: {
            initiate: { from: ['draft'], to: ['pending'] },
            confirm: { from: ['pending'], to: ['confirmed'] },
        },
    };

    beforeEach(async () => {
        orderEntity = { id: 1, state: ['draft'] };
        workflow = new Symflow(workflowDefinition);
        await AuditTrail.clearAuditTrail(workflowDefinition.name, orderEntity.id);
    });

    afterAll(async () => {
        await fs.remove(AUDIT_FOLDER); // Clean up after tests
    });

    test('should persist events with workflow name in the audit trail', async () => {
        workflow.apply(orderEntity, 'initiate');

        const history = await AuditTrail.getAuditTrail(workflowDefinition.name, orderEntity.id);
        expect(history.length).toBe(7);

        // Ensure the audit log file is named correctly
        const expectedFilePath = path.join(AUDIT_FOLDER, 'order-processing-1.json');
        expect(await fs.pathExists(expectedFilePath)).toBe(true);
    });

    test('should clear the audit trail when enabled', async () => {
        workflow.apply(orderEntity, 'initiate');
        await AuditTrail.clearAuditTrail(workflowDefinition.name, orderEntity.id);

        const history = await AuditTrail.getAuditTrail(workflowDefinition.name, orderEntity.id);
        expect(history.length).toBe(0);
    });
});
