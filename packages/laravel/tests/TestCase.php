<?php

declare(strict_types=1);

namespace Laraflow\Tests;

use Laraflow\LaraflowServiceProvider;
use Orchestra\Testbench\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function getPackageProviders($app): array
    {
        return [LaraflowServiceProvider::class];
    }
}
