import { Symflow } from './symflow';

export class Workflow<T extends Record<string, any>> extends Symflow<T> {}
