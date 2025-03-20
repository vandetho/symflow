"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Definition = void 0;
const logic_exception_1 = require("./exceptions/logic-exception");
class Definition {
    constructor(places, transitions, initialPlaces) {
        this.transitions = {};
        this.places = {};
        this.initialPlaces = [];
        Object.keys(places).forEach((place) => {
            this.addPlace(place, places[place]);
        });
        Object.keys(transitions).forEach((transition) => {
            this.addTransition(transition, transitions[transition]);
        });
        this.setInitialPlaces(initialPlaces);
    }
    getInitialPlaces() {
        return this.initialPlaces;
    }
    setInitialPlaces(places) {
        if (!places) {
            return;
        }
        places.forEach((place) => {
            if (!this.places[place]) {
                throw new logic_exception_1.LogicException(`Place "{place}" cannot be the initial place as it does not exist.`);
            }
        });
        this.initialPlaces = places;
    }
    addPlace(name, place) {
        if (!this.places.length) {
            this.initialPlaces = [name];
        }
        this.places[name] = place;
    }
    addTransition(name, transition) {
        const froms = Array.isArray(transition.from) ? transition.from : [transition.from];
        const tos = Array.isArray(transition.to) ? transition.to : [transition.to];
        froms.forEach((from) => {
            if (!this.places[from]) {
                this.addPlace(from, {});
            }
        });
        tos.forEach((to) => {
            if (!this.places[to]) {
                this.addPlace(to, {});
            }
        });
        this.transitions[name] = transition;
    }
    can(state, transition) {
        return this.transitions[transition] && this.transitions[transition].from.includes(state);
    }
    apply(state, transition) {
        if (!this.can(state, transition)) {
            throw new Error(`Transition "{transition}" is not allowed from state "{state}".`);
        }
        return this.transitions[transition].to;
    }
}
exports.Definition = Definition;
//# sourceMappingURL=definition.js.map