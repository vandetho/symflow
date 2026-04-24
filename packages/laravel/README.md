# Laraflow

A Symfony-compatible workflow engine for Laravel. State machines, Petri nets, guards, events, weighted arcs, middleware, and YAML/JSON/PHP import/export.

Part of the [SymFlow](https://github.com/vandetho/symflow) monorepo.

## Installation

```bash
composer require vandetho/laraflow
php artisan vendor:publish --tag=laraflow-config
```

## Quick Start

Define a workflow in `config/laraflow.php`:

```php
'workflows' => [
    'order' => [
        'type' => 'state_machine',
        'marking_store' => ['type' => 'property', 'property' => 'status'],
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

Use the Eloquent trait:

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

$order->applyTransition('submit');
$order->canTransition('approve'); // true/false
```

Or use the Facade:

```php
use Laraflow\Facades\Laraflow;

$workflow = Laraflow::get('order');
$workflow->apply($order, 'submit');
```

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.md) | Installation, first workflow, Eloquent trait |
| [Engine API](./docs/engine-api.md) | WorkflowEngine, guards, validation, pattern analysis |
| [Subject API](./docs/subject-api.md) | Workflow facade, marking stores, config-driven workflows |
| [Weighted Arcs](./docs/weighted-arcs.md) | Multi-token transitions |
| [Middleware](./docs/middleware.md) | Lifecycle hooks, transactions, logging |
| [Events](./docs/events.md) | Symfony event order, Laravel event integration |
| [Artisan Commands](./docs/artisan-commands.md) | validate, mermaid, dot |
| [Persistence Formats](./docs/persistence-formats.md) | YAML, JSON, PHP, Mermaid, Graphviz |

## License

MIT
