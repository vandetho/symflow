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

// src/engine/validator.ts
function validateDefinition(definition) {
  const errors = [];
  const placeNames = new Set(definition.places.map((p) => p.name));
  if (definition.initialMarking.length === 0) {
    errors.push({
      type: "no_initial_marking",
      message: "Workflow has no initial marking"
    });
  }
  for (const place of definition.initialMarking) {
    if (!placeNames.has(place)) {
      errors.push({
        type: "invalid_initial_marking",
        message: `Initial marking references unknown place "${place}"`,
        details: { place }
      });
    }
  }
  for (const transition of definition.transitions) {
    for (const from of transition.froms) {
      if (!placeNames.has(from)) {
        errors.push({
          type: "invalid_transition_source",
          message: `Transition "${transition.name}" references unknown source place "${from}"`,
          details: { transition: transition.name, place: from }
        });
      }
    }
    for (const to of transition.tos) {
      if (!placeNames.has(to)) {
        errors.push({
          type: "invalid_transition_target",
          message: `Transition "${transition.name}" references unknown target place "${to}"`,
          details: { transition: transition.name, place: to }
        });
      }
    }
  }
  const reachable = new Set(definition.initialMarking);
  const queue = [...definition.initialMarking];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const transition of definition.transitions) {
      if (transition.froms.includes(current)) {
        for (const to of transition.tos) {
          if (!reachable.has(to)) {
            reachable.add(to);
            queue.push(to);
          }
        }
      }
    }
  }
  for (const place of definition.places) {
    if (!reachable.has(place.name)) {
      errors.push({
        type: "unreachable_place",
        message: `Place "${place.name}" is unreachable from the initial marking`,
        details: { place: place.name }
      });
    }
  }
  for (const transition of definition.transitions) {
    const allFromsReachable = transition.froms.every((f) => reachable.has(f));
    if (!allFromsReachable) {
      errors.push({
        type: "dead_transition",
        message: `Transition "${transition.name}" can never fire \u2014 not all source places are reachable`,
        details: { transition: transition.name }
      });
    }
  }
  const hasIncoming = /* @__PURE__ */ new Set();
  const hasOutgoing = /* @__PURE__ */ new Set();
  for (const transition of definition.transitions) {
    for (const from of transition.froms) hasOutgoing.add(from);
    for (const to of transition.tos) hasIncoming.add(to);
  }
  for (const place of definition.places) {
    const isInitial = definition.initialMarking.includes(place.name);
    if (!hasIncoming.has(place.name) && !hasOutgoing.has(place.name)) {
      errors.push({
        type: "orphan_place",
        message: `Place "${place.name}" has no transitions${isInitial ? " (initial place)" : ""}`,
        details: { place: place.name, isInitial }
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

// src/engine/analyzer.ts
function analyzeWorkflow(definition) {
  const isStateMachine = definition.type === "state_machine";
  const placeOutgoing = /* @__PURE__ */ new Map();
  const placeIncoming = /* @__PURE__ */ new Map();
  for (const place of definition.places) {
    placeOutgoing.set(place.name, /* @__PURE__ */ new Set());
    placeIncoming.set(place.name, /* @__PURE__ */ new Set());
  }
  for (const transition of definition.transitions) {
    for (const from of transition.froms) {
      placeOutgoing.get(from)?.add(transition.name);
    }
    for (const to of transition.tos) {
      placeIncoming.get(to)?.add(transition.name);
    }
  }
  const transitions = {};
  for (const t of definition.transitions) {
    let pattern;
    if (t.froms.length > 1 && t.tos.length > 1) {
      pattern = "and-split-join";
    } else if (t.froms.length > 1) {
      pattern = "and-join";
    } else if (t.tos.length > 1) {
      pattern = "and-split";
    } else {
      pattern = "simple";
    }
    transitions[t.name] = {
      name: t.name,
      pattern,
      froms: t.froms,
      tos: t.tos
    };
  }
  const places = {};
  for (const place of definition.places) {
    const outgoing = placeOutgoing.get(place.name) ?? /* @__PURE__ */ new Set();
    const incoming = placeIncoming.get(place.name) ?? /* @__PURE__ */ new Set();
    const patterns = [];
    if (outgoing.size > 1) {
      patterns.push(isStateMachine ? "xor-split" : "or-split");
    }
    if (incoming.size > 1) {
      patterns.push(isStateMachine ? "xor-join" : "or-join");
    }
    if (!isStateMachine) {
      for (const tName of incoming) {
        const t = definition.transitions.find((tr) => tr.name === tName);
        if (t && t.tos.length > 1) {
          patterns.push("and-split");
          break;
        }
      }
    }
    if (!isStateMachine) {
      for (const tName of outgoing) {
        const t = definition.transitions.find((tr) => tr.name === tName);
        if (t && t.froms.length > 1) {
          patterns.push("and-join");
          break;
        }
      }
    }
    if (patterns.length === 0) {
      patterns.push("simple");
    }
    places[place.name] = {
      name: place.name,
      patterns,
      incomingTransitions: Array.from(incoming),
      outgoingTransitions: Array.from(outgoing)
    };
  }
  return { places, transitions };
}

export { WorkflowEngine, analyzeWorkflow, validateDefinition };
//# sourceMappingURL=engine.js.map
//# sourceMappingURL=engine.js.map