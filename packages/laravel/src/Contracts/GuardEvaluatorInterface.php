<?php

declare(strict_types=1);

namespace Laraflow\Contracts;

use Laraflow\Data\Marking;
use Laraflow\Data\Transition;

interface GuardEvaluatorInterface
{
    public function evaluate(string $expression, Marking $marking, Transition $transition): bool;
}
