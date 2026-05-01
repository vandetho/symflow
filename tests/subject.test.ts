import { describe, it, expect, vi } from "vitest";
import { createWorkflow } from "../src/subject/workflow";
import { propertyMarkingStore, methodMarkingStore } from "../src/subject/marking-store";
import type { Marking } from "../src/engine";
import { orderStateMachine, guardedStateMachine } from "./fixtures";

interface Order {
    id: string;
    status: string;
    amount: number;
}

describe("Workflow<T> — subject-driven API", () => {
    it("can() checks transition for subject", () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });
        const order: Order = { id: "1", status: "draft", amount: 100 };
        expect(workflow.can(order, "submit").allowed).toBe(true);
        expect(workflow.can(order, "approve").allowed).toBe(false);
    });

    it("apply() updates subject state", () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });
        const order: Order = { id: "1", status: "draft", amount: 100 };
        workflow.apply(order, "submit");
        expect(order.status).toBe("submitted");
    });

    it("getEnabledTransitions() returns available transitions", () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });
        const order: Order = { id: "1", status: "submitted", amount: 100 };
        const names = workflow.getEnabledTransitions(order).map((t) => t.name);
        expect(names.sort()).toEqual(["approve", "reject"]);
    });

    it("getMarking() reads from subject", () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });
        const order: Order = { id: "1", status: "approved", amount: 100 };
        const marking = workflow.getMarking(order);
        expect(marking.approved).toBe(1);
    });

    it("events include subject", () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });
        const order: Order = { id: "1", status: "draft", amount: 100 };

        let receivedSubject: Order | undefined;
        workflow.on("entered", (event) => {
            receivedSubject = event.subject;
        });

        workflow.apply(order, "submit");
        expect(receivedSubject).toBe(order);
    });

    it("guard evaluator receives subject", () => {
        const evaluator = vi.fn().mockReturnValue(false);
        const workflow = createWorkflow<Order>(guardedStateMachine, {
            markingStore: propertyMarkingStore("status"),
            guardEvaluator: evaluator,
        });
        const order: Order = { id: "1", status: "pending", amount: 5000 };
        workflow.can(order, "approve");
        expect(evaluator).toHaveBeenCalledWith(
            "subject.amount < 1000",
            expect.objectContaining({ subject: order }),
        );
    });

    it("full flow through subject", () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });
        const order: Order = { id: "1", status: "draft", amount: 100 };
        workflow.apply(order, "submit");
        workflow.apply(order, "approve");
        workflow.apply(order, "fulfill");
        expect(order.status).toBe("fulfilled");
    });

    it("listener filter narrows by transition name on subject Workflow", () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });
        const order: Order = { id: "1", status: "draft", amount: 100 };
        const calls: string[] = [];
        workflow.on("entered", { transition: "approve" }, (e) => calls.push(e.transition.name));

        workflow.apply(order, "submit");
        workflow.apply(order, "approve");
        workflow.apply(order, "fulfill");

        expect(calls).toEqual(["approve"]);
    });
});

describe("propertyMarkingStore", () => {
    it("reads single string as marking", () => {
        const store = propertyMarkingStore<{ state: string }, "state">("state");
        const marking = store.read({ state: "draft" });
        expect(marking).toEqual({ draft: 1 });
    });

    it("reads array as marking", () => {
        const store = propertyMarkingStore<{ state: string | string[] }, "state">("state");
        const marking = store.read({ state: ["a", "b"] });
        expect(marking).toEqual({ a: 1, b: 1 });
    });

    it("reads empty/undefined as empty marking", () => {
        const store = propertyMarkingStore<{ state: string }, "state">("state");
        const marking = store.read({ state: "" });
        expect(marking).toEqual({});
    });

    it("writes single place as string", () => {
        const subject = { state: "" };
        const store = propertyMarkingStore<typeof subject, "state">("state");
        store.write(subject, { a: 1, b: 0 });
        expect(subject.state).toBe("a");
    });

    it("writes multiple places as array", () => {
        const subject = { state: "" as string | string[] };
        const store = propertyMarkingStore<typeof subject, "state">("state");
        store.write(subject, { a: 1, b: 1 });
        expect(subject.state).toEqual(["a", "b"]);
    });
});

