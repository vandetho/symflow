import { Workflow, WorkflowDefinition } from '../src';

describe('Workflow Export Tests', () => {
    let workflow: Workflow<{ id: number; state: string[] }>;

    beforeEach(() => {
        const workflowDefinition: WorkflowDefinition<{ id: number; state: string[] }> = {
            name: 'Test Workflow',
            metadata: { description: 'Test Workflow', version: '1.0' },
            stateField: 'state',
            initialState: ['draft'],
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

        workflow = new Workflow(workflowDefinition);
    });

    test('should export workflow to Graphviz', () => {
        const dot = workflow.toGraphviz();
        expect(dot).toContain(`digraph Workflow`);
        expect(dot).toContain(`"draft" -> "pending" [label="initiate"];`);
        expect(dot).toContain(`"pending" -> "confirmed" [label="confirm"];`);
    });

    test('should export workflow to Mermaid', () => {
        const mermaid = workflow.toMermaid();
        expect(mermaid).toContain(`graph TD;`);
        expect(mermaid).toContain(`draft -->|initiate| pending;`);
        expect(mermaid).toContain(`pending -->|confirm| confirmed;`);
    });
});
