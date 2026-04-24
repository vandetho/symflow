<?php

declare(strict_types=1);

namespace Laraflow\Data;

final readonly class TransitionBlocker
{
    public function __construct(
        public string $code,
        public string $message,
    ) {}
}
