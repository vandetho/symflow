import { validateWorkflow } from '../src/symflow-cli';
import { WorkflowDefinition } from '../src';

describe('Workflow Validation Tests', () => {
    test('should pass validation for a correct workflow', () => {
        const workflowDefinition: WorkflowDefinition<any> = {
            name: 'Order Processing',
            type: 'state_machine',
            stateField: 'state',
            initialState: ['draft'],
            places: { draft: {}, pending: {}, confirmed: {} },
            transitions: { initiate: { from: 'draft', to: 'pending' }, confirm: { from: 'pending', to: 'confirmed' } },
        };
        const errors = validateWorkflow(workflowDefinition);
        expect(errors).toEqual([]);
    });

    test('should detect invalid states in transitions', () => {
        const workflowDefinition: WorkflowDefinition<any> = {
            name: 'Order Processing',
            type: 'state_machine',
            stateField: 'state',
            initialState: ['draft'],
            places: { draft: {}, confirmed: {} }, // Missing "pending"
            transitions: { initiate: { from: 'draft', to: 'pending' } },
        };
        const errors = validateWorkflow(workflowDefinition);
        expect(errors).toContain('Transition "initiate" results in undefined state "pending".');
    });
});
