import { WorkflowEngine, matchesFilter } from "../engine";
import type {
    ListenerFilter,
    Marking,
    Transition,
    TransitionResult,
    WorkflowDefinition,
    WorkflowEventType,
} from "../engine";
import type {
    AsyncMarkingStore,
    MarkingStore,
    SubjectEventListener,
    SubjectGuardEvaluator,
    SubjectMiddleware,
    SubjectMiddlewareAsync,
} from "./types";
import type { MiddlewareContext } from "../engine";

export interface CreateWorkflowOptions<T> {
    /** Sync marking store. Required unless `asyncMarkingStore` is provided. */
    markingStore?: MarkingStore<T>;
    /**
     * Async marking store for I/O-backed persistence (DB, external API).
     * Mutually exclusive with `markingStore`. Configures the workflow for
     * async-only use — sync `apply()`/`can()` will throw at runtime.
     */
    asyncMarkingStore?: AsyncMarkingStore<T>;
    guardEvaluator?: SubjectGuardEvaluator<T>;
    middleware?: SubjectMiddleware<T>[];
    asyncMiddleware?: SubjectMiddlewareAsync<T>[];
}

/**
 * Subject-driven workflow facade. Mirrors Symfony's `Workflow` service:
 * pass the entity to `can()` / `apply()` — the marking is loaded from and
 * written back to the subject via the provided `MarkingStore`.
 */
export class Workflow<T> {
    readonly definition: WorkflowDefinition;
    private readonly markingStore?: MarkingStore<T>;
    private readonly asyncMarkingStore?: AsyncMarkingStore<T>;
    private readonly guardEvaluator?: SubjectGuardEvaluator<T>;
    private readonly listeners = new Map<WorkflowEventType, Set<SubjectEventListener<T>>>();
    private readonly subjectMiddleware: SubjectMiddleware<T>[];
    private readonly subjectAsyncMiddleware: SubjectMiddlewareAsync<T>[];

    constructor(definition: WorkflowDefinition, options: CreateWorkflowOptions<T>) {
        if (!options.markingStore && !options.asyncMarkingStore) {
            throw new Error("Workflow requires either `markingStore` or `asyncMarkingStore`.");
        }
        if (options.markingStore && options.asyncMarkingStore) {
            throw new Error(
                "Workflow accepts only one of `markingStore` or `asyncMarkingStore`, not both.",
            );
        }
        this.definition = definition;
        this.markingStore = options.markingStore;
        this.asyncMarkingStore = options.asyncMarkingStore;
        this.guardEvaluator = options.guardEvaluator;
        this.subjectMiddleware = options.middleware ?? [];
        this.subjectAsyncMiddleware = options.asyncMiddleware ?? [];
    }

    /** Register a sync middleware. Wraps `apply()` only. */
    use(mw: SubjectMiddleware<T>): void {
        this.subjectMiddleware.push(mw);
    }

    /** Register an async middleware. Wraps `applyAsync()` only. */
    useAsync(mw: SubjectMiddlewareAsync<T>): void {
        this.subjectAsyncMiddleware.push(mw);
    }

    getMarking(subject: T): Marking {
        return this.requireSyncStore().read(subject);
    }

    setMarking(subject: T, marking: Marking): void {
        this.requireSyncStore().write(subject, marking);
    }

    async getMarkingAsync(subject: T): Promise<Marking> {
        return this.readMarkingAsync(subject);
    }

    getEnabledTransitions(subject: T): Transition[] {
        const marking = this.requireSyncStore().read(subject);
        return this.buildEngine(subject, marking).getEnabledTransitions();
    }

    async getEnabledTransitionsAsync(subject: T): Promise<Transition[]> {
        const marking = await this.readMarkingAsync(subject);
        return this.buildEngine(subject, marking).getEnabledTransitions();
    }

    can(subject: T, transitionName: string): TransitionResult {
        const marking = this.requireSyncStore().read(subject);
        return this.buildEngine(subject, marking).can(transitionName);
    }

    async canAsync(subject: T, transitionName: string): Promise<TransitionResult> {
        const marking = await this.readMarkingAsync(subject);
        return this.buildEngine(subject, marking).can(transitionName);
    }

    apply(subject: T, transitionName: string): Marking {
        const store = this.requireSyncStore();
        const engine = this.buildEngine(subject, store.read(subject));

        for (const mw of this.subjectMiddleware) {
            engine.use((ctx: MiddlewareContext, next: () => Marking) =>
                mw({ ...ctx, subject }, next),
            );
        }

        const unsubscribers = this.bridgeListenersSync(engine, subject);

        try {
            const newMarking = engine.apply(transitionName);
            store.write(subject, newMarking);
            return newMarking;
        } finally {
            for (const unsub of unsubscribers) unsub();
        }
    }

