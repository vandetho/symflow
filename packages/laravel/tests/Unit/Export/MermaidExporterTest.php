<?php

declare(strict_types=1);

use Laraflow\Export\MermaidExporter;
use Laraflow\Tests\Fixtures\Definitions;

test('exports stateDiagram-v2 header', function () {
    $output = MermaidExporter::export(Definitions::orderStateMachine());
    expect($output)->toContain('stateDiagram-v2');
    expect($output)->toContain('direction LR');
});

test('exports initial transitions', function () {
    $output = MermaidExporter::export(Definitions::orderStateMachine());
    expect($output)->toContain('[*] --> draft');
});

test('exports transition labels', function () {
    $output = MermaidExporter::export(Definitions::orderStateMachine());
    expect($output)->toContain('draft --> submitted : submit');
});

test('exports final states', function () {
    $output = MermaidExporter::export(Definitions::orderStateMachine());
    expect($output)->toContain('fulfilled --> [*]');
    expect($output)->toContain('rejected --> [*]');
});

test('exports weight annotations', function () {
    $output = MermaidExporter::export(Definitions::weightedWorkflow());
    expect($output)->toContain('manufacture (3:2)');
});

test('exports AND-split cross-product', function () {
    $output = MermaidExporter::export(Definitions::articleReviewWorkflow());
    expect($output)->toContain('draft --> checking_content : start_review');
    expect($output)->toContain('draft --> checking_spelling : start_review');
});
