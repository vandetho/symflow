export class TransitionException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TransitionException';
    }
}
