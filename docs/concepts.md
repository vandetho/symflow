# Concepts

This page explains the mental model behind symflow -- the *why* behind places, transitions, and the two workflow types. Read this once and the rest of the docs (weights, parallel states, persistence) will fall out as natural consequences.

## Marking Is a Multiset

A **marking** is the runtime state of a workflow. It is not a single string ("the current state"), it is a count of **tokens** held by each **place**:

```ts
type Marking = Record<string, number>;
```

```ts
// One token in "draft", nothing else active
{ draft: 1 }

// Two tokens in "approvals", one in "rejected"
{ approvals: 2, rejected: 1 }

// Empty workflow -- no active places
{}
```

The number is the key insight. Most workflow tutorials describe places as "states the subject is *at*" -- a set. symflow (and Symfony Workflow underneath) models places as **buckets that hold tokens** -- a multiset. Once you internalize that, every other feature becomes obvious.

## State Machine vs Workflow

The two `type` values are not about graph shape. They are about **token invariants**:

| Type            | Token invariant                              | Marking example                |
| --------------- | -------------------------------------------- | ------------------------------ |
| `state_machine` | Exactly **1** token total, in exactly 1 place | `{ verified: 1 }`              |
| `workflow`      | **0..N** tokens per place, any number of places | `{ approvals: 3, rejected: 1 }` |

```ts
type: "state_machine"  // single-token Petri net (a classical FSM)
type: "workflow"       // general Petri net (multi-token, parallel places)
```

A state machine is just a workflow with the extra rule "1 token, always." If you draw the same graph and swap the type, the engine's enforcement changes:

- `state_machine` rejects markings with 0 or 2+ active places. `from: [a, b]` means **OR** -- the one active token must be in `a` or `b`.
- `workflow` allows any token distribution. `from: [a, b]` means **AND** -- every listed place must have enough tokens.

## Why Tokens, Not Just Names?

Three features fall out of the multiset model for free:

### 1. Parallel states (AND-split / AND-join)

A `workflow` transition with `tos: ["awaiting_payment", "awaiting_shipping"]` puts a token in *both* places at once. The subject is genuinely in two states simultaneously. AND-join (`froms: [a, b]`) waits for tokens in both before firing.

State machines cannot model this -- there is only one token.

### 2. Weighted arcs

Once tokens are numeric, "consume 3 tokens, produce 2" is a one-line addition:

```ts
{ name: "manufacture", froms: ["raw"], tos: ["parts"],
  consumeWeight: 3, produceWeight: 2 }
```

Weights are honored only by `type: "workflow"`. State machines always have 1 token, so consume/produce weights are silently meaningless (and will corrupt the marking if set). See [Weighted Arcs](./weighted-arcs.md).

### 3. Aggregate counts

A single workflow instance can track "5 unverified, 3 verified" as `{ unverified: 5, verified: 3 }`. Each token represents one entity in that state. Useful for inventory, resource pools, or batch counters.

## Storage: Runtime vs Database

The marking shape at runtime (`Record<string, number>`) is not the shape on disk. The marking store collapses it:

| Subject model                          | Database column           | Runtime marking            |
| -------------------------------------- | ------------------------- | -------------------------- |
| One row per entity (state machine)     | `VARCHAR`                 | `{ verified: 1 }`          |
| One row per entity (single-token workflow) | `VARCHAR` or `JSON` array | `{ verified: 1 }` or `{ a: 1, b: 1 }` |
| Aggregate counter (multi-token)        | `JSON` / `JSONB` / `TEXT` | `{ unverified: 5, verified: 3 }` |

`propertyMarkingStore("status")` and `methodMarkingStore()` both follow Symfony's convention: they read/write **place names only**, hardcoding token counts to `1`. So:

```ts
// runtime:    { verified: 1 }
// database:   "verified"        ← varchar column

// runtime:    { reviewed: 1, approved: 1 }
// database:   ["reviewed", "approved"]   ← JSON array column
```

Counts greater than 1 cannot survive a round-trip through these stores -- they are designed for the "one subject per entity" pattern, identical to Symfony.

If you need to persist actual token counts (the aggregate case), write a custom `MarkingStore`:

```ts
const jsonMarkingStore: MarkingStore<Aggregate> = {
    read:  (s) => JSON.parse(s.markingJson),
    write: (s, m) => { s.markingJson = JSON.stringify(m); },
};
```

See [Subject API](./subject-api.md) for the marking store interface.

## Picking a Type

```
Need weighted arcs (consume/produce ≠ 1)?
  └─ YES → type: "workflow" (mandatory)
  └─ NO  → Need parallel active places?
            └─ YES → type: "workflow"
            └─ NO  → type: "state_machine" (simpler, stricter validation)
```

Concrete examples:

- **Order status** (draft → submitted → approved → fulfilled) -- linear, single token. `state_machine`, varchar column.
- **Document review** (drafted, then *both* legal and finance review in parallel, then merged) -- parallel places, single token per branch. `workflow`, JSON array column.
- **3-of-N approvals** (publish requires 3 approval tokens to accumulate) -- multi-token, weighted. `workflow`, custom JSON store.
- **Charging stations dashboard** (count of verified vs unverified across the fleet) -- aggregate counts. `workflow`, custom JSON store. Or: one row per station with `state_machine` and a varchar column, count via SQL.

## What This Means in Practice

- The marking is `Record<string, number>` because the engine has one code path for both types. State machines just always use count = 1.
- `propertyMarkingStore` writes a string (or string array) because that is what Symfony does and what most apps actually need. Counts are a runtime concept.
- If you find yourself reaching for `consumeWeight` or "two places active at once," you have left the state machine world by definition. Switch the type.
- If your domain genuinely needs single-token semantics but also weights (rare), keep `type: "workflow"` and enforce the invariant manually -- the engine will not do it for you.

## Further Reading

- [Getting Started](./getting-started.md) -- minimal worked example
- [Weighted Arcs](./weighted-arcs.md) -- consume/produce weights in detail
- [Subject API](./subject-api.md) -- marking stores, custom persistence
- [Persistence Formats](./persistence-formats.md) -- YAML, JSON, TS, PHP, Mermaid, Graphviz
- Petri net theory -- the underlying formalism (search "place/transition net")
