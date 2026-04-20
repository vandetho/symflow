'use strict';

// src/subject/marking-store.ts
function propertyMarkingStore(property) {
  return {
    read(subject) {
      const value = subject[property];
      if (value === void 0 || value === null || value === "") return {};
      const places = Array.isArray(value) ? value : [value];
      const marking = {};
      for (const place of places) marking[place] = 1;
      return marking;
    },
    write(subject, marking) {
      const active = Object.entries(marking).filter(([, count]) => count > 0).map(([name]) => name);
      const next = active.length === 1 ? active[0] : active;
      subject[property] = next;
    }
  };
}
function methodMarkingStore(options) {
  const getterName = options?.getter ?? "getMarking";
  const setterName = options?.setter ?? "setMarking";
  return {
    read(subject) {
      const getter = subject[getterName];
      if (typeof getter !== "function") {
        throw new Error(`Subject is missing getter method "${getterName}()"`);
      }
      const value = getter.call(subject);
      if (value === void 0 || value === null || value === "") return {};
      const places = Array.isArray(value) ? value : [value];
      const marking = {};
      for (const place of places) marking[place] = 1;
      return marking;
    },
    write(subject, marking) {
      const setter = subject[setterName];
      if (typeof setter !== "function") {
        throw new Error(
          `Subject is missing setter method "${setterName}(value)"`
        );
      }
      const active = Object.entries(marking).filter(([, count]) => count > 0).map(([name]) => name);
      const next = active.length === 1 ? active[0] : active;
      setter.call(subject, next);
    }
  };
}

// src/engine/workflow-engine.ts
var defaultGuardEvaluator = () => true;
var WorkflowEngine = class {
  constructor(definition, options) {
    this.listeners = /* @__PURE__ */ new Map();
    this.definition = definition;
    this.guardEvaluator = options?.guardEvaluator ?? defaultGuardEvaluator;
    this.placeNames = new Set(definition.places.map((p) => p.name));
    this.marking = this.buildInitialMarking();
  }
  buildInitialMarking() {
    const marking = {};
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
  getDefinition() {
    return this.definition;
  }
  getMarking() {
    return { ...this.marking };
  }
  setMarking(marking) {
    this.marking = { ...marking };
  }
  getInitialMarking() {
    return this.buildInitialMarking();
  }
  /** Returns the names of all currently active places (token count > 0) */
  getActivePlaces() {
    return Object.entries(this.marking).filter(([, count]) => count > 0).map(([name]) => name);
  }
  /** Returns all transitions that can fire from the current marking */
  getEnabledTransitions() {
    return this.definition.transitions.filter((t) => this.can(t.name).allowed);
  }
  /** Check if a specific transition can fire */
  can(transitionName) {
    const transition = this.definition.transitions.find(
      (t) => t.name === transitionName
    );
    if (!transition) {
      return {
        allowed: false,
        blockers: [
          {
            code: "unknown_transition",
            message: `Transition "${transitionName}" does not exist`
          }
        ]
      };
    }
    const blockers = [];
    if (this.definition.type === "state_machine") {
      const activePlaces = this.getActivePlaces();
      if (activePlaces.length !== 1) {
        blockers.push({
          code: "invalid_marking",
          message: `State machine must have exactly one active place, found ${activePlaces.length}`
        });
        return { allowed: false, blockers };
      }
      if (!transition.froms.includes(activePlaces[0])) {
        blockers.push({
          code: "not_in_place",
          message: `Current state "${activePlaces[0]}" is not in transition's from places`
        });
        return { allowed: false, blockers };
      }
    } else {
      for (const from of transition.froms) {
        if ((this.marking[from] ?? 0) < 1) {
          blockers.push({
            code: "not_in_place",
            message: `Place "${from}" is not marked`
          });
        }
      }
    }
    if (blockers.length > 0) {
      return { allowed: false, blockers };
    }
    if (transition.guard) {
      const guardPassed = this.guardEvaluator(transition.guard, {
        marking: this.getMarking(),
        transition
      });
      if (!guardPassed) {
        blockers.push({
          code: "guard_blocked",
          message: `Guard "${transition.guard}" blocked the transition`
        });
        return { allowed: false, blockers };
      }
    }
    return { allowed: true, blockers: [] };
  }
  /** Apply a transition and return the new marking */
  apply(transitionName) {
    const result = this.can(transitionName);
    if (!result.allowed) {
      throw new Error(
        `Cannot apply transition "${transitionName}": ${result.blockers.map((b) => b.message).join(", ")}`
      );
    }
    const transition = this.definition.transitions.find(
      (t) => t.name === transitionName
    );
    this.emit("guard", transition);
    for (let i = 0; i < transition.froms.length; i++) {
      this.emit("leave", transition);
    }
    for (const from of transition.froms) {
      this.marking[from] = Math.max(0, (this.marking[from] ?? 0) - 1);
    }
    this.emit("transition", transition);
    for (let i = 0; i < transition.tos.length; i++) {
      this.emit("enter", transition);
    }
    for (const to of transition.tos) {
      this.marking[to] = (this.marking[to] ?? 0) + 1;
    }
    this.emit("entered", transition);
    this.emit("completed", transition);
    const enabled = this.getEnabledTransitions();
    for (let i = 0; i < enabled.length; i++) {
      this.emit("announce", transition);
    }
    return this.getMarking();
  }
  /** Reset marking to initial state */
  reset() {
    this.marking = this.buildInitialMarking();
  }
  /** Register an event listener. Returns an unsubscribe function. */
  on(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, /* @__PURE__ */ new Set());
    }
    this.listeners.get(type).add(listener);
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }
  emit(type, transition) {
    const event = {
      type,
      transition,
      marking: this.getMarking(),
      workflowName: this.definition.name
    };
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
};

