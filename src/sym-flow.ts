import { Place, Transition, WorkflowDefinition } from './workflow-definition';

export type EventHandler<T> = (entity: T, transition: string) => void;

export abstract class SymFlow<T extends Record<string, any>> {
    protected readonly metadata: Record<string, any>;
    protected places: Record<string, Place>;
    protected readonly transitions: Record<string, Transition>;
    protected readonly stateField: keyof T;
    protected readonly isStateMachine: boolean;
    protected readonly beforeTransitionHandlers: Record<string, EventHandler<T>[]>;
    protected readonly afterTransitionHandlers: Record<string, EventHandler<T>[]>;

    constructor(definition: WorkflowDefinition, stateField: keyof T = 'state', isStateMachine: boolean = true) {
        this.metadata = definition.metadata || {};
        this.places = definition.places;
        this.transitions = definition.transitions;
        this.stateField = stateField;
        this.isStateMachine = isStateMachine;
        this.beforeTransitionHandlers = {};
        this.afterTransitionHandlers = {};
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

    onBeforeTransition(transition: string, handler: EventHandler<T>) {
        if (!this.beforeTransitionHandlers[transition]) {
            this.beforeTransitionHandlers[transition] = [];
        }
        this.beforeTransitionHandlers[transition].push(handler);
    }

    onAfterTransition(transition: string, handler: EventHandler<T>) {
        if (!this.afterTransitionHandlers[transition]) {
            this.afterTransitionHandlers[transition] = [];
        }
        this.afterTransitionHandlers[transition].push(handler);
    }

    protected applyTransition(entity: T, transition: string, newState: string | string[]): void {
        if (this.beforeTransitionHandlers[transition]) {
            this.beforeTransitionHandlers[transition].forEach((handler) => handler(entity, transition));
        }

        entity[this.stateField] = newState as T[keyof T];

        if (this.afterTransitionHandlers[transition]) {
            this.afterTransitionHandlers[transition].forEach((handler) => handler(entity, transition));
        }
    }

    abstract apply(entity: T, transition: string): void;
}
