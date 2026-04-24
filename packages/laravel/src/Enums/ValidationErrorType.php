<?php

declare(strict_types=1);

namespace Laraflow\Enums;

enum ValidationErrorType: string
{
    case NoInitialMarking = 'no_initial_marking';
    case InvalidInitialMarking = 'invalid_initial_marking';
    case InvalidTransitionSource = 'invalid_transition_source';
    case InvalidTransitionTarget = 'invalid_transition_target';
    case UnreachablePlace = 'unreachable_place';
    case DeadTransition = 'dead_transition';
    case OrphanPlace = 'orphan_place';
    case InvalidWeight = 'invalid_weight';
}
