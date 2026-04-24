<?php

declare(strict_types=1);

namespace Laraflow\Data;

final readonly class SubjectMiddlewareContext extends MiddlewareContext
{
    public function __construct(
        WorkflowDefinition $definition,
        Transition $transition,
        Marking $marking,
        string $workflowName,
        public object $subject,
    ) {
        parent::__construct($definition, $transition, $marking, $workflowName);
    }
}
