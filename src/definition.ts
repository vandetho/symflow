export type Place = {
    metadata?: Record<string, any>;
};

export type Transition = {
    from: string | string[];
    to: string | string[];
    metadata?: Record<string, any>;
};

export type Definition = {
    metadata?: Record<string, any>;
    initialState: string;
    places: Record<string, Place>;
    transitions: Record<string, Transition>;
};

export class Workflow {
    private metadata: Record<string, any>;
    private places: Record<string, Place>;
    private transitions: Record<string, Transition>;
    public initialState: string;

    constructor(definition: Definition) {
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

    canTransition(state: string, transition: string): boolean {
        return this.transitions[transition] && this.transitions[transition].from.includes(state);
    }

    apply(state: string, transition: string): string | string[] {
        if (!this.canTransition(state, transition)) {
            throw new Error(`Transition "${transition}" is not allowed from state "${state}".`);
        }
        return this.transitions[transition].to;
    }
}
