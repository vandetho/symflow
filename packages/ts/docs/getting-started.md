# Getting Started

## Installation

```bash
npm install symflow
```

## Your First Workflow

A workflow definition describes **places** (states), **transitions** (edges between states), and an **initial marking** (starting state).

```ts
import {
    WorkflowEngine,
    validateDefinition,
    type WorkflowDefinition,
} from "symflow/engine";

const definition: WorkflowDefinition = {
    name: "order",
    type: "state_machine",
    places: [
        { name: "draft" },
        { name: "submitted" },
        { name: "approved" },
        { name: "rejected" },
        { name: "fulfilled" },
    ],
    transitions: [
        { name: "submit", froms: ["draft"], tos: ["submitted"] },
        { name: "approve", froms: ["submitted"], tos: ["approved"] },
        { name: "reject", froms: ["submitted"], tos: ["rejected"] },
        { name: "fulfill", froms: ["approved"], tos: ["fulfilled"] },
    ],
    initialMarking: ["draft"],
};
```

## Validate

Always validate before creating an engine:

```ts
const { valid, errors } = validateDefinition(definition);
if (!valid) {
    for (const error of errors) {
        console.error(`[${error.type}] ${error.message}`);
    }
    throw new Error("Invalid workflow definition");
}
```

## Use the Engine

```ts
const engine = new WorkflowEngine(definition);

engine.getActivePlaces();        // ["draft"]
engine.getEnabledTransitions();  // [{ name: "submit", ... }]

// Check before applying
if (engine.can("submit").allowed) {
    engine.apply("submit");
}

engine.getActivePlaces();  // ["submitted"]
```

## Two Workflow Types

### State Machine

`type: "state_machine"` allows exactly one active place at a time. `from: [a, b]` means OR -- the current place must be one of them.

### Petri Net Workflow

`type: "workflow"` allows multiple places to be active simultaneously. `from: [a, b]` means AND -- all listed places must have tokens. This enables parallel execution paths with AND-split (fork) and AND-join (synchronization) patterns.

## Subpath Imports

Import only what you need -- most subpaths have zero dependencies:

```ts
import { WorkflowEngine } from "symflow/engine";       // core engine
import { createWorkflow } from "symflow/subject";       // subject-driven API
import { importWorkflowYaml } from "symflow/yaml";      // YAML import/export
import { importWorkflowJson } from "symflow/json";      // JSON import/export
import { exportWorkflowTs } from "symflow/typescript";   // TypeScript codegen
import { exportWorkflowMermaid } from "symflow/mermaid"; // Mermaid diagrams
import { exportWorkflowDot } from "symflow/graphviz";    // Graphviz DOT
```

## Next Steps

- [CLI](./cli.md) -- validate and export from the command line
- [Weighted Arcs](./weighted-arcs.md) -- transitions that consume/produce multiple tokens
- [Middleware](./middleware.md) -- wrap transitions with logging, metrics, etc.
- [Persistence Formats](./persistence-formats.md) -- YAML, JSON, TypeScript, Mermaid, Graphviz
