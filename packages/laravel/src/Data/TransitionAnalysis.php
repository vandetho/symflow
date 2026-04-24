<?php

declare(strict_types=1);

namespace Laraflow\Data;

use Laraflow\Enums\TransitionPattern;

final readonly class TransitionAnalysis
{
    /**
     * @param  array<string>  $froms
     * @param  array<string>  $tos
     */
    public function __construct(
        public string $name,
        public TransitionPattern $pattern,
        public array $froms,
        public array $tos,
    ) {}
}
