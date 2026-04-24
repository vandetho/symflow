<?php

declare(strict_types=1);

namespace Laraflow\Data;

final readonly class Place
{
    /**
     * @param  array<string, string>|null  $metadata
     */
    public function __construct(
        public string $name,
        public ?array $metadata = null,
    ) {}
}
