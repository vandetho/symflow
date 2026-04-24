<?php

declare(strict_types=1);

namespace Laraflow\Data;

final readonly class WorkflowAnalysis
{
    /**
     * @param  array<string, PlaceAnalysis>  $places
     * @param  array<string, TransitionAnalysis>  $transitions
     */
    public function __construct(
        public array $places,
        public array $transitions,
    ) {}
}
