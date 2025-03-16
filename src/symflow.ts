import { Place, State, Transition, WorkflowDefinition } from './workflow-definition';
import { WorkflowEvent, WorkflowEventHandler, WorkflowEventType } from './event-workflow';
import { AuditTrail } from './audit-trail';
import { loadWorkflowDefinition } from './workflow-loader';

/**
 * SymFlow manages transitions between states.
 * Supports **state machines (single active state)** and **workflows (multiple active states)**.
 */
export class Symflow<T extends Record<string, any>> {
    protected readonly metadata: Record<string, any>;
    protected readonly places: Record<string, Place>;
    protected readonly transitions: Record<string, Transition>;
    protected readonly stateField: keyof T;
    protected readonly isStateMachine: boolean;
    protected readonly auditEnabled: boolean; // 🔹 Per-workflow audit setting
    protected readonly workflowName: string; // 🔹 Unique name for audit logging
    protected readonly eventHandlers: Partial<Record<WorkflowEventType, WorkflowEventHandler<T>[]>> = {};

    constructor(workflow: WorkflowDefinition<T> | string) {
        const definition = typeof workflow === 'string' ? loadWorkflowDefinition<T>(workflow) : workflow;
        this.metadata = definition.metadata || {};
        this.places = definition.places;
        this.transitions = definition.transitions;
        this.stateField = definition.stateField;
        this.isStateMachine = definition.type === 'state_machine';
        this.workflowName = definition.name; // 🔹 Required field
        this.auditEnabled =
            typeof definition.auditTrail === 'boolean'
                ? definition.auditTrail
                : (definition.auditTrail?.enabled ?? false); // 🔹 Default: Disabled

        if (definition.events) {
            for (const [eventType, handlers] of Object.entries(definition.events) as [
                WorkflowEventType,
                WorkflowEventHandler<T>[],
            ][]) {
                this.eventHandlers[eventType] = handlers;
            }
        }
    }

    /**
     * Retrieves the metadata of the workflow.
     */
    getMetadata(): Record<string, any> {
        return this.metadata;
    }

    /**
     * Retrieves all valid transitions available for the entity's current state(s).
     */
    getAvailableTransitions(entity: T): string[] {
        const currentStates = this.getCurrentStates(entity);
        return Object.keys(this.transitions).filter((transition) =>
            this.matchFromStates(currentStates, this.transitions[transition].from),
        );
    }

    /**
     * Retrieves valid transitions available for a **specific state**.
     */
    getAvailableTransition(state: string): string[] {
        return Object.keys(this.transitions).filter((transition) =>
            this.matchFromStates([state], this.transitions[transition].from),
        );
    }

    /**
     * Checks if a transition is allowed based on the entity's current state(s).
     */
    async canTransition(entity: T, transition: string, shouldTriggerGuard = false) {
        const currentStates = this.getCurrentStates(entity);
        const fromState = this.transitions[transition]?.from;
        if (!this.matchFromStates(currentStates, fromState)) {
            return false;
        }

        if (shouldTriggerGuard) {
            return await this.triggerEvent(
                WorkflowEventType.GUARD,
                entity,
                transition,
                currentStates,
                this.transitions[transition].to,
                true,
            );
        }

        return true;
    }

    /**
     * Registers an event listener for a specific workflow event type.
     */
    on(eventType: WorkflowEventType, handler: WorkflowEventHandler<T>) {
        if (!this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = [];
        }
        this.eventHandlers[eventType]!.push(handler);
    }

    /**
     * Triggers an event and logs it persistently.
     */
    private async triggerEvent(
        eventType: WorkflowEventType,
        entity: T,
        transition: string,
        fromState?: string | string[],
        toState?: string | string[],
        silent = false,
    ): Promise<boolean> {
        const metadata = this.transitions[transition]?.metadata || {};

        const eventPayload: WorkflowEvent<T> = { entity, transition, fromState, toState, metadata };

        // Log event to persistent audit trail
        await AuditTrail.logEvent(
            this.workflowName, // 🔹 Use workflow name in logs
            {
                entityId: entity.id, // Ensure entity has an `id` field
                eventType,
                transition,
                fromState,
                toState,
                metadata,
                timestamp: new Date().toISOString(),
            },
            !silent && this.auditEnabled,
        );

        let allowTransition = true;

        // If it's a Guard event, check if any handler returns `false`
        if (eventType === WorkflowEventType.GUARD) {
            for (const handler of this.eventHandlers[eventType] || []) {
                if (handler(eventPayload) === false) {
                    allowTransition = false;
                    break;
                }
            }
        } else {
            this.eventHandlers[eventType]?.forEach((handler) => handler(eventPayload));
        }

        return allowTransition;
    }

