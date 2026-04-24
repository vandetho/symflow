<?php

declare(strict_types=1);

namespace Laraflow\Export;

use Laraflow\Data\WorkflowDefinition;
use Laraflow\Data\WorkflowMeta;
use Symfony\Component\Yaml\Yaml;

final class YamlExporter
{
    public static function export(WorkflowDefinition $definition, WorkflowMeta $meta): string
    {
        $anyPlaceHasMetadata = false;

        foreach ($definition->places as $place) {
            if ($place->metadata !== null && count($place->metadata) > 0) {
                $anyPlaceHasMetadata = true;

                break;
            }
        }

        if ($anyPlaceHasMetadata) {
            $places = [];

            foreach ($definition->places as $place) {
                $hasMetadata = $place->metadata !== null && count($place->metadata) > 0;
                $places[$place->name] = $hasMetadata ? ['metadata' => $place->metadata] : null;
            }
        } else {
            $places = array_map(fn ($p) => $p->name, $definition->places);
        }

        $transitions = [];

        foreach ($definition->transitions as $t) {
            if (count($t->froms) === 0 || count($t->tos) === 0) {
                continue;
            }

            $transition = [
                'from' => count($t->froms) === 1 ? $t->froms[0] : $t->froms,
                'to' => count($t->tos) === 1 ? $t->tos[0] : $t->tos,
            ];

            if ($t->guard !== null) {
                $transition['guard'] = $t->guard;
            }

            if ($t->consumeWeight !== null && $t->consumeWeight !== 1) {
                $transition['consumeWeight'] = $t->consumeWeight;
            }

            if ($t->produceWeight !== null && $t->produceWeight !== 1) {
                $transition['produceWeight'] = $t->produceWeight;
            }

            if ($t->metadata !== null && count($t->metadata) > 0) {
                $transition['metadata'] = $t->metadata;
            }

            $transitions[$t->name] = $transition;
        }

        $initialMarkingArr = count($meta->initialMarking) > 0
            ? $meta->initialMarking
            : $definition->initialMarking;
        $initialMarking = count($initialMarkingArr) === 1 ? $initialMarkingArr[0] : $initialMarkingArr;

        $workflowConfig = [
            'type' => $meta->type->value,
            'marking_store' => [
                'type' => $meta->markingStore->value,
                'property' => $meta->property,
            ],
            'supports' => [$meta->supports],
            'initial_marking' => $initialMarking,
            'places' => $places,
            'transitions' => $transitions,
        ];

        $output = [
            'framework' => [
                'workflows' => [
                    $meta->name => $workflowConfig,
                ],
            ],
        ];

        $raw = Yaml::dump($output, 10, 4, Yaml::DUMP_MULTI_LINE_LITERAL_BLOCK);

        // Inline short arrays (supports, from, to)
        $raw = preg_replace_callback(
            '/^( +)([\w][\w.]*):[ ]*\n((?:\1 {4}- .+\n)+)/m',
            function ($match) {
                $indent = $match[1];
                $key = $match[2];
                $items = $match[3];
                $values = [];

                foreach (explode("\n", trim($items)) as $line) {
                    $line = trim($line);

                    if (str_starts_with($line, '- ')) {
                        $values[] = substr($line, 2);
                    }
                }

                return "{$indent}{$key}: [" . implode(', ', $values) . "]\n";
            },
            $raw,
        );

        return $raw;
    }
}
