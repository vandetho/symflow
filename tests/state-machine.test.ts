import { StateMachine, WorkflowDefinition } from '../src';
import { OrderEntity } from './types';

describe('StateMachine', () => {
    const definition: WorkflowDefinition<OrderEntity> = {
        initialState: 'draft',
        stateField: 'state',
        places: { draft: {}, pending: {} },
        transitions: {
            initiate: { from: ['draft'], to: 'pending' },
        },
    };

    const newOrder: OrderEntity = { id: 1, state: 'draft', states: [] };

    test('should apply a valid transition', () => {
        const stateMachine = new StateMachine(definition);
        stateMachine.apply(newOrder, 'initiate');
        expect(newOrder.state).toBe('pending');
    });
});
