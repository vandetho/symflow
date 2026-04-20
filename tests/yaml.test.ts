import { describe, it, expect } from "vitest";
import { exportWorkflowYaml } from "../src/yaml/export";
import { importWorkflowYaml } from "../src/yaml/import";
import { orderStateMachine, articleReviewWorkflow } from "./fixtures";
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

const articleMeta: WorkflowMeta = {
    name: "article_review",
    symfonyVersion: "8.0",
    type: "workflow",
    marking_store: "method",
    property: "currentState",
    initial_marking: ["draft"],
    supports: "App\\Entity\\Article",
};

describe("exportWorkflowYaml", () => {
    it("exports valid Symfony YAML structure", () => {
        const yaml = exportWorkflowYaml({ definition: orderStateMachine, meta: orderMeta });
        expect(yaml).toContain("framework:");
        expect(yaml).toContain("workflows:");
        expect(yaml).toContain("order:");
    });

    it("exports type correctly", () => {
        const yaml = exportWorkflowYaml({ definition: orderStateMachine, meta: orderMeta });
        expect(yaml).toContain("type: state_machine");
    });

    it("exports marking_store", () => {
        const yaml = exportWorkflowYaml({ definition: orderStateMachine, meta: orderMeta });
        expect(yaml).toContain("marking_store:");
        expect(yaml).toContain("type: method");
        expect(yaml).toContain("property: currentState");
    });

    it("exports supports as flow array", () => {
        const yaml = exportWorkflowYaml({ definition: orderStateMachine, meta: orderMeta });
        expect(yaml).toMatch(/supports: \[.*Order.*\]/);
    });

    it("exports initial_marking as scalar for single value", () => {
        const yaml = exportWorkflowYaml({ definition: orderStateMachine, meta: orderMeta });
        expect(yaml).toContain("initial_marking: draft");
    });

    it("exports places as simple array when no metadata", () => {
        const yaml = exportWorkflowYaml({ definition: orderStateMachine, meta: orderMeta });
        expect(yaml).toMatch(/places: \[.*draft.*\]/);
    });

    it("exports places as object when metadata exists", () => {
        const defWithMeta = {
            ...orderStateMachine,
            places: [
                { name: "draft" },
                { name: "submitted", metadata: { bg_color: "blue" } },
                { name: "approved" },
                { name: "rejected" },
                { name: "fulfilled" },
            ],
        };
        const yaml = exportWorkflowYaml({ definition: defWithMeta, meta: orderMeta });
        expect(yaml).toContain("draft: ~");
        expect(yaml).toContain("bg_color: blue");
    });

    it("exports transitions with from/to", () => {
        const yaml = exportWorkflowYaml({ definition: orderStateMachine, meta: orderMeta });
        expect(yaml).toContain("submit:");
        expect(yaml).toContain("from: draft");
        expect(yaml).toContain("to: submitted");
    });

    it("exports guard on transitions", () => {
        const defWithGuard = {
            ...orderStateMachine,
            transitions: [
                {
                    name: "submit",
                    froms: ["draft"],
                    tos: ["submitted"],
                    guard: 'is_granted("ROLE_USER")',
                },
            ],
        };
        const yaml = exportWorkflowYaml({ definition: defWithGuard, meta: orderMeta });
        expect(yaml).toContain("guard:");
        expect(yaml).toContain("ROLE_USER");
    });

    it("exports flow arrays for multiple from/to", () => {
        const yaml = exportWorkflowYaml({
            definition: articleReviewWorkflow,
            meta: articleMeta,
        });
        expect(yaml).toMatch(/from: \[content_approved, spelling_approved\]/);
        expect(yaml).toMatch(/to: \[checking_content, checking_spelling\]/);
    });
});

