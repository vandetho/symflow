import { describe, it, expect, vi } from "vitest";
import { WorkflowEngine } from "../src/engine/workflow-engine";
import {
    orderStateMachine,
    articleReviewWorkflow,
    guardedStateMachine,
    weightedWorkflow,
} from "./fixtures";

describe("WorkflowEngine — state_machine", () => {
    it("starts with initial marking", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        expect(engine.getActivePlaces()).toEqual(["draft"]);
    });

    it("can() returns allowed for valid transition", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const result = engine.can("submit");
        expect(result.allowed).toBe(true);
        expect(result.blockers).toEqual([]);
    });

    it("can() returns not_in_place for wrong state", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const result = engine.can("approve");
        expect(result.allowed).toBe(false);
        expect(result.blockers[0].code).toBe("not_in_place");
    });

    it("can() returns unknown_transition for nonexistent transition", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const result = engine.can("nonexistent");
        expect(result.allowed).toBe(false);
        expect(result.blockers[0].code).toBe("unknown_transition");
    });

    it("apply() moves to new state", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        engine.apply("submit");
        expect(engine.getActivePlaces()).toEqual(["submitted"]);
    });

    it("apply() throws on blocked transition", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        expect(() => engine.apply("approve")).toThrow("Cannot apply transition");
    });

    it("getEnabledTransitions() returns correct transitions", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        engine.apply("submit");
        const enabled = engine.getEnabledTransitions();
        const names = enabled.map((t) => t.name).sort();
        expect(names).toEqual(["approve", "reject"]);
    });

    it("reset() restores initial marking", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        engine.apply("submit");
        engine.reset();
        expect(engine.getActivePlaces()).toEqual(["draft"]);
    });

    it("full path: draft → submitted → approved → fulfilled", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        engine.apply("submit");
        engine.apply("approve");
        engine.apply("fulfill");
        expect(engine.getActivePlaces()).toEqual(["fulfilled"]);
        expect(engine.getEnabledTransitions()).toEqual([]);
    });

    it("setMarking() overrides current state", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        engine.setMarking({ draft: 0, submitted: 0, approved: 1, rejected: 0, fulfilled: 0 });
        expect(engine.getActivePlaces()).toEqual(["approved"]);
        expect(engine.can("fulfill").allowed).toBe(true);
    });

    it("getDefinition() returns the definition", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        expect(engine.getDefinition().name).toBe("order");
    });

    it("getInitialMarking() always returns initial state", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        engine.apply("submit");
        const initial = engine.getInitialMarking();
        expect(initial.draft).toBe(1);
        expect(initial.submitted).toBe(0);
    });
});

describe("WorkflowEngine — workflow (Petri net)", () => {
    it("starts with initial marking", () => {
        const engine = new WorkflowEngine(articleReviewWorkflow);
        expect(engine.getActivePlaces()).toEqual(["draft"]);
    });

    it("AND-split: forks into parallel places", () => {
        const engine = new WorkflowEngine(articleReviewWorkflow);
        engine.apply("start_review");
        expect(engine.getActivePlaces().sort()).toEqual(["checking_content", "checking_spelling"]);
    });

    it("AND-join: requires all source places", () => {
        const engine = new WorkflowEngine(articleReviewWorkflow);
        engine.apply("start_review");
        engine.apply("approve_content");
        expect(engine.can("publish").allowed).toBe(false);
    });

    it("AND-join: fires when all sources marked", () => {
        const engine = new WorkflowEngine(articleReviewWorkflow);
        engine.apply("start_review");
        engine.apply("approve_content");
        engine.apply("approve_spelling");
        expect(engine.can("publish").allowed).toBe(true);
        engine.apply("publish");
        expect(engine.getActivePlaces()).toEqual(["published"]);
    });

    it("tokens are consumed correctly", () => {
        const engine = new WorkflowEngine(articleReviewWorkflow);
        engine.apply("start_review");
        const marking = engine.getMarking();
        expect(marking.draft).toBe(0);
        expect(marking.checking_content).toBe(1);
        expect(marking.checking_spelling).toBe(1);
    });
});

