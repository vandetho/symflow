# Engine API

## WorkflowEngine

The core engine manages token-based markings, fires transitions, and emits events.

```php
use Laraflow\Engine\WorkflowEngine;
use Laraflow\Data\WorkflowDefinition;
use Laraflow\Data\Place;
use Laraflow\Data\Transition;
use Laraflow\Enums\WorkflowType;

$definition = new WorkflowDefinition(
    name: 'order',
    type: WorkflowType::StateMachine,
    places: [
        new Place(name: 'draft'),
        new Place(name: 'submitted'),
        new Place(name: 'approved'),
    ],
    transitions: [
        new Transition(name: 'submit', froms: ['draft'], tos: ['submitted']),
        new Transition(name: 'approve', froms: ['submitted'], tos: ['approved']),
    ],
    initialMarking: ['draft'],
);

$engine = new WorkflowEngine($definition);
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getMarking()` | `Marking` | Current marking (clone) |
| `setMarking(Marking)` | `void` | Override current marking |
| `getInitialMarking()` | `Marking` | The initial marking from definition |
| `getActivePlaces()` | `string[]` | Places with token count > 0 |
| `getEnabledTransitions()` | `Transition[]` | Transitions that can fire now |
| `can(string)` | `TransitionResult` | Check if a transition can fire |
| `apply(string)` | `Marking` | Fire a transition (throws if blocked) |
| `use(callable)` | `void` | Register a middleware |
| `reset()` | `void` | Reset to initial marking |
| `on(WorkflowEventType, callable)` | `Closure` | Subscribe to events (returns unsubscribe) |
| `getDefinition()` | `WorkflowDefinition` | The underlying definition |

### TransitionResult

```php
$result = $engine->can('approve');

if (!$result->allowed) {
    foreach ($result->blockers as $blocker) {
        echo $blocker->code;    // "not_in_place", "guard_blocked", "unknown_transition", "invalid_marking"
        echo $blocker->message;
    }
}
```

### Constructor Options

```php
$engine = new WorkflowEngine(
    definition: $definition,
    guardEvaluator: $myGuardEvaluator, // implements GuardEvaluatorInterface
    middleware: [
        function ($ctx, $next) {
            // wrap apply() lifecycle
            return $next();
        },
    ],
);
```

## Guards

Implement `GuardEvaluatorInterface` to control transition access:

```php
use Laraflow\Contracts\GuardEvaluatorInterface;
use Laraflow\Data\Marking;
use Laraflow\Data\Transition;

class MyGuardEvaluator implements GuardEvaluatorInterface
{
    public function evaluate(string $expression, Marking $marking, Transition $transition): bool
    {
        // Parse $expression and return true to allow, false to block
        return match ($expression) {
            'is_admin' => auth()->user()?->isAdmin() ?? false,
            default => true,
        };
    }
}
```

Add guards to transitions:

```php
new Transition(
    name: 'approve',
    froms: ['submitted'],
    tos: ['approved'],
    guard: 'is_admin',
),
```

## Validation

Catch structural problems before creating an engine:

```php
use Laraflow\Engine\Validator;

$result = Validator::validate($definition);

if (!$result->valid) {
    foreach ($result->errors as $error) {
        echo "[{$error->type->value}] {$error->message}\n";
    }
}
```

| Error Type | Description |
|-----------|-------------|
| `no_initial_marking` | No initial marking defined |
| `invalid_initial_marking` | References a non-existent place |
| `invalid_transition_source` | Transition `from` references unknown place |
| `invalid_transition_target` | Transition `to` references unknown place |
| `unreachable_place` | Place unreachable from initial marking (BFS) |
| `dead_transition` | Transition can never fire |
| `orphan_place` | Place has no transitions |
| `invalid_weight` | Weight is not a positive integer |

## Pattern Analysis

Detect structural patterns in your workflow:

```php
use Laraflow\Engine\Analyzer;

$analysis = Analyzer::analyze($definition);

// Transition patterns
$analysis->transitions['start_review']->pattern; // TransitionPattern::AndSplit
$analysis->transitions['publish']->pattern;       // TransitionPattern::AndJoin

// Place patterns
$analysis->places['review']->patterns;            // [PlacePattern::OrSplit]
```

**Transition patterns:** `Simple`, `AndSplit`, `AndJoin`, `AndSplitJoin`

**Place patterns (workflow):** `Simple`, `OrSplit`, `OrJoin`, `AndSplit`, `AndJoin`

**Place patterns (state_machine):** `Simple`, `XorSplit`, `XorJoin`
