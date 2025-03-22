import { Symflow, WorkflowDefinition, WorkflowEventType } from '../src';

describe('Symflow - Manual and Automatic Workflow Loading', () => {
    let manualWorkflow: Symflow<{ id: number; state: string[] }>;
    let automaticWorkflow: Symflow<{ id: number; state: string[] }>;
    let orderEntity: { id: number; state: string[] };

    const manualWorkflowDefinition: WorkflowDefinition<{ id: number; state: string[] }> = {
        name: 'manual-order',
        type: 'workflow',
        auditTrail: false, // 🔹 Enable audit trail
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

    beforeEach(() => {
        orderEntity = { id: 1, state: ['draft'] };
        manualWorkflow = new Symflow(manualWorkflowDefinition);
        automaticWorkflow = new Symflow('order'); // Loads from `config/workflows/order.json` or `.yaml`
    });

    test('should correctly initialize manual workflow', () => {
        expect(manualWorkflow['workflowName']).toBe('manual-order');
    });

    test('should correctly initialize automatic workflow', () => {
        expect(automaticWorkflow['workflowName']).toBe('order');
    });

    test('should allow transitioning in manually loaded workflow', async () => {
        await manualWorkflow['triggerEvent'](
            WorkflowEventType.TRANSITION,
            orderEntity,
            'initiate',
            ['draft'],
            ['pending'],
        );
        expect(orderEntity.state).toEqual(['draft']); // No actual state change here, just checking event firing
    });

    test('should allow transitioning in automatically loaded workflow', async () => {
        await automaticWorkflow['triggerEvent'](
            WorkflowEventType.TRANSITION,
            orderEntity,
            'initiate',
            ['draft'],
            ['pending'],
        );
        expect(orderEntity.state).toEqual(['draft']);
    });

    test('should block transition if guard returns true', async () => {
        const workflow = new Symflow({
            name: 'order',
            type: 'workflow',
            stateField: 'state',
            initialState: ['draft'],
            places: { draft: {}, pending: {} },
            transitions: { initiate: { from: ['draft'], to: ['pending'] } },
        });

        workflow.on(WorkflowEventType.GUARD, (event) => {
            if (event.transition === 'initiate') {
                return false; // Block transition
            }
        });

        const order = { id: 1, state: ['draft'] };
        try {
            await workflow.apply(order, 'initiate');
        } catch (error) {
            expect((error as Error).message).toMatch('❌ Transition "initiate" blocked by Guard event.');
        }
    });

    test('should pass metadata in event payload', async () => {
        const workflow = new Symflow({
            name: 'order',
            type: 'workflow',
            stateField: 'state',
            initialState: ['draft'],
            places: { draft: {}, pending: {} },
            transitions: {
                initiate: {
                    from: ['draft'],
                    to: ['pending'],
                    metadata: { requiredRole: 'admin' }, // ✅ Add metadata
                },
            },
        });

        let receivedMetadata = null;

        workflow.on(WorkflowEventType.COMPLETED, (event) => {
            receivedMetadata = event.metadata; // ✅ Capture metadata
        });

        const order = { id: 1, state: ['draft'] };

        await workflow.apply(order, 'initiate');

        // ✅ Ensure metadata was passed correctly
        expect(receivedMetadata).toEqual({ requiredRole: 'admin' });
    });

    test('should trigger event handlers from workflow definition', async () => {
        let guardTriggered = false;
        let completedMessage = '';

        const workflow = new Symflow({
            name: 'test_workflow',
            stateField: 'state',
            initialState: ['draft'],
            places: { draft: {}, pending: {} },
            transitions: { initiate: { from: ['draft'], to: ['pending'] } },
            events: {
                [WorkflowEventType.GUARD]: [
                    () => {
                        guardTriggered = true;
                        return true;
                    },
                ],
                [WorkflowEventType.COMPLETED]: [
                    (event) => {
                        completedMessage = `Transitioned to ${event.toState}`;
                    },
                ],
            },
        });

        const entity = { id: 1, state: ['draft'] };

        await workflow.apply(entity, 'initiate');

        expect(guardTriggered).toBe(true);
        expect(completedMessage).toBe('Transitioned to pending');
    });

    it('should trigger guard and prevent transition', async () => {
        const wf = new Symflow(manualWorkflowDefinition);
        wf.on(WorkflowEventType.GUARD, () => false);

        await expect(wf.apply({ id: 1, state: ['draft'] }, 'approve')).rejects.toThrow();
    });

    it('should prevent transition if canTransition fails even after guard', async () => {
        const wf = new Symflow(manualWorkflowDefinition);
        const entity = { id: 1, state: ['draft'] };

        wf.on(WorkflowEventType.GUARD, () => true); // guard passes

        // Remove the transition so canTransition will fail
        (wf as any).transitions = {}; // forcefully clear

        await expect(wf.apply(entity, 'approve')).rejects.toThrow(/not allowed/);
    });

    it('should render to graphviz and mermaid', () => {
        const wf = new Symflow(manualWorkflowDefinition);
        expect(wf.toGraphviz()).toMatch(/digraph/);
        expect(wf.toMermaid()).toMatch(/graph TD/);
    });
});
