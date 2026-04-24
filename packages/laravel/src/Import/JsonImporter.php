<?php

declare(strict_types=1);

namespace Laraflow\Import;

use Laraflow\Data\Place;
use Laraflow\Data\Transition;
use Laraflow\Data\WorkflowDefinition;
use Laraflow\Data\WorkflowMeta;
use Laraflow\Enums\MarkingStoreType;
use Laraflow\Enums\WorkflowType;

final class JsonImporter
{
    /**
     * @return array{definition: WorkflowDefinition, meta: WorkflowMeta}
     */
    public static function import(string $jsonString): array
    {
        $parsed = json_decode($jsonString, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Invalid workflow JSON: ' . json_last_error_msg());
        }

        if (! is_array($parsed)) {
            throw new \RuntimeException('Invalid workflow JSON: expected an object');
        }

        if (! isset($parsed['definition']) || ! is_array($parsed['definition'])) {
            throw new \RuntimeException("Invalid workflow JSON: missing 'definition'");
        }

        if (! isset($parsed['meta']) || ! is_array($parsed['meta'])) {
            throw new \RuntimeException("Invalid workflow JSON: missing 'meta'");
        }

        $defData = $parsed['definition'];
        $metaData = $parsed['meta'];

        if (! isset($defData['places']) || ! is_array($defData['places'])) {
            throw new \RuntimeException('Invalid workflow JSON: definition must have places array');
        }

        if (! isset($defData['transitions']) || ! is_array($defData['transitions'])) {
            throw new \RuntimeException('Invalid workflow JSON: definition must have transitions array');
        }

        $places = array_map(
            fn (array $p) => new Place(
                name: $p['name'],
                metadata: $p['metadata'] ?? null,
            ),
            $defData['places'],
        );

        $transitions = array_map(
            fn (array $t) => new Transition(
                name: $t['name'],
                froms: $t['froms'],
                tos: $t['tos'],
                guard: $t['guard'] ?? null,
                metadata: $t['metadata'] ?? null,
                consumeWeight: $t['consumeWeight'] ?? null,
                produceWeight: $t['produceWeight'] ?? null,
            ),
            $defData['transitions'],
        );

        $definition = new WorkflowDefinition(
            name: $defData['name'],
            type: WorkflowType::from($defData['type']),
            places: $places,
            transitions: $transitions,
            initialMarking: $defData['initialMarking'],
        );

        $meta = new WorkflowMeta(
            name: $metaData['name'],
            type: WorkflowType::from($metaData['type'] ?? 'workflow'),
            markingStore: MarkingStoreType::from($metaData['markingStore'] ?? $metaData['marking_store'] ?? 'method'),
            initialMarking: $metaData['initialMarking'] ?? $metaData['initial_marking'] ?? [],
            supports: $metaData['supports'] ?? 'App\\Entity\\MyEntity',
            property: $metaData['property'] ?? 'currentState',
        );

        return ['definition' => $definition, 'meta' => $meta];
    }
}
