<?php

declare(strict_types=1);

use Laraflow\Data\WorkflowMeta;
use Laraflow\Export\PhpExporter;
use Laraflow\Tests\Fixtures\Definitions;

test('generates valid PHP', function () {
    $meta = new WorkflowMeta(name: 'order', type: \Laraflow\Enums\WorkflowType::StateMachine, initialMarking: ['draft']);
    $output = PhpExporter::export(Definitions::orderStateMachine(), $meta);
    expect($output)->toContain('<?php');
    expect($output)->toContain("name: 'order'");
    expect($output)->toContain('WorkflowType::StateMachine');
});

test('includes place definitions', function () {
    $meta = new WorkflowMeta(name: 'order', type: \Laraflow\Enums\WorkflowType::StateMachine, initialMarking: ['draft']);
    $output = PhpExporter::export(Definitions::orderStateMachine(), $meta);
    expect($output)->toContain("new Place(name: 'draft')");
    expect($output)->toContain("new Place(name: 'submitted')");
});

test('includes transition definitions', function () {
    $meta = new WorkflowMeta(name: 'order', type: \Laraflow\Enums\WorkflowType::StateMachine, initialMarking: ['draft']);
    $output = PhpExporter::export(Definitions::orderStateMachine(), $meta);
    expect($output)->toContain("name: 'submit'");
    expect($output)->toContain("froms: ['draft']");
    expect($output)->toContain("tos: ['submitted']");
});

test('includes weights when present', function () {
    $meta = new WorkflowMeta(name: 'factory', type: \Laraflow\Enums\WorkflowType::Workflow, initialMarking: ['raw_materials']);
    $output = PhpExporter::export(Definitions::weightedWorkflow(), $meta);
    expect($output)->toContain('consumeWeight: 3');
    expect($output)->toContain('produceWeight: 2');
});
