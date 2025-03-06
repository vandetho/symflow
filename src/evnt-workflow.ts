import { Workflow } from './workflow';
import { WorkflowDefinition } from './workflow-definition';

export type EventHandler<T> = (entity: T, transition: string) => void;

export class EventWorkflow<T extends Record<string, any>> extends Workflow<T> {
    private readonly beforeTransitionHandlers: Record<string, EventHandler<T>[]>;
    private readonly afterTransitionHandlers: Record<string, EventHandler<T>[]>;

    constructor(definition: WorkflowDefinition) {
        super(definition);
        this.beforeTransitionHandlers = {};
        this.afterTransitionHandlers = {};
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

    applyTransition(entity: T, transition: string): void {
        if (!this.canTransition(entity, transition)) {
            throw new Error(`Transition "${transition}" is not allowed from state "${entity[this.stateField]}".`);
        }

        // Execute before transition handlers
        if (this.beforeTransitionHandlers[transition]) {
            this.beforeTransitionHandlers[transition].forEach((handler) => handler(entity, transition));
        }

        // Change state
        super.applyTransition(entity, transition);

        // Execute after transition handlers
        if (this.afterTransitionHandlers[transition]) {
            this.afterTransitionHandlers[transition].forEach((handler) => handler(entity, transition));
        }
    }
}
