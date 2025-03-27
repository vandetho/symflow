import { EventEmitter } from 'events';
import { Place, State, Transition, WorkflowDefinition } from './workflow-definition';
import { WorkflowEvent, WorkflowEventHandler, WorkflowEventType } from './event-workflow';
import { AuditTrail } from './audit-trail';
import { loadWorkflowDefinition } from './workflow-loader';

/**
 * Class representing a state or workflow management system with support for finite-state machines and event-driven workflows.
 * Provides functionality to define workflows, enable transitions between states, and handle corresponding events.
 *
 * @template T - The type of the entities managed by the workflow.
 */
export class Symflow<T extends Record<string, any>> {
    protected readonly metadata: Record<string, any>;
    protected readonly places: Record<string, Place>;
    protected readonly transitions: Record<string, Transition>;
    protected readonly stateField: keyof T;
    protected readonly isStateMachine: boolean;
    protected readonly auditEnabled: boolean;
    protected readonly workflowName: string;
    protected readonly eventHandlers: Partial<Record<WorkflowEventType, WorkflowEventHandler<T>[]>> = {};
    private readonly forkSiblingMap: Record<string, string[]> = {};
    private readonly emitter: EventEmitter;

    /**
     * Constructor for initializing a workflow instance. It sets up workflow definition, states, transitions,
     * event emitters, and event handlers based on the provided workflow definition or workflow name string.
     *
     * @param {WorkflowDefinition<T> | string} workflow - The workflow definition object or the name of the workflow to load.
     * @param {EventEmitter} [emitter] - Optional event emitter used for handling workflow-related events.
     *                                    If not provided, a new event emitter will be created.
     */
    constructor(workflow: WorkflowDefinition<T> | string, emitter?: EventEmitter) {
        const definition = typeof workflow === 'string' ? loadWorkflowDefinition<T>(workflow) : workflow;

        this.metadata = definition.metadata || {};
        this.places = definition.places;
        this.transitions = definition.transitions;
        this.stateField = definition.stateField;
        this.isStateMachine = definition.type === 'state_machine';
        this.workflowName = definition.name;
        this.auditEnabled =
            typeof definition.auditTrail === 'boolean'
                ? definition.auditTrail
                : (definition.auditTrail?.enabled ?? false);

        this.emitter = emitter || new EventEmitter();

        if (definition.events) {
            for (const [eventType, handlers] of Object.entries(definition.events) as [
                WorkflowEventType,
                WorkflowEventHandler<T>[],
            ][]) {
                this.eventHandlers[eventType] = handlers;
            }
        }

        for (const transition of Object.values(this.transitions)) {
            if (Array.isArray(transition.to) && transition.to.length > 1) {
                for (const to of transition.to) {
                    this.forkSiblingMap[to] = transition.to.filter((s) => s !== to);
                }
            }
        }
    }

    /**
     * Retrieves the EventEmitter instance associated with the current object.
     *
     * @return {EventEmitter} The EventEmitter instance.
     */
    getEmitter(): EventEmitter {
        return this.emitter;
    }

    /**
     * Retrieves metadata associated with the instance.
     *
     * @return {Record<string, any>} An object containing metadata key-value pairs.
     */
    getMetadata(): Record<string, any> {
        return this.metadata;
    }

    /**
     * Retrieves the list of available transitions for the given entity based on its current states.
     *
     * @param {T} entity - The entity for which the available transitions need to be determined.
     * @return {string[]} An array of transition names that are available for the entity's current states.
     */
    getAvailableTransitions(entity: T): string[] {
        const currentStates = this.getCurrentStates(entity);
        return Object.keys(this.transitions).filter((transition) =>
            this.matchFromStates(currentStates, this.transitions[transition].from),
        );
    }

    /**
     * Retrieves the list of available transitions for a given state.
     *
     * @param {string} state - The current state for which available transitions are to be determined.
     * @return {string[]} An array of transition names that can be applied from the provided state.
     */
    getAvailableTransition(state: string): string[] {
        return Object.keys(this.transitions).filter((transition) =>
            this.matchFromStates([state], this.transitions[transition].from),
        );
    }

