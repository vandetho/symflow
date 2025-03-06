import { WorkflowDefinition, State, Transition, Place } from './workflow-definition';
import {
    AnnounceEvent,
    CompletedEvent,
    EnteredEvent,
    EnterEvent,
    GuardEvent,
    LeaveEvent,
    TransitionEvent,
    WorkflowEventHandler,
    WorkflowEventType,
} from './event-workflow';

/**
 * SymFlow manages transitions between states.
 * Supports **state machines (single active state)** and **workflows (multiple active states)**.
 */
export class SymFlow<T extends Record<string, any>> {
    protected readonly metadata: Record<string, any>;
    protected readonly places: Record<string, Place>;
    protected readonly transitions: Record<string, Transition>;
    protected readonly stateField: keyof T;
    protected readonly isStateMachine: boolean;
    protected readonly eventHandlers: Partial<Record<WorkflowEventType, WorkflowEventHandler<T>[]>> = {};

    constructor(definition: WorkflowDefinition<T>, isStateMachine = false) {
        this.metadata = definition.metadata || {};
        this.places = definition.places;
        this.transitions = definition.transitions;
        this.stateField = definition.stateField;
        this.isStateMachine = isStateMachine;
    }

    /**
     * Retrieves the metadata of the workflow.
     */
    getMetadata(): Record<string, any> {
        return this.metadata;
    }

    /**
     * Retrieves all valid transitions available for the entity's current state(s).
     */
    getAvailableTransitions(entity: T): string[] {
        const currentStates = this.getCurrentStates(entity);
        return Object.keys(this.transitions).filter((transition) =>
            this.matchFromStates(currentStates, this.transitions[transition].from),
        );
    }

    /**
     * Retrieves valid transitions available for a **specific state**.
     */
    getAvailableTransition(state: string): string[] {
        return Object.keys(this.transitions).filter((transition) =>
            this.matchFromStates([state], this.transitions[transition].from),
        );
    }

    /**
     * Checks if a transition is allowed based on the entity's current state(s).
     */
    canTransition(entity: T, transition: string): boolean {
        const currentStates = this.getCurrentStates(entity);
        return this.matchFromStates(currentStates, this.transitions[transition]?.from);
    }

    /**
     * Registers an event listener for a specific workflow event type.
     */
    on(eventType: WorkflowEventType, handler: WorkflowEventHandler<T>) {
        if (!this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = [];
        }
        this.eventHandlers[eventType]!.push(handler);
    }

    /**
     * Triggers an event during a transition lifecycle.
     */
    protected triggerEvent(
        eventType: WorkflowEventType,
        entity: T,
        transition: string,
        fromState?: State,
        toState?: State,
    ) {
        const eventPayload:
            | AnnounceEvent<T>
            | GuardEvent<T>
            | LeaveEvent<T>
            | EnterEvent<T>
            | TransitionEvent<T>
            | CompletedEvent<T>
            | EnteredEvent<T> = { entity, transition, fromState, toState };

        this.eventHandlers[eventType]?.forEach((handler) => (handler as any)(eventPayload));
    }

    /**
     * Applies a transition to change the entity's state.
     */
    protected applyTransition(entity: T, transition: string, newState: State) {
        const fromState = this.getCurrentStates(entity);

        this.triggerEvent(WorkflowEventType.ANNOUNCE, entity, transition, fromState, newState);
        this.triggerEvent(WorkflowEventType.GUARD, entity, transition, fromState, newState);

        if (!this.canTransition(entity, transition)) {
            throw new Error(`Transition "${transition}" is not allowed from state "${fromState}".`);
        }

        this.triggerEvent(WorkflowEventType.LEAVE, entity, transition, fromState, newState);
        this.triggerEvent(WorkflowEventType.ENTER, entity, transition, fromState, newState);

        if (this.isStateMachine) {
            // **State Machine:** Always set a **single active state**
            (entity[this.stateField] as unknown as string) = Array.isArray(newState) ? newState[0] : newState;
        } else {
            // **Workflow:** Remove previous states unless explicitly kept
            if (Array.isArray(newState)) {
                (entity[this.stateField] as unknown as string[]) = newState;
            } else {
                (entity[this.stateField] as unknown as string[]) = [newState];
            }
        }

        this.triggerEvent(WorkflowEventType.TRANSITION, entity, transition, fromState, newState);
        this.triggerEvent(WorkflowEventType.COMPLETED, entity, transition, fromState, newState);
        this.triggerEvent(WorkflowEventType.ENTERED, entity, transition, fromState, newState);
    }

    /**
     * Applies a transition to the entity.
     */
    apply(entity: T, transition: string): void {
        if (!this.canTransition(entity, transition)) {
            throw new Error(`Transition "${transition}" is not allowed from state "${entity[this.stateField]}".`);
        }

        this.applyTransition(entity, transition, this.transitions[transition].to);
    }

    /**
     * Retrieves the current state(s) of an entity.
     */
    private getCurrentStates(entity: T): string[] {
        return Array.isArray(entity[this.stateField])
            ? (entity[this.stateField] as string[])
            : [entity[this.stateField] as string];
    }

    /**
     * Checks if the entity's current states match the transition's `from` states.
     * Supports:
     * - **Single state match** (Standard transition)
     * - **Multiple state match** (Workflow with multiple active states)
     * - **AND Condition (`AND` logic requires all states)**
     * - **OR Condition (`OR` logic requires at least one state)**
     */
    private matchFromStates(currentStates: string[], fromStates: State): boolean {
        if (typeof fromStates === 'string') {
            return currentStates.includes(fromStates);
        }

        if (Array.isArray(fromStates)) {
            // **AND Condition:** The entity must have ALL states in `from`
            if (fromStates.length > 1) {
                return fromStates.every((state) => currentStates.includes(state));
            }

            // **OR Condition:** The entity must have at least ONE state in `from`
            return fromStates.some((state) => currentStates.includes(state));
        }

        return false;
    }
}
