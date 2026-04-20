/** Mapping of place names to token counts */
type Marking = Record<string, number>;
interface Place {
    name: string;
    metadata?: Record<string, string>;
}
interface Transition {
    name: string;
    froms: string[];
    tos: string[];
    guard?: string;
    metadata?: Record<string, string>;
}
interface WorkflowDefinition {
    name: string;
    type: "workflow" | "state_machine";
    places: Place[];
    transitions: Transition[];
    initialMarking: string[];
}
/** Detected workflow pattern on a transition */
type TransitionPattern = "simple" | "and-split" | "and-join" | "and-split-join" | "or-split" | "or-join";
/** Detected workflow pattern on a place */
type PlacePattern = "simple" | "or-split" | "xor-split" | "or-join" | "xor-join" | "and-split" | "and-join";
interface PlaceAnalysis {
    name: string;
    patterns: PlacePattern[];
    incomingTransitions: string[];
    outgoingTransitions: string[];
}
interface TransitionAnalysis {
    name: string;
    pattern: TransitionPattern;
    froms: string[];
    tos: string[];
}
interface WorkflowAnalysis {
    places: Record<string, PlaceAnalysis>;
    transitions: Record<string, TransitionAnalysis>;
}
interface TransitionBlocker {
    code: string;
    message: string;
}
interface TransitionResult {
    allowed: boolean;
    blockers: TransitionBlocker[];
}
type WorkflowEventType = "guard" | "leave" | "transition" | "enter" | "entered" | "completed" | "announce";
interface WorkflowEvent {
    type: WorkflowEventType;
    transition: Transition;
    marking: Marking;
    workflowName: string;
}
type WorkflowEventListener = (event: WorkflowEvent) => void;
type GuardEvaluator = (expression: string, context: {
    marking: Marking;
    transition: Transition;
}) => boolean;
type ValidationErrorType = "no_initial_marking" | "invalid_initial_marking" | "invalid_transition_source" | "invalid_transition_target" | "unreachable_place" | "dead_transition" | "orphan_place";
interface ValidationError {
    type: ValidationErrorType;
    message: string;
    details?: Record<string, unknown>;
}
interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

export type { GuardEvaluator as G, Marking as M, Place as P, Transition as T, ValidationError as V, WorkflowAnalysis as W, PlaceAnalysis as a, PlacePattern as b, TransitionAnalysis as c, TransitionBlocker as d, TransitionPattern as e, TransitionResult as f, ValidationErrorType as g, ValidationResult as h, WorkflowDefinition as i, WorkflowEvent as j, WorkflowEventListener as k, WorkflowEventType as l };
