'use strict';

var yaml = require('js-yaml');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var yaml__default = /*#__PURE__*/_interopDefault(yaml);

// src/types/workflow.ts
var STATE_NAME_REGEX = /^[a-z][a-z0-9_]*$/;
var DEFAULT_WORKFLOW_META = {
  name: "my_workflow",
  symfonyVersion: "8.0",
  type: "workflow",
  marking_store: "method",
  initial_marking: [],
  supports: "App\\Entity\\MyEntity",
  property: "currentState"
};

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
function exportWorkflowYaml({ definition, meta }) {
  const anyPlaceHasMetadata = definition.places.some(
    (p) => p.metadata && Object.keys(p.metadata).length > 0
  );
  let places;
  if (anyPlaceHasMetadata) {
    const placesObj = {};
    for (const place of definition.places) {
      const hasMetadata = place.metadata && Object.keys(place.metadata).length > 0;
      placesObj[place.name] = hasMetadata ? { metadata: place.metadata } : null;
    }
    places = placesObj;
  } else {
    places = definition.places.map((p) => p.name);
  }
  const transitions = {};
  for (const t of definition.transitions) {
    if (t.froms.length === 0 || t.tos.length === 0) continue;
    const transition = {
      from: t.froms.length === 1 ? t.froms[0] : t.froms,
      to: t.tos.length === 1 ? t.tos[0] : t.tos
    };
    if (t.guard) transition.guard = t.guard;
    if (t.metadata && Object.keys(t.metadata).length > 0) {
      transition.metadata = t.metadata;
    }
    transitions[t.name] = transition;
  }
  const initialMarkingArr = meta.initial_marking.length > 0 ? meta.initial_marking : definition.initialMarking;
  const initialMarking = initialMarkingArr.length === 1 ? initialMarkingArr[0] : initialMarkingArr;
  const workflowConfig = {
    type: meta.type,
    marking_store: {
      type: meta.marking_store,
      property: meta.property
    },
    supports: [meta.supports],
    initial_marking: initialMarking,
    places,
    transitions
  };
  const output = {
    framework: {
      workflows: {
        [meta.name]: workflowConfig
      }
    }
  };
  const raw = yaml__default.default.dump(output, {
    indent: 4,
    lineWidth: 120,
    noRefs: true,
    quotingType: "'",
    forceQuotes: false,
    styles: { "!!null": "canonical" }
  });
  return raw.replace(
    /^( +)([\w][\w.]*):[ ]*\n((?:\1 {4}- .+\n)+)/gm,
    (_match, indent, key, items) => {
      const values = items.split("\n").filter((l) => l.trim().startsWith("- ")).map((l) => l.trim().replace(/^- /, ""));
      return `${indent}${key}: [${values.join(", ")}]
`;
    }
  );
}
function importWorkflowYaml(yamlString) {
  const parsed = yaml__default.default.load(yamlString);
  let workflowName;
  let config;
  if (parsed.framework) {
    const fw = parsed.framework;
    const workflows = fw.workflows;
    const names = Object.keys(workflows);
    if (names.length === 0) throw new Error("No workflow found in YAML");
    workflowName = names[0];
    config = workflows[workflowName];
  } else if (parsed.places || parsed.transitions) {
    workflowName = "imported_workflow";
    config = parsed;
  } else {
    const keys = Object.keys(parsed);
    if (keys.length > 0 && typeof parsed[keys[0]] === "object") {
      const inner = parsed[keys[0]];
      if (inner.places || inner.transitions) {
        workflowName = keys[0];
        config = inner;
      } else {
        throw new Error("Could not detect workflow structure in YAML");
      }
    } else {
      throw new Error("Could not detect workflow structure in YAML");
    }
  }
  const markingStore = config.marking_store;
  const initialMarking = Array.isArray(config.initial_marking) ? config.initial_marking : config.initial_marking ? [config.initial_marking] : [];
  const meta = {
    name: workflowName,
    symfonyVersion: DEFAULT_WORKFLOW_META.symfonyVersion,
    type: config.type ?? "workflow",
    marking_store: markingStore?.type ?? "method",
    property: markingStore?.property ?? "currentState",
    initial_marking: initialMarking,
    supports: Array.isArray(config.supports) ? config.supports[0] : config.supports ?? DEFAULT_WORKFLOW_META.supports
  };
  const placesRaw = config.places;
  const places = [];
  if (Array.isArray(placesRaw)) {
    for (const name of placesRaw) places.push({ name });
  } else if (placesRaw && typeof placesRaw === "object") {
    for (const [name, value] of Object.entries(placesRaw)) {
      const place = { name };
      if (value && typeof value === "object" && "metadata" in value) {
        place.metadata = value.metadata;
      }
      places.push(place);
    }
  }
  const transitionsRaw = config.transitions;
  const transitions = [];
  if (transitionsRaw) {
    for (const [name, tc] of Object.entries(transitionsRaw)) {
      const tcObj = tc;
      const froms = Array.isArray(tcObj.from) ? tcObj.from : [tcObj.from];
      const tos = Array.isArray(tcObj.to) ? tcObj.to : [tcObj.to];
      const transition = { name, froms, tos };
      if (tcObj.guard) transition.guard = tcObj.guard;
      if (tcObj.metadata) {
        transition.metadata = tcObj.metadata;
      }
      transitions.push(transition);
    }
  }
  const definition = {
    name: workflowName,
    type: meta.type,
    places,
    transitions,
    initialMarking
  };
  return { definition, meta };
}

