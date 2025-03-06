export type Place = {
    metadata?: Record<string, any>;
};

export type Transition = {
    from: string | string[];
    to: string | string[];
    metadata?: Record<string, any>;
};

export interface WorkflowDefinition<T extends Record<string, any>> {
    metadata?: Record<string, any>;
    stateField?: keyof T;
    initialState: string;
    places: Record<string, Place>;
    transitions: Record<string, Transition>;
}