    /**
     * Applies a transition to change the entity's state.
     */
    protected async applyTransition(entity: T, transition: string, newState: State): Promise<void> {
        const fromState = this.getCurrentStates(entity);

        await this.triggerEvent(WorkflowEventType.ANNOUNCE, entity, transition, fromState, newState);

        // 🚀 **Check if the Guard event allows the transition**
        if (!(await this.triggerEvent(WorkflowEventType.GUARD, entity, transition, fromState, newState))) {
            throw new Error(`❌ Transition "${transition}" blocked by Guard event.`);
        }

        await this.triggerEvent(WorkflowEventType.LEAVE, entity, transition, fromState, newState);
        await this.triggerEvent(WorkflowEventType.ENTER, entity, transition, fromState, newState);

        if (this.isStateMachine) {
            // **State Machine:** Always set a **single active state**
            entity[this.stateField] = (Array.isArray(newState) ? newState[0] : newState) as T[keyof T];
        } else {
            // **Workflow:** Remove previous states unless explicitly kept
            if (Array.isArray(newState)) {
                entity[this.stateField] = newState as T[keyof T];
            } else {
                entity[this.stateField] = [newState] as T[keyof T];
            }
        }

        await this.triggerEvent(WorkflowEventType.TRANSITION, entity, transition, fromState, newState);
        await this.triggerEvent(WorkflowEventType.COMPLETED, entity, transition, fromState, newState);
        await this.triggerEvent(WorkflowEventType.ENTERED, entity, transition, fromState, newState);
    }

    /**
     * Applies a transition to the entity.
     */
    async apply(entity: T, transition: string) {
        if (!(await this.canTransition(entity, transition, false))) {
            throw new Error(`Transition "${transition}" is not allowed from state "${entity[this.stateField]}".`);
        }

        await this.applyTransition(entity, transition, this.transitions[transition].to);
    }

    /**
     * Retrieves the current state(s) of an entity.
     */
    private getCurrentStates(entity: T): string[] {
        return Array.isArray(entity[this.stateField])
            ? (entity[this.stateField] as string[])
            : [entity[this.stateField] as string];
    }

    /**
     * Checks if the entity's current states match the transition's `from` states.
     * Supports:
     * - **Single state match** (Standard transition)
     * - **Multiple state match** (Workflow with multiple active states)
     * - **AND Condition (`AND` logic requires all states)**
     * - **OR Condition (`OR` logic requires at least one state)**
     */
    private matchFromStates(currentStates: string[], fromStates: State): boolean {
        if (typeof fromStates === 'string') {
            return currentStates.includes(fromStates);
        }

        if (Array.isArray(fromStates)) {
            // **AND Condition:** The entity must have ALL states in `from`
            if (fromStates.length > 1) {
                return fromStates.every((state) => currentStates.includes(state));
            }

            // **OR Condition:** The entity must have at least ONE state in `from`
            return fromStates.some((state) => currentStates.includes(state));
        }

        return false;
    }

    /**
     * Exports the workflow definition to Graphviz DOT format.
     */
    toGraphviz(): string {
        let dot = `digraph Workflow {\n`;

        for (const [state] of Object.entries(this.places)) {
            dot += `    "${state}" [label="${state}"];\n`;
        }

        for (const [transition, { from, to }] of Object.entries(this.transitions)) {
            const fromStates = Array.isArray(from) ? from : [from];
            const toStates = Array.isArray(to) ? to : [to];

            fromStates.forEach((fromState) => {
                toStates.forEach((toState) => {
                    dot += `    "${fromState}" -> "${toState}" [label="${transition}"];\n`;
                });
            });
        }

        dot += `}`;
        return dot;
    }

    /**
     * Exports the workflow definition to Mermaid flowchart format.
     */
    toMermaid(): string {
        let mermaid = `graph TD;\n`;

        for (const [transition, { from, to }] of Object.entries(this.transitions)) {
            const fromStates = Array.isArray(from) ? from : [from];
            const toStates = Array.isArray(to) ? to : [to];

            fromStates.forEach((fromState) => {
                toStates.forEach((toState) => {
                    mermaid += `    ${fromState} -->|${transition}| ${toState};\n`;
                });
            });
        }

        return mermaid;
    }
}
