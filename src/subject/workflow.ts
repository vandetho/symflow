import { WorkflowEngine } from "../engine";
import type {
    Marking,
    Transition,
    TransitionResult,
    WorkflowDefinition,
    WorkflowEventType,
} from "../engine";
import type {
    MarkingStore,
    SubjectEventListener,
    SubjectGuardEvaluator,
    SubjectMiddleware,
} from "./types";
import type { MiddlewareContext } from "../engine";

export interface CreateWorkflowOptions<T> {
    markingStore: MarkingStore<T>;
    guardEvaluator?: SubjectGuardEvaluator<T>;
    middleware?: SubjectMiddleware<T>[];
}

/**
 * Subject-driven workflow facade. Mirrors Symfony's `Workflow` service:
 * pass the entity to `can()` / `apply()` — the marking is loaded from and
 * written back to the subject via the provided `MarkingStore`.
 */
export class Workflow<T> {
    readonly definition: WorkflowDefinition;
    private readonly markingStore: MarkingStore<T>;
    private readonly guardEvaluator?: SubjectGuardEvaluator<T>;
    private readonly listeners = new Map<WorkflowEventType, Set<SubjectEventListener<T>>>();
    private readonly subjectMiddleware: SubjectMiddleware<T>[];

    constructor(definition: WorkflowDefinition, options: CreateWorkflowOptions<T>) {
        this.definition = definition;
        this.markingStore = options.markingStore;
        this.guardEvaluator = options.guardEvaluator;
        this.subjectMiddleware = options.middleware ?? [];
    }

    /** Register a middleware. Middleware wraps the entire apply() lifecycle. */
    use(mw: SubjectMiddleware<T>): void {
        this.subjectMiddleware.push(mw);
    }

    getMarking(subject: T): Marking {
        return this.markingStore.read(subject);
    }

    setMarking(subject: T, marking: Marking): void {
        this.markingStore.write(subject, marking);
    }

    getEnabledTransitions(subject: T): Transition[] {
        return this.buildEngine(subject).getEnabledTransitions();
    }

    can(subject: T, transitionName: string): TransitionResult {
        return this.buildEngine(subject).can(transitionName);
    }

    apply(subject: T, transitionName: string): Marking {
        const engine = this.buildEngine(subject);

        // Convert subject middleware to engine middleware
        for (const mw of this.subjectMiddleware) {
            engine.use((ctx: MiddlewareContext, next: () => Marking) =>
                mw({ ...ctx, subject }, next),
            );
        }

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

        try {
            const newMarking = engine.apply(transitionName);
            this.markingStore.write(subject, newMarking);
            return newMarking;
        } finally {
            for (const unsub of unsubscribers) unsub();
        }
    }

    on(type: WorkflowEventType, listener: SubjectEventListener<T>): () => void {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type)!.add(listener);
        return () => {
            this.listeners.get(type)?.delete(listener);
        };
    }

    private buildEngine(subject: T): WorkflowEngine {
        const guardEvaluator = this.guardEvaluator;
        const engine = new WorkflowEngine(this.definition, {
            guardEvaluator: guardEvaluator
                ? (expression, { marking, transition }) =>
                      guardEvaluator(expression, { subject, marking, transition })
                : undefined,
        });
        engine.setMarking(this.markingStore.read(subject));
        return engine;
    }
}

export function createWorkflow<T>(
    definition: WorkflowDefinition,
    options: CreateWorkflowOptions<T>,
): Workflow<T> {
    return new Workflow(definition, options);
}
