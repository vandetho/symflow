# Engine API

## `WorkflowEngine`

```ts
import { WorkflowEngine } from "symflow/engine";

const engine = new WorkflowEngine(definition, {
    guardEvaluator: (expression, { marking, transition }) => {
        return true; // return true to allow, false to block
    },
    middleware: [
        (ctx, next) => {
            console.log(`Firing: ${ctx.transition.name}`);
            return next();
        },
    ],
});
```

### Methods

| Method                       | Returns              | Description                                 |
| ---------------------------- | -------------------- | ------------------------------------------- |
| `getMarking()`               | `Marking`            | Current marking (place name to token count) |
| `setMarking(marking)`        | `void`               | Override the current marking                |
| `getInitialMarking()`        | `Marking`            | The initial marking from the definition     |
| `getActivePlaces()`          | `string[]`           | Places with token count > 0                 |
| `getEnabledTransitions()`    | `Transition[]`       | Transitions that can fire right now         |
| `can(transitionName)`        | `TransitionResult`   | Check if a transition can fire              |
| `apply(transitionName)`      | `Marking`            | Fire a transition (throws if blocked)       |
| `use(middleware)`            | `void`               | Register a middleware                       |
| `reset()`                    | `void`               | Reset to initial marking                    |
| `on(eventType, listener)`    | `() => void`         | Subscribe to events (returns unsubscribe)   |
| `getDefinition()`            | `WorkflowDefinition` | The underlying definition                   |

### `TransitionResult`

`can()` returns structured feedback:

```ts
const result = engine.can("approve");

if (!result.allowed) {
    for (const blocker of result.blockers) {
        console.log(blocker.code);    // "not_in_place" | "guard_blocked" | "unknown_transition" | "invalid_marking"
        console.log(blocker.message); // human-readable explanation
    }
}
```

## Events

The engine fires events in Symfony's exact order when `apply()` is called:

| Order | Event        | When                                          |
| ----- | ------------ | --------------------------------------------- |
| 1     | `guard`      | Checks if the transition is allowed           |
| 2     | `leave`      | Per source place, before tokens are removed   |
| 3     | `transition` | After tokens are removed from source places   |
| 4     | `enter`      | Per target place, before marking is updated   |
| 5     | `entered`    | After marking is updated                      |
| 6     | `completed`  | After the full transition is done             |
| 7     | `announce`   | Per newly enabled transition                  |

```ts
engine.on("entered", (event) => {
    console.log(event.type);          // "entered"
    console.log(event.transition);    // { name, froms, tos, guard?, consumeWeight?, produceWeight? }
    console.log(event.marking);       // { draft: 0, submitted: 1, ... }
    console.log(event.workflowName);  // "order"
});

// Unsubscribe
const unsub = engine.on("guard", listener);
unsub();
```

## Guards

Attach guard expressions to transitions and provide an evaluator:

```ts
const definition: WorkflowDefinition = {
    name: "order",
    type: "state_machine",
    places: [{ name: "submitted" }, { name: "approved" }],
    transitions: [
        {
            name: "approve",
            froms: ["submitted"],
            tos: ["approved"],
            guard: "subject.total < 10000",
        },
    ],
    initialMarking: ["submitted"],
};

const engine = new WorkflowEngine(definition, {
    guardEvaluator: (expression, { marking, transition }) => {
        if (expression === "subject.total < 10000") {
            return orderTotal < 10000;
        }
        return true;
    },
});
```

## Validation

```ts
import { validateDefinition } from "symflow/engine";

const result = validateDefinition(definition);
if (!result.valid) {
    for (const error of result.errors) {
        console.error(`[${error.type}] ${error.message}`);
    }
}
```

| Error type                  | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| `no_initial_marking`        | No initial marking defined                            |
| `invalid_initial_marking`   | Initial marking references a non-existent place       |
| `invalid_transition_source` | Transition `from` references a non-existent place     |
| `invalid_transition_target` | Transition `to` references a non-existent place       |
| `unreachable_place`         | Place cannot be reached from the initial marking (BFS)|
| `dead_transition`           | Transition can never fire (source places unreachable) |
| `orphan_place`              | Place has no incoming or outgoing transitions         |
| `invalid_weight`            | Transition weight is not a positive integer           |

## Pattern Analysis

```ts
import { analyzeWorkflow } from "symflow/engine";

const analysis = analyzeWorkflow(definition);

analysis.transitions["start_review"].pattern;  // "and-split"
analysis.places["content_approved"].patterns;   // ["and-join"]
```

**Transition patterns:** `simple`, `and-split`, `and-join`, `and-split-join`

**Place patterns (workflow):** `simple`, `or-split`, `or-join`, `and-split`, `and-join`

**Place patterns (state_machine):** `simple`, `xor-split`, `xor-join`
