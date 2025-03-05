import { WorkflowDefinition } from './workflow-definition';

export class Workflow {
    private readonly metadata: Record<string, any>;
    private places: Record<string, any>;
    private readonly transitions: Record<string, any>;
    public initialState: string;

    constructor(definition: WorkflowDefinition) {
        this.metadata = definition.metadata || {};
        this.places = definition.places;
        this.transitions = definition.transitions;
        this.initialState = definition.initialState;
    }

    getMetadata(): Record<string, any> {
        return this.metadata;
    }

    getPlaceMetadata(place: string): Record<string, any> {
        return this.places[place]?.metadata || {};
    }

    getTransitionMetadata(transition: string): Record<string, any> {
        return this.transitions[transition]?.metadata || {};
    }

    getAvailableTransitions(state: string): string[] {
        return Object.keys(this.transitions).filter((transition) => this.transitions[transition].from.includes(state));
    }

    can(state: string, transition: string): boolean {
        return this.transitions[transition] && this.transitions[transition].from.includes(state);
    }

    apply(state: string[], transition: string): string[] {
        if (!state.every((s) => this.can(s, transition))) {
            throw new Error(`Transition "${transition}" is not allowed from state(s) "${state}".`);
        }

        return state.map(() => this.transitions[transition].to);
    }
}
