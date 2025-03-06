import { Workflow, WorkflowDefinition } from '../src';
import { OrderEntity } from './types';

describe('Workflow', () => {
    const definition: WorkflowDefinition<OrderEntity> = {
        initialState: 'draft',
        places: { draft: {}, pending: {}, payment: {} },
        stateField: 'states',
        transitions: {
            initiate: { from: ['draft'], to: ['pending', 'payment'] },
        },
    };
    const order: OrderEntity = { id: 1, state: '', states: [] };

    test('should apply a valid transition', () => {
        const workflow = new Workflow(definition);
        workflow.apply(order, 'initiate');
        expect(order.state).toEqual(['pending', 'payment']);
    });

    test('should not apply a valid transition', () => {
        const workflow = new Workflow(definition);
        order.states = ['pending'];
        expect(() => workflow.apply(order, 'initiate')).toThrow();
    });
});
