import { Symflow } from './symflow';
import { WorkflowDefinition } from './workflow-definition';

export class StateMachine<T extends Record<string, any>> extends Symflow<T> {
    constructor(definition: WorkflowDefinition<T>) {
        super(definition, true);
    }
}
