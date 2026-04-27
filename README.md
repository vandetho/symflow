# SymFlow

[![CI](https://github.com/vandetho/symflow/actions/workflows/ci.yaml/badge.svg)](https://github.com/vandetho/symflow/actions/workflows/ci.yaml)
[![npm](https://img.shields.io/npm/v/symflow)](https://www.npmjs.com/package/symflow)
[![bundle size](https://img.shields.io/bundlephobia/minzip/symflow)](https://bundlephobia.com/package/symflow)
[![downloads](https://img.shields.io/npm/dm/symflow)](https://npm-stat.com/charts.html?package=symflow)

A Symfony-compatible workflow engine for TypeScript and Node.js. Design state machines and Petri net workflows with the same semantics as Symfony's Workflow component -- no PHP required.

The engine has **zero runtime dependencies** and runs anywhere JavaScript runs: Node.js backends, serverless functions, CLI tools, or the browser. The core engine is **~2.5 kB gzipped** -- the full bundle with all formats is under 8 kB.

> Design workflows visually with [SymFlowBuilder](https://symflowbuilder.com/editor) -- drag-and-drop states and transitions, test with the built-in simulator, then export and run in production.

## Installation

```bash
npm install symflow
```

## Quick Start

```ts
import { WorkflowEngine, validateDefinition, type WorkflowDefinition } from "symflow/engine";

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

const { valid, errors } = validateDefinition(definition);
if (!valid) throw new Error(errors.map((e) => e.message).join("\n"));

const engine = new WorkflowEngine(definition);

engine.getActivePlaces();        // ["draft"]
engine.getEnabledTransitions();  // [{ name: "submit", ... }]

if (engine.can("submit").allowed) {
    engine.apply("submit");
}

engine.getActivePlaces();  // ["submitted"]
```

## Features

- **Two workflow types** -- `state_machine` (single active place) and `workflow` (Petri net with parallel states)
- **Symfony event order** -- `guard > leave > transition > enter > entered > completed > announce`
- **Subject-driven API** -- mirrors Symfony's `$workflow->apply($entity, 'submit')` pattern
- **Marking stores** -- `property` and `method` stores matching Symfony's options
- **Pluggable guards** -- bring your own expression evaluator
- **Weighted arcs** -- transitions can consume/produce multiple tokens per firing
- **Middleware** -- wrap `apply()` with composable before/after hooks
- **Validation** -- catches unreachable places, dead transitions, invalid weights
- **Pattern analysis** -- detects AND-split, AND-join, OR-split, XOR patterns
- **Import/Export** -- YAML (Symfony-compatible), JSON, TypeScript, PHP, Mermaid, Graphviz DOT
- **CLI** -- `symflow validate`, `symflow mermaid`, `symflow dot`
- **React Flow adapter** -- optional integration for visual editors

## CLI

```bash
symflow validate workflow.yaml
symflow mermaid workflow.yaml -o diagram.mmd
symflow dot workflow.yaml | dot -Tpng -o graph.png
```

## Subpath Exports

Import only what you need -- most have zero dependencies.

| Import               | Contents                                                                      | Extra deps             |
|----------------------|-------------------------------------------------------------------------------|------------------------|
| `symflow/engine`     | `WorkflowEngine`, `validateDefinition`, `analyzeWorkflow`, types              | none                   |
| `symflow/subject`    | `Workflow<T>`, `createWorkflow`, `propertyMarkingStore`, `methodMarkingStore` | none                   |
| `symflow/yaml`       | Symfony YAML import/export                                                    | `js-yaml`              |
| `symflow/json`       | JSON import/export                                                            | none                   |
| `symflow/typescript` | TypeScript codegen from a definition                                          | none                   |
| `symflow/php`        | PHP/Laraflow codegen from a definition                                        | none                   |
| `symflow/mermaid`    | Mermaid `stateDiagram-v2` export                                              | none                   |
| `symflow/graphviz`   | Graphviz DOT digraph export                                                   | none                   |
| `symflow/types`      | `WorkflowMeta`, `TransitionListener`, defaults                                | none                   |
| `symflow/react-flow` | React Flow node/edge types, graph utilities                                   | `@xyflow/react` (peer) |
| `symflow`            | All of the above re-exported                                                  | all                    |

## Documentation

| Guide                                                | Description                                                  |
|------------------------------------------------------|--------------------------------------------------------------|
| [Getting Started](./docs/getting-started.md)         | Installation, first workflow, subpath imports                |
| [Concepts](./docs/concepts.md)                       | Mental model: markings, tokens, two workflow types           |
| [Engine API](./docs/engine-api.md)                   | WorkflowEngine, events, guards, validation, pattern analysis |
| [Subject API](./docs/subject-api.md)                 | Workflow\<T\>, marking stores, subject events                |
| [Weighted Arcs](./docs/weighted-arcs.md)             | Multi-token transitions                                      |
| [Middleware](./docs/middleware.md)                   | Composable lifecycle hooks                                   |
| [CLI](./docs/cli.md)                                 | validate, mermaid, dot commands                              |
| [Persistence Formats](./docs/persistence-formats.md) | YAML, JSON, TypeScript, PHP, Mermaid, Graphviz               |

## React Flow Adapter

For visual editors built with React Flow (used by [SymFlowBuilder](https://symflowbuilder.com)):

```ts
import {
    importWorkflowYamlToGraph,
    exportGraphToYaml,
    exportGraphToJson,
    exportGraphToTs,
    exportGraphToPhp,
    exportGraphToMermaid,
    exportGraphToDot,
    autoLayoutNodes,
    buildDefinition,
} from "symflow/react-flow";

// Import YAML into React Flow nodes/edges
const { nodes, edges, meta } = importWorkflowYamlToGraph(yamlString);

// Export from graph
const yaml = exportGraphToYaml({ nodes, edges, meta });
const json = exportGraphToJson({ nodes, edges, meta });
const ts = exportGraphToTs({ nodes, edges, meta, exportName: "myFlow" });
const php = exportGraphToPhp({ nodes, edges, meta });
const mmd = exportGraphToMermaid({ nodes, edges, meta });
const dot = exportGraphToDot({ nodes, edges, meta });
```

`TransitionNodeData` supports `consumeWeight` and `produceWeight` for weighted arc editing. Requires `@xyflow/react` as a peer dependency.

## Laravel / PHP

Looking for the PHP version? See [**symflow-laravel**](https://github.com/vandetho/symflow-laravel) -- the same engine for Laravel 11+.

```bash
composer require vandetho/symflow-laravel
```

## License

MIT
