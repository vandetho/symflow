# CLAUDE.md — symflow

## Project Overview

Symfony-compatible workflow engine for TypeScript and Node.js. State machines, Petri nets, guards, events, validation, pattern analysis, and multi-format import/export.

- **npm:** https://www.npmjs.com/package/symflow
- **Repo:** https://github.com/vandetho/symflow
- **Laravel version:** https://github.com/vandetho/symflow-laravel
- **Consumer:** [SymFlowBuilder](https://symflowbuilder.com) imports this as `symflow`
- **Stack:** TypeScript (strict) · tsup (build) · Vitest (test) · ESLint + Prettier
- **Zero runtime deps** except `js-yaml` for YAML and optional `@xyflow/react` peer dep

---

## Coding Conventions

### Style

- **Indentation:** 4 spaces
- **Line width:** 100 chars
- **Quotes:** Double quotes (Prettier)
- **Trailing commas:** Always
- **Arrow parens:** Always `(x) => y`
- **Type imports:** Enforce `import type` keyword (ESLint rule `consistent-type-imports`)
- **Unused params:** Prefix with `_` (ESLint `no-unused-vars` rule)

### Naming

- **Files:** kebab-case (`workflow-engine.ts`, `marking-store.ts`)
- **Types/Interfaces:** PascalCase (`WorkflowEngine`, `Marking`, `TransitionResult`)
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_WORKFLOW_META`, `STATE_NAME_REGEX`)
- **Functions:** camelCase (`validateDefinition`, `analyzeWorkflow`)
- **Private fields:** `private` keyword, no prefix

### Module Structure

```
src/yaml/
  export.ts   — exportWorkflowYaml()
  import.ts   — importWorkflowYaml()
  index.ts    — export * from "./export"; export * from "./import";
```

Index files re-export everything with `export *` — no named re-exports.

### Adding a New Export Format

1. Create `src/{format}/export.ts` — pure function taking `{ definition, meta }`
2. Create `src/{format}/index.ts` — barrel export
3. Add to `src/index.ts`: `export * from "./{format}"`
4. Create `src/adapters/react-flow/{format}.ts` — wrapper calling `buildDefinition()`
5. Add to `src/adapters/react-flow/index.ts`
6. Add entry to `tsup.config.ts` and export map in `package.json`
7. Add tests in `tests/{format}.test.ts`

---

## Architecture

### Engine (`src/engine/`)

- `WorkflowEngine` — Core class. Manages marking (token counts), fires transitions, emits events
- Two workflow types: `state_machine` (single active place) and `workflow` (Petri net, parallel states)
- Event order mirrors Symfony: guard > leave > transition > enter > entered > completed > announce
- Weighted arcs: `Transition.consumeWeight` / `produceWeight` (optional, default 1)
- Middleware: `use(mw)` or `middleware` option — wraps `apply()` lifecycle, `can()` is not wrapped
- `validateDefinition()` — Catches 8 error types (unreachable places, dead transitions, invalid weights, etc.)
- `analyzeWorkflow()` — Detects patterns: AND-split, AND-join, OR-split, XOR-split, etc.

### Subject API (`src/subject/`)

- `Workflow<T>` — Wraps engine with subject awareness (reads/writes marking from domain objects)
- `SubjectMiddleware<T>` — Middleware with `subject` in context, added via `use()` or `middleware` option
- `propertyMarkingStore(prop)` — Reads/writes a string or string[] property
- `methodMarkingStore(opts)` — Calls `getMarking()` / `setMarking()` methods

### Import/Export Modules

All follow `{ definition, meta }` shape:

- **YAML** — Symfony-compatible. Handles `!php/const` and `!php/enum` tags via preprocessing
- **JSON** — Simple `{ definition, meta }` envelope
- **TypeScript** — Generates typed `.ts` module with `{name}Definition` and `{name}Meta` exports
- **PHP** — Generates Laraflow-compatible `.php` config file
- **Mermaid** — `stateDiagram-v2` text output. Sanitizes IDs, auto-detects final states
- **Graphviz** — DOT `digraph` output. Intermediate nodes for AND-split/join, auto-detects final states

### React Flow Adapter (`src/adapters/react-flow/`)

Bridges visual editor graph and engine:

- `buildDefinition(nodes, edges, meta)` — Graph to `WorkflowDefinition`
- `autoLayoutNodes(nodes, edges)` — BFS layering + barycenter heuristic
- `migrateGraphData()` — Idempotent migration from old edge-based to node-based transitions
- Graph export wrappers: `exportGraphToYaml`, `exportGraphToJson`, `exportGraphToTs`, `exportGraphToPhp`, `exportGraphToMermaid`, `exportGraphToDot`

### CLI (`src/cli.ts`)

Commands: `symflow validate <file>`, `symflow mermaid <file>`, `symflow dot <file>`.

---

## Build & Test

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src/
npm run format      # prettier --write
npm test            # vitest run
npm run build       # tsup → dist/ (CJS + ESM + .d.ts)
```

183+ tests across 12 test files.

---

## Release Process

- **Conventional commits** (`feat:` → minor, `fix:` → patch, `chore:`/`docs:` → no release)
- **release-please** automates version bumps and CHANGELOG
- **CI** (`ci.yaml`): lint, format check, typecheck, test, build on Node 20.x + 22.x
- **Publish** (`publish.yaml`): on GitHub release event, `npm publish --provenance`
- **Auto-merge** (`auto-merge.yaml`): release-please and dependabot PRs

---

## Key Constraints

- Strict TypeScript (`strict: true`)
- Zero deps for engine/subject/types/json/typescript/php/mermaid — only `js-yaml` for YAML
- `@xyflow/react` is an optional peer dependency (for react-flow adapter only)
- Marking is `Record<string, number>` — token counts, not just active/inactive
- Weighted arcs: `consumeWeight` / `produceWeight` (default 1)
- Middleware wraps `apply()` only, not `can()`
- Engine returns copies of marking (immutable read)
- YAML export must produce valid Symfony `framework.workflows` config
- Dual CJS + ESM build (tsup with `splitting: false`)
