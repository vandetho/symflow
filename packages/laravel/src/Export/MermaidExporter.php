<?php

declare(strict_types=1);

namespace Laraflow\Export;

use Laraflow\Data\WorkflowDefinition;

final class MermaidExporter
{
    public static function export(WorkflowDefinition $definition): string
    {
        $lines = [];
        $lines[] = 'stateDiagram-v2';
        $lines[] = '    direction LR';

        // State descriptions from place metadata
        foreach ($definition->places as $place) {
            $description = $place->metadata['description'] ?? null;

            if ($description !== null) {
                $lines[] = '    ' . self::sanitizeId($place->name) . ' : ' . $description;
            }
        }

        // Initial transitions
        foreach ($definition->initialMarking as $placeName) {
            $lines[] = '    [*] --> ' . self::sanitizeId($placeName);
        }

        // Transitions
        foreach ($definition->transitions as $transition) {
            $label = $transition->name;
            $cw = $transition->consumeWeight ?? 1;
            $pw = $transition->produceWeight ?? 1;

            if ($cw !== 1 || $pw !== 1) {
                $label .= " ({$cw}:{$pw})";
            }

            if ($transition->guard !== null) {
                $label .= " [{$transition->guard}]";
            }

            foreach ($transition->froms as $from) {
                foreach ($transition->tos as $to) {
                    $lines[] = '    ' . self::sanitizeId($from) . ' --> ' . self::sanitizeId($to) . ' : ' . $label;
                }
            }
        }

        // Final states
        $placesWithOutgoing = [];

        foreach ($definition->transitions as $t) {
            foreach ($t->froms as $from) {
                $placesWithOutgoing[$from] = true;
            }
        }

        foreach ($definition->places as $place) {
            if (! isset($placesWithOutgoing[$place->name])) {
                $lines[] = '    ' . self::sanitizeId($place->name) . ' --> [*]';
            }
        }

        return implode("\n", $lines) . "\n";
    }

    private static function sanitizeId(string $label): string
    {
        if (preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $label)) {
            return $label;
        }

        return preg_replace('/[^a-zA-Z0-9_]/', '_', $label);
    }
}
