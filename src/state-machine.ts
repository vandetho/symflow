import { Place, WorkflowDefinition } from './workflow-definition';

export class StateMachine {
    private metadata: Record<string, any>;
    private places: Record<string, Place>;
    private transitions: Record<string, any>;
    private currentState: string;

    constructor(definition: WorkflowDefinition) {
        this.metadata = definition.metadata || {};
        this.places = definition.places;
        this.transitions = definition.transitions;
        this.currentState = definition.initialState;
    }

    getMetadata(): Record<string, any> {
        return this.metadata;
    }

    getCurrentState(): string {
        return this.currentState;
    }

    getAvailableTransitions(): string[] {
        return Object.keys(this.transitions).filter((transition) =>
            this.transitions[transition].from.includes(this.currentState),
        );
    }

    canTransition(transition: string): boolean {
        return this.transitions[transition] && this.transitions[transition].from.includes(this.currentState);
    }

    apply(transition: string): string {
        if (!this.canTransition(transition)) {
            throw new Error(`Transition "${transition}" is not allowed from state "${this.currentState}".`);
        }

        this.currentState = this.transitions[transition].to;
        return this.currentState;
    }
}
