"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Symflow = void 0;
const event_workflow_1 = require("./event-workflow");
const audit_trail_1 = require("./audit-trail");
const workflow_loader_1 = require("./workflow-loader");
class Symflow {
    constructor(workflow) {
        var _a, _b;
        this.eventHandlers = {};
        this.forkSiblingMap = {};
        const definition = typeof workflow === 'string' ? (0, workflow_loader_1.loadWorkflowDefinition)(workflow) : workflow;
        this.metadata = definition.metadata || {};
        this.places = definition.places;
        this.transitions = definition.transitions;
        this.stateField = definition.stateField;
        this.isStateMachine = definition.type === 'state_machine';
        this.workflowName = definition.name;
        this.auditEnabled =
            typeof definition.auditTrail === 'boolean'
                ? definition.auditTrail
                : ((_b = (_a = definition.auditTrail) === null || _a === void 0 ? void 0 : _a.enabled) !== null && _b !== void 0 ? _b : false);
        if (definition.events) {
            for (const [eventType, handlers] of Object.entries(definition.events)) {
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
    getMetadata() {
        return this.metadata;
    }
    getAvailableTransitions(entity) {
        const currentStates = this.getCurrentStates(entity);
        return Object.keys(this.transitions).filter((transition) => this.matchFromStates(currentStates, this.transitions[transition].from));
    }
    getAvailableTransition(state) {
        return Object.keys(this.transitions).filter((transition) => this.matchFromStates([state], this.transitions[transition].from));
    }
    canTransition(entity_1, transition_1) {
        return __awaiter(this, arguments, void 0, function* (entity, transition, shouldTriggerGuard = false) {
            var _a;
            const currentStates = this.getCurrentStates(entity);
            const fromState = (_a = this.transitions[transition]) === null || _a === void 0 ? void 0 : _a.from;
            if (!this.matchFromStates(currentStates, fromState)) {
                return false;
            }
            if (shouldTriggerGuard) {
                return yield this.triggerEvent(event_workflow_1.WorkflowEventType.GUARD, entity, transition, currentStates, this.transitions[transition].to, true);
            }
            return true;
        });
    }
    on(eventType, handler) {
        if (!this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = [];
        }
        this.eventHandlers[eventType].push(handler);
    }
    triggerEvent(eventType_1, entity_1, transition_1, fromState_1, toState_1) {
        return __awaiter(this, arguments, void 0, function* (eventType, entity, transition, fromState, toState, silent = false) {
            var _a, _b;
            const metadata = ((_a = this.transitions[transition]) === null || _a === void 0 ? void 0 : _a.metadata) || {};
            const eventPayload = { entity, transition, fromState, toState, metadata };
            yield audit_trail_1.AuditTrail.logEvent(this.workflowName, {
                entityId: entity.id,
                eventType,
                transition,
                fromState,
                toState,
                metadata,
                timestamp: new Date().toISOString(),
            }, !silent && this.auditEnabled);
            let allowTransition = true;
            if (eventType === event_workflow_1.WorkflowEventType.GUARD) {
                for (const handler of this.eventHandlers[eventType] || []) {
                    if (handler(eventPayload) === false) {
                        allowTransition = false;
                        break;
                    }
                }
            }
            else {
                (_b = this.eventHandlers[eventType]) === null || _b === void 0 ? void 0 : _b.forEach((handler) => handler(eventPayload));
            }
            return allowTransition;
        });
    }
    applyTransition(entity, transition, newState) {
        return __awaiter(this, void 0, void 0, function* () {
            const fromState = this.getCurrentStates(entity);
            yield this.triggerEvent(event_workflow_1.WorkflowEventType.ANNOUNCE, entity, transition, fromState, newState);
            if (!(yield this.triggerEvent(event_workflow_1.WorkflowEventType.GUARD, entity, transition, fromState, newState))) {
                throw new Error(`❌ Transition "${transition}" blocked by Guard event.`);
            }
            yield this.triggerEvent(event_workflow_1.WorkflowEventType.LEAVE, entity, transition, fromState, newState);
            yield this.triggerEvent(event_workflow_1.WorkflowEventType.ENTER, entity, transition, fromState, newState);
            if (this.isStateMachine) {
                entity[this.stateField] = (Array.isArray(newState) ? newState[0] : newState);
            }
            else {
                const toStates = Array.isArray(newState) ? newState : [newState];
                const currentStates = this.getCurrentStates(entity);
                const fromStates = this.collectRecursiveFromStates(toStates);
                const forkSiblings = toStates.flatMap((to) => this.forkSiblingMap[to] || []);
                const toRemove = new Set([...fromStates, ...forkSiblings]);
                const keptStates = currentStates.filter((state) => !toRemove.has(state));
                const nextStates = [...new Set([...keptStates, ...toStates])];
                entity[this.stateField] = nextStates;
            }
            yield this.triggerEvent(event_workflow_1.WorkflowEventType.TRANSITION, entity, transition, fromState, newState);
            yield this.triggerEvent(event_workflow_1.WorkflowEventType.COMPLETED, entity, transition, fromState, newState);
            yield this.triggerEvent(event_workflow_1.WorkflowEventType.ENTERED, entity, transition, fromState, newState);
        });
    }
    apply(entity, transition) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.canTransition(entity, transition, false))) {
                throw new Error(`Transition "${transition}" is not allowed from state "${entity[this.stateField]}".`);
            }
            yield this.applyTransition(entity, transition, this.transitions[transition].to);
        });
    }
    getCurrentStates(entity) {
        return Array.isArray(entity[this.stateField])
            ? entity[this.stateField]
            : [entity[this.stateField]];
    }
    matchFromStates(currentStates, fromStates) {
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
    toGraphviz() {
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
    toMermaid() {
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
    collectRecursiveFromStates(toStates) {
        const allFromStates = new Set();
        const visited = new Set();
        const recurse = (currentTo) => {
            if (visited.has(currentTo))
                return;
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
}
exports.Symflow = Symflow;
//# sourceMappingURL=symflow.js.map