import { SymFlow } from './sym-flow';

export class StateMachine<T extends Record<string, any>> extends SymFlow<T> {
    apply(entity: T, transition: string): void {
        if (!this.canTransition(entity, transition)) {
            throw new Error(`Transition "${transition}" is not allowed from state "${entity[this.stateField]}".`);
        }

        // Ensure only **one** active state at a time
        this.applyTransition(entity, transition, this.transitions[transition].to);
    }
}
