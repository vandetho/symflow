<?php

declare(strict_types=1);

use Laraflow\Data\WorkflowMeta;
use Laraflow\Export\YamlExporter;
use Laraflow\Import\YamlImporter;
use Laraflow\Tests\Fixtures\Definitions;

$orderMeta = fn () => new WorkflowMeta(
    name: 'order',
    type: \Laraflow\Enums\WorkflowType::StateMachine,
    initialMarking: ['draft'],
    supports: 'App\\Entity\\Order',
);

test('exports valid Symfony YAML structure', function () use ($orderMeta) {
    $yaml = YamlExporter::export(Definitions::orderStateMachine(), $orderMeta());
    expect($yaml)->toContain('framework:');
    expect($yaml)->toContain('workflows:');
    expect($yaml)->toContain('order:');
});

test('exports type correctly', function () use ($orderMeta) {
    $yaml = YamlExporter::export(Definitions::orderStateMachine(), $orderMeta());
    expect($yaml)->toContain('type: state_machine');
});

test('exports transitions with from/to', function () use ($orderMeta) {
    $yaml = YamlExporter::export(Definitions::orderStateMachine(), $orderMeta());
    expect($yaml)->toContain('submit:');
    expect($yaml)->toContain('from: draft');
    expect($yaml)->toContain('to: submitted');
});

test('omits default weights', function () use ($orderMeta) {
    $yaml = YamlExporter::export(Definitions::orderStateMachine(), $orderMeta());
    expect($yaml)->not->toContain('consumeWeight');
    expect($yaml)->not->toContain('produceWeight');
});

test('exports non-default weights', function () {
    $meta = new WorkflowMeta(
        name: 'factory',
        type: \Laraflow\Enums\WorkflowType::Workflow,
        initialMarking: ['raw_materials'],
    );
    $yaml = YamlExporter::export(Definitions::weightedWorkflow(), $meta);
    expect($yaml)->toContain('consumeWeight: 3');
    expect($yaml)->toContain('produceWeight: 2');
});

test('round-trips: export then import preserves definition', function () use ($orderMeta) {
    $yaml = YamlExporter::export(Definitions::orderStateMachine(), $orderMeta());
    $result = YamlImporter::import($yaml);
    expect($result['definition']->name)->toBe('order');
    expect($result['definition']->type->value)->toBe('state_machine');
    $placeNames = array_map(fn ($p) => $p->name, $result['definition']->places);
    $expectedNames = array_map(fn ($p) => $p->name, Definitions::orderStateMachine()->places);
    expect($placeNames)->toBe($expectedNames);
    expect($result['definition']->transitions)->toHaveCount(4);
    expect($result['definition']->initialMarking)->toBe(['draft']);
});

test('round-trips weighted arcs', function () {
    $meta = new WorkflowMeta(
        name: 'factory',
        type: \Laraflow\Enums\WorkflowType::Workflow,
        initialMarking: ['raw_materials'],
    );
    $yaml = YamlExporter::export(Definitions::weightedWorkflow(), $meta);
    $result = YamlImporter::import($yaml);
    $manufacture = collect($result['definition']->transitions)->firstWhere('name', 'manufacture');
    expect($manufacture->consumeWeight)->toBe(3);
    expect($manufacture->produceWeight)->toBe(2);
});
