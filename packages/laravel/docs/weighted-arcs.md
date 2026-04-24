# Weighted Arcs

By default, transitions consume 1 token from each source place and produce 1 token to each target place. Weighted arcs let transitions consume or produce multiple tokens per firing.

## Usage

```php
use Laraflow\Data\Transition;

new Transition(
    name: 'manufacture',
    froms: ['raw_materials'],
    tos: ['components'],
    consumeWeight: 3, // needs 3 tokens in raw_materials
    produceWeight: 2, // produces 2 tokens in components
),
```

Both fields are optional and default to `1`.

## How It Works

### `can()` with Weights

For `workflow` type, `can()` checks that each source place has at least `consumeWeight` tokens:

```php
$engine->setMarking(new Marking(['raw_materials' => 2]));
$result = $engine->can('manufacture');
// $result->allowed === false
// "Place "raw_materials" has 2 token(s), needs 3"

$engine->setMarking(new Marking(['raw_materials' => 3]));
$result = $engine->can('manufacture');
// $result->allowed === true
```

### `apply()` with Weights

```php
$engine->setMarking(new Marking(['raw_materials' => 6, 'components' => 0, 'assembled' => 0]));

$engine->apply('manufacture');
// raw_materials: 6 - 3 = 3
// components:    0 + 2 = 2

$engine->apply('manufacture');
// raw_materials: 3 - 3 = 0
// components:    2 + 2 = 4

$engine->apply('assemble');  // consumeWeight: 2
// components: 4 - 2 = 2
// assembled:  0 + 1 = 1
```

## Config

```php
// config/laraflow.php
'transitions' => [
    'manufacture' => [
        'from' => 'raw_materials',
        'to' => 'components',
        'consumeWeight' => 3,
        'produceWeight' => 2,
    ],
],
```

## Validation

`Validator::validate()` rejects non-positive or non-integer weights:

```php
$result = Validator::validate($definition);
// Invalid weights produce ValidationErrorType::InvalidWeight
```

## Diagram Output

Both Mermaid and Graphviz exporters annotate weighted transitions:

**Mermaid:** `raw_materials --> components : manufacture (3:2)`

**Graphviz DOT:** `raw_materials -> components [label="manufacture\n(3:2)"];`
