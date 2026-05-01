import type {
    WorkflowDefinition,
    Marking,
    Transition,
    TransitionResult,
    TransitionBlocker,
    WorkflowEventType,
    WorkflowEventListener,
    WorkflowEvent,
    GuardEvaluator,
    ListenerFilter,
    MiddlewareContext,
    WorkflowMiddleware,
} from "./types";

const defaultGuardEvaluator: GuardEvaluator = () => true;

/** Returns true if the event matches the listener filter. Exported for the
 *  subject `Workflow` facade, which mirrors the same filter semantics. */
export function matchesFilter(event: WorkflowEvent, filter: ListenerFilter): boolean {
    if (filter.transition !== undefined) {
        const targets = Array.isArray(filter.transition) ? filter.transition : [filter.transition];
        if (!targets.includes(event.transition.name)) return false;
    }
    return true;
}

export class WorkflowEngine {
    private definition: WorkflowDefinition;
    private marking: Marking;
    private listeners = new Map<WorkflowEventType, Set<WorkflowEventListener>>();
    private guardEvaluator: GuardEvaluator;
    private placeNames: Set<string>;
    private middleware: WorkflowMiddleware[];

    constructor(
        definition: WorkflowDefinition,
        options?: { guardEvaluator?: GuardEvaluator; middleware?: WorkflowMiddleware[] },
    ) {
        this.definition = definition;
        this.guardEvaluator = options?.guardEvaluator ?? defaultGuardEvaluator;
        this.middleware = options?.middleware ?? [];
        this.placeNames = new Set(definition.places.map((p) => p.name));
        this.marking = this.buildInitialMarking();
    }

    /** Register a middleware. Middleware wraps the entire apply() lifecycle. */
    use(mw: WorkflowMiddleware): void {
        this.middleware.push(mw);
    }

    private buildInitialMarking(): Marking {
        const marking: Marking = {};
        for (const place of this.definition.places) {
            marking[place.name] = 0;
        }
        for (const place of this.definition.initialMarking) {
            if (this.placeNames.has(place)) {
                marking[place] = 1;
            }
        }
        return marking;
    }

    getDefinition(): WorkflowDefinition {
        return this.definition;
    }

    getMarking(): Marking {
        return { ...this.marking };
    }

    setMarking(marking: Marking): void {
        this.marking = { ...marking };
    }

    getInitialMarking(): Marking {
        return this.buildInitialMarking();
    }

    /** Returns the names of all currently active places (token count > 0) */
    getActivePlaces(): string[] {
        return Object.entries(this.marking)
            .filter(([, count]) => count > 0)
            .map(([name]) => name);
    }

    /** Returns all transitions that can fire from the current marking */
    getEnabledTransitions(): Transition[] {
        return this.definition.transitions.filter((t) => this.can(t.name).allowed);
    }

    /** Check if a specific transition can fire */
    can(transitionName: string): TransitionResult {
        const transition = this.definition.transitions.find((t) => t.name === transitionName);
        if (!transition) {
            return {
                allowed: false,
                blockers: [
                    {
                        code: "unknown_transition",
                        message: `Transition "${transitionName}" does not exist`,
                    },
                ],
            };
        }

        const blockers: TransitionBlocker[] = [];

        // For state_machine: exactly one place should be active
        if (this.definition.type === "state_machine") {
            const activePlaces = this.getActivePlaces();
            if (activePlaces.length !== 1) {
                blockers.push({
                    code: "invalid_marking",
                    message: `State machine must have exactly one active place, found ${activePlaces.length}`,
                });
                return { allowed: false, blockers };
            }
            if (!transition.froms.includes(activePlaces[0])) {
                blockers.push({
                    code: "not_in_place",
                    message: `Current state "${activePlaces[0]}" is not in transition's from places`,
                });
                return { allowed: false, blockers };
            }
        } else {
            // For workflow: all from-places must have enough tokens
            const weight = transition.consumeWeight ?? 1;
            for (const from of transition.froms) {
                if ((this.marking[from] ?? 0) < weight) {
                    blockers.push({
                        code: "not_in_place",
                        message: `Place "${from}" has ${this.marking[from] ?? 0} token(s), needs ${weight}`,
                    });
                }
            }
        }

        if (blockers.length > 0) {
            return { allowed: false, blockers };
        }

        // Evaluate guard
        if (transition.guard) {
            const guardResult = this.guardEvaluator(transition.guard, {
                marking: this.getMarking(),
                transition,
            });
            const allowed = typeof guardResult === "boolean" ? guardResult : guardResult.allowed;
            if (!allowed) {
                const structured = typeof guardResult === "object" ? guardResult : null;
                blockers.push({
                    code: structured?.code ?? "guard_blocked",
                    message:
                        structured?.reason ?? `Guard "${transition.guard}" blocked the transition`,
                });
                return { allowed: false, blockers };
            }
        }

        return { allowed: true, blockers: [] };
    }