    /**
     * Async variant of `apply()`. Reads/writes via either a sync or an async
     * marking store; awaits async listeners and async middleware.
     *
     * Atomic from the subject's perspective: if any listener rejects, async
     * middleware throws, or the marking store's `write()` rejects, the
     * subject's stored state is left unchanged (we only write on full
     * success). If the durable store partially persisted before rejecting,
     * recovery is the store implementation's responsibility.
     */
    async applyAsync(subject: T, transitionName: string): Promise<Marking> {
        const initialMarking = await this.readMarkingAsync(subject);
        const engine = this.buildEngine(subject, initialMarking);

        for (const mw of this.subjectAsyncMiddleware) {
            engine.useAsync((ctx, next) => mw({ ...ctx, subject }, next));
        }

        const unsubscribers = this.bridgeListenersAsync(engine, subject);

        try {
            const newMarking = await engine.applyAsync(transitionName);
            await this.writeMarkingAsync(subject, newMarking);
            return newMarking;
        } finally {
            for (const unsub of unsubscribers) unsub();
        }
    }

    on(type: WorkflowEventType, listener: SubjectEventListener<T>): () => void;
    on(
        type: WorkflowEventType,
        filter: ListenerFilter,
        listener: SubjectEventListener<T>,
    ): () => void;
    on(
        type: WorkflowEventType,
        filterOrListener: ListenerFilter | SubjectEventListener<T>,
        maybeListener?: SubjectEventListener<T>,
    ): () => void {
        const [filter, listener]: [ListenerFilter | undefined, SubjectEventListener<T>] =
            typeof filterOrListener === "function"
                ? [undefined, filterOrListener]
                : [filterOrListener, maybeListener!];

        const wrapped: SubjectEventListener<T> = filter
            ? (event) => {
                  if (matchesFilter(event, filter)) return listener(event);
              }
            : listener;

        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type)!.add(wrapped);
        return () => {
            this.listeners.get(type)?.delete(wrapped);
        };
    }

    private buildEngine(subject: T, marking: Marking): WorkflowEngine {
        const guardEvaluator = this.guardEvaluator;
        const engine = new WorkflowEngine(this.definition, {
            guardEvaluator: guardEvaluator
                ? (expression, { marking: m, transition }) =>
                      guardEvaluator(expression, { subject, marking: m, transition })
                : undefined,
        });
        engine.setMarking(marking);
        return engine;
    }

    /**
     * Bridge subject listeners to engine listeners for sync `apply()`.
     * Returns void (not a promise) so the engine doesn't detect-and-warn that
     * the bridge listener is async.
     */
    private bridgeListenersSync(engine: WorkflowEngine, subject: T): Array<() => void> {
        const unsubscribers: Array<() => void> = [];
        for (const [type, listeners] of this.listeners) {
            unsubscribers.push(
                engine.on(type, (event) => {
                    for (const listener of listeners) {
                        listener({ ...event, subject });
                    }
                }),
            );
        }
        return unsubscribers;
    }

    /**
     * Bridge subject listeners for `applyAsync()`. Awaits each subject
     * listener sequentially so async listeners get proper backpressure.
     */
    private bridgeListenersAsync(engine: WorkflowEngine, subject: T): Array<() => void> {
        const unsubscribers: Array<() => void> = [];
        for (const [type, listeners] of this.listeners) {
            unsubscribers.push(
                engine.on(type, async (event) => {
                    for (const listener of listeners) {
                        await listener({ ...event, subject });
                    }
                }),
            );
        }
        return unsubscribers;
    }

    private requireSyncStore(): MarkingStore<T> {
        if (!this.markingStore) {
            throw new Error(
                "Workflow is configured with `asyncMarkingStore`; use the async API " +
                    "(applyAsync, canAsync, getMarkingAsync, getEnabledTransitionsAsync) instead.",
            );
        }
        return this.markingStore;
    }

    private async readMarkingAsync(subject: T): Promise<Marking> {
        if (this.markingStore) return this.markingStore.read(subject);
        return this.asyncMarkingStore!.read(subject);
    }

    private async writeMarkingAsync(subject: T, marking: Marking): Promise<void> {
        if (this.markingStore) {
            this.markingStore.write(subject, marking);
            return;
        }
        await this.asyncMarkingStore!.write(subject, marking);
    }
}

export function createWorkflow<T>(
    definition: WorkflowDefinition,
    options: CreateWorkflowOptions<T>,
): Workflow<T> {
    return new Workflow(definition, options);
}
