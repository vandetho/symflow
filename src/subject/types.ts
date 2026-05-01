import type {
    GuardResult,
    ListenerFilter,
    Marking,
    Transition,
    WorkflowEvent,
    WorkflowEventType,
    MiddlewareContext,
    WorkflowMiddlewareAsync,
} from "../engine";

/**
 * Reads and writes a workflow's `Marking` onto a domain object (the "subject").
 * Mirrors Symfony's `MarkingStoreInterface`.
 */
export interface MarkingStore<T> {
    read(subject: T): Marking;
    write(subject: T, marking: Marking): void;
}

/**
 * Async variant of `MarkingStore` for backends that need I/O (databases,
 * external APIs). Used with `Workflow.applyAsync()` and `Workflow.canAsync()`.
 * A `Workflow` configured with only an `AsyncMarkingStore` cannot use the
 * sync `apply()`/`can()` methods — those throw at runtime.
 */
export interface AsyncMarkingStore<T> {
    read(subject: T): Promise<Marking>;
    write(subject: T, marking: Marking): Promise<void>;
}

/** A workflow event delivered to listeners attached via `Workflow.on()`. */
export interface SubjectEvent<T> extends WorkflowEvent {
    subject: T;
}

export type SubjectEventListener<T> = (event: SubjectEvent<T>) => void | Promise<void>;

/** Context passed to a subject-aware guard evaluator. */
export interface SubjectGuardContext<T> {
    subject: T;
    marking: Marking;
    transition: Transition;
}

export type SubjectGuardEvaluator<T> = (
    expression: string,
    context: SubjectGuardContext<T>,
) => boolean | GuardResult;

export interface SubjectMiddlewareContext<T> extends MiddlewareContext {
    readonly subject: T;
}

export type SubjectMiddleware<T> = (
    context: SubjectMiddlewareContext<T>,
    next: () => Marking,
) => Marking;

/** Async subject middleware. Runs only inside `Workflow.applyAsync()`. */
export type SubjectMiddlewareAsync<T> = (
    context: SubjectMiddlewareContext<T>,
    next: () => Promise<Marking>,
) => Promise<Marking>;

export type {
    GuardResult,
    ListenerFilter,
    Marking,
    Transition,
    WorkflowEvent,
    WorkflowEventType,
    MiddlewareContext,
    WorkflowMiddlewareAsync,
};
