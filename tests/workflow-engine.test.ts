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

    it("uses structured reason from guard evaluator", () => {
        const engine = new WorkflowEngine(guardedStateMachine, {
            guardEvaluator: () => ({ allowed: false, reason: "Insufficient balance" }),
        });
        const result = engine.can("approve");
        expect(result.allowed).toBe(false);
        expect(result.blockers[0]).toEqual({
            code: "guard_blocked",
            message: "Insufficient balance",
        });
    });

    it("uses custom code from guard evaluator and surfaces reason in apply()", () => {
        const engine = new WorkflowEngine(guardedStateMachine, {
            guardEvaluator: () => ({
                allowed: false,
                reason: "Balance below minimum",
                code: "insufficient_funds",
            }),
        });
        const result = engine.can("approve");
        expect(result.blockers[0]).toEqual({
            code: "insufficient_funds",
            message: "Balance below minimum",
        });
        expect(() => engine.apply("approve")).toThrow(/Balance below minimum/);
    });

    it("accepts structured allowed result", () => {
        const engine = new WorkflowEngine(guardedStateMachine, {
            guardEvaluator: () => ({ allowed: true }),
        });
        expect(engine.can("approve").allowed).toBe(true);
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

    it("rolls back marking when a 'leave' listener throws", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const before = engine.getMarking();
        engine.on("leave", () => {
            throw new Error("listener boom");
        });

        expect(() => engine.apply("submit")).toThrow("listener boom");
        expect(engine.getMarking()).toEqual(before);
    });

    it("rolls back marking when an 'enter' listener throws (mid-apply)", () => {
        // The dangerous case: from-tokens already removed, to-tokens not yet
        // added. Without rollback this would corrupt the marking.
        const engine = new WorkflowEngine(orderStateMachine);
        const before = engine.getMarking();
        engine.on("enter", () => {
            throw new Error("enter boom");
        });

        expect(() => engine.apply("submit")).toThrow("enter boom");
        expect(engine.getMarking()).toEqual(before);
    });

    it("rolls back marking when an 'entered' listener throws (post-apply)", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const before = engine.getMarking();
        engine.on("entered", () => {
            throw new Error("entered boom");
        });

        expect(() => engine.apply("submit")).toThrow("entered boom");
        expect(engine.getMarking()).toEqual(before);
    });

    it("rolls back marking when an 'announce' listener throws", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const before = engine.getMarking();
        engine.on("announce", () => {
            throw new Error("announce boom");
        });

        expect(() => engine.apply("submit")).toThrow("announce boom");
        expect(engine.getMarking()).toEqual(before);
    });

    it("filter narrows listener to a single transition by name", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const calls: string[] = [];
        engine.on("entered", { transition: "submit" }, (e) => calls.push(e.transition.name));

        engine.apply("submit");
        engine.apply("approve");
        engine.apply("fulfill");

        expect(calls).toEqual(["submit"]);
    });

    it("filter narrows listener to multiple transitions via array", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const calls: string[] = [];
        engine.on("entered", { transition: ["submit", "fulfill"] }, (e) =>
            calls.push(e.transition.name),
        );

        engine.apply("submit");
        engine.apply("approve");
        engine.apply("fulfill");

        expect(calls).toEqual(["submit", "fulfill"]);
    });

    it("listener without filter still fires for every transition", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const calls: string[] = [];
        engine.on("entered", (e) => calls.push(e.transition.name));

        engine.apply("submit");
        engine.apply("approve");

        expect(calls).toEqual(["submit", "approve"]);
    });

    it("unsubscribe works on filtered listener", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const listener = vi.fn();
        const unsub = engine.on("entered", { transition: "submit" }, listener);
        unsub();

        engine.apply("submit");
        expect(listener).not.toHaveBeenCalled();
    });

    it("announce event carries the newly-reachable transition, not the applied one", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const announced: string[] = [];
        engine.on("announce", (e) => announced.push(e.transition.name));

        // After applying "submit", "approve" and "reject" become enabled —
        // both should be announced (not "submit" repeated).
        engine.apply("submit");

        expect(announced.sort()).toEqual(["approve", "reject"]);
    });

    it("announce filter matches a specific newly-reachable transition", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const calls: string[] = [];
        engine.on("announce", { transition: "approve" }, (e) => calls.push(e.transition.name));

        engine.apply("submit"); // enables approve + reject
        expect(calls).toEqual(["approve"]);
    });

    it("announce does not fire when no transitions are enabled post-apply", () => {
        const engine = new WorkflowEngine(orderStateMachine);
        engine.apply("submit");
        engine.apply("approve");

        const announced: string[] = [];
        engine.on("announce", (e) => announced.push(e.transition.name));
        engine.apply("fulfill"); // terminal — no enabled transitions after

        expect(announced).toEqual([]);
    });

    it("rollback covers parallel from-places in a workflow", () => {
        const engine = new WorkflowEngine(articleReviewWorkflow);
        engine.apply("start_review");
        engine.apply("approve_content");
        engine.apply("approve_spelling");
        const before = engine.getMarking();

        engine.on("enter", () => {
            throw new Error("multi-place boom");
        });

        // publish has from: [content_approved, spelling_approved] — both must
        // be restored if a listener throws between consume and produce.
        expect(() => engine.apply("publish")).toThrow("multi-place boom");
        expect(engine.getMarking()).toEqual(before);
    });
});

