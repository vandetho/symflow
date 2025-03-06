// Define a workflow/state machine
import { CompletedEvent, LeaveEvent, StateMachine, Workflow, WorkflowDefinition, WorkflowEventType } from '../src';

export type OrderEntity = { id: number; state: string };

const orderWorkflowDefinition: WorkflowDefinition<OrderEntity> = {
    metadata: { description: 'Order processing workflow', version: '1.0' },
    initialState: 'draft',
    stateField: 'state', // Defined in WorkflowDefinition
    places: {
        draft: { metadata: { label: 'Draft Order' } },
        pending: { metadata: { label: 'Pending Approval' } },
        confirmed: { metadata: { label: 'Confirmed Order' } },
    },
    transitions: {
        initiate: { from: ['draft'], to: 'pending' },
        confirm: { from: ['pending'], to: 'confirmed' },
    },
};

// Create two separate orders for testing
const orderEntitySM: OrderEntity = { id: 1, state: 'draft' };
const orderEntityWF: OrderEntity = { id: 2, state: 'draft' };

// **State Machine Instance**
const stateMachine = new StateMachine<OrderEntity>(orderWorkflowDefinition);

// **Workflow Instance**
const workflow = new Workflow<OrderEntity>(orderWorkflowDefinition);

// Add event listeners for **State Machine**
stateMachine.on(WorkflowEventType.LEAVE, (event: LeaveEvent<OrderEntity>) => {
    console.log(`[StateMachine] Leaving state: ${event.fromState}, entering: ${event.toState}`);
});

stateMachine.on(WorkflowEventType.COMPLETED, (event: CompletedEvent<OrderEntity>) => {
    console.log(`[StateMachine] Transition completed: ${event.transition}`);
});

// Add event listeners for **Workflow**
workflow.on(WorkflowEventType.LEAVE, (event: LeaveEvent<OrderEntity>) => {
    console.log(`[Workflow] Leaving state: ${event.fromState}, entering: ${event.toState}`);
});

workflow.on(WorkflowEventType.COMPLETED, (event: CompletedEvent<OrderEntity>) => {
    console.log(`[Workflow] Transition completed: ${event.transition}`);
});

// Apply transitions in **State Machine**
console.log('\n--- Testing StateMachine ---');
stateMachine.apply(orderEntitySM, 'initiate');
console.log(`[StateMachine] Final Order State: ${orderEntitySM.state}`);

// Apply transitions in **Workflow**
console.log('\n--- Testing Workflow ---');
workflow.apply(orderEntityWF, 'initiate');
console.log(`[Workflow] Final Order State: ${orderEntityWF.state}`);