describe("methodMarkingStore", () => {
    it("reads via getter method", () => {
        const store = methodMarkingStore();
        const subject = {
            _state: "draft",
            getMarking() {
                return this._state;
            },
            setMarking(_v: string | string[]) {
                /* noop */
            },
        };
        const marking = store.read(subject);
        expect(marking).toEqual({ draft: 1 });
    });

    it("writes via setter method", () => {
        const store = methodMarkingStore();
        const subject = {
            _state: "" as string | string[],
            getMarking() {
                return this._state;
            },
            setMarking(v: string | string[]) {
                this._state = v;
            },
        };
        store.write(subject, { submitted: 1, draft: 0 });
        expect(subject._state).toBe("submitted");
    });

    it("supports custom method names", () => {
        const store = methodMarkingStore({ getter: "getState", setter: "setState" });
        const subject = {
            _s: "a" as string | string[],
            getState() {
                return this._s;
            },
            setState(v: string | string[]) {
                this._s = v;
            },
        };
        expect(store.read(subject)).toEqual({ a: 1 });
        store.write(subject, { b: 1 });
        expect(subject._s).toBe("b");
    });

    it("throws if getter missing", () => {
        const store = methodMarkingStore();
        expect(() => store.read({} as never)).toThrow('missing getter method "getMarking()"');
    });

    it("throws if setter missing", () => {
        const store = methodMarkingStore();
        expect(() => store.write({} as never, { a: 1 })).toThrow(
            'missing setter method "setMarking(value)"',
        );
    });
});

describe("Workflow<T> — middleware", () => {
    it("subject middleware receives subject in context", () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
            middleware: [
                (ctx, next) => {
                    expect(ctx.subject).toBeDefined();
                    expect(ctx.subject.id).toBe("1");
                    return next();
                },
            ],
        });
        const order: Order = { id: "1", status: "draft", amount: 100 };
        workflow.apply(order, "submit");
    });

    it("subject middleware wraps the transition", () => {
        const log: string[] = [];
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
            middleware: [
                (_ctx, next) => {
                    log.push("before");
                    const result = next();
                    log.push("after");
                    return result;
                },
            ],
        });
        const order: Order = { id: "1", status: "draft", amount: 100 };
        workflow.apply(order, "submit");
        expect(log).toEqual(["before", "after"]);
    });

    it("use() adds middleware at runtime", () => {
        const log: string[] = [];
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });

        workflow.use((_ctx, next) => {
            log.push("runtime-mw");
            return next();
        });

        const order: Order = { id: "1", status: "draft", amount: 100 };
        workflow.apply(order, "submit");
        expect(log).toEqual(["runtime-mw"]);
    });
});

