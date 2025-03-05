import { Workflow, WorkflowDefinition } from '../src';

describe('Workflow', () => {
    const definition: WorkflowDefinition = {
        initialState: 'draft',
        places: { draft: {}, pending: {} },
        transitions: {
            initiate: { from: ['draft'], to: 'pending' },
        },
    };

    test('should apply a valid transition', () => {
        const workflow = new Workflow(definition);
        let state = [workflow.initialState];
        state = workflow.apply(state, 'initiate');
        expect(state).toEqual(['pending']);
    });
});
