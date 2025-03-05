import { LogicException } from './exceptions/logic-exception';
import { Place, Transition } from './workflow-definition';

export class Definition {
    private readonly transitions: Record<string, Transition> = {};
    private readonly places: Record<string, Place> = {};
    private initialPlaces: string[] = [];

    constructor(places: Record<string, Place>, transitions: Record<string, Transition>, initialPlaces?: string[]) {
        Object.keys(places).forEach((place) => {
            this.addPlace(place, places[place]);
        });

        Object.keys(transitions).forEach((transition) => {
            this.addTransition(transition, transitions[transition]);
        });

        this.setInitialPlaces(initialPlaces);
    }

    getInitialPlaces(): string[] {
        return this.initialPlaces;
    }

    setInitialPlaces(places: string[] | undefined): void {
        if (!places) {
            return;
        }

        places.forEach((place) => {
            if (!this.places[place]) {
                throw new LogicException(`Place "{place}" cannot be the initial place as it does not exist.`);
            }
        });

        this.initialPlaces = places;
    }

    addPlace(name: string, place: Place): void {
        if (!this.places.length) {
            this.initialPlaces = [name];
        }

        this.places[name] = place;
    }

    addTransition(name: string, transition: Transition): void {
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

    can(state: string, transition: string): boolean {
        return this.transitions[transition] && this.transitions[transition].from.includes(state);
    }

    apply(state: string, transition: string): string | string[] {
        if (!this.can(state, transition)) {
            throw new Error(`Transition "{transition}" is not allowed from state "{state}".`);
        }
        return this.transitions[transition].to;
    }
}
