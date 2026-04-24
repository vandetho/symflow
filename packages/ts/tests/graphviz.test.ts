import { describe, it, expect } from "vitest";
import { exportWorkflowDot } from "../src/graphviz/export";
import { orderStateMachine, articleReviewWorkflow, guardedStateMachine } from "./fixtures";
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
    property: "marking",
    initial_marking: ["draft"],
    supports: "App\\Entity\\Article",
};

describe("exportWorkflowDot", () => {
    it("produces valid digraph wrapper", () => {
        const dot = exportWorkflowDot({ definition: orderStateMachine, meta: orderMeta });
        expect(dot).toMatch(/^digraph order \{/);
        expect(dot).toContain("}");
    });

    it("sets rankdir=LR", () => {
        const dot = exportWorkflowDot({ definition: orderStateMachine, meta: orderMeta });
        expect(dot).toContain("rankdir=LR;");
    });

    it("includes start point and initial edge", () => {
        const dot = exportWorkflowDot({ definition: orderStateMachine, meta: orderMeta });
        expect(dot).toContain("__start__ [shape=point");
        expect(dot).toContain("__start__ -> draft;");
    });

    it("renders place nodes as circles", () => {
        const dot = exportWorkflowDot({ definition: orderStateMachine, meta: orderMeta });
        expect(dot).toContain("draft [shape=circle");
        expect(dot).toContain("submitted [shape=circle");
    });

    it("renders final places as doublecircle", () => {
        const dot = exportWorkflowDot({ definition: orderStateMachine, meta: orderMeta });
        expect(dot).toContain("fulfilled [shape=doublecircle");
        expect(dot).toContain("rejected [shape=doublecircle");
    });

    it("renders simple transitions as direct edges with labels", () => {
        const dot = exportWorkflowDot({ definition: orderStateMachine, meta: orderMeta });
        expect(dot).toContain("draft -> submitted [label=submit];");
        expect(dot).toContain("submitted -> approved [label=approve];");
        expect(dot).toContain("submitted -> rejected [label=reject];");
        expect(dot).toContain("approved -> fulfilled [label=fulfill];");
    });

    it("includes guard expression in label", () => {
        const dot = exportWorkflowDot({ definition: guardedStateMachine, meta: orderMeta });
        expect(dot).toContain("[label=\"approve\\n[subject.amount < 1000]\"]");
    });

    it("renders AND-split with intermediate transition node", () => {
        const dot = exportWorkflowDot({ definition: articleReviewWorkflow, meta: articleMeta });
        expect(dot).toContain("__t_start_review__");
        expect(dot).toContain("draft -> __t_start_review__;");
        expect(dot).toContain("__t_start_review__ -> checking_content;");
        expect(dot).toContain("__t_start_review__ -> checking_spelling;");
    });

    it("renders AND-join with intermediate transition node", () => {
        const dot = exportWorkflowDot({ definition: articleReviewWorkflow, meta: articleMeta });
        expect(dot).toContain("__t_publish__");
        expect(dot).toContain("content_approved -> __t_publish__;");
        expect(dot).toContain("spelling_approved -> __t_publish__;");
        expect(dot).toContain("__t_publish__ -> published;");
    });

    it("ends with a newline", () => {
        const dot = exportWorkflowDot({ definition: orderStateMachine, meta: orderMeta });
        expect(dot).toMatch(/\n$/);
    });
});
