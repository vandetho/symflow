# Subject API

The subject-driven API wraps the engine with domain object awareness, mirroring Symfony's `$workflow->apply($entity, 'transition')` pattern.

## Workflow Class

```php
use Laraflow\Subject\Workflow;
use Laraflow\Subject\PropertyMarkingStore;

$workflow = new Workflow(
    definition: $definition,
    markingStore: new PropertyMarkingStore('status'),
    guardEvaluator: $myGuard, // optional
    middleware: [...],         // optional
);
```

### Methods

| Method | Description |
|--------|-------------|
| `can($subject, $transition)` | Check if transition is possible for this subject |
| `apply($subject, $transition)` | Fire transition — reads, applies, writes marking back |
| `getMarking($subject)` | Read current marking from subject |
| `setMarking($subject, $marking)` | Write marking to subject |
| `getEnabledTransitions($subject)` | Get all transitions that can fire |
| `on($type, $listener)` | Subscribe to events with subject context |
| `use($middleware)` | Register subject middleware |

## Marking Stores

Marking stores read and write workflow state from domain objects.

### PropertyMarkingStore

Reads and writes a model property directly:

```php
use Laraflow\Subject\PropertyMarkingStore;

$store = new PropertyMarkingStore('status');
// Reads: $subject->status  (string or array)
// Writes: $subject->status = 'submitted' or ['checking_content', 'checking_spelling']
```

- Single active place: writes as `string`
- Multiple active places (Petri net): writes as `string[]`

### MethodMarkingStore

Calls getter/setter methods on the subject:

```php
use Laraflow\Subject\MethodMarkingStore;

// Default: getMarking() / setMarking()
$store = new MethodMarkingStore();

// Custom method names
$store = new MethodMarkingStore(getter: 'getState', setter: 'setState');
```

### Custom MarkingStore

Implement `MarkingStoreInterface` for custom storage (database columns, Redis, etc.):

```php
use Laraflow\Contracts\MarkingStoreInterface;
use Laraflow\Data\Marking;

class DatabaseMarkingStore implements MarkingStoreInterface
{
    public function read(object $subject): Marking
    {
        $state = DB::table('workflow_states')
            ->where('entity_id', $subject->id)
            ->pluck('place', 'tokens')
            ->toArray();
        return new Marking($state);
    }

    public function write(object $subject, Marking $marking): void
    {
        DB::table('workflow_states')
            ->where('entity_id', $subject->id)
            ->delete();

        foreach ($marking->toArray() as $place => $tokens) {
            if ($tokens > 0) {
                DB::table('workflow_states')->insert([
                    'entity_id' => $subject->id,
                    'place' => $place,
                    'tokens' => $tokens,
                ]);
            }
        }
    }
}
```

## Eloquent Trait

Add `HasWorkflowTrait` to your Eloquent models:

```php
use Illuminate\Database\Eloquent\Model;
use Laraflow\Eloquent\HasWorkflowTrait;

class Order extends Model
{
    use HasWorkflowTrait;

    protected $fillable = ['status'];

    protected function getDefaultWorkflowName(): string
    {
        return 'order';
    }
}
```

The trait provides:

```php
$order = Order::find(1);

// Check transitions
$order->canTransition('submit');              // bool
$order->getEnabledTransitions();              // Transition[]
$order->getWorkflowMarking();                 // Marking

// Apply transitions
$order->applyTransition('submit');            // Marking

// Use a specific workflow (if model has multiple)
$order->canTransition('submit', 'approval_flow');
```

## Config-Driven Workflows

Define workflows in `config/laraflow.php` and they're automatically registered:

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
        'places' => ['draft', 'submitted', 'approved'],
        'transitions' => [
            'submit' => ['from' => 'draft', 'to' => 'submitted'],
            'approve' => ['from' => 'submitted', 'to' => 'approved'],
        ],
    ],
],
```

Access via the Facade:

```php
use Laraflow\Facades\Laraflow;

$workflow = Laraflow::get('order');
Laraflow::has('order');  // true
Laraflow::all();         // ['order' => Workflow, ...]
```
