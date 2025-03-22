import { StateMachine, WorkflowDefinition } from '../src';

type Order = { id: number; state: string };

describe('State Machine Tests', () => {
    const stateMachineDefinition: WorkflowDefinition<Order> = {
        name: 'Order Processing',
        type: 'state_machine',
        metadata: { description: 'State Machine Test', version: '1.0' },
        stateField: 'state',
        initialState: 'draft',
        places: {
            draft: { metadata: { label: 'Draft Order' } },
            pending: { metadata: { label: 'Pending Approval' } },
            confirmed: { metadata: { label: 'Confirmed Order' } },
        },
        transitions: {
            initiate: { from: 'draft', to: 'pending' },
            confirm: { from: 'pending', to: 'confirmed' },
        },
    };

    let stateMachine: StateMachine<Order>;
    let orderEntity: Order;

    beforeEach(() => {
        orderEntity = { id: 1, state: 'draft' };
        stateMachine = new StateMachine(stateMachineDefinition);
    });

    test('should start with initial state', () => {
        expect(orderEntity.state).toBe('draft');
    });

    it('should instantiate correctly', () => {
        const def: WorkflowDefinition<{ id: number; state: string }> = {
            name: 'sm',
            stateField: 'state',
            initialState: 'init',
            auditTrail: false,
            places: { init: {}, done: {} },
            transitions: { go: { from: 'init', to: 'done' } },
        };

        const sm = new StateMachine(def);
        expect(sm).toBeInstanceOf(StateMachine);
    });

    test('should retrieves all metadata', () => {
        expect(stateMachine.getMetadata()).toEqual({
            description: 'State Machine Test',
            version: '1.0',
        });
    });

    test('should retrieves getAvailableTransition', () => {
        expect(stateMachine.getAvailableTransition('draft')).toEqual(['initiate']);
    });

    test('should transition from draft to pending', async () => {
        expect(await stateMachine.canTransition(orderEntity, 'initiate')).toBe(true);
        await stateMachine.apply(orderEntity, 'initiate');
        expect(orderEntity.state).toBe('pending');
    });

    test('should transition from pending to confirmed', async () => {
        await stateMachine.apply(orderEntity, 'initiate');
        expect(await stateMachine.canTransition(orderEntity, 'confirm')).toBe(true);
        await stateMachine.apply(orderEntity, 'confirm');
        expect(orderEntity.state).toBe('confirmed');
    });

    test('should NOT allow invalid transitions and throw an error', async () => {
        expect(await stateMachine.canTransition(orderEntity, 'confirm')).toBe(false);
        try {
            await stateMachine.apply(orderEntity, 'confirm');
        } catch (error) {
            expect((error as Error).message).toMatch('Transition "confirm" is not allowed from state "draft".');
        }
    });

    test('should NOT allow transition from confirmed back to draft', async () => {
        await stateMachine.apply(orderEntity, 'initiate');
        await stateMachine.apply(orderEntity, 'confirm');
        expect(await stateMachine.canTransition(orderEntity, 'initiate')).toBe(false);
        try {
            await stateMachine.apply(orderEntity, 'confirm');
        } catch (error) {
            expect((error as Error).message).toMatch('Transition "confirm" is not allowed from state "confirmed".');
        }
    });
});
