# Artisan Commands

Laraflow provides three Artisan commands for validating and exporting workflow definitions.

## `laraflow:validate`

Validates a workflow definition file and reports errors.

```bash
php artisan laraflow:validate workflow.yaml
# "article_workflow" is valid (6 places, 4 transitions)

php artisan laraflow:validate broken.yaml
# "order" has 2 error(s):
#   [unreachable_place] Place "orphan" is unreachable from the initial marking
#   [invalid_weight] Transition "batch" has invalid consumeWeight: 0
```

Exit code `1` on validation failure.

## `laraflow:mermaid`

Exports a workflow as a Mermaid `stateDiagram-v2` diagram.

```bash
# Output to stdout
php artisan laraflow:mermaid workflow.yaml

# Write to file
php artisan laraflow:mermaid workflow.yaml --output=diagram.mmd
```

Output can be pasted into GitHub Markdown, Notion, or any Mermaid renderer.

## `laraflow:dot`

Exports a workflow as a Graphviz DOT `digraph`.

```bash
# Output to stdout
php artisan laraflow:dot workflow.yaml

# Write to file
php artisan laraflow:dot workflow.yaml --output=graph.dot

# Pipe to Graphviz (if installed)
php artisan laraflow:dot workflow.yaml | dot -Tpng -o graph.png
```

## Supported File Formats

| Extension | How it's loaded |
|-----------|----------------|
| `.yaml`, `.yml` | Symfony-compatible YAML (handles `!php/const` and `!php/enum` tags) |
| `.json` | JSON with `{ definition, meta }` shape |
| `.php` | PHP file returning `['definition' => ..., 'meta' => ...]` |

## Examples

```bash
# Validate a Symfony YAML config
php artisan laraflow:validate config/packages/workflow.yaml

# Generate a Mermaid diagram for documentation
php artisan laraflow:mermaid app/Workflows/order.yaml --output=docs/order-diagram.mmd

# Generate SVG from DOT
php artisan laraflow:dot app/Workflows/order.yaml | dot -Tsvg -o public/images/order-flow.svg

# Validate a PHP config file
php artisan laraflow:validate app/Workflows/order.php
```