// src/json/export.ts
function exportWorkflowJson({
  definition,
  meta,
  indent = 2
}) {
  const payload = { definition, meta };
  return JSON.stringify(payload, null, indent);
}

// src/json/import.ts
function importWorkflowJson(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(
      `Invalid workflow JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid workflow JSON: expected an object");
  }
  const obj = parsed;
  const definition = obj.definition;
  const meta = obj.meta;
  if (!definition || typeof definition !== "object") {
    throw new Error("Invalid workflow JSON: missing 'definition'");
  }
  if (!meta || typeof meta !== "object") {
    throw new Error("Invalid workflow JSON: missing 'meta'");
  }
  if (!Array.isArray(definition.places) || !Array.isArray(definition.transitions)) {
    throw new Error(
      "Invalid workflow JSON: definition must have places and transitions arrays"
    );
  }
  return { definition, meta };
}

// src/typescript/export.ts
function exportWorkflowTs({
  definition,
  meta,
  exportName = "workflow",
  importFrom = "@symflow/core"
}) {
  const definitionLiteral = JSON.stringify(definition, null, 4);
  const metaLiteral = JSON.stringify(meta, null, 4);
  return `import type { WorkflowDefinition, WorkflowMeta } from "${importFrom}";

export const ${exportName}Definition: WorkflowDefinition = ${definitionLiteral};

export const ${exportName}Meta: WorkflowMeta = ${metaLiteral};
`;
}

// src/adapters/react-flow/definition-builder.ts
function buildDefinition(nodes, edges, meta) {
  const stateNodes = nodes.filter((n) => n.type === "state");
  const transitionNodes = nodes.filter((n) => n.type === "transition");
  const places = stateNodes.map((n) => {
    const data = n.data;
    return {
      name: data.label,
      metadata: Object.keys(data.metadata).length > 0 ? data.metadata : void 0
    };
  });
  const transitions = transitionNodes.map((tNode) => {
    const data = tNode.data;
    const froms = edges.filter((e) => e.target === tNode.id).map((e) => stateNodes.find((n) => n.id === e.source)).filter(Boolean).map((n) => n.data.label);
    const tos = edges.filter((e) => e.source === tNode.id).map((e) => stateNodes.find((n) => n.id === e.target)).filter(Boolean).map((n) => n.data.label);
    return {
      name: data.label,
      froms,
      tos,
      guard: data.guard || void 0,
      metadata: Object.keys(data.metadata).length > 0 ? data.metadata : void 0
    };
  });
  const initialMarking = meta.initial_marking.length > 0 ? meta.initial_marking : stateNodes.filter((n) => n.data.isInitial).map((n) => n.data.label);
  return {
    name: meta.name,
    type: meta.type,
    places,
    transitions,
    initialMarking
  };
}

// src/adapters/react-flow/layout.ts
var NODE_HEIGHT = 100;
var H_GAP = 280;
var V_GAP = 120;
function autoLayoutNodes(nodes, edges) {
  if (nodes.length === 0) return nodes;
  const nodeIds = new Set(nodes.map((n) => n.id));
  const successors = /* @__PURE__ */ new Map();
  const predecessors = /* @__PURE__ */ new Map();
  for (const id of nodeIds) {
    successors.set(id, /* @__PURE__ */ new Set());
    predecessors.set(id, /* @__PURE__ */ new Set());
  }
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      successors.get(edge.source).add(edge.target);
      predecessors.get(edge.target).add(edge.source);
    }
  }
  const roots = nodes.filter((n) => predecessors.get(n.id).size === 0);
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]);
  }
  const layerOf = /* @__PURE__ */ new Map();
  const queue = [];
  for (const root of roots) {
    if (!layerOf.has(root.id)) {
      layerOf.set(root.id, 0);
      queue.push(root.id);
    }
  }
  while (queue.length > 0) {
    const current = queue.shift();
    const currentLayer = layerOf.get(current);
    for (const next of successors.get(current) ?? []) {
      if (!layerOf.has(next)) {
        layerOf.set(next, currentLayer + 1);
        queue.push(next);
      }
    }
  }
  for (const node of nodes) {
    if (!layerOf.has(node.id)) {
      layerOf.set(node.id, 0);
    }
  }
  const layerCount = Math.max(0, ...Array.from(layerOf.values())) + 1;
  const layers = Array.from({ length: layerCount }, () => []);
  for (const node of nodes) {
    layers[layerOf.get(node.id)].push(node.id);
  }
  for (let i = 1; i < layers.length; i++) {
    const prevOrder = /* @__PURE__ */ new Map();
    layers[i - 1].forEach((id, idx) => prevOrder.set(id, idx));
    layers[i].sort((a, b) => {
      const avgA = barycenter(predecessors.get(a), prevOrder);
      const avgB = barycenter(predecessors.get(b), prevOrder);
      return avgA - avgB;
    });
  }
  for (let i = layers.length - 2; i >= 0; i--) {
    const nextOrder = /* @__PURE__ */ new Map();
    layers[i + 1].forEach((id, idx) => nextOrder.set(id, idx));
    layers[i].sort((a, b) => {
      const avgA = barycenter(successors.get(a), nextOrder);
      const avgB = barycenter(successors.get(b), nextOrder);
      return avgA - avgB;
    });
  }
  const positioned = /* @__PURE__ */ new Map();
  const maxLayerSize = Math.max(...layers.map((l) => l.length), 1);
  for (let col = 0; col < layers.length; col++) {
    const layer = layers[col];
    const totalHeight = layer.length * NODE_HEIGHT + (layer.length - 1) * V_GAP;
    const maxTotalHeight = maxLayerSize * NODE_HEIGHT + (maxLayerSize - 1) * V_GAP;
    const startY = (maxTotalHeight - totalHeight) / 2;
    for (let row = 0; row < layer.length; row++) {
      positioned.set(layer[row], {
        x: col * H_GAP,
        y: startY + row * (NODE_HEIGHT + V_GAP)
      });
    }
  }
  return nodes.map((node) => ({
    ...node,
    position: positioned.get(node.id) ?? node.position
  }));
}
function barycenter(neighbors, positions) {
  if (neighbors.size === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const id of neighbors) {
    const pos = positions.get(id);
    if (pos !== void 0) {
      sum += pos;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

// src/adapters/react-flow/migrate-graph.ts
function migrateGraphData(data) {
  const oldEdges = data.edges.filter(
    (e) => e.type === "transition" && e.data && "label" in e.data
  );
  if (oldEdges.length === 0) return data;
  const newNodes = [...data.nodes];
  const newEdges = [];
  for (const edge of data.edges) {
    if (edge.type !== "transition" || !edge.data || !("label" in edge.data)) {
      newEdges.push(edge);
    }
  }
  const transitionGroups = /* @__PURE__ */ new Map();
  for (const edge of oldEdges) {
    const edgeData = edge.data;
    const label = edgeData.label;
    const existing = transitionGroups.get(label);
    if (existing) {
      existing.froms.add(edge.source);
      existing.tos.add(edge.target);
    } else {
      transitionGroups.set(label, {
        froms: /* @__PURE__ */ new Set([edge.source]),
        tos: /* @__PURE__ */ new Set([edge.target]),
        data: edgeData
      });
    }
  }
  for (const [label, group] of transitionGroups) {
    const transitionId = `transition-migrated-${label}`;
    const edgeData = group.data;
    const fromNodes = [...group.froms].map((id) => data.nodes.find((n) => n.id === id)).filter(Boolean);
    const toNodes = [...group.tos].map((id) => data.nodes.find((n) => n.id === id)).filter(Boolean);
    const allConnected = [...fromNodes, ...toNodes];
    const midX = allConnected.length > 0 ? allConnected.reduce((sum, n) => sum + n.position.x, 0) / allConnected.length : 0;
    const midY = allConnected.length > 0 ? allConnected.reduce((sum, n) => sum + n.position.y, 0) / allConnected.length : 0;
    newNodes.push({
      id: transitionId,
      type: "transition",
      position: { x: midX, y: midY },
      data: {
        label,
        guard: edgeData.guard,
        listeners: edgeData.listeners ?? [],
        metadata: edgeData.metadata ?? {}
      }
    });
    for (const fromId of group.froms) {
      newEdges.push({
        id: `edge-migrated-${label}-from-${fromId}`,
        source: fromId,
        target: transitionId,
        type: "connector"
      });
    }
    for (const toId of group.tos) {
      newEdges.push({
        id: `edge-migrated-${label}-to-${toId}`,
        source: transitionId,
        target: toId,
        type: "connector"
      });
    }
  }
  return { nodes: newNodes, edges: newEdges };
}

// src/adapters/react-flow/yaml.ts
function importWorkflowYamlToGraph(yamlString) {
  const { definition, meta } = importWorkflowYaml(yamlString);
  const stateNodes = definition.places.map((place) => ({
    id: `state-${place.name}`,
    type: "state",
    position: { x: 0, y: 0 },
    data: {
      label: place.name,
      isInitial: definition.initialMarking.includes(place.name),
      isFinal: false,
      metadata: place.metadata ?? {}
    }
  }));
  const transitionNodes = [];
  const edges = [];
  for (const transition of definition.transitions) {
    const transitionId = `transition-${transition.name}`;
    transitionNodes.push({
      id: transitionId,
      type: "transition",
      position: { x: 0, y: 0 },
      data: {
        label: transition.name,
        guard: transition.guard,
        listeners: [],
        metadata: transition.metadata ?? {}
      }
    });
    for (const from of transition.froms) {
      edges.push({
        id: `edge-${transition.name}-from-${from}`,
        source: `state-${from}`,
        target: transitionId,
        type: "connector"
      });
    }
    for (const to of transition.tos) {
      edges.push({
        id: `edge-${transition.name}-to-${to}`,
        source: transitionId,
        target: `state-${to}`,
        type: "connector"
      });
    }
  }
  const allNodes = [...stateNodes, ...transitionNodes];
  const statesThatAreSource = new Set(
    edges.filter((e) => e.target.startsWith("transition-")).map((e) => e.source)
  );
  for (const node of stateNodes) {
    if (!statesThatAreSource.has(node.id)) {
      node.data.isFinal = true;
    }
  }
  const layoutedNodes = autoLayoutNodes(allNodes, edges);
  return { nodes: layoutedNodes, edges, meta };
}
function exportGraphToYaml(options) {
  const definition = buildDefinition(options.nodes, options.edges, options.meta);
  return exportWorkflowYaml({ definition, meta: options.meta });
}

// src/adapters/react-flow/json.ts
function importWorkflowJsonToGraph(jsonString) {
  const { definition, meta } = importWorkflowJson(jsonString);
  const stateNodes = definition.places.map((place) => ({
    id: `state-${place.name}`,
    type: "state",
    position: { x: 0, y: 0 },
    data: {
      label: place.name,
      isInitial: definition.initialMarking.includes(place.name),
      isFinal: false,
      metadata: place.metadata ?? {}
    }
  }));
  const transitionNodes = [];
  const edges = [];
  for (const transition of definition.transitions) {
    const transitionId = `transition-${transition.name}`;
    transitionNodes.push({
      id: transitionId,
      type: "transition",
      position: { x: 0, y: 0 },
      data: {
        label: transition.name,
        guard: transition.guard,
        listeners: [],
        metadata: transition.metadata ?? {}
      }
    });
    for (const from of transition.froms) {
      edges.push({
        id: `edge-${transition.name}-from-${from}`,
        source: `state-${from}`,
        target: transitionId,
        type: "connector"
      });
    }
    for (const to of transition.tos) {
      edges.push({
        id: `edge-${transition.name}-to-${to}`,
        source: transitionId,
        target: `state-${to}`,
        type: "connector"
      });
    }
  }
  const allNodes = [...stateNodes, ...transitionNodes];
  const statesThatAreSource = new Set(
    edges.filter((e) => e.target.startsWith("transition-")).map((e) => e.source)
  );
  for (const node of stateNodes) {
    if (!statesThatAreSource.has(node.id)) {
      node.data.isFinal = true;
    }
  }
  const layoutedNodes = autoLayoutNodes(allNodes, edges);
  return { nodes: layoutedNodes, edges, meta };
}
function exportGraphToJson(options) {
  const definition = buildDefinition(options.nodes, options.edges, options.meta);
  return exportWorkflowJson({
    definition,
    meta: options.meta,
    indent: options.indent
  });
}

// src/adapters/react-flow/typescript.ts
function exportGraphToTs(options) {
  const definition = buildDefinition(options.nodes, options.edges, options.meta);
  return exportWorkflowTs({
    definition,
    meta: options.meta,
    exportName: options.exportName,
    importFrom: options.importFrom
  });
}

exports.DEFAULT_WORKFLOW_META = DEFAULT_WORKFLOW_META;
exports.STATE_NAME_REGEX = STATE_NAME_REGEX;
exports.Workflow = Workflow;
exports.WorkflowEngine = WorkflowEngine;
exports.analyzeWorkflow = analyzeWorkflow;
exports.autoLayoutNodes = autoLayoutNodes;
exports.buildDefinition = buildDefinition;
exports.createWorkflow = createWorkflow;
exports.exportGraphToJson = exportGraphToJson;
exports.exportGraphToTs = exportGraphToTs;
exports.exportGraphToYaml = exportGraphToYaml;
exports.exportWorkflowJson = exportWorkflowJson;
exports.exportWorkflowTs = exportWorkflowTs;
exports.exportWorkflowYaml = exportWorkflowYaml;
exports.importWorkflowJson = importWorkflowJson;
exports.importWorkflowJsonToGraph = importWorkflowJsonToGraph;
exports.importWorkflowYaml = importWorkflowYaml;
exports.importWorkflowYamlToGraph = importWorkflowYamlToGraph;
exports.methodMarkingStore = methodMarkingStore;
exports.migrateGraphData = migrateGraphData;
exports.propertyMarkingStore = propertyMarkingStore;
exports.validateDefinition = validateDefinition;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map