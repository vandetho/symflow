# Getting Started

## Requirements

- PHP 8.2+
- Laravel 11+

## Installation

```bash
composer require vandetho/laraflow
```

Publish the configuration file:

```bash
php artisan vendor:publish --tag=laraflow-config
```

This creates `config/laraflow.php` where you define your workflows.

## Your First Workflow

Add a workflow definition to `config/laraflow.php`:

```php
'workflows' => [
    'order' => [
        'type' => 'state_machine',
        'marking_store' => [
            'type' => 'property',
            'property' => 'status',
        ],
        'supports' => App\Models\Order::class,
        'initial_marking' => ['draft'],
        'places' => ['draft', 'submitted', 'approved', 'rejected', 'fulfilled'],
        'transitions' => [
            'submit' => ['from' => 'draft', 'to' => 'submitted'],
            'approve' => ['from' => 'submitted', 'to' => 'approved'],
            'reject' => ['from' => 'submitted', 'to' => 'rejected'],
            'fulfill' => ['from' => 'approved', 'to' => 'fulfilled'],
        ],
    ],
],
```

## Using the Facade

```php
use Laraflow\Facades\Laraflow;

$workflow = Laraflow::get('order');

// Check if a transition is possible
$result = $workflow->can($order, 'submit');
if ($result->allowed) {
    $workflow->apply($order, 'submit');
}
```

## Using the Eloquent Trait

Add the `HasWorkflowTrait` to your model:

```php
use Laraflow\Eloquent\HasWorkflowTrait;

class Order extends Model
{
    use HasWorkflowTrait;

    protected function getDefaultWorkflowName(): string
    {
        return 'order';
    }
}
```

Then use the workflow methods directly on the model:

```php
$order = Order::find(1);

$order->canTransition('submit');      // true/false
$order->applyTransition('submit');    // applies and persists
$order->getEnabledTransitions();      // available transitions
$order->getWorkflowMarking();         // current marking
```

## Two Workflow Types

### State Machine

`type: state_machine` -- exactly one place active at a time. Transitions move between single states.

### Petri Net Workflow

`type: workflow` -- multiple places can be active simultaneously. Supports AND-split (fork) and AND-join (synchronization) patterns for parallel execution paths.

## Next Steps

- [Engine API](./engine-api.md) -- WorkflowEngine, validation, pattern analysis
- [Subject API](./subject-api.md) -- Workflow facade, marking stores, Eloquent trait
- [Weighted Arcs](./weighted-arcs.md) -- multi-token transitions
- [Middleware](./middleware.md) -- lifecycle hooks
- [Artisan Commands](./artisan-commands.md) -- validate, mermaid, dot
- [Persistence Formats](./persistence-formats.md) -- YAML, JSON, PHP, Mermaid, Graphviz
- [Events](./events.md) -- Laravel event integration