describe("WorkflowEngine — guards", () => {
    it("blocks transition when guard fails", () => {
        const engine = new WorkflowEngine(guardedStateMachine, {
            guardEvaluator: () => false,
        });
        const result = engine.can("approve");
        expect(result.allowed).toBe(false);
        expect(result.blockers[0].code).toBe("guard_blocked");
    });

    it("allows transition when guard passes", () => {
        const engine = new WorkflowEngine(guardedStateMachine, {
            guardEvaluator: () => true,
        });
        expect(engine.can("approve").allowed).toBe(true);
    });

    it("guard evaluator receives correct context", () => {
        const evaluator = vi.fn().mockReturnValue(true);
        const engine = new WorkflowEngine(guardedStateMachine, {
            guardEvaluator: evaluator,
        });
        engine.can("approve");
        expect(evaluator).toHaveBeenCalledWith("subject.amount < 1000", {
            marking: engine.getMarking(),
            transition: expect.objectContaining({ name: "approve" }),
        });
    });

    it("transitions without guards are not affected", () => {
        const engine = new WorkflowEngine(guardedStateMachine, {
            guardEvaluator: () => false,
        });
        expect(engine.can("deny").allowed).toBe(true);
    });
});

describe("WorkflowEngine — events", () => {
    it("fires events in Symfony order", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const events: string[] = [];

        engine.on("guard", () => events.push("guard"));
        engine.on("leave", () => events.push("leave"));
        engine.on("transition", () => events.push("transition"));
        engine.on("enter", () => events.push("enter"));
        engine.on("entered", () => events.push("entered"));
        engine.on("completed", () => events.push("completed"));
        engine.on("announce", () => events.push("announce"));

        engine.apply("submit");

        expect(events[0]).toBe("guard");
        expect(events[1]).toBe("leave");
        expect(events[2]).toBe("transition");
        expect(events[3]).toBe("enter");
        expect(events[4]).toBe("entered");
        expect(events[5]).toBe("completed");
    });

    it("event contains correct data", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        let receivedEvent: unknown;

        engine.on("entered", (event) => {
            receivedEvent = event;
        });

        engine.apply("submit");

        expect(receivedEvent).toMatchObject({
            type: "entered",
            transition: expect.objectContaining({ name: "submit" }),
            workflowName: "order",
        });
    });

    it("unsubscribe removes listener", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const listener = vi.fn();
        const unsub = engine.on("entered", listener);
        unsub();

        engine.apply("submit");
        expect(listener).not.toHaveBeenCalled();
    });

    it("leave fires per from-place in workflow", () => {
        const engine = new WorkflowEngine(articleReviewWorkflow);
        engine.apply("start_review");
        engine.apply("approve_content");
        engine.apply("approve_spelling");

        let leaveCount = 0;
        engine.on("leave", () => leaveCount++);
        engine.apply("publish"); // from: [content_approved, spelling_approved]

        expect(leaveCount).toBe(2);
    });

    it("enter fires per to-place in workflow", () => {
        const engine = new WorkflowEngine(articleReviewWorkflow);
        let enterCount = 0;
        engine.on("enter", () => enterCount++);
        engine.apply("start_review"); // to: [checking_content, checking_spelling]

        expect(enterCount).toBe(2);
    });
});

