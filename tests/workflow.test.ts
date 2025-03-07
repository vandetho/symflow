import { Workflow, WorkflowDefinition } from '../src';

type Order = { id: number; state: string[] };

describe('Workflow Tests', () => {
    const workflowDefinition: WorkflowDefinition<Order> = {
        name: 'Order Processing',
        type: 'workflow',
        metadata: { description: 'Workflow Test', version: '1.0' },
        stateField: 'state',
        initialState: ['draft'],
        places: {
            draft: { metadata: { label: 'Draft Order' } },
            review: { metadata: { label: 'Under Review' } },
            pending: { metadata: { label: 'Pending Approval' } },
            confirmed: { metadata: { label: 'Confirmed Order' } },
        },
        transitions: {
            initiate: { from: ['draft'], to: 'pending' },
            confirm: { from: ['pending'], to: 'confirmed' },
        },
    };

    let workflow: Workflow<Order>;
    let orderEntity: Order;

    beforeEach(() => {
        orderEntity = { id: 2, state: ['draft'] };
        workflow = new Workflow(workflowDefinition);
    });

    test('should transition from draft to pending', async () => {
        expect(workflow.canTransition(orderEntity, 'initiate')).toBe(true);
        await workflow.apply(orderEntity, 'initiate');
        expect(orderEntity.state).toContain('pending');
        expect(orderEntity.state).not.toContain('draft');
    });

    test('should transition from pending to confirmed', async () => {
        await workflow.apply(orderEntity, 'initiate');
        expect(workflow.canTransition(orderEntity, 'confirm')).toBe(true);
        await workflow.apply(orderEntity, 'confirm');
        expect(orderEntity.state).toContain('confirmed');
        expect(orderEntity.state).not.toContain('pending');
    });

    test('should NOT allow invalid transitions and throw an error', async () => {
        expect(workflow.canTransition(orderEntity, 'confirm')).toBe(false);
        try {
            await workflow.apply(orderEntity, 'confirm');
        } catch (error) {
            expect((error as Error).message).toMatch('Transition "confirm" is not allowed from state "draft".');
        }
    });

    test('should correctly get available transitions', async () => {
        expect(workflow.getAvailableTransitions(orderEntity)).toContain('initiate');
        await workflow.apply(orderEntity, 'initiate');
        expect(workflow.getAvailableTransitions(orderEntity)).toContain('confirm');
    });
});

describe('AND & OR Transition Tests', () => {
    const logicalWorkflowDefinition: WorkflowDefinition<Order> = {
        name: 'Logical Workflow',
        type: 'workflow',
        metadata: { description: 'Logical Workflow Test', version: '1.0' },
        stateField: 'state',
        initialState: ['draft'],
        places: {
            draft: { metadata: { label: 'Draft Order' } },
            review: { metadata: { label: 'Under Review' } },
            pending: { metadata: { label: 'Pending Approval' } },
            confirmed: { metadata: { label: 'Confirmed Order' } },
        },
        transitions: {
            approve: { from: ['draft', 'review'], to: 'pending' }, // **AND Logic**
            verify: { from: ['draft'], to: 'pending' }, // **OR Logic**
            confirm: { from: 'pending', to: 'confirmed' },
        },
    };

    let logicalWorkflow: Workflow<Order>;
    let orderEntity: Order;

    beforeEach(() => {
        orderEntity = { id: 3, state: ['draft'] };
        logicalWorkflow = new Workflow(logicalWorkflowDefinition);
    });

    test('should NOT transition with AND logic if missing required states', async () => {
        expect(logicalWorkflow.canTransition(orderEntity, 'approve')).toBe(false);
        try {
            await logicalWorkflow.apply(orderEntity, 'approve');
        } catch (error) {
            expect((error as Error).message).toMatch('Transition "approve" is not allowed from state "draft".');
        }
    });

    test('should transition with AND logic if all required states are present', async () => {
        orderEntity.state = ['draft', 'review'];
        expect(logicalWorkflow.canTransition(orderEntity, 'approve')).toBe(true);
        await logicalWorkflow.apply(orderEntity, 'approve');
        expect(orderEntity.state).toContain('pending');
    });

    test('should transition with OR logic if at least one required state is present', async () => {
        expect(logicalWorkflow.canTransition(orderEntity, 'verify')).toBe(true);
        await logicalWorkflow.apply(orderEntity, 'verify');
        expect(orderEntity.state).toContain('pending');
    });

    test('should NOT allow transitioning from invalid states', async () => {
        expect(logicalWorkflow.canTransition(orderEntity, 'confirm')).toBe(false);
        try {
            await logicalWorkflow.apply(orderEntity, 'confirm');
        } catch (error) {
            expect((error as Error).message).toMatch('Transition "confirm" is not allowed from state "draft".');
        }
    });
});
