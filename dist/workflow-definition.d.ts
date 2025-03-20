import { WorkflowEventHandler, WorkflowEventType } from './event-workflow';
export type State = string | string[];
export type Place = {
    metadata?: Record<string, any>;
};
export type Transition = {
    from: State;
    to: State;
    metadata?: Record<string, any>;
};
export type WorkflowType = 'state_machine' | 'workflow';
export interface WorkflowDefinition<T extends Record<string, any>> {
    name: string;
    type?: WorkflowType;
    auditTrail?: boolean | {
        enabled: boolean;
    };
    metadata?: Record<string, any>;
    stateField: keyof T;
    initialState: State;
    places: Record<string, Place>;
    transitions: Record<string, Transition>;
    events?: Partial<Record<WorkflowEventType, WorkflowEventHandler<T>[]>>;
}
