# Weighted Arcs

By default, each transition consumes 1 token from each source place and produces 1 token to each target place. Weighted arcs let transitions consume or produce multiple tokens per firing.

## Transition Fields

| Field           | Type     | Default | Description                                  |
| --------------- | -------- | ------- | -------------------------------------------- |
| `consumeWeight` | `number` | `1`     | Tokens consumed from each source place       |
| `produceWeight` | `number` | `1`     | Tokens produced to each target place         |

Both fields are optional. When omitted, they default to `1`, preserving backward compatibility with all existing workflows.

## How It Works

### `can()` with Weights

For `workflow` type, `can()` checks that each source place has at least `consumeWeight` tokens:

```ts
// Transition: { name: "manufacture", froms: ["raw_materials"], consumeWeight: 3 }
engine.setMarking({ raw_materials: 2 });
engine.can("manufacture");
// { allowed: false, blockers: [{ code: "not_in_place", message: 'Place "raw_materials" has 2 token(s), needs 3' }] }

engine.setMarking({ raw_materials: 3 });
engine.can("manufacture");
// { allowed: true, blockers: [] }
```

For `state_machine` type, weights do not affect the `can()` check (state machines always have exactly one active place with 1 token).

### `apply()` with Weights

When a transition fires:
1. Each source place loses `consumeWeight` tokens
2. Each target place gains `produceWeight` tokens

```ts
const definition: WorkflowDefinition = {
    name: "factory",
    type: "workflow",
    places: [
        { name: "raw_materials" },
        { name: "components" },
        { name: "assembled" },
    ],
    transitions: [
        {
            name: "manufacture",
            froms: ["raw_materials"],
            tos: ["components"],
            consumeWeight: 3,
            produceWeight: 2,
        },
        {
            name: "assemble",
            froms: ["components"],
            tos: ["assembled"],
            consumeWeight: 2,
        },
    ],
    initialMarking: ["raw_materials"],
};

const engine = new WorkflowEngine(definition);
engine.setMarking({ raw_materials: 6, components: 0, assembled: 0 });

engine.apply("manufacture");
// raw_materials: 6 - 3 = 3
// components:    0 + 2 = 2

engine.apply("manufacture");
// raw_materials: 3 - 3 = 0
// components:    2 + 2 = 4

engine.apply("assemble");
// components: 4 - 2 = 2
// assembled:  0 + 1 = 1
```

## Validation

`validateDefinition()` checks that weights are positive integers:

```ts
const result = validateDefinition(definition);
// Invalid weights produce errors with type "invalid_weight":
// - consumeWeight: 0       -> "must be a positive integer"
// - consumeWeight: -1      -> "must be a positive integer"
// - consumeWeight: 1.5     -> "must be a positive integer"
// - consumeWeight: 2       -> valid
// - consumeWeight: undefined -> valid (defaults to 1)
```

## YAML Support

Weights are included in YAML export when they differ from the default (`1`):

```yaml
transitions:
    manufacture:
        from: raw_materials
        to: components
        consumeWeight: 3
        produceWeight: 2
    assemble:
        from: components
        to: assembled
        consumeWeight: 2
        # produceWeight omitted (defaults to 1)
```

Round-trip is preserved: import a YAML with weights, export it back, and the weights are retained.

## Diagram Output

When weights are non-default, both Mermaid and Graphviz exporters annotate the transitions:

**Mermaid:**
```
raw_materials --> components : manufacture (3:2)
```

**Graphviz DOT:**
```dot
raw_materials -> components [label="manufacture\n(3:2)"];
```

The format is `(consumeWeight:produceWeight)`.

For AND-split/join transitions in Graphviz, individual arc weights are shown on each edge.

## Use Cases

- **Batch processing** -- consume N items from a queue per firing
- **Resource pools** -- consume 2 resources to produce 1 output
- **Manufacturing** -- 3 raw materials become 2 components
- **Rate limiting** -- require accumulated tokens before proceeding
- **Capacity modeling** -- model systems where operations have different input/output ratios
