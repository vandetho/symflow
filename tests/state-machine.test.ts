import { StateMachine, WorkflowDefinition } from '../src';

describe('StateMachine', () => {
    const definition: WorkflowDefinition = {
        initialState: 'draft',
        places: { draft: {}, pending: {} },
        transitions: {
            initiate: { from: ['draft'], to: 'pending' },
        },
    };

    test('should apply a valid transition', () => {
        const stateMachine = new StateMachine(definition);
        stateMachine.apply('initiate');
        expect(stateMachine.getCurrentState()).toBe('pending');
    });
});
