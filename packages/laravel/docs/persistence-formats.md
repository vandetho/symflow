# Persistence Formats

Laraflow supports importing and exporting workflow definitions in multiple formats.

## YAML (Symfony-compatible)

### Import

```php
use Laraflow\Import\YamlImporter;

$yaml = file_get_contents('workflow.yaml');
$result = YamlImporter::import($yaml);
$definition = $result['definition'];
$meta = $result['meta'];
```

Accepted YAML structures:
- Full Symfony config: `framework.workflows.{name}.*`
- Named workflow: `{name}.places` / `{name}.transitions`
- Bare definition: top-level `places` and `transitions`

Handles `!php/const` and `!php/enum` tags automatically:
- `!php/const App\Workflow\BlogState::DRAFT` resolves to `"DRAFT"`
- `!php/enum App\Enum\Status::Active` resolves to `"Active"`

### Export

```php
use Laraflow\Export\YamlExporter;

$yaml = YamlExporter::export($definition, $meta);
file_put_contents('workflow.yaml', $yaml);
```

Produces valid Symfony `framework.workflows` configuration. Weighted arcs are included only when non-default.

## JSON

### Import

```php
use Laraflow\Import\JsonImporter;

$result = JsonImporter::import($jsonString);
```

Expects `{ "definition": {...}, "meta": {...} }` structure.

### Export

```php
use Laraflow\Export\JsonExporter;

$json = JsonExporter::export($definition, $meta);
```

## PHP Config

Generate a PHP config file that returns typed Laraflow objects:

```php
use Laraflow\Export\PhpExporter;

$php = PhpExporter::export($definition, $meta);
file_put_contents('workflow.php', $php);
```

The generated file can be loaded with `require` or `FileLoader::load()`:

```php
$result = require 'workflow.php';
$definition = $result['definition']; // WorkflowDefinition
$meta = $result['meta'];             // WorkflowMeta
```

## Mermaid

```php
use Laraflow\Export\MermaidExporter;

$mmd = MermaidExporter::export($definition);
```

Generates `stateDiagram-v2` with:
- Initial and final state markers
- Transition labels with guards and weights
- Cross-product edges for AND-split transitions

## Graphviz DOT

```php
use Laraflow\Export\GraphvizExporter;

$dot = GraphvizExporter::export($definition);
```

Generates `digraph` with:
- Circle/doublecircle nodes for places/final states
- Intermediate rectangle nodes for AND-split/join
- Weight and guard annotations on edges

Render with Graphviz:

```bash
echo "$dot" | dot -Tpng -o graph.png
echo "$dot" | dot -Tsvg -o graph.svg
```

## FileLoader

The `FileLoader` dispatches by file extension:

```php
use Laraflow\Import\FileLoader;

$result = FileLoader::load('workflow.yaml');  // YamlImporter
$result = FileLoader::load('workflow.json');  // JsonImporter
$result = FileLoader::load('workflow.php');   // require
```
