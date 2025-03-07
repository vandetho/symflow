import { Symflow, WorkflowDefinition, WorkflowEventType } from '../src';

type Order = { id: number; state: string[] };

describe('Workflow Event Tests (Non-State Machine)', () => {
    let workflow: Symflow<Order>;
    let orderEntity: Order;

    const workflowDefinition: WorkflowDefinition<Order> = {
        name: 'Order Processing',
        type: 'workflow',
        metadata: { description: 'Workflow Test', version: '1.0' },
        stateField: 'state',
        initialState: ['draft'], // ✅ Always an array
        places: {
            draft: {},
            pending: {},
            confirmed: {},
        },
        transitions: {
            initiate: { from: ['draft'], to: ['pending'] }, // ✅ Arrays
            confirm: { from: ['pending'], to: ['confirmed'] },
        },
    };

    let eventLog: string[] = [];

    beforeEach(() => {
        orderEntity = { id: 1, state: ['draft'] }; // ✅ Always use an array
        workflow = new Symflow(workflowDefinition);
        eventLog = [];

        // Register event listeners
        Object.values(WorkflowEventType).forEach((eventType) => {
            workflow.on(eventType, ({ transition, fromState, toState }) => {
                eventLog.push(
                    `${eventType} - Transition: ${transition}, From: ${JSON.stringify(fromState)}, To: ${JSON.stringify(toState)}`,
                );
            });
        });
    });

    test('should trigger correct events when applying a transition', async () => {
        await workflow.apply(orderEntity, 'initiate');

        expect(orderEntity.state).toEqual(['pending']);

        expect(eventLog).toEqual([
            'ANNOUNCE - Transition: initiate, From: ["draft"], To: ["pending"]',
            'GUARD - Transition: initiate, From: ["draft"], To: ["pending"]',
            'LEAVE - Transition: initiate, From: ["draft"], To: ["pending"]',
            'ENTER - Transition: initiate, From: ["draft"], To: ["pending"]',
            'TRANSITION - Transition: initiate, From: ["draft"], To: ["pending"]',
            'COMPLETED - Transition: initiate, From: ["draft"], To: ["pending"]',
            'ENTERED - Transition: initiate, From: ["draft"], To: ["pending"]',
        ]);
    });

    test('should trigger correct events for multiple transitions', async () => {
        await workflow.apply(orderEntity, 'initiate');
        await workflow.apply(orderEntity, 'confirm');

        expect(orderEntity.state).toEqual(['confirmed']);
        expect(eventLog).toEqual([
            'ANNOUNCE - Transition: initiate, From: ["draft"], To: ["pending"]',
            'GUARD - Transition: initiate, From: ["draft"], To: ["pending"]',
            'LEAVE - Transition: initiate, From: ["draft"], To: ["pending"]',
            'ENTER - Transition: initiate, From: ["draft"], To: ["pending"]',
            'TRANSITION - Transition: initiate, From: ["draft"], To: ["pending"]',
            'COMPLETED - Transition: initiate, From: ["draft"], To: ["pending"]',
            'ENTERED - Transition: initiate, From: ["draft"], To: ["pending"]',

            'ANNOUNCE - Transition: confirm, From: ["pending"], To: ["confirmed"]',
            'GUARD - Transition: confirm, From: ["pending"], To: ["confirmed"]',
            'LEAVE - Transition: confirm, From: ["pending"], To: ["confirmed"]',
            'ENTER - Transition: confirm, From: ["pending"], To: ["confirmed"]',
            'TRANSITION - Transition: confirm, From: ["pending"], To: ["confirmed"]',
            'COMPLETED - Transition: confirm, From: ["pending"], To: ["confirmed"]',
            'ENTERED - Transition: confirm, From: ["pending"], To: ["confirmed"]',
        ]);
    });

    test('should not allow invalid transition and trigger no events', async () => {
        try {
            await workflow.apply(orderEntity, 'confirm');
        } catch (error) {
            expect((error as Error).message).toMatch('Transition "confirm" is not allowed from state "draft".');
        }
        expect(eventLog).toEqual([]); // No events should be triggered
    });
});
