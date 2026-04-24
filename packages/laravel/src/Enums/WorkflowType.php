<?php

declare(strict_types=1);

namespace Laraflow\Enums;

enum WorkflowType: string
{
    case Workflow = 'workflow';
    case StateMachine = 'state_machine';
}
