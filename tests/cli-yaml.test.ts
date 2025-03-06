import { loadWorkflowData } from '../src/symflow-cli';
import * as fs from 'fs-extra';

describe('YAML Workflow Parsing Tests', () => {
    let processExitSpy: jest.SpyInstance;

    beforeAll(() => {
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit was called'); // Prevent Jest from exiting
        });
    });

    afterAll(() => {
        processExitSpy.mockRestore();
    });

    test('should correctly parse a YAML workflow file', () => {
        const yamlFile = 'tests/sample-workflow.yaml';
        fs.writeFileSync(
            yamlFile,
            `
            metadata:
              description: "Test Workflow"
              version: "1.0"
            stateField: "state"
            initialState: ["draft"]
            places:
              draft:
                metadata:
                  label: "Draft Order"
              pending:
                metadata:
                  label: "Pending Approval"
              confirmed:
                metadata:
                  label: "Confirmed Order"
            transitions:
              initiate:
                from: "draft"
                to: "pending"
              confirm:
                from: "pending"
                to: "confirmed"
        `,
        );

        const workflow = loadWorkflowData(yamlFile);
        expect(workflow.stateField).toBe('state');
        expect(workflow.initialState).toContain('draft');
        expect(workflow.transitions.initiate.from).toBe('draft');
        expect(workflow.transitions.initiate.to).toBe('pending');

        fs.removeSync(yamlFile);
    });
});
