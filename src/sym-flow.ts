import { Place, Transition, WorkflowDefinition } from './workflow-definition';

export type EventHandler<T> = (entity: T, transition: string) => void;

export class SymFlow<T extends Record<string, any>> {
    private readonly metadata: Record<string, any>;
    private places: Record<string, Place>;
    private readonly transitions: Record<string, Transition>;
    private readonly stateField: keyof T;
    private readonly isStateMachine: boolean;
    private readonly beforeTransitionHandlers: Record<string, EventHandler<T>[]>;
    private readonly afterTransitionHandlers: Record<string, EventHandler<T>[]>;

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

    apply(entity: T, transition: string): void {
        if (!this.canTransition(entity, transition)) {
            throw new Error(`Transition "${transition}" is not allowed from state "${entity[this.stateField]}".`);
        }

        if (this.beforeTransitionHandlers[transition]) {
            this.beforeTransitionHandlers[transition].forEach((handler) => handler(entity, transition));
        }

        if (this.isStateMachine) {
            entity[this.stateField] = this.transitions[transition].to as T[keyof T];
        } else {
            if (Array.isArray(entity[this.stateField])) {
                (entity[this.stateField] as unknown as string[]) = [
                    ...(entity[this.stateField] as unknown as string[]),
                    this.transitions[transition].to,
                ];
            } else {
                (entity[this.stateField] as unknown as string) = this.transitions[transition].to;
            }
        }

        if (this.afterTransitionHandlers[transition]) {
            this.afterTransitionHandlers[transition].forEach((handler) => handler(entity, transition));
        }
    }
}
