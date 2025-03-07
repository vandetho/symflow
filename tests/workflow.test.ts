import { Workflow, WorkflowDefinition } from '../src';

type Order = { id: number; state: string[] };

describe('Workflow Tests', () => {
    const workflowDefinition: WorkflowDefinition<Order> = {
        name: 'Order Processing',
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

    test('should transition from draft to pending', () => {
        expect(workflow.canTransition(orderEntity, 'initiate')).toBe(true);
        workflow.apply(orderEntity, 'initiate');
        expect(orderEntity.state).toContain('pending');
        expect(orderEntity.state).not.toContain('draft');
    });

    test('should transition from pending to confirmed', () => {
        workflow.apply(orderEntity, 'initiate');
        expect(workflow.canTransition(orderEntity, 'confirm')).toBe(true);
        workflow.apply(orderEntity, 'confirm');
        expect(orderEntity.state).toContain('confirmed');
        expect(orderEntity.state).not.toContain('pending');
    });

    test('should NOT allow invalid transitions and throw an error', () => {
        expect(workflow.canTransition(orderEntity, 'confirm')).toBe(false);
        expect(() => workflow.apply(orderEntity, 'confirm')).toThrow(
            'Transition "confirm" is not allowed from state "draft".',
        );
    });

    test('should correctly get available transitions', () => {
        expect(workflow.getAvailableTransitions(orderEntity)).toContain('initiate');
        workflow.apply(orderEntity, 'initiate');
        expect(workflow.getAvailableTransitions(orderEntity)).toContain('confirm');
    });
});

describe('AND & OR Transition Tests', () => {
    const logicalWorkflowDefinition: WorkflowDefinition<Order> = {
        name: 'Logical Workflow',
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

    test('should NOT transition with AND logic if missing required states', () => {
        expect(logicalWorkflow.canTransition(orderEntity, 'approve')).toBe(false);
        expect(() => logicalWorkflow.apply(orderEntity, 'approve')).toThrow(
            'Transition "approve" is not allowed from state "draft".',
        );
    });

    test('should transition with AND logic if all required states are present', () => {
        orderEntity.state = ['draft', 'review'];
        expect(logicalWorkflow.canTransition(orderEntity, 'approve')).toBe(true);
        logicalWorkflow.apply(orderEntity, 'approve');
        expect(orderEntity.state).toContain('pending');
    });

    test('should transition with OR logic if at least one required state is present', () => {
        expect(logicalWorkflow.canTransition(orderEntity, 'verify')).toBe(true);
        logicalWorkflow.apply(orderEntity, 'verify');
        expect(orderEntity.state).toContain('pending');
    });

    test('should NOT allow transitioning from invalid states', () => {
        expect(logicalWorkflow.canTransition(orderEntity, 'confirm')).toBe(false);
        expect(() => logicalWorkflow.apply(orderEntity, 'confirm')).toThrow(
            'Transition "confirm" is not allowed from state "draft".',
        );
    });
});
