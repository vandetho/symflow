<?php

declare(strict_types=1);

namespace Laraflow\Export;

use Laraflow\Data\WorkflowDefinition;

final class GraphvizExporter
{
    public static function export(WorkflowDefinition $definition): string
    {
        $lines = [];
        $graphName = self::sanitizeId($definition->name);

        $lines[] = "digraph {$graphName} {";
        $lines[] = '    rankdir=LR;';
        $lines[] = '';

        // Initial marker node
        $lines[] = '    __start__ [shape=point, width=0.2, height=0.2];';

        // Place nodes
        $placesWithOutgoing = [];

        foreach ($definition->transitions as $t) {
            foreach ($t->froms as $from) {
                $placesWithOutgoing[$from] = true;
            }
        }

        foreach ($definition->places as $place) {
            $isFinal = ! isset($placesWithOutgoing[$place->name]);
            $shape = $isFinal ? 'doublecircle' : 'circle';
            $label = $place->metadata['description'] ?? $place->name;
            $lines[] = "    " . self::sanitizeId($place->name) . " [shape={$shape}, label=" . self::sanitizeId($label) . '];';
        }

        $lines[] = '';

        // Initial marking edges
        foreach ($definition->initialMarking as $placeName) {
            $lines[] = '    __start__ -> ' . self::sanitizeId($placeName) . ';';
        }

        // Transition edges
        foreach ($definition->transitions as $transition) {
            $label = $transition->name;
            $cw = $transition->consumeWeight ?? 1;
            $pw = $transition->produceWeight ?? 1;

            if ($cw !== 1 || $pw !== 1) {
                $label .= "\\n({$cw}:{$pw})";
            }

            if ($transition->guard !== null) {
                $label .= "\\n[{$transition->guard}]";
            }

            if (count($transition->froms) === 1 && count($transition->tos) === 1) {
                $lines[] = '    ' . self::sanitizeId($transition->froms[0]) . ' -> ' . self::sanitizeId($transition->tos[0]) . ' [label=' . self::sanitizeId($label) . '];';
            } else {
                // AND-split / AND-join: intermediate node
                $tId = '__t_' . preg_replace('/[^a-zA-Z0-9_]/', '_', $transition->name) . '__';
                $lines[] = "    {$tId} [shape=rect, width=0.3, height=0.2, label=" . self::sanitizeId($transition->name) . '];';

                foreach ($transition->froms as $from) {
                    $edgeLabel = $cw !== 1 ? " [label=\"{$cw}\"]" : '';
                    $lines[] = '    ' . self::sanitizeId($from) . " -> {$tId}{$edgeLabel};";
                }

                foreach ($transition->tos as $to) {
                    $edgeLabel = $pw !== 1 ? " [label=\"{$pw}\"]" : '';
                    $lines[] = "    {$tId} -> " . self::sanitizeId($to) . "{$edgeLabel};";
                }
            }
        }

        $lines[] = '}';

        return implode("\n", $lines) . "\n";
    }

    private static function sanitizeId(string $label): string
    {
        if (preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $label)) {
            return $label;
        }

        return '"' . str_replace('"', '\\"', $label) . '"';
    }
}
