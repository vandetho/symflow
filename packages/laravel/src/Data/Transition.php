<?php

declare(strict_types=1);

namespace Laraflow\Data;

final readonly class Transition
{
    /**
     * @param  array<string>  $froms
     * @param  array<string>  $tos
     * @param  array<string, string>|null  $metadata
     */
    public function __construct(
        public string $name,
        public array $froms,
        public array $tos,
        public ?string $guard = null,
        public ?array $metadata = null,
        public ?int $consumeWeight = null,
        public ?int $produceWeight = null,
    ) {}
}
