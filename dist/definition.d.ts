import { Place, Transition } from './workflow-definition';
export declare class Definition {
    private readonly transitions;
    private readonly places;
    private initialPlaces;
    constructor(places: Record<string, Place>, transitions: Record<string, Transition>, initialPlaces?: string[]);
    getInitialPlaces(): string[];
    setInitialPlaces(places: string[] | undefined): void;
    addPlace(name: string, place: Place): void;
    addTransition(name: string, transition: Transition): void;
    can(state: string, transition: string): boolean;
    apply(state: string, transition: string): string | string[];
}
