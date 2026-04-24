<?php

declare(strict_types=1);

namespace Laraflow\Import;

use Laraflow\Data\Place;
use Laraflow\Data\Transition;
use Laraflow\Data\WorkflowDefinition;
use Laraflow\Data\WorkflowMeta;
use Laraflow\Enums\MarkingStoreType;
use Laraflow\Enums\WorkflowType;
use Symfony\Component\Yaml\Tag\TaggedValue;
use Symfony\Component\Yaml\Yaml;

final class YamlImporter
{
    /**
     * @return array{definition: WorkflowDefinition, meta: WorkflowMeta}
     */
    public static function import(string $yamlString): array
    {
        // Pre-process !php/const and !php/enum tags used as mapping keys
        $preprocessed = preg_replace(
            '/^(\s*)!php\/(?:const|enum)\s+([^:\n]+?)::\s*(\S+)\s*:/m',
            '$1$3:',
            $yamlString,
        );

        /** @var array<string, mixed> $parsed */
        $parsed = Yaml::parse($preprocessed, Yaml::PARSE_CUSTOM_TAGS);
        $parsed = self::resolveTaggedValues($parsed);

        if (isset($parsed['framework'])) {
            $fw = $parsed['framework'];
            $workflows = $fw['workflows'] ?? [];
            $names = array_keys($workflows);

            if (count($names) === 0) {
                throw new \RuntimeException('No workflow found in YAML');
            }

            $workflowName = $names[0];
            $config = $workflows[$workflowName];
        } elseif (isset($parsed['places']) || isset($parsed['transitions'])) {
            $workflowName = 'imported_workflow';
            $config = $parsed;
        } else {
            $keys = array_keys($parsed);

            if (count($keys) > 0 && is_array($parsed[$keys[0]])) {
                $inner = $parsed[$keys[0]];

                if (isset($inner['places']) || isset($inner['transitions'])) {
                    $workflowName = $keys[0];
                    $config = $inner;
                } else {
                    throw new \RuntimeException('Could not detect workflow structure in YAML');
                }
            } else {
                throw new \RuntimeException('Could not detect workflow structure in YAML');
            }
        }

        $markingStoreConfig = $config['marking_store'] ?? [];
        $initialMarkingRaw = $config['initial_marking'] ?? [];
        $initialMarking = is_array($initialMarkingRaw) ? $initialMarkingRaw : [$initialMarkingRaw];

        $meta = new WorkflowMeta(
            name: $workflowName,
            type: WorkflowType::tryFrom($config['type'] ?? 'workflow') ?? WorkflowType::Workflow,
            markingStore: MarkingStoreType::tryFrom($markingStoreConfig['type'] ?? 'method') ?? MarkingStoreType::Method,
            initialMarking: array_map('strval', $initialMarking),
            supports: is_array($config['supports'] ?? null) ? ($config['supports'][0] ?? 'App\\Entity\\MyEntity') : ($config['supports'] ?? 'App\\Entity\\MyEntity'),
            property: $markingStoreConfig['property'] ?? 'currentState',
        );

        // Parse places
        $placesRaw = $config['places'] ?? [];
        $places = [];

        if (array_is_list($placesRaw)) {
            foreach ($placesRaw as $name) {
                $places[] = new Place(name: (string) $name);
            }
        } else {
            foreach ($placesRaw as $name => $value) {
                $metadata = null;

                if (is_array($value) && isset($value['metadata'])) {
                    $metadata = $value['metadata'];
                }

                $places[] = new Place(name: (string) $name, metadata: $metadata);
            }
        }

        // Parse transitions
        $transitionsRaw = $config['transitions'] ?? [];
        $transitions = [];

        foreach ($transitionsRaw as $name => $tc) {
            $froms = is_array($tc['from'] ?? null) ? $tc['from'] : [$tc['from'] ?? ''];
            $tos = is_array($tc['to'] ?? null) ? $tc['to'] : [$tc['to'] ?? ''];
            $froms = array_map('strval', $froms);
            $tos = array_map('strval', $tos);

            $guard = isset($tc['guard']) ? (string) $tc['guard'] : null;
            $consumeWeight = isset($tc['consumeWeight']) ? (int) $tc['consumeWeight'] : null;
            $produceWeight = isset($tc['produceWeight']) ? (int) $tc['produceWeight'] : null;
            $metadata = $tc['metadata'] ?? null;

            $transitions[] = new Transition(
                name: (string) $name,
                froms: $froms,
                tos: $tos,
                guard: $guard,
                metadata: $metadata,
                consumeWeight: $consumeWeight,
                produceWeight: $produceWeight,
            );
        }

        $definition = new WorkflowDefinition(
            name: $workflowName,
            type: $meta->type,
            places: $places,
            transitions: $transitions,
            initialMarking: $meta->initialMarking,
        );

        return ['definition' => $definition, 'meta' => $meta];
    }

    private static function resolvePhpName(string $data): string
    {
        $idx = strrpos($data, '::');

        return $idx !== false ? substr($data, $idx + 2) : $data;
    }

    private static function resolveTaggedValues(mixed $data): mixed
    {
        if ($data instanceof TaggedValue) {
            $tag = $data->getTag();

            if ($tag === 'php/const' || $tag === 'php/enum') {
                return self::resolvePhpName((string) $data->getValue());
            }

            return $data->getValue();
        }

        if (is_array($data)) {
            $resolved = [];

            foreach ($data as $key => $value) {
                $resolved[$key] = self::resolveTaggedValues($value);
            }

            return $resolved;
        }

        return $data;
    }
}
