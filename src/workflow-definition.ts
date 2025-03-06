export type Place = {
    metadata?: Record<string, any>;
};

export type Transition = {
    from: string | string[];
    to: string | string[];
    metadata?: Record<string, any>;
};

export interface WorkflowDefinition {
    metadata?: Record<string, any>;
    stateField?: string;
    initialState: string;
    places: Record<string, Place>;
    transitions: Record<string, Transition>;
}
