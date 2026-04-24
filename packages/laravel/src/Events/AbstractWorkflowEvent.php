<?php

declare(strict_types=1);

namespace Laraflow\Events;

use Laraflow\Data\WorkflowEvent;

abstract class AbstractWorkflowEvent
{
    public function __construct(
        public readonly WorkflowEvent $workflowEvent,
    ) {}
}
