<?php

declare(strict_types=1);

namespace Laraflow\Data;

use Laraflow\Enums\WorkflowEventType;

readonly class WorkflowEvent
{
    public function __construct(
        public WorkflowEventType $type,
        public Transition $transition,
        public Marking $marking,
        public string $workflowName,
    ) {}
}
