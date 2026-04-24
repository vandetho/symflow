<?php

declare(strict_types=1);

namespace Laraflow\Data;

readonly class MiddlewareContext
{
    public function __construct(
        public WorkflowDefinition $definition,
        public Transition $transition,
        public Marking $marking,
        public string $workflowName,
    ) {}
}
