<?php

declare(strict_types=1);

namespace Laraflow\Data;

final readonly class ValidationResult
{
    /**
     * @param  array<ValidationError>  $errors
     */
    public function __construct(
        public bool $valid,
        public array $errors = [],
    ) {}
}