    /**
     * Determines if a transition is allowed for a given entity based on its current state.
     *
     * @param {T} entity - The entity for which the transition is being checked.
     * @param {string} transition - The name of the transition to verify.
     * @param {boolean} [shouldTriggerGuard=false] - Indicates whether to trigger the guard event for additional checks.
     * @return {Promise<boolean>} A promise that resolves to a boolean indicating whether the transition is permitted.
     */
    async canTransition(entity: T, transition: string, shouldTriggerGuard: boolean = false): Promise<boolean> {
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
     * Registers an event handler for a specific workflow event type.
     *
     * @param {WorkflowEventType} eventType - The type of the workflow event to listen for.
     * @param {WorkflowEventHandler<T>} handler - The handler function to execute when the specified event occurs.
     * @return {void} This method does not return a value.
     */
    on(eventType: WorkflowEventType, handler: WorkflowEventHandler<T>): void {
        if (!this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = [];
        }
        this.eventHandlers[eventType]!.push(handler);
    }

    /**
     * Triggers an event in the workflow lifecycle. Handles task transitions and emits related events.
     *
     * @param {WorkflowEventType} eventType - The type of the workflow event to trigger (e.g., GUARD, TRANSITION).
     * @param {T} entity - The entity associated with the workflow event.
     * @param {string} transition - The transition name associated with the event.
     * @param {string | string[]} [fromState] - The state(s) the entity is transitioning from.
     * @param {string | string[]} [toState] - The state(s) the entity is transitioning to.
     * @param {boolean} [silent=false] - Whether to suppress audit logging for this event.
     * @return {Promise<boolean>} A promise that resolves to a boolean indicating if the transition is allowed (true) or blocked (false).
     */
    private async triggerEvent(
        eventType: WorkflowEventType,
        entity: T,
        transition: string,
        fromState?: string | string[],
        toState?: string | string[],
        silent: boolean = false,
    ): Promise<boolean> {
        const metadata = this.transitions[transition]?.metadata || {};
        const eventPayload: WorkflowEvent<T> = { entity, transition, fromState, toState, metadata };

        await AuditTrail.logEvent(
            this.workflowName,
            {
                entityId: entity.id,
                eventType,
                transition,
                fromState,
                toState,
                metadata,
                timestamp: new Date().toISOString(),
            },
            !silent && this.auditEnabled,
        );

        const eventTypeKey = eventType.toLowerCase();
        const eventNames = [
            `symflow.${eventTypeKey}`,
            `symflow.${this.workflowName}.${eventTypeKey}`,
            `symflow.${this.workflowName}.${eventTypeKey}.${transition}`,
        ];

        for (const name of eventNames) {
            this.emitter.emit(name, eventPayload);
        }

        let allowTransition = true;

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
     * Applies a transition to the given entity, updating its state and triggering lifecycle events.
     *
     * @param {T} entity - The entity to which the transition will be applied.
     * @param {string} transition - The name of the transition being performed.
     * @param {State} newState - The target state or states to transition to.
     * @return {Promise<void>} A promise that resolves when all lifecycle events have been triggered and the transition is complete.
     */
    protected async applyTransition(entity: T, transition: string, newState: State): Promise<void> {
        const fromState = this.getCurrentStates(entity);

        await this.triggerEvent(WorkflowEventType.ANNOUNCE, entity, transition, fromState, newState);

        if (!(await this.triggerEvent(WorkflowEventType.GUARD, entity, transition, fromState, newState))) {
            throw new Error(`❌ Transition "${transition}" blocked by Guard event.`);
        }

        await this.triggerEvent(WorkflowEventType.LEAVE, entity, transition, fromState, newState);
        await this.triggerEvent(WorkflowEventType.ENTER, entity, transition, fromState, newState);

        if (this.isStateMachine) {
            entity[this.stateField] = (Array.isArray(newState) ? newState[0] : newState) as T[keyof T];
        } else {
            const toStates = Array.isArray(newState) ? newState : [newState];
            const currentStates = this.getCurrentStates(entity);
            const fromStates = this.collectRecursiveFromStates(toStates);
            const forkSiblings = toStates.flatMap((to) => this.forkSiblingMap[to] || []);
            const toRemove = new Set([...fromStates, ...forkSiblings]);
            const keptStates = currentStates.filter((state) => !toRemove.has(state));
            const nextStates = [...new Set([...keptStates, ...toStates])];

            entity[this.stateField] = nextStates as T[keyof T];
        }

        await this.triggerEvent(WorkflowEventType.TRANSITION, entity, transition, fromState, newState);
        await this.triggerEvent(WorkflowEventType.COMPLETED, entity, transition, fromState, newState);
        await this.triggerEvent(WorkflowEventType.ENTERED, entity, transition, fromState, newState);
    }

    /**
     * Applies a specified state transition to the given entity.
     * Validates whether the transition is permissible before applying it.
     *
     * @param {T} entity - The entity to which the state transition will be applied.
     * @param {string} transition - The name of the transition to be applied.
     * @return {Promise<void>} A promise that resolves when the transition is successfully applied.
     * @throws {Error} If the transition is not allowed from the entity's current state.
     */
    async apply(entity: T, transition: string): Promise<void> {
        if (!(await this.canTransition(entity, transition, false))) {
            throw new Error(`Transition "${transition}" is not allowed from state "${entity[this.stateField]}".`);
        }

        await this.applyTransition(entity, transition, this.transitions[transition].to);
    }

    /**
     * Retrieves the current state(s) of the given entity.
     *
     * @param {T} entity - The entity from which to extract the current state(s).
     * @return {string[]} An array of strings representing the current state(s) of the entity.
     */
    private getCurrentStates(entity: T): string[] {
        return Array.isArray(entity[this.stateField])
            ? (entity[this.stateField] as string[])
            : [entity[this.stateField] as string];
    }

    /**
     * Matches the current states with the given `fromStates` criteria.
     *
     * @param {string[]} currentStates - An array of current state names to be matched.
     * @param {State} fromStates - A single state name or an array of state names to check against `currentStates`.
     * @return {boolean} Returns true if `fromStates` matches the criteria for `currentStates`, otherwise false.
     */
    private matchFromStates(currentStates: string[], fromStates: State): boolean {
        if (typeof fromStates === 'string') {
            return currentStates.includes(fromStates);
        }

        if (Array.isArray(fromStates)) {
            if (fromStates.length > 1) {
                return fromStates.every((state) => currentStates.includes(state));
            }
            return fromStates.some((state) => currentStates.includes(state));
        }

        return false;
    }

    /**
     * Collects and returns a set of all states that can transition to the specified target states,
     * recursively traversing transitions.
     *
     * @param {string[]} toStates - An array of target states for which the originating states are to be gathered.
     * @return {Set<string>} A set of all states from which transitions reach the specified target states.
     */
    private collectRecursiveFromStates(toStates: string[]): Set<string> {
        const allFromStates = new Set<string>();
        const visited = new Set<string>();

        const recurse = (currentTo: string) => {
            if (visited.has(currentTo)) return;
            visited.add(currentTo);

            for (const transition of Object.values(this.transitions)) {
                const transitionTo = Array.isArray(transition.to) ? transition.to : [transition.to];
                if (transitionTo.includes(currentTo)) {
                    const from = Array.isArray(transition.from) ? transition.from : [transition.from];
                    from.forEach((f) => {
                        allFromStates.add(f);
                        recurse(f);
                    });
                }
            }
        };

        toStates.forEach(recurse);
        return allFromStates;
    }

    /**
     * Converts the current workflow state and transitions into a Graphviz DOT representation.
     *
     * @return {string} A string representation of the workflow in DOT format, suitable for rendering with Graphviz.
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
     * Converts the state transitions of a state machine into a Mermaid.js graph definition.
     *
     * @return {string} A string representing the state machine transitions in Mermaid.js syntax.
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
