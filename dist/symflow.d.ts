import { Place, State, Transition, WorkflowDefinition } from './workflow-definition';
import { WorkflowEventHandler, WorkflowEventType } from './event-workflow';
export declare class Symflow<T extends Record<string, any>> {
    protected readonly metadata: Record<string, any>;
    protected readonly places: Record<string, Place>;
    protected readonly transitions: Record<string, Transition>;
    protected readonly stateField: keyof T;
    protected readonly isStateMachine: boolean;
    protected readonly auditEnabled: boolean;
    protected readonly workflowName: string;
    protected readonly eventHandlers: Partial<Record<WorkflowEventType, WorkflowEventHandler<T>[]>>;
    constructor(workflow: WorkflowDefinition<T> | string);
    getMetadata(): Record<string, any>;
    getAvailableTransitions(entity: T): string[];
    getAvailableTransition(state: string): string[];
    canTransition(entity: T, transition: string, shouldTriggerGuard?: boolean): Promise<boolean>;
    on(eventType: WorkflowEventType, handler: WorkflowEventHandler<T>): void;
    private triggerEvent;
    protected applyTransition(entity: T, transition: string, newState: State): Promise<void>;
    apply(entity: T, transition: string): Promise<void>;
    private getCurrentStates;
    private matchFromStates;
    toGraphviz(): string;
    toMermaid(): string;
}
