import { Symflow } from './symflow';

export class StateMachine<T extends Record<string, any>> extends Symflow<T> {}
