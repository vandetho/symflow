import { describe, it, expect } from "vitest";
import { analyzeWorkflow } from "../src/engine/analyzer";
import { orderStateMachine, articleReviewWorkflow } from "./fixtures";

describe("analyzeWorkflow — state_machine", () => {
    it("detects simple transitions", () => {
        const analysis = analyzeWorkflow(orderStateMachine);
        expect(analysis.transitions["submit"].pattern).toBe("simple");
        expect(analysis.transitions["fulfill"].pattern).toBe("simple");
    });

    it("detects xor-split on places with multiple outgoing", () => {
        const analysis = analyzeWorkflow(orderStateMachine);
        expect(analysis.places["submitted"].patterns).toContain("xor-split");
    });

    it("uses xor-join for state_machine", () => {
        const analysis = analyzeWorkflow(orderStateMachine);
        // draft has only outgoing, no join
        expect(analysis.places["draft"].patterns).toEqual(["simple"]);
    });

    it("tracks incoming and outgoing transitions", () => {
        const analysis = analyzeWorkflow(orderStateMachine);
        expect(analysis.places["submitted"].incomingTransitions).toEqual(["submit"]);
        expect(analysis.places["submitted"].outgoingTransitions.sort()).toEqual([
            "approve",
            "reject",
        ]);
    });
});

describe("analyzeWorkflow — workflow (Petri net)", () => {
    it("detects and-split transition", () => {
        const analysis = analyzeWorkflow(articleReviewWorkflow);
        expect(analysis.transitions["start_review"].pattern).toBe("and-split");
    });

    it("detects and-join transition", () => {
        const analysis = analyzeWorkflow(articleReviewWorkflow);
        expect(analysis.transitions["publish"].pattern).toBe("and-join");
    });

    it("detects simple transitions", () => {
        const analysis = analyzeWorkflow(articleReviewWorkflow);
        expect(analysis.transitions["approve_content"].pattern).toBe("simple");
    });

    it("detects and-split pattern on forked places", () => {
        const analysis = analyzeWorkflow(articleReviewWorkflow);
        expect(analysis.places["checking_content"].patterns).toContain("and-split");
        expect(analysis.places["checking_spelling"].patterns).toContain("and-split");
    });

    it("detects and-join pattern on synchronized places", () => {
        const analysis = analyzeWorkflow(articleReviewWorkflow);
        expect(analysis.places["content_approved"].patterns).toContain("and-join");
        expect(analysis.places["spelling_approved"].patterns).toContain("and-join");
    });
});