describe("importWorkflowYaml", () => {
    it("round-trips: export then import preserves definition", () => {
        const yaml = exportWorkflowYaml({ definition: orderStateMachine, meta: orderMeta });
        const { definition, meta } = importWorkflowYaml(yaml);

        expect(definition.name).toBe("order");
        expect(definition.type).toBe("state_machine");
        expect(definition.places.map((p) => p.name)).toEqual(
            orderStateMachine.places.map((p) => p.name),
        );
        expect(definition.transitions.length).toBe(orderStateMachine.transitions.length);
        expect(definition.initialMarking).toEqual(["draft"]);
        expect(meta.name).toBe("order");
        expect(meta.type).toBe("state_machine");
    });

    it("imports framework-wrapped YAML", () => {
        const yaml = `
framework:
    workflows:
        my_flow:
            type: workflow
            marking_store:
                type: property
                property: state
            supports: [App\\Entity\\Ticket]
            initial_marking: new
            places: [new, open, closed]
            transitions:
                open_ticket:
                    from: new
                    to: open
                close_ticket:
                    from: open
                    to: closed
`;
        const { definition, meta } = importWorkflowYaml(yaml);
        expect(definition.name).toBe("my_flow");
        expect(definition.places).toHaveLength(3);
        expect(definition.transitions).toHaveLength(2);
        expect(definition.initialMarking).toEqual(["new"]);
        expect(meta.marking_store).toBe("property");
        expect(meta.property).toBe("state");
    });

    it("imports bare YAML (no framework wrapper)", () => {
        const yaml = `
places: [a, b]
transitions:
    go:
        from: a
        to: b
initial_marking: a
`;
        const { definition } = importWorkflowYaml(yaml);
        expect(definition.places.map((p) => p.name)).toEqual(["a", "b"]);
        expect(definition.transitions[0].name).toBe("go");
    });

    it("imports places with metadata", () => {
        const yaml = `
framework:
    workflows:
        test:
            type: state_machine
            initial_marking: draft
            places:
                draft: ~
                review:
                    metadata:
                        description: Human review
                        bg_color: DeepSkyBlue
            transitions:
                submit:
                    from: draft
                    to: review
`;
        const { definition } = importWorkflowYaml(yaml);
        expect(definition.places[0].name).toBe("draft");
        expect(definition.places[1].metadata).toEqual({
            description: "Human review",
            bg_color: "DeepSkyBlue",
        });
    });

    it("imports guards", () => {
        const yaml = `
framework:
    workflows:
        test:
            type: state_machine
            initial_marking: draft
            places: [draft, approved]
            transitions:
                approve:
                    from: draft
                    to: approved
                    guard: 'is_granted("ROLE_ADMIN")'
`;
        const { definition } = importWorkflowYaml(yaml);
        expect(definition.transitions[0].guard).toBe('is_granted("ROLE_ADMIN")');
    });

    it("imports multiple from/to as arrays", () => {
        const yaml = `
framework:
    workflows:
        test:
            type: workflow
            initial_marking: draft
            places: [draft, a, b, done]
            transitions:
                fork:
                    from: draft
                    to: [a, b]
                join:
                    from: [a, b]
                    to: done
`;
        const { definition } = importWorkflowYaml(yaml);
        expect(definition.transitions[0].tos).toEqual(["a", "b"]);
        expect(definition.transitions[1].froms).toEqual(["a", "b"]);
    });

    it("throws on empty YAML", () => {
        expect(() => importWorkflowYaml("")).toThrow();
    });

    it("round-trips workflow with metadata", () => {
        const defWithMeta = {
            ...articleReviewWorkflow,
            transitions: [
                ...articleReviewWorkflow.transitions.map((t) =>
                    t.name === "publish" ? { ...t, metadata: { color: "green" } } : t,
                ),
            ],
        };
        const yaml = exportWorkflowYaml({ definition: defWithMeta, meta: articleMeta });
        const { definition } = importWorkflowYaml(yaml);
        const publish = definition.transitions.find((t) => t.name === "publish");
        expect(publish?.metadata).toEqual({ color: "green" });
    });
});
