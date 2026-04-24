<?php

declare(strict_types=1);

namespace Laraflow\Registry;

use Laraflow\Contracts\WorkflowRegistryInterface;
use Laraflow\Data\Place;
use Laraflow\Data\Transition;
use Laraflow\Data\WorkflowDefinition;
use Laraflow\Enums\MarkingStoreType;
use Laraflow\Enums\WorkflowType;
use Laraflow\Subject\MethodMarkingStore;
use Laraflow\Subject\PropertyMarkingStore;
use Laraflow\Subject\Workflow;

final class WorkflowRegistry implements WorkflowRegistryInterface
{
    /** @var array<string, Workflow> */
    private array $workflows = [];

    public function register(string $name, Workflow $workflow): void
    {
        $this->workflows[$name] = $workflow;
    }

    public function get(string $name): Workflow
    {
        if (! isset($this->workflows[$name])) {
            throw new \RuntimeException("Workflow \"{$name}\" is not registered");
        }

        return $this->workflows[$name];
    }

    public function has(string $name): bool
    {
        return isset($this->workflows[$name]);
    }

    /**
     * @return array<string, Workflow>
     */
    public function all(): array
    {
        return $this->workflows;
    }

    /**
     * @param  array<string, array<string, mixed>>  $config
     */
    public function buildFromConfig(array $config): void
    {
        foreach ($config as $name => $workflowConfig) {
            $places = [];
            $placesRaw = $workflowConfig['places'] ?? [];

            if (array_is_list($placesRaw)) {
                foreach ($placesRaw as $placeName) {
                    $places[] = new Place(name: (string) $placeName);
                }
            } else {
                foreach ($placesRaw as $placeName => $value) {
                    $places[] = new Place(
                        name: (string) $placeName,
                        metadata: is_array($value) ? ($value['metadata'] ?? null) : null,
                    );
                }
            }

            $transitions = [];

            foreach ($workflowConfig['transitions'] ?? [] as $tName => $tConfig) {
                $froms = (array) ($tConfig['from'] ?? []);
                $tos = (array) ($tConfig['to'] ?? []);

                $transitions[] = new Transition(
                    name: (string) $tName,
                    froms: array_map('strval', $froms),
                    tos: array_map('strval', $tos),
                    guard: $tConfig['guard'] ?? null,
                    metadata: $tConfig['metadata'] ?? null,
                    consumeWeight: isset($tConfig['consumeWeight']) ? (int) $tConfig['consumeWeight'] : null,
                    produceWeight: isset($tConfig['produceWeight']) ? (int) $tConfig['produceWeight'] : null,
                );
            }

            $initialMarking = (array) ($workflowConfig['initial_marking'] ?? []);

            $definition = new WorkflowDefinition(
                name: (string) $name,
                type: WorkflowType::from($workflowConfig['type'] ?? 'workflow'),
                places: $places,
                transitions: $transitions,
                initialMarking: array_map('strval', $initialMarking),
            );

            $markingStoreConfig = $workflowConfig['marking_store'] ?? [];
            $markingStoreType = MarkingStoreType::from($markingStoreConfig['type'] ?? 'property');
            $property = $markingStoreConfig['property'] ?? 'status';

            $markingStore = match ($markingStoreType) {
                MarkingStoreType::Property => new PropertyMarkingStore($property),
                MarkingStoreType::Method => new MethodMarkingStore(
                    getter: $markingStoreConfig['getter'] ?? 'getMarking',
                    setter: $markingStoreConfig['setter'] ?? 'setMarking',
                ),
            };

            $this->register($name, new Workflow($definition, $markingStore));
        }
    }
}
