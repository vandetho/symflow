import yaml from 'js-yaml';

// src/yaml/export.ts
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

export { exportWorkflowYaml, importWorkflowYaml };
//# sourceMappingURL=yaml.js.map
//# sourceMappingURL=yaml.js.map