describe("WorkflowEngine — weighted arcs", () => {
    it("can() returns false when marking < consumeWeight", () => {
        const engine = new WorkflowEngine(weightedWorkflow);
        // raw_materials has 1 token, manufacture needs 3
        const result = engine.can("manufacture");
        expect(result.allowed).toBe(false);
        expect(result.blockers[0].code).toBe("not_in_place");
    });

    it("can() returns true when marking >= consumeWeight", () => {
        const engine = new WorkflowEngine(weightedWorkflow);
        engine.setMarking({ raw_materials: 3, components: 0, assembled: 0 });
        expect(engine.can("manufacture").allowed).toBe(true);
    });

    it("apply() consumes consumeWeight tokens and produces produceWeight tokens", () => {
        const engine = new WorkflowEngine(weightedWorkflow);
        engine.setMarking({ raw_materials: 5, components: 0, assembled: 0 });
        engine.apply("manufacture"); // consume 3, produce 2
        const marking = engine.getMarking();
        expect(marking.raw_materials).toBe(2);
        expect(marking.components).toBe(2);
    });

    it("multi-step: accumulate tokens then assemble", () => {
        const engine = new WorkflowEngine(weightedWorkflow);
        engine.setMarking({ raw_materials: 6, components: 0, assembled: 0 });

        engine.apply("manufacture"); // raw: 6-3=3, comp: 0+2=2
        engine.apply("manufacture"); // raw: 3-3=0, comp: 2+2=4

        expect(engine.can("assemble").allowed).toBe(true);
        engine.apply("assemble"); // comp: 4-2=2, assembled: 0+1=1

        const marking = engine.getMarking();
        expect(marking.raw_materials).toBe(0);
        expect(marking.components).toBe(2);
        expect(marking.assembled).toBe(1);
    });

    it("defaults to weight 1 when fields are undefined", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        engine.apply("submit");
        const marking = engine.getMarking();
        expect(marking.draft).toBe(0);
        expect(marking.submitted).toBe(1);
    });
});

describe("WorkflowEngine — middleware", () => {
    it("middleware is called with correct context", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        let receivedCtx: unknown;

        engine.use((ctx, next) => {
            receivedCtx = ctx;
            return next();
        });

        engine.apply("submit");

        expect(receivedCtx).toMatchObject({
            transition: expect.objectContaining({ name: "submit" }),
            workflowName: "order",
        });
    });

    it("middleware wraps the transition (before/after)", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const log: string[] = [];

        engine.use((_ctx, next) => {
            log.push("before");
            const result = next();
            log.push("after");
            return result;
        });

        engine.apply("submit");
        expect(log).toEqual(["before", "after"]);
    });

    it("middleware chain executes in registration order (outermost first)", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const log: string[] = [];

        engine.use((_ctx, next) => {
            log.push("mw1-before");
            const result = next();
            log.push("mw1-after");
            return result;
        });
        engine.use((_ctx, next) => {
            log.push("mw2-before");
            const result = next();
            log.push("mw2-after");
            return result;
        });

        engine.apply("submit");
        expect(log).toEqual(["mw1-before", "mw2-before", "mw2-after", "mw1-after"]);
    });

    it("middleware can block transition by not calling next()", () => {
        const engine = new WorkflowEngine(orderStateMachine);

        engine.use((ctx, _next) => {
            return ctx.marking; // return original marking, skip transition
        });

        const result = engine.apply("submit");
        expect(result.draft).toBe(1); // unchanged
        expect(engine.getActivePlaces()).toEqual(["draft"]);
    });

    it("middleware provided via constructor options", () => {
        const log: string[] = [];
        const engine = new WorkflowEngine(orderStateMachine, {
            middleware: [
                (_ctx, next) => {
                    log.push("constructor-mw");
                    return next();
                },
            ],
        });

        engine.apply("submit");
        expect(log).toEqual(["constructor-mw"]);
    });

    it("can() is not affected by middleware", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const spy = vi.fn();
        engine.use((ctx, next) => {
            spy();
            return next();
        });

        engine.can("submit");
        expect(spy).not.toHaveBeenCalled();
    });

    it("middleware receives pre-transition marking", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        let preMarking: Record<string, number> | undefined;

        engine.use((ctx, next) => {
            preMarking = ctx.marking;
            return next();
        });

        engine.apply("submit");
        expect(preMarking!.draft).toBe(1);
        expect(preMarking!.submitted).toBe(0);
    });
});
