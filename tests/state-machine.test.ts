import { StateMachine, WorkflowDefinition } from '../src';

type Order = { id: number; state: string };

describe('State Machine Tests', () => {
    const stateMachineDefinition: WorkflowDefinition<Order> = {
        name: 'Order Processing',
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

    test('should transition from draft to pending', () => {
        expect(stateMachine.canTransition(orderEntity, 'initiate')).toBe(true);
        stateMachine.apply(orderEntity, 'initiate');
        expect(orderEntity.state).toBe('pending');
    });

    test('should transition from pending to confirmed', () => {
        stateMachine.apply(orderEntity, 'initiate');
        expect(stateMachine.canTransition(orderEntity, 'confirm')).toBe(true);
        stateMachine.apply(orderEntity, 'confirm');
        expect(orderEntity.state).toBe('confirmed');
    });

    test('should NOT allow invalid transitions and throw an error', async () => {
        expect(stateMachine.canTransition(orderEntity, 'confirm')).toBe(false);
        try {
            await stateMachine.apply(orderEntity, 'confirm');
        } catch (error) {
            expect((error as Error).message).toMatch('Transition "confirm" is not allowed from state "draft".');
        }
    });

    test('should NOT allow transition from confirmed back to draft', async () => {
        await stateMachine.apply(orderEntity, 'initiate');
        await stateMachine.apply(orderEntity, 'confirm');
        expect(stateMachine.canTransition(orderEntity, 'initiate')).toBe(false);
        try {
            await stateMachine.apply(orderEntity, 'confirm');
        } catch (error) {
            expect((error as Error).message).toMatch('Transition "confirm" is not allowed from state "confirmed".');
        }
    });
});
