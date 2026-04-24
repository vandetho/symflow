<?php

declare(strict_types=1);

namespace Laraflow\Data;

use Laraflow\Enums\WorkflowType;

final readonly class WorkflowDefinition
{
    /**
     * @param  array<Place>  $places
     * @param  array<Transition>  $transitions
     * @param  array<string>  $initialMarking
     */
    public function __construct(
        public string $name,
        public WorkflowType $type,
        public array $places,
        public array $transitions,
        public array $initialMarking,
    ) {}
}
