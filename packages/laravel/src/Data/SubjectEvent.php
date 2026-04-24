<?php

declare(strict_types=1);

namespace Laraflow\Data;

use Laraflow\Enums\WorkflowEventType;

final readonly class SubjectEvent extends WorkflowEvent
{
    public function __construct(
        WorkflowEventType $type,
        Transition $transition,
        Marking $marking,
        string $workflowName,
        public object $subject,
    ) {
        parent::__construct($type, $transition, $marking, $workflowName);
    }
}
