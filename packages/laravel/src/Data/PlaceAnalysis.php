<?php

declare(strict_types=1);

namespace Laraflow\Data;

use Laraflow\Enums\PlacePattern;

final readonly class PlaceAnalysis
{
    /**
     * @param  array<PlacePattern>  $patterns
     * @param  array<string>  $incomingTransitions
     * @param  array<string>  $outgoingTransitions
     */
    public function __construct(
        public string $name,
        public array $patterns,
        public array $incomingTransitions,
        public array $outgoingTransitions,
    ) {}
}
