<?php

declare(strict_types=1);

namespace Laraflow\Export;

use Laraflow\Data\WorkflowDefinition;
use Laraflow\Data\WorkflowMeta;

final class JsonExporter
{
    public static function export(
        WorkflowDefinition $definition,
        WorkflowMeta $meta,
        int $flags = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES,
    ): string {
        $defArray = [
            'name' => $definition->name,
            'type' => $definition->type->value,
            'places' => array_map(fn ($p) => array_filter([
                'name' => $p->name,
                'metadata' => $p->metadata,
            ], fn ($v) => $v !== null), $definition->places),
            'transitions' => array_map(fn ($t) => array_filter([
                'name' => $t->name,
                'froms' => $t->froms,
                'tos' => $t->tos,
                'guard' => $t->guard,
                'metadata' => $t->metadata,
                'consumeWeight' => $t->consumeWeight,
                'produceWeight' => $t->produceWeight,
            ], fn ($v) => $v !== null), $definition->transitions),
            'initialMarking' => $definition->initialMarking,
        ];

        $metaArray = [
            'name' => $meta->name,
            'type' => $meta->type->value,
            'markingStore' => $meta->markingStore->value,
            'initialMarking' => $meta->initialMarking,
            'supports' => $meta->supports,
            'property' => $meta->property,
        ];

        return json_encode(['definition' => $defArray, 'meta' => $metaArray], $flags);
    }
}
