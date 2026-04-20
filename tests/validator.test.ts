import { describe, it, expect } from "vitest";
import { validateDefinition } from "../src/engine/validator";
import { orderStateMachine, articleReviewWorkflow } from "./fixtures";
import type { WorkflowDefinition } from "../src/engine/types";

describe("validateDefinition", () => {
    it("valid definition returns no errors", () => {
        const result = validateDefinition(orderStateMachine);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it("valid workflow definition returns no errors", () => {
        const result = validateDefinition(articleReviewWorkflow);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it("detects no initial marking", () => {
        const def: WorkflowDefinition = {
            ...orderStateMachine,
            initialMarking: [],
        };
        const result = validateDefinition(def);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.type === "no_initial_marking")).toBe(true);
    });

    it("detects invalid initial marking", () => {
        const def: WorkflowDefinition = {
            ...orderStateMachine,
            initialMarking: ["nonexistent"],
        };
        const result = validateDefinition(def);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.type === "invalid_initial_marking")).toBe(true);
    });

    it("detects invalid transition source", () => {
        const def: WorkflowDefinition = {
            ...orderStateMachine,
            transitions: [{ name: "bad", froms: ["nonexistent"], tos: ["submitted"] }],
        };
        const result = validateDefinition(def);
        expect(result.errors.some((e) => e.type === "invalid_transition_source")).toBe(true);
    });

    it("detects invalid transition target", () => {
        const def: WorkflowDefinition = {
            ...orderStateMachine,
            transitions: [{ name: "bad", froms: ["draft"], tos: ["nonexistent"] }],
        };
        const result = validateDefinition(def);
        expect(result.errors.some((e) => e.type === "invalid_transition_target")).toBe(true);
    });

    it("detects unreachable places", () => {
        const def: WorkflowDefinition = {
            name: "test",
            type: "state_machine",
            places: [{ name: "a" }, { name: "b" }, { name: "isolated" }],
            transitions: [{ name: "go", froms: ["a"], tos: ["b"] }],
            initialMarking: ["a"],
        };
        const result = validateDefinition(def);
        expect(result.errors.some((e) => e.type === "unreachable_place")).toBe(true);
    });

    it("detects dead transitions", () => {
        const def: WorkflowDefinition = {
            name: "test",
            type: "state_machine",
            places: [{ name: "a" }, { name: "b" }, { name: "c" }],
            transitions: [
                { name: "go", froms: ["a"], tos: ["b"] },
                { name: "dead", froms: ["c"], tos: ["a"] },
            ],
            initialMarking: ["a"],
        };
        const result = validateDefinition(def);
        expect(result.errors.some((e) => e.type === "dead_transition")).toBe(true);
    });

    it("detects orphan places", () => {
        const def: WorkflowDefinition = {
            name: "test",
            type: "state_machine",
            places: [{ name: "a" }, { name: "b" }, { name: "orphan" }],
            transitions: [{ name: "go", froms: ["a"], tos: ["b"] }],
            initialMarking: ["a"],
        };
        const result = validateDefinition(def);
        expect(result.errors.some((e) => e.type === "orphan_place")).toBe(true);
    });
});
