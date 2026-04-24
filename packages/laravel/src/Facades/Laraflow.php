<?php

declare(strict_types=1);

namespace Laraflow\Facades;

use Illuminate\Support\Facades\Facade;
use Laraflow\Contracts\WorkflowRegistryInterface;

/**
 * @method static \Laraflow\Subject\Workflow get(string $name)
 * @method static bool has(string $name)
 * @method static array<string, \Laraflow\Subject\Workflow> all()
 *
 * @see \Laraflow\Registry\WorkflowRegistry
 */
class Laraflow extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return WorkflowRegistryInterface::class;
    }
}
