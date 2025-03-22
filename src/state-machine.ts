import { Symflow } from './symflow';
import { WorkflowDefinition } from './workflow-definition';

export class StateMachine<T extends Record<string, any>> extends Symflow<T> {
    constructor(definition: WorkflowDefinition<T>) {
        if (Array.isArray(definition.initialState)) {
            throw new Error('❌ StateMachine must have a string `initialState`, not an array.');
        }

        for (const [name, transition] of Object.entries(definition.transitions)) {
            if (Array.isArray(transition.from) || Array.isArray(transition.to)) {
                throw new Error(`❌ Transition "${name}" in a StateMachine must use single 'from' and 'to' strings.`);
            }
        }

        super(definition);
    }
}
