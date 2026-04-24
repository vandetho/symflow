<?php

declare(strict_types=1);

namespace Laraflow\Data;

final readonly class TransitionResult
{
    /**
     * @param  array<TransitionBlocker>  $blockers
     */
    public function __construct(
        public bool $allowed,
        public array $blockers = [],
    ) {}
}