describe("Workflow<T> — async API", () => {
    it("constructor throws when neither store is provided", () => {
        expect(() => createWorkflow<Order>(orderStateMachine, {} as never)).toThrow(
            /requires either `markingStore` or `asyncMarkingStore`/,
        );
    });

    it("constructor throws when both stores are provided", () => {
        expect(() =>
            createWorkflow<Order>(orderStateMachine, {
                markingStore: propertyMarkingStore("status"),
                asyncMarkingStore: {
                    read: async () => ({}),
                    write: async () => {},
                },
            }),
        ).toThrow(/only one of/);
    });

    it("sync apply() throws when only async store is configured", () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            asyncMarkingStore: {
                read: async () => ({ draft: 1 }),
                write: async () => {},
            },
        });
        const order: Order = { id: "1", status: "draft", amount: 100 };
        expect(() => workflow.apply(order, "submit")).toThrow(/use the async API/);
        expect(() => workflow.can(order, "submit")).toThrow(/use the async API/);
        expect(() => workflow.getMarking(order)).toThrow(/use the async API/);
    });

    it("applyAsync works with a sync marking store", async () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });
        const order: Order = { id: "1", status: "draft", amount: 100 };
        await workflow.applyAsync(order, "submit");
        expect(order.status).toBe("submitted");
    });

    it("applyAsync reads/writes via async marking store", async () => {
        const writes: Marking[] = [];
        const order: Order = { id: "1", status: "draft", amount: 100 };
        const workflow = createWorkflow<Order>(orderStateMachine, {
            asyncMarkingStore: {
                read: async (s) => ({ [s.status]: 1 }),
                write: async (s, marking) => {
                    writes.push(marking);
                    const active = Object.entries(marking)
                        .filter(([, n]) => n > 0)
                        .map(([name]) => name);
                    s.status = active[0] ?? "";
                },
            },
        });

        await workflow.applyAsync(order, "submit");
        expect(order.status).toBe("submitted");
        expect(writes).toHaveLength(1);
        expect(writes[0]).toEqual({ submitted: 1, draft: 0 });
    });

    it("applyAsync awaits async listeners", async () => {
        const events: string[] = [];
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });
        workflow.on("entered", async () => {
            await new Promise((r) => setTimeout(r, 5));
            events.push("entered-async");
        });

        const order: Order = { id: "1", status: "draft", amount: 100 };
        await workflow.applyAsync(order, "submit");
        expect(events).toEqual(["entered-async"]);
    });

    it("rolls back marking when an async listener rejects", async () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });
        workflow.on("entered", async () => {
            throw new Error("listener boom");
        });

        const order: Order = { id: "1", status: "draft", amount: 100 };
        await expect(workflow.applyAsync(order, "submit")).rejects.toThrow("listener boom");
        // Subject is unchanged because the engine rolled back AND the store
        // was never written to.
        expect(order.status).toBe("draft");
    });

    it("does not write to async store when async listener rejects", async () => {
        const writes: Marking[] = [];
        const workflow = createWorkflow<Order>(orderStateMachine, {
            asyncMarkingStore: {
                read: async () => ({ draft: 1 }),
                write: async (_, m) => {
                    writes.push(m);
                },
            },
        });
        workflow.on("entered", async () => {
            throw new Error("listener boom");
        });

        const order: Order = { id: "1", status: "draft", amount: 100 };
        await expect(workflow.applyAsync(order, "submit")).rejects.toThrow();
        expect(writes).toEqual([]);
    });

    it("async middleware runs in applyAsync only", async () => {
        const calls: string[] = [];
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
            asyncMiddleware: [
                async (ctx, next) => {
                    calls.push(`async:${ctx.subject.id}`);
                    return next();
                },
            ],
        });
        const order: Order = { id: "1", status: "draft", amount: 100 };
        await workflow.applyAsync(order, "submit");
        expect(calls).toEqual(["async:1"]);
    });

    it("useAsync registers async middleware at runtime", async () => {
        const calls: string[] = [];
        const workflow = createWorkflow<Order>(orderStateMachine, {
            markingStore: propertyMarkingStore("status"),
        });
        workflow.useAsync(async (_ctx, next) => {
            calls.push("hit");
            return next();
        });

        const order: Order = { id: "1", status: "draft", amount: 100 };
        await workflow.applyAsync(order, "submit");
        expect(calls).toEqual(["hit"]);
    });

    it("canAsync reads via async marking store", async () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            asyncMarkingStore: {
                read: async (s) => ({ [s.status]: 1 }),
                write: async () => {},
            },
        });
        const order: Order = { id: "1", status: "submitted", amount: 100 };
        const result = await workflow.canAsync(order, "approve");
        expect(result.allowed).toBe(true);
    });

    it("getEnabledTransitionsAsync reads via async store", async () => {
        const workflow = createWorkflow<Order>(orderStateMachine, {
            asyncMarkingStore: {
                read: async (s) => ({ [s.status]: 1 }),
                write: async () => {},
            },
        });
        const order: Order = { id: "1", status: "submitted", amount: 100 };
        const enabled = await workflow.getEnabledTransitionsAsync(order);
        expect(enabled.map((t) => t.name).sort()).toEqual(["approve", "reject"]);
    });

    it("restores engine snapshot when async store write fails", async () => {
        const order: Order = { id: "1", status: "draft", amount: 100 };
        const workflow = createWorkflow<Order>(orderStateMachine, {
            asyncMarkingStore: {
                read: async (s) => ({ [s.status]: 1 }),
                write: async () => {
                    throw new Error("store write boom");
                },
            },
        });

        await expect(workflow.applyAsync(order, "submit")).rejects.toThrow("store write boom");
        // The subject's status field is set by a hypothetical store; since
        // the write failed, status stays "draft".
        expect(order.status).toBe("draft");
    });
});
