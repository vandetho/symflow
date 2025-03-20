"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransitionException = void 0;
class TransitionException extends Error {
    constructor(message) {
        super(message);
        this.name = 'TransitionException';
    }
}
exports.TransitionException = TransitionException;
//# sourceMappingURL=transition-exception.js.map