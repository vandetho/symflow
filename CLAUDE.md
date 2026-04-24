# CLAUDE.md — symflow monorepo

## Project Overview

Monorepo for the SymFlow workflow engine — Symfony-compatible state machines and Petri nets.

| Package | Path | Registry | Language |
|---------|------|----------|----------|
| **symflow** | `packages/ts/` | [npm](https://www.npmjs.com/package/symflow) | TypeScript |
| **laraflow** | `packages/laravel/` | [Packagist](https://packagist.org/packages/vandetho/laraflow) | PHP 8.2+ / Laravel 11+ |

- **Repo:** https://github.com/vandetho/symflow
- **Consumer:** [SymFlowBuilder](https://symflowbuilder.com)

---

## packages/ts — symflow (TypeScript)

### Stack
TypeScript (strict) · tsup (build) · Vitest (test) · ESLint + Prettier
Zero runtime deps except `js-yaml` for YAML and optional `@xyflow/react` peer dep.

### Style
- 4 spaces, 100 chars, double quotes, trailing commas
- Files: kebab-case · Types: PascalCase · Constants: UPPER_SNAKE_CASE · Functions: camelCase
- Enforce `import type` keyword · Unused params: prefix with `_`

### Architecture
- **Engine** (`src/engine/`) — `WorkflowEngine`, `validateDefinition`, `analyzeWorkflow`, weighted arcs, middleware
- **Subject** (`src/subject/`) — `Workflow<T>`, `propertyMarkingStore`, `methodMarkingStore`, `SubjectMiddleware`
- **Import/Export** — YAML (Symfony-compat), JSON, TypeScript, Mermaid, Graphviz DOT
- **React Flow Adapter** (`src/adapters/react-flow/`) — graph ↔ definition, auto-layout
- **CLI** (`src/cli.ts`) — `symflow validate|mermaid|dot <file>`

### Build & Test
```bash
cd packages/ts
npm run typecheck && npm run lint && npm test && npm run build
```
169+ tests across 11 test files.

---

## packages/laravel — laraflow (PHP)

### Stack
PHP 8.2+ · Laravel 11+ · Pest (test) · symfony/yaml

### Style
- PSR-4 autoloading under `Laraflow\` namespace
- PHP 8.2 enums, readonly classes, strict types
- Pest test framework

### Architecture
- **Engine** (`src/Engine/`) — `WorkflowEngine`, `Validator`, `Analyzer`
- **Subject** (`src/Subject/`) — `Workflow`, `PropertyMarkingStore`, `MethodMarkingStore`
- **Import/Export** — YAML, JSON, PHP codegen, Mermaid, Graphviz DOT
- **Laravel** — `LaraflowServiceProvider`, `Laraflow` facade, `HasWorkflowTrait`, 7 event classes, `WorkflowRegistry`
- **Console** — `laraflow:validate`, `laraflow:mermaid`, `laraflow:dot`
- **Config** — `config/laraflow.php` (declarative workflow definitions)

### Build & Test
```bash
cd packages/laravel
composer install && ./vendor/bin/pest
```
117 tests, 199 assertions.

---

## CI/CD

- **CI** (`ci.yaml`): Runs both `ts` (Node 20.x + 22.x) and `laravel` (PHP 8.2) jobs
- **Publish** (`publish.yaml`): npm publish from `packages/ts/` on GitHub release
- **Auto-merge** (`auto-merge.yaml`): release-please and dependabot PRs

---

## Coding Conventions (TypeScript)

### Module Structure
```
src/yaml/
  export.ts   — exportWorkflowYaml()
  import.ts   — importWorkflowYaml()
  index.ts    — export * from "./export"; export * from "./import";
```

### Adding a New Export Format
1. Create `src/{format}/export.ts` — pure function taking `{ definition, meta }`
2. Create `src/{format}/index.ts` — barrel export
3. Add to `src/index.ts`: `export * from "./{format}"`
4. Create `src/adapters/react-flow/{format}.ts` — wrapper calling `buildDefinition()`
5. Add to `src/adapters/react-flow/index.ts`
6. Add entry to `tsup.config.ts` and export map in `package.json`
7. Add tests in `tests/{format}.test.ts`

---

## Key Constraints

- Both packages implement the same workflow semantics (Symfony-compatible)
- Event order: guard > leave > transition > enter > entered > completed > announce
- Marking is `Record<string, number>` (TS) / `array<string, int>` (PHP)
- Weighted arcs: `consumeWeight` / `produceWeight` (default 1)
- Middleware wraps `apply()` only, not `can()`
- YAML export produces valid Symfony `framework.workflows` config
