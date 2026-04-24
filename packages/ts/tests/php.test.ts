import { describe, it, expect } from "vitest";
import { exportWorkflowPhp } from "../src/php/export";
import { orderStateMachine, articleReviewWorkflow, weightedWorkflow } from "./fixtures";
import type { WorkflowMeta } from "../src/types/workflow";

const orderMeta: WorkflowMeta = {
    name: "order",
    symfonyVersion: "8.0",
    type: "state_machine",
    marking_store: "property",
    property: "status",
    initial_marking: ["draft"],
    supports: "App\\Models\\Order",
};

describe("exportWorkflowPhp", () => {
    it("generates valid PHP opening tag", () => {
        const output = exportWorkflowPhp({ definition: orderStateMachine, meta: orderMeta });
        expect(output).toContain("<?php");
    });

    it("includes Laraflow use statements", () => {
        const output = exportWorkflowPhp({ definition: orderStateMachine, meta: orderMeta });
        expect(output).toContain("use Laraflow\\Data\\Place;");
        expect(output).toContain("use Laraflow\\Data\\Transition;");
        expect(output).toContain("use Laraflow\\Data\\WorkflowDefinition;");
        expect(output).toContain("use Laraflow\\Data\\WorkflowMeta;");
        expect(output).toContain("use Laraflow\\Enums\\WorkflowType;");
        expect(output).toContain("use Laraflow\\Enums\\MarkingStoreType;");
    });

    it("exports workflow name", () => {
        const output = exportWorkflowPhp({ definition: orderStateMachine, meta: orderMeta });
        expect(output).toContain("name: 'order'");
    });

    it("exports WorkflowType enum correctly", () => {
        const output = exportWorkflowPhp({ definition: orderStateMachine, meta: orderMeta });
        expect(output).toContain("WorkflowType::StateMachine");
    });

    it("exports workflow type as Workflow for petri nets", () => {
        const meta: WorkflowMeta = { ...orderMeta, name: "review", type: "workflow" };
        const output = exportWorkflowPhp({ definition: articleReviewWorkflow, meta });
        expect(output).toContain("WorkflowType::Workflow");
    });

    it("exports place definitions", () => {
        const output = exportWorkflowPhp({ definition: orderStateMachine, meta: orderMeta });
        expect(output).toContain("new Place(name: 'draft')");
        expect(output).toContain("new Place(name: 'submitted')");
    });

    it("exports transition with froms and tos", () => {
        const output = exportWorkflowPhp({ definition: orderStateMachine, meta: orderMeta });
        expect(output).toContain("name: 'submit'");
        expect(output).toContain("froms: ['draft']");
        expect(output).toContain("tos: ['submitted']");
    });

    it("exports initial marking", () => {
        const output = exportWorkflowPhp({ definition: orderStateMachine, meta: orderMeta });
        expect(output).toContain("initialMarking: ['draft']");
    });

    it("exports MarkingStoreType enum", () => {
        const output = exportWorkflowPhp({ definition: orderStateMachine, meta: orderMeta });
        expect(output).toContain("MarkingStoreType::Property");
    });

    it("exports supports and property", () => {
        const output = exportWorkflowPhp({ definition: orderStateMachine, meta: orderMeta });
        expect(output).toContain("supports: 'App\\\\Models\\\\Order'");
        expect(output).toContain("property: 'status'");
    });

    it("exports weighted arcs", () => {
        const meta: WorkflowMeta = {
            ...orderMeta,
            name: "factory",
            type: "workflow",
        };
        const output = exportWorkflowPhp({ definition: weightedWorkflow, meta });
        expect(output).toContain("consumeWeight: 3");
        expect(output).toContain("produceWeight: 2");
    });

    it("exports guard expressions", () => {
        const defWithGuard = {
            ...orderStateMachine,
            transitions: [
                {
                    name: "approve",
                    froms: ["submitted"],
                    tos: ["approved"],
                    guard: 'is_granted("ROLE_ADMIN")',
                },
            ],
        };
        const output = exportWorkflowPhp({ definition: defWithGuard, meta: orderMeta });
        expect(output).toContain("guard: 'is_granted(\"ROLE_ADMIN\")'");
    });

    it("exports multiple from/to in arrays", () => {
        const meta: WorkflowMeta = { ...orderMeta, name: "review", type: "workflow" };
        const output = exportWorkflowPhp({ definition: articleReviewWorkflow, meta });
        expect(output).toContain("tos: ['checking_content', 'checking_spelling']");
        expect(output).toContain("froms: ['content_approved', 'spelling_approved']");
    });

    it("returns array structure for require", () => {
        const output = exportWorkflowPhp({ definition: orderStateMachine, meta: orderMeta });
        expect(output).toContain("return [");
        expect(output).toContain("'definition' => new WorkflowDefinition(");
        expect(output).toContain("'meta' => new WorkflowMeta(");
    });
});
