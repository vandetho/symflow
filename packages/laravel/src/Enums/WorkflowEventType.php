<?php

declare(strict_types=1);

namespace Laraflow\Enums;

enum WorkflowEventType: string
{
    case Guard = 'guard';
    case Leave = 'leave';
    case Transition = 'transition';
    case Enter = 'enter';
    case Entered = 'entered';
    case Completed = 'completed';
    case Announce = 'announce';
}
