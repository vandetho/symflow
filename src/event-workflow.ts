export enum WorkflowEventType {
    ANNOUNCE = 'ANNOUNCE',
    GUARD = 'GUARD',
    LEAVE = 'LEAVE',
    ENTER = 'ENTER',
    TRANSITION = 'TRANSITION',
    COMPLETED = 'COMPLETED',
    ENTERED = 'ENTERED',
}

interface BaseEvent<T> {
    entity: T;
    transition: string;
    fromState?: string | string[];
    toState?: string | string[];
    metadata?: Record<string, any>;
}

export interface AnnounceEvent<T> extends BaseEvent<T> {}
export interface GuardEvent<T> extends BaseEvent<T> {}
export interface LeaveEvent<T> extends BaseEvent<T> {}
export interface EnterEvent<T> extends BaseEvent<T> {}
export interface TransitionEvent<T> extends BaseEvent<T> {}
export interface CompletedEvent<T> extends BaseEvent<T> {}
export interface EnteredEvent<T> extends BaseEvent<T> {}

export type WorkflowEvent<T> =
    | AnnounceEvent<T>
    | GuardEvent<T>
    | LeaveEvent<T>
    | EnterEvent<T>
    | TransitionEvent<T>
    | CompletedEvent<T>
    | EnteredEvent<T>;

// Event handler types
export type WorkflowEventHandler<T> =
    | ((event: AnnounceEvent<T>) => void)
    | ((event: GuardEvent<T>) => boolean)
    | ((event: LeaveEvent<T>) => void)
    | ((event: EnterEvent<T>) => void)
    | ((event: TransitionEvent<T>) => void)
    | ((event: CompletedEvent<T>) => void)
    | ((event: EnteredEvent<T>) => void);