// src/subject/workflow.ts
var Workflow = class {
  constructor(definition, options) {
    this.listeners = /* @__PURE__ */ new Map();
    this.definition = definition;
    this.markingStore = options.markingStore;
    this.guardEvaluator = options.guardEvaluator;
  }
  getMarking(subject) {
    return this.markingStore.read(subject);
  }
  setMarking(subject, marking) {
    this.markingStore.write(subject, marking);
  }
  getEnabledTransitions(subject) {
    return this.buildEngine(subject).getEnabledTransitions();
  }
  can(subject, transitionName) {
    return this.buildEngine(subject).can(transitionName);
  }
  apply(subject, transitionName) {
    const engine = this.buildEngine(subject);
    const unsubscribers = [];
    for (const [type, listeners] of this.listeners) {
      unsubscribers.push(
        engine.on(type, (event) => {
          for (const listener of listeners) {
            listener({ ...event, subject });
          }
        })
      );
    }
    try {
      const newMarking = engine.apply(transitionName);
      this.markingStore.write(subject, newMarking);
      return newMarking;
    } finally {
      for (const unsub of unsubscribers) unsub();
    }
  }
  on(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, /* @__PURE__ */ new Set());
    this.listeners.get(type).add(listener);
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }
  buildEngine(subject) {
    const guardEvaluator = this.guardEvaluator;
    const engine = new WorkflowEngine(this.definition, {
      guardEvaluator: guardEvaluator ? (expression, { marking, transition }) => guardEvaluator(expression, { subject, marking, transition }) : void 0
    });
    engine.setMarking(this.markingStore.read(subject));
    return engine;
  }
};
function createWorkflow(definition, options) {
  return new Workflow(definition, options);
}

exports.Workflow = Workflow;
exports.createWorkflow = createWorkflow;
exports.methodMarkingStore = methodMarkingStore;
exports.propertyMarkingStore = propertyMarkingStore;
//# sourceMappingURL=subject.cjs.map
//# sourceMappingURL=subject.cjs.map