describe("WorkflowEngine — async listeners (applyAsync)", () => {
    it("awaits async listeners in registration order", async () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const order: string[] = [];

        engine.on("entered", async () => {
            await new Promise((r) => setTimeout(r, 10));
            order.push("first");
        });
        engine.on("entered", async () => {
            order.push("second");
        });

        await engine.applyAsync("submit");
        expect(order).toEqual(["first", "second"]);
    });

    it("rolls back marking when an async listener rejects", async () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const before = engine.getMarking();

        engine.on("entered", async () => {
            throw new Error("async boom");
        });

        await expect(engine.applyAsync("submit")).rejects.toThrow("async boom");
        expect(engine.getMarking()).toEqual(before);
    });

    it("rolls back when an async listener rejects between consume and produce", async () => {
        // The `enter` event fires after from-tokens are removed but before
        // to-tokens are added — the dangerous window. Verifies the rollback
        // covers async rejections in this window.
        const engine = new WorkflowEngine(orderStateMachine);
        const before = engine.getMarking();

        engine.on("enter", async () => {
            throw new Error("enter async boom");
        });

        await expect(engine.applyAsync("submit")).rejects.toThrow("enter async boom");
        expect(engine.getMarking()).toEqual(before);
    });

    it("runs async middleware in chain order, awaits inner work", async () => {
        const log: string[] = [];
        const engine = new WorkflowEngine(orderStateMachine, {
            asyncMiddleware: [
                async (_ctx, next) => {
                    log.push("outer-before");
                    const m = await next();
                    log.push("outer-after");
                    return m;
                },
                async (_ctx, next) => {
                    log.push("inner-before");
                    await new Promise((r) => setTimeout(r, 5));
                    const m = await next();
                    log.push("inner-after");
                    return m;
                },
            ],
        });

        await engine.applyAsync("submit");
        expect(log).toEqual(["outer-before", "inner-before", "inner-after", "outer-after"]);
    });

    it("rolls back when an async middleware rejects", async () => {
        const engine = new WorkflowEngine(orderStateMachine, {
            asyncMiddleware: [
                async () => {
                    throw new Error("mw boom");
                },
            ],
        });
        const before = engine.getMarking();

        await expect(engine.applyAsync("submit")).rejects.toThrow("mw boom");
        expect(engine.getMarking()).toEqual(before);
    });

    it("sync middleware does not run inside applyAsync", async () => {
        const calls: string[] = [];
        const engine = new WorkflowEngine(orderStateMachine, {
            middleware: [
                (_ctx, next) => {
                    calls.push("sync");
                    return next();
                },
            ],
            asyncMiddleware: [
                async (_ctx, next) => {
                    calls.push("async");
                    return next();
                },
            ],
        });

        await engine.applyAsync("submit");
        expect(calls).toEqual(["async"]);
    });

    it("useAsync() registers async middleware at runtime", async () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const calls: string[] = [];
        engine.useAsync(async (_ctx, next) => {
            calls.push("hit");
            return next();
        });

        await engine.applyAsync("submit");
        expect(calls).toEqual(["hit"]);
    });

    it("applyAsync respects guards (blocked transitions throw)", async () => {
        const engine = new WorkflowEngine(orderStateMachine);
        await expect(engine.applyAsync("approve")).rejects.toThrow("Cannot apply transition");
    });

    it("applyAsync fires events in Symfony order", async () => {
        const engine = new WorkflowEngine(orderStateMachine);
        const order: string[] = [];
        for (const t of [
            "guard",
            "leave",
            "transition",
            "enter",
            "entered",
            "completed",
        ] as const) {
            engine.on(t, () => {
                order.push(t);
            });
        }
        await engine.applyAsync("submit");
        expect(order).toEqual(["guard", "leave", "transition", "enter", "entered", "completed"]);
    });
});

