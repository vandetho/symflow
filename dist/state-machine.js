"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateMachine = void 0;
const symflow_1 = require("./symflow");
class StateMachine extends symflow_1.Symflow {
    constructor(definition) {
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
exports.StateMachine = StateMachine;
//# sourceMappingURL=state-machine.js.map