    /**
     * Apply a transition and return the new marking.
     *
     * Atomic: if any event listener throws, the marking is restored to its
     * pre-apply state and the error is re-thrown. Callers see all-or-nothing —
     * either the transition fully succeeds or the engine is unchanged.
     */
    apply(transitionName: string): Marking {
        const result = this.can(transitionName);
        if (!result.allowed) {
            throw new Error(
                `Cannot apply transition "${transitionName}": ${result.blockers.map((b) => b.message).join(", ")}`,
            );
        }

        const transition = this.definition.transitions.find((t) => t.name === transitionName)!;

        if (this.middleware.length === 0) {
            return this.applyCore(transition);
        }

        const context: MiddlewareContext = {
            definition: this.definition,
            transition,
            marking: this.getMarking(),
            workflowName: this.definition.name,
        };

        const chain = this.middleware.reduceRight<() => Marking>(
            (next, mw) => () => mw(context, next),
            () => this.applyCore(transition),
        );

        return chain();
    }

    private applyCore(transition: Transition): Marking {
        // Snapshot for rollback if a listener throws partway through.
        // Without this, a throw in `enter` leaves marking with from-tokens
        // removed and to-tokens not yet added — a corrupted state.
        const snapshot = { ...this.marking };

        try {
            // Fire events in Symfony order:
            // https://symfony.com/doc/current/workflow.html#using-events

            // 1. Guard (already checked in can(), but fire the event)
            this.emit("guard", transition);

            // 2. Leave — fire per from-place, then remove tokens
            for (let i = 0; i < transition.froms.length; i++) {
                this.emit("leave", transition);
            }
            const cw = transition.consumeWeight ?? 1;
            for (const from of transition.froms) {
                this.marking[from] = Math.max(0, (this.marking[from] ?? 0) - cw);
            }

            // 3. Transition
            this.emit("transition", transition);

            // 4. Enter — fire BEFORE marking update (subject not yet in new place)
            for (let i = 0; i < transition.tos.length; i++) {
                this.emit("enter", transition);
            }

            // 5. Update marking (add tokens to target places)
            const pw = transition.produceWeight ?? 1;
            for (const to of transition.tos) {
                this.marking[to] = (this.marking[to] ?? 0) + pw;
            }

            // 6. Entered — fire AFTER marking update (subject is now in new place)
            this.emit("entered", transition);

            // 7. Completed
            this.emit("completed", transition);

            // 8. Announce — fire once per currently-enabled transition, with
            // the *enabled* transition in the event payload (not the applied
            // one). This lets listeners use `engine.on("announce", { transition: "X" }, …)`
            // to react when X becomes reachable, mirroring Symfony's
            // `workflow.<name>.announce.<X>` event-name idiom.
            const enabled = this.getEnabledTransitions();
            for (const next of enabled) {
                this.emit("announce", next);
            }

            return this.getMarking();
        } catch (err) {
            this.marking = snapshot;
            throw err;
        }
    }

    /** Reset marking to initial state */
    reset(): void {
        this.marking = this.buildInitialMarking();
    }

    /** Register an event listener. Returns an unsubscribe function. */
    on(type: WorkflowEventType, listener: WorkflowEventListener): () => void;
    /**
     * Register an event listener that only fires when the event matches the
     * given filter. Useful to scope a listener to a specific transition
     * without filtering inside the listener body.
     */
    on(
        type: WorkflowEventType,
        filter: ListenerFilter,
        listener: WorkflowEventListener,
    ): () => void;
    on(
        type: WorkflowEventType,
        filterOrListener: ListenerFilter | WorkflowEventListener,
        maybeListener?: WorkflowEventListener,
    ): () => void {
        const [filter, listener]: [ListenerFilter | undefined, WorkflowEventListener] =
            typeof filterOrListener === "function"
                ? [undefined, filterOrListener]
                : [filterOrListener, maybeListener!];

        const wrapped: WorkflowEventListener = filter
            ? (event) => {
                  if (matchesFilter(event, filter)) listener(event);
              }
            : listener;

        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(wrapped);
        return () => {
            this.listeners.get(type)?.delete(wrapped);
        };
    }

    private emit(type: WorkflowEventType, transition: Transition): void {
        const event: WorkflowEvent = {
            type,
            transition,
            marking: this.getMarking(),
            workflowName: this.definition.name,
        };
        this.listeners.get(type)?.forEach((listener) => listener(event));
    }
}
