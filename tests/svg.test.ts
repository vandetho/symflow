import { describe, it, expect } from "vitest";
import { exportWorkflowSvg, renderPositionedSvg } from "../src/svg/export";
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

describe("exportWorkflowSvg", () => {
    it("produces a self-contained SVG with viewBox", () => {
        const svg = exportWorkflowSvg({ definition: orderStateMachine, meta: orderMeta });
        expect(svg.startsWith("<svg ")).toBe(true);
        expect(svg).toMatch(/viewBox="[\d. -]+"/);
        expect(svg.endsWith("</svg>")).toBe(true);
    });

    it("includes the workflow name as title", () => {
        const svg = exportWorkflowSvg({ definition: orderStateMachine, meta: orderMeta });
        expect(svg).toContain("<title>order</title>");
    });

    it("renders every place as text", () => {
        const svg = exportWorkflowSvg({ definition: orderStateMachine, meta: orderMeta });
        for (const p of orderStateMachine.places) {
            expect(svg).toContain(`>${p.name}</text>`);
        }
    });

    it("renders every transition name as text", () => {
        const svg = exportWorkflowSvg({ definition: orderStateMachine, meta: orderMeta });
        for (const t of orderStateMachine.transitions) {
            expect(svg).toContain(t.name);
        }
    });

    it("includes guard expressions in transition labels", () => {
        const svg = exportWorkflowSvg({
            definition: guardedStateMachine,
            meta: orderMeta,
        });
        expect(svg).toContain("subject.amount &lt; 1000");
    });

    it("renders AND-split with multiple targets", () => {
        const svg = exportWorkflowSvg({
            definition: articleReviewWorkflow,
            meta: articleMeta,
        });
        expect(svg).toContain("checking_content");
        expect(svg).toContain("checking_spelling");
        expect(svg).toContain("start_review");
    });

    it("defaults to dark theme background", () => {
        const svg = exportWorkflowSvg({ definition: orderStateMachine, meta: orderMeta });
        expect(svg).toContain("#0a0a14");
    });

    it("supports light theme override", () => {
        const svg = exportWorkflowSvg({
            definition: orderStateMachine,
            meta: orderMeta,
            theme: "light",
        });
        expect(svg).toMatch(/<rect[^>]*fill="#ffffff"/);
        const dark = exportWorkflowSvg({ definition: orderStateMachine, meta: orderMeta });
        expect(dark).toMatch(/<rect[^>]*fill="#0a0a14"/);
    });

    it("escapes XML special characters in labels", () => {
        const svg = exportWorkflowSvg({
            definition: guardedStateMachine,
            meta: orderMeta,
        });
        expect(svg).not.toMatch(/<text[^>]*>[^<]*[<>][^<]*<\/text>/);
    });

    it("returns a placeholder when no nodes are present", () => {
        const empty = { ...orderStateMachine, places: [], transitions: [], initialMarking: [] };
        const svg = renderPositionedSvg({ nodes: [], edges: [] });
        expect(svg).toContain("Empty workflow");
        void empty;
    });
});
