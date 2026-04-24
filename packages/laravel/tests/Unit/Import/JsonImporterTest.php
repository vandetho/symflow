<?php

declare(strict_types=1);

use Laraflow\Export\JsonExporter;
use Laraflow\Import\JsonImporter;
use Laraflow\Tests\Fixtures\Definitions;

test('imports valid JSON', function () {
    $def = Definitions::orderStateMachine();
    $meta = new \Laraflow\Data\WorkflowMeta(name: 'order', type: $def->type);
    $json = JsonExporter::export($def, $meta);
    $result = JsonImporter::import($json);
    expect($result['definition']->name)->toBe('order');
    expect($result['definition']->places)->toHaveCount(5);
    expect($result['definition']->transitions)->toHaveCount(4);
});

test('throws on invalid JSON', function () {
    expect(fn () => JsonImporter::import('{invalid'))->toThrow(RuntimeException::class, 'Invalid workflow JSON');
});

test('throws on missing definition', function () {
    expect(fn () => JsonImporter::import('{"meta": {}}'))->toThrow(RuntimeException::class, "missing 'definition'");
});

test('throws on missing meta', function () {
    expect(fn () => JsonImporter::import('{"definition": {"places": [], "transitions": []}}'))->toThrow(RuntimeException::class, "missing 'meta'");
});

test('round-trips preserves weights', function () {
    $def = Definitions::weightedWorkflow();
    $meta = new \Laraflow\Data\WorkflowMeta(name: 'factory', type: $def->type);
    $json = JsonExporter::export($def, $meta);
    $result = JsonImporter::import($json);
    $manufacture = collect($result['definition']->transitions)->firstWhere('name', 'manufacture');
    expect($manufacture->consumeWeight)->toBe(3);
    expect($manufacture->produceWeight)->toBe(2);
});
