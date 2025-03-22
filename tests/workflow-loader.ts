import { loadWorkflowDefinition } from '../src';

describe('Workflow Loader', () => {
    it('loads TS file', () => {
        const def = loadWorkflowDefinition('tests/workflows/order.ts');
        expect(def.name).toBe('order');
    });

    it('loads JSON file', () => {
        const def = loadWorkflowDefinition('tests/workflows/order.json');
        expect(def.name).toBe('order');
    });

    it('loads YAML file', () => {
        const def = loadWorkflowDefinition('tests/workflows/order.yaml');
        expect(def.name).toBe('order');
    });

    it('throws on unsupported file format', () => {
        expect(() => loadWorkflowDefinition('tests/workflows/invalid.txt')).toThrow(/unsupported/i);
    });

    it('throws if file is missing', () => {
        expect(() => loadWorkflowDefinition('tests/workflows/not-exist.json')).toThrow();
    });
});
