import yaml from 'js-yaml';

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
  const raw = yaml.dump(output, {
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

// src/types/workflow.ts
var DEFAULT_WORKFLOW_META = {
  symfonyVersion: "8.0",
  supports: "App\\Entity\\MyEntity"};

// src/yaml/import.ts
function importWorkflowYaml(yamlString) {
  const parsed = yaml.load(yamlString);
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

export { autoLayoutNodes, buildDefinition, exportGraphToJson, exportGraphToTs, exportGraphToYaml, importWorkflowJsonToGraph, importWorkflowYamlToGraph, migrateGraphData };
//# sourceMappingURL=react-flow.js.map
//# sourceMappingURL=react-flow.js.map