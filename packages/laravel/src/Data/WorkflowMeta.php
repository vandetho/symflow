<?php

declare(strict_types=1);

namespace Laraflow\Data;

use Laraflow\Enums\MarkingStoreType;
use Laraflow\Enums\WorkflowType;

final readonly class WorkflowMeta
{
    /**
     * @param  array<string>  $initialMarking
     */
    public function __construct(
        public string $name,
        public WorkflowType $type = WorkflowType::Workflow,
        public MarkingStoreType $markingStore = MarkingStoreType::Method,
        public array $initialMarking = [],
        public string $supports = 'App\\Entity\\MyEntity',
        public string $property = 'currentState',
    ) {}

    public static function default(): self
    {
        return new self(name: 'my_workflow');
    }
}
