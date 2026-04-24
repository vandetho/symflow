# Events

Laraflow fires events at each stage of the transition lifecycle, following Symfony's exact event order.

## Event Order

When `apply()` is called, events fire in this order:

| Order | Event | When |
|-------|-------|------|
| 1 | `guard` | Before checking if transition is allowed |
| 2 | `leave` | Per source place, before tokens are removed |
| 3 | `transition` | After tokens removed, before entering new places |
| 4 | `enter` | Per target place, before marking is updated |
| 5 | `entered` | After marking is updated |
| 6 | `completed` | After the full transition is done |
| 7 | `announce` | Per newly enabled transition |

## Engine Event Listeners

Register listeners directly on the engine:

```php
use Laraflow\Enums\WorkflowEventType;
use Laraflow\Data\WorkflowEvent;

$unsub = $engine->on(WorkflowEventType::Entered, function (WorkflowEvent $event) {
    echo $event->type->value;          // "entered"
    echo $event->transition->name;     // "submit"
    echo $event->workflowName;         // "order"
    print_r($event->marking->toArray());
});

// Unsubscribe
$unsub();
```

## Subject Event Listeners

When using the `Workflow` class, events include the subject:

```php
use Laraflow\Data\SubjectEvent;

$workflow->on(WorkflowEventType::Entered, function (SubjectEvent $event) {
    echo $event->subject->id;          // "42"
    echo $event->transition->name;     // "submit"
});
```

## Laravel Event Classes

Laraflow provides 7 Laravel event classes that can be used with Laravel's event system (listeners, subscribers, queued jobs):

| Event Class | WorkflowEventType |
|------------|-------------------|
| `Laraflow\Events\WorkflowGuard` | `guard` |
| `Laraflow\Events\WorkflowLeave` | `leave` |
| `Laraflow\Events\WorkflowTransition` | `transition` |
| `Laraflow\Events\WorkflowEnter` | `enter` |
| `Laraflow\Events\WorkflowEntered` | `entered` |
| `Laraflow\Events\WorkflowCompleted` | `completed` |
| `Laraflow\Events\WorkflowAnnounce` | `announce` |

Each wraps a `WorkflowEvent` instance:

```php
use Laraflow\Events\WorkflowEntered;

class SendNotificationOnApproval
{
    public function handle(WorkflowEntered $event): void
    {
        $workflowEvent = $event->workflowEvent;

        if ($workflowEvent->transition->name === 'approve') {
            // Send notification
        }
    }
}
```

Register in `EventServiceProvider`:

```php
protected $listen = [
    \Laraflow\Events\WorkflowEntered::class => [
        SendNotificationOnApproval::class,
    ],
];
```

## Middleware vs Events

| Feature | Middleware | Event Listeners |
|---------|-----------|-----------------|
| Wraps lifecycle | Yes (before/after) | No (fire-and-forget) |
| Can block | Yes (skip `$next()`) | No |
| Per-event | No (wraps entire transition) | Yes (guard, leave, enter, ...) |
| Returns value | `Marking` | `void` |

Use **middleware** for cross-cutting concerns (logging, transactions, metrics). Use **events** for reacting to specific lifecycle phases.
