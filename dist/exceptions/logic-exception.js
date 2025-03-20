"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogicException = void 0;
class LogicException extends Error {
    constructor(message) {
        super(message);
        this.name = 'LogicException';
    }
}
exports.LogicException = LogicException;
//# sourceMappingURL=logic-exception.js.map