import { i as WorkflowDefinition, G as GuardEvaluator, M as Marking, T as Transition, f as TransitionResult, l as WorkflowEventType, k as WorkflowEventListener, h as ValidationResult, W as WorkflowAnalysis } from './types-CGhrS6jV.cjs';
export { P as Place, a as PlaceAnalysis, b as PlacePattern, c as TransitionAnalysis, d as TransitionBlocker, e as TransitionPattern, V as ValidationError, g as ValidationErrorType, j as WorkflowEvent } from './types-CGhrS6jV.cjs';

declare class WorkflowEngine {
    private definition;
    private marking;
    private listeners;
    private guardEvaluator;
    private placeNames;
    constructor(definition: WorkflowDefinition, options?: {
        guardEvaluator?: GuardEvaluator;
    });
    private buildInitialMarking;
    getDefinition(): WorkflowDefinition;
    getMarking(): Marking;
    setMarking(marking: Marking): void;
    getInitialMarking(): Marking;
    /** Returns the names of all currently active places (token count > 0) */
    getActivePlaces(): string[];
    /** Returns all transitions that can fire from the current marking */
    getEnabledTransitions(): Transition[];
    /** Check if a specific transition can fire */
    can(transitionName: string): TransitionResult;
    /** Apply a transition and return the new marking */
    apply(transitionName: string): Marking;
    /** Reset marking to initial state */
    reset(): void;
    /** Register an event listener. Returns an unsubscribe function. */
    on(type: WorkflowEventType, listener: WorkflowEventListener): () => void;
    private emit;
}

declare function validateDefinition(definition: WorkflowDefinition): ValidationResult;

/**
 * Analyzes a workflow definition to detect structural patterns.
 *
 * Pattern semantics depend on the workflow type:
 * - state_machine: one place active at a time → splits/joins are XOR (exclusive)
 * - workflow: multiple places can be active → splits/joins are OR (non-exclusive)
 *   and AND patterns (from/to arrays) create parallel states
 */
declare function analyzeWorkflow(definition: WorkflowDefinition): WorkflowAnalysis;

export { GuardEvaluator, Marking, Transition, TransitionResult, ValidationResult, WorkflowAnalysis, WorkflowDefinition, WorkflowEngine, WorkflowEventListener, WorkflowEventType, analyzeWorkflow, validateDefinition };
