export type State = string | string[]; // Allows single or multiple states

export type Place = {
    metadata?: Record<string, any>;
};

export type Transition = {
    from: State;
    to: State;
    metadata?: Record<string, any>;
};

export interface WorkflowDefinition<T extends Record<string, any>> {
    name: string; // 🔹 Unique identifier for the workflow (Required)
    type: 'state_machine' | 'workflow'; // 🔹 Required field
    auditTrail?: boolean | { enabled: boolean };
    metadata?: Record<string, any>;
    stateField: keyof T; // Ensure `stateField` is always required for better type safety
    initialState: State; // Can be a single state or multiple states
    places: Record<string, Place>; // Must contain at least one place
    transitions: Record<string, Transition>; // Defines allowed transitions between states
}
