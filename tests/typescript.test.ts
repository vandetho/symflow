import { describe, it, expect } from "vitest";
import { exportWorkflowTs } from "../src/typescript/export";
import { orderStateMachine } from "./fixtures";
import type { WorkflowMeta } from "../src/types/workflow";

const orderMeta: WorkflowMeta = {
    name: "order",
    symfonyVersion: "8.0",
    type: "state_machine",
    marking_store: "method",
    property: "currentState",
    initial_marking: ["draft"],
    supports: "App\\Entity\\Order",
};

describe("exportWorkflowTs", () => {
    it("emits valid TypeScript with import", () => {
        const ts = exportWorkflowTs({ definition: orderStateMachine, meta: orderMeta });
        expect(ts).toContain('import type { WorkflowDefinition, WorkflowMeta }');
    });

    it("uses default export name 'workflow'", () => {
        const ts = exportWorkflowTs({ definition: orderStateMachine, meta: orderMeta });
        expect(ts).toContain("export const workflowDefinition: WorkflowDefinition");
        expect(ts).toContain("export const workflowMeta: WorkflowMeta");
    });

    it("uses custom export name", () => {
        const ts = exportWorkflowTs({
            definition: orderStateMachine,
            meta: orderMeta,
            exportName: "order",
        });
        expect(ts).toContain("export const orderDefinition: WorkflowDefinition");
        expect(ts).toContain("export const orderMeta: WorkflowMeta");
    });

    it("uses custom import path", () => {
        const ts = exportWorkflowTs({
            definition: orderStateMachine,
            meta: orderMeta,
            importFrom: "@my-org/workflows",
        });
        expect(ts).toContain('from "@my-org/workflows"');
    });

    it("default import path is symflow", () => {
        const ts = exportWorkflowTs({ definition: orderStateMachine, meta: orderMeta });
        expect(ts).toContain('from "symflow"');
    });

    it("includes definition data", () => {
        const ts = exportWorkflowTs({ definition: orderStateMachine, meta: orderMeta });
        expect(ts).toContain('"name": "order"');
        expect(ts).toContain('"state_machine"');
        expect(ts).toContain('"draft"');
    });

    it("includes meta data", () => {
        const ts = exportWorkflowTs({ definition: orderStateMachine, meta: orderMeta });
        expect(ts).toContain('"symfonyVersion": "8.0"');
        expect(ts).toContain('"supports": "App\\\\Entity\\\\Order"');
    });
});
