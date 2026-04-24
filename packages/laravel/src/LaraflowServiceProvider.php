<?php

declare(strict_types=1);

namespace Laraflow;

use Illuminate\Support\ServiceProvider;
use Laraflow\Console\DotCommand;
use Laraflow\Console\MermaidCommand;
use Laraflow\Console\ValidateCommand;
use Laraflow\Contracts\WorkflowRegistryInterface;
use Laraflow\Registry\WorkflowRegistry;

class LaraflowServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/laraflow.php', 'laraflow');

        $this->app->singleton(WorkflowRegistryInterface::class, function ($app) {
            $registry = new WorkflowRegistry();
            $registry->buildFromConfig($app['config']->get('laraflow.workflows', []));

            return $registry;
        });
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../config/laraflow.php' => config_path('laraflow.php'),
            ], 'laraflow-config');

            $this->commands([
                ValidateCommand::class,
                MermaidCommand::class,
                DotCommand::class,
            ]);
        }
    }
}
