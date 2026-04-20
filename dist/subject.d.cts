import { M as Marking, T as Transition, j as WorkflowEvent, i as WorkflowDefinition, f as TransitionResult, l as WorkflowEventType } from './types-CGhrS6jV.cjs';

/**
 * Reads and writes a workflow's `Marking` onto a domain object (the "subject").
 * Mirrors Symfony's `MarkingStoreInterface`.
 */
interface MarkingStore<T> {
    read(subject: T): Marking;
    write(subject: T, marking: Marking): void;
}
/** A workflow event delivered to listeners attached via `Workflow.on()`. */
interface SubjectEvent<T> extends WorkflowEvent {
    subject: T;
}
type SubjectEventListener<T> = (event: SubjectEvent<T>) => void;
/** Context passed to a subject-aware guard evaluator. */
interface SubjectGuardContext<T> {
    subject: T;
    marking: Marking;
    transition: Transition;
}
type SubjectGuardEvaluator<T> = (expression: string, context: SubjectGuardContext<T>) => boolean;

/**
 * Marking store that reads/writes a single property on the subject, holding
 * the active place name (string) or names (string[] for parallel markings).
 *
 * Matches Symfony's default `property` marking store:
 *
 *     marking_store:
 *         type: property
 *         property: currentState
 */
declare function propertyMarkingStore<T, K extends keyof T>(property: K): MarkingStore<T>;
/**
 * Marking store that reads/writes the marking via getter/setter methods on the
 * subject. Matches Symfony's `method` marking store.
 *
 *     marking_store:
 *         type: method
 *
 * Expects `subject.getMarking()` / `subject.setMarking(value)` by default.
 */
declare function methodMarkingStore<T>(options?: {
    getter?: string;
    setter?: string;
}): MarkingStore<T>;

interface CreateWorkflowOptions<T> {
    markingStore: MarkingStore<T>;
    guardEvaluator?: SubjectGuardEvaluator<T>;
}
/**
 * Subject-driven workflow facade. Mirrors Symfony's `Workflow` service:
 * pass the entity to `can()` / `apply()` — the marking is loaded from and
 * written back to the subject via the provided `MarkingStore`.
 */
declare class Workflow<T> {
    readonly definition: WorkflowDefinition;
    private readonly markingStore;
    private readonly guardEvaluator?;
    private readonly listeners;
    constructor(definition: WorkflowDefinition, options: CreateWorkflowOptions<T>);
    getMarking(subject: T): Marking;
    setMarking(subject: T, marking: Marking): void;
    getEnabledTransitions(subject: T): Transition[];
    can(subject: T, transitionName: string): TransitionResult;
    apply(subject: T, transitionName: string): Marking;
    on(type: WorkflowEventType, listener: SubjectEventListener<T>): () => void;
    private buildEngine;
}
declare function createWorkflow<T>(definition: WorkflowDefinition, options: CreateWorkflowOptions<T>): Workflow<T>;

export { type CreateWorkflowOptions, Marking, type MarkingStore, type SubjectEvent, type SubjectEventListener, type SubjectGuardContext, type SubjectGuardEvaluator, Transition, Workflow, WorkflowEvent, WorkflowEventType, createWorkflow, methodMarkingStore, propertyMarkingStore };
