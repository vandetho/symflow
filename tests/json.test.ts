import { describe, it, expect } from "vitest";
import { exportWorkflowJson } from "../src/json/export";
import { importWorkflowJson } from "../src/json/import";
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

describe("exportWorkflowJson", () => {
    it("exports valid JSON string", () => {
        const json = exportWorkflowJson({ definition: orderStateMachine, meta: orderMeta });
        expect(() => JSON.parse(json)).not.toThrow();
    });

    it("includes definition and meta", () => {
        const json = exportWorkflowJson({ definition: orderStateMachine, meta: orderMeta });
        const parsed = JSON.parse(json);
        expect(parsed.definition).toBeDefined();
        expect(parsed.meta).toBeDefined();
        expect(parsed.definition.name).toBe("order");
        expect(parsed.meta.type).toBe("state_machine");
    });

    it("respects indent option", () => {
        const json2 = exportWorkflowJson({
            definition: orderStateMachine,
            meta: orderMeta,
            indent: 2,
        });
        const json4 = exportWorkflowJson({
            definition: orderStateMachine,
            meta: orderMeta,
            indent: 4,
        });
        expect(json4.length).toBeGreaterThan(json2.length);
    });
});

describe("importWorkflowJson", () => {
    it("round-trips: export then import preserves data", () => {
        const json = exportWorkflowJson({ definition: orderStateMachine, meta: orderMeta });
        const { definition, meta } = importWorkflowJson(json);

        expect(definition.name).toBe("order");
        expect(definition.type).toBe("state_machine");
        expect(definition.places).toHaveLength(5);
        expect(definition.transitions).toHaveLength(4);
        expect(definition.initialMarking).toEqual(["draft"]);
        expect(meta.name).toBe("order");
        expect(meta.supports).toBe("App\\Entity\\Order");
    });

    it("throws on invalid JSON", () => {
        expect(() => importWorkflowJson("{invalid")).toThrow("Invalid workflow JSON");
    });

    it("throws on non-object JSON", () => {
        expect(() => importWorkflowJson('"string"')).toThrow("expected an object");
    });

    it("throws on missing definition", () => {
        expect(() => importWorkflowJson('{"meta": {}}')).toThrow("missing 'definition'");
    });

    it("throws on missing meta", () => {
        expect(() =>
            importWorkflowJson(
                '{"definition": {"places": [], "transitions": [], "initialMarking": []}}',
            ),
        ).toThrow("missing 'meta'");
    });

    it("throws on invalid definition structure", () => {
        expect(() => importWorkflowJson('{"definition": {"places": "bad"}, "meta": {}}')).toThrow(
            "places and transitions arrays",
        );
    });
});
