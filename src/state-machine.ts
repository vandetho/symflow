import { WorkflowDefinition } from './workflow-definition';
import { SymFlow } from './sym-flow';

export class StateMachine<T extends Record<string, any>> extends SymFlow<T> {
    constructor(definition: WorkflowDefinition, stateField: keyof T = 'state') {
        super(definition, stateField);
    }

    apply(entity: T, transition: string): void {
        if (!this.canTransition(entity, transition)) {
            throw new Error(`Transition "${transition}" is not allowed from state "${entity[this.stateField]}".`);
        }

        entity[this.stateField] = this.transitions[transition].to as any;
    }
}
