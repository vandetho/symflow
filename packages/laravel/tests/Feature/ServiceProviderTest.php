<?php

declare(strict_types=1);

use Laraflow\Contracts\WorkflowRegistryInterface;

test('service provider registers registry singleton', function () {
    expect(app()->bound(WorkflowRegistryInterface::class))->toBeTrue();
});

test('registry is empty by default', function () {
    $registry = app(WorkflowRegistryInterface::class);
    expect($registry->all())->toBe([]);
});

test('registry builds workflows from config', function () {
    config()->set('laraflow.workflows', [
        'order' => [
            'type' => 'state_machine',
            'marking_store' => ['type' => 'property', 'property' => 'status'],
            'supports' => 'App\\Models\\Order',
            'initial_marking' => ['draft'],
            'places' => ['draft', 'submitted', 'approved'],
            'transitions' => [
                'submit' => ['from' => 'draft', 'to' => 'submitted'],
                'approve' => ['from' => 'submitted', 'to' => 'approved'],
            ],
        ],
    ]);

    // Re-resolve to pick up new config
    app()->forgetInstance(WorkflowRegistryInterface::class);
    $registry = app(WorkflowRegistryInterface::class);

    expect($registry->has('order'))->toBeTrue();
    $workflow = $registry->get('order');
    expect($workflow->definition->name)->toBe('order');
    expect($workflow->definition->places)->toHaveCount(3);
});
