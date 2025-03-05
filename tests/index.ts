import { Workflow, StateMachine, WorkflowDefinition } from '../src';

// Define a workflow definition (for both Workflow and State Machine)
const orderWorkflowDefinition: WorkflowDefinition = {
    metadata: { description: 'Order processing workflow', version: '1.0' },
    initialState: 'draft',
    places: {
        draft: { metadata: { label: 'Draft Order', description: 'Order is being configured.' } },
        pending: { metadata: { label: 'Pending', description: 'Waiting for confirmation.' } },
        confirmed: { metadata: { label: 'Confirmed', description: 'Order confirmed by admin.' } },
    },
    transitions: {
        initiate: { from: ['draft'], to: 'pending', metadata: { label: 'Initiate Order' } },
        confirm: { from: ['pending'], to: 'confirmed', metadata: { label: 'Confirm Order' } },
    },
};

// Using Workflow (Multiple states supported)
const workflow = new Workflow(orderWorkflowDefinition);
let workflowState = [workflow.initialState];
console.log('Workflow Initial state:', workflowState);

workflowState = workflow.apply(workflowState, 'initiate');
console.log('After initiate:', workflowState);

// Using State Machine (Strict single-state transitions)
const stateMachine = new StateMachine(orderWorkflowDefinition);
console.log('StateMachine Initial state:', stateMachine.getCurrentState());

stateMachine.apply('initiate');
console.log('After initiate:', stateMachine.getCurrentState());
