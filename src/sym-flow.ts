import { Place, Transition, WorkflowDefinition } from './workflow-definition';
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

export abstract class SymFlow<T extends Record<string, any>> {
    protected readonly metadata: Record<string, any>;
    protected places: Record<string, Place>;
    protected readonly transitions: Record<string, Transition>;
    protected readonly stateField: keyof T;
    protected readonly eventHandlers: Partial<Record<WorkflowEventType, WorkflowEventHandler<T>[]>> = {};

    constructor(definition: WorkflowDefinition<T>) {
        this.metadata = definition.metadata || {};
        this.places = definition.places;
        this.transitions = definition.transitions;
        this.stateField = definition.stateField || 'state';
        console.log(this.stateField);
    }

    getMetadata(): Record<string, any> {
        return this.metadata;
    }

    getAvailableTransitions(entity: T): string[] {
        return Object.keys(this.transitions).filter((transition) =>
            this.transitions[transition].from.includes(entity[this.stateField] as string),
        );
    }

    canTransition(entity: T, transition: string): boolean {
        return (
            this.transitions[transition] &&
            this.transitions[transition].from.includes(entity[this.stateField] as string)
        );
    }

    on(eventType: WorkflowEventType, handler: WorkflowEventHandler<T>) {
        if (!this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = [];
        }
        this.eventHandlers[eventType]!.push(handler);
    }

    protected triggerEvent(
        eventType: WorkflowEventType,
        entity: T,
        transition: string,
        fromState?: string | string[],
        toState?: string | string[],
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

    protected applyTransition(entity: T, transition: string, newState: string | string[]): void {
        const fromState = entity[this.stateField] as string;
        const toState = newState;

        this.triggerEvent(WorkflowEventType.ANNOUNCE, entity, transition, fromState, toState);
        this.triggerEvent(WorkflowEventType.GUARD, entity, transition, fromState, toState);

        if (!this.canTransition(entity, transition)) {
            throw new Error(`Transition "${transition}" is not allowed from state "${fromState}".`);
        }

        this.triggerEvent(WorkflowEventType.LEAVE, entity, transition, fromState, toState);
        this.triggerEvent(WorkflowEventType.ENTER, entity, transition, fromState, toState);

        // Update state
        entity[this.stateField] = newState as T[keyof T];

        this.triggerEvent(WorkflowEventType.TRANSITION, entity, transition, fromState, toState);
        this.triggerEvent(WorkflowEventType.COMPLETED, entity, transition, fromState, toState);
        this.triggerEvent(WorkflowEventType.ENTERED, entity, transition, fromState, toState);
    }

    abstract apply(entity: T, transition: string): void;
}
