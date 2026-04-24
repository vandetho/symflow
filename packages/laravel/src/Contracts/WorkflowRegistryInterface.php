<?php

declare(strict_types=1);

namespace Laraflow\Contracts;

use Laraflow\Subject\Workflow;

interface WorkflowRegistryInterface
{
    public function get(string $name): Workflow;

    public function has(string $name): bool;

    /**
     * @return array<string, Workflow>
     */
    public function all(): array;
}
