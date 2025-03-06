import { SymFlow } from './sym-flow';
import { WorkflowDefinition } from './workflow-definition';

export class Workflow<T extends Record<string, any>> extends SymFlow<T> {
    constructor(definition: WorkflowDefinition<T>) {
        super(definition, false);
    }
}
