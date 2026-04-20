type SymfonyVersion = "5.4" | "6.4" | "7.4" | "8.0";
type WorkflowType = "workflow" | "state_machine";
type MarkingStoreType = "method" | "property";
interface TransitionListener {
    event: string;
    service: string;
}
interface WorkflowMeta {
    name: string;
    symfonyVersion: SymfonyVersion;
    type: WorkflowType;
    marking_store: MarkingStoreType;
    initial_marking: string[];
    supports: string;
    property: string;
}
declare const STATE_NAME_REGEX: RegExp;
declare const DEFAULT_WORKFLOW_META: WorkflowMeta;

export { DEFAULT_WORKFLOW_META, type MarkingStoreType, STATE_NAME_REGEX, type SymfonyVersion, type TransitionListener, type WorkflowMeta, type WorkflowType };
