import { loadWorkflowData } from '../src/symflow-cli';

describe('JSON Workflow Parsing Tests', () => {
    let processExitSpy: jest.SpyInstance;

    beforeAll(() => {
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit was called'); // Prevent Jest from exiting
        });
    });

    afterAll(() => {
        processExitSpy.mockRestore();
    });

    test('should correctly parse a valid JSON string', () => {
        const jsonString = `{
            "metadata": { "description": "Test Workflow", "version": "1.0" },
            "stateField": "state",
            "initialState": ["draft"],
            "places": {
                "draft": { "metadata": { "label": "Draft Order" } },
                "pending": { "metadata": { "label": "Pending Approval" } },
                "confirmed": { "metadata": { "label": "Confirmed Order" } }
            },
            "transitions": {
                "initiate": { "from": "draft", "to": "pending" },
                "confirm": { "from": "pending", "to": "confirmed" }
            }
        }`;

        const workflow = loadWorkflowData(undefined, jsonString);
        expect(workflow.stateField).toBe('state');
        expect(workflow.initialState).toContain('draft');
        expect(workflow.transitions.initiate.from).toBe('draft');
        expect(workflow.transitions.initiate.to).toBe('pending');
    });

    test('should throw an error for invalid JSON string', () => {
        expect(() => loadWorkflowData(undefined, '{invalid_json}')).toThrow('Invalid JSON string provided.');
    });
});
