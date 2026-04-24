<?php

declare(strict_types=1);

namespace Laraflow\Data;

use Laraflow\Enums\ValidationErrorType;

final readonly class ValidationError
{
    /**
     * @param  array<string, mixed>|null  $details
     */
    public function __construct(
        public ValidationErrorType $type,
        public string $message,
        public ?array $details = null,
    ) {}
}