describe("WorkflowEngine — sync apply() with async listeners", () => {
    it("warns once when a listener returns a Promise during sync apply()", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const engine = new WorkflowEngine(orderStateMachine);
        engine.on("entered", async () => {
            // returns a Promise — should warn during sync apply()
        });

        engine.apply("submit");
        engine.apply("approve");

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain("returned a Promise during sync apply()");
        warn.mockRestore();
    });

    it("strictSyncListeners: true throws when a listener returns a Promise", () => {
        const engine = new WorkflowEngine(orderStateMachine, {
            strictSyncListeners: true,
        });
        engine.on("entered", async () => {});

        expect(() => engine.apply("submit")).toThrow(/returned a Promise during sync apply/);
    });

    it("strictSyncListeners rollback restores marking on detection", () => {
        const engine = new WorkflowEngine(orderStateMachine, {
            strictSyncListeners: true,
        });
        const before = engine.getMarking();
        engine.on("entered", async () => {});

        expect(() => engine.apply("submit")).toThrow();
        expect(engine.getMarking()).toEqual(before);
    });

    it("suppresses unhandled-rejection from discarded listener promise", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const engine = new WorkflowEngine(orderStateMachine);

        let unhandled = false;
        const onRejection = () => {
            unhandled = true;
        };
        process.once("unhandledRejection", onRejection);

        engine.on("entered", async () => {
            throw new Error("rejecting listener");
        });

        engine.apply("submit");
        // Give the microtask queue a chance to flush
        await new Promise((r) => setImmediate(r));

        expect(unhandled).toBe(false);
        process.removeListener("unhandledRejection", onRejection);
        warn.mockRestore();
    });

    it("strict mode also suppresses unhandled-rejection from rejecting listener", async () => {
        // Without the fix, strict mode throws BEFORE attaching .catch() to the
        // returned promise — so a rejecting async listener produces both the
        // strict-mode error and an unhandledRejection.
        const engine = new WorkflowEngine(orderStateMachine, {
            strictSyncListeners: true,
        });

        let unhandled = false;
        const onRejection = () => {
            unhandled = true;
        };
        process.once("unhandledRejection", onRejection);

        engine.on("entered", async () => {
            throw new Error("strict + rejecting");
        });

        expect(() => engine.apply("submit")).toThrow(/returned a Promise during sync apply/);
        await new Promise((r) => setImmediate(r));

        expect(unhandled).toBe(false);
        process.removeListener("unhandledRejection", onRejection);
    });

    it("filtered async listener trips the warning when the filter matches", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const engine = new WorkflowEngine(orderStateMachine);
        engine.on("entered", { transition: "submit" }, async () => {});

        engine.apply("submit");

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain("returned a Promise during sync apply()");
        warn.mockRestore();
    });

    it("filtered async listener does NOT warn when the filter doesn't match", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const engine = new WorkflowEngine(orderStateMachine);
        engine.on("entered", { transition: "approve" }, async () => {});

        // "submit" doesn't match the filter, so the inner listener never
        // runs and no Promise is returned to the engine's emit().
        engine.apply("submit");

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it("filtered async listener throws under strictSyncListeners when filter matches", () => {
        const engine = new WorkflowEngine(orderStateMachine, {
            strictSyncListeners: true,
        });
        engine.on("entered", { transition: "submit" }, async () => {});

        expect(() => engine.apply("submit")).toThrow(/returned a Promise during sync apply/);
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
