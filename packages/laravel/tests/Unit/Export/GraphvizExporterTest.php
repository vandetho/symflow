<?php

declare(strict_types=1);

use Laraflow\Export\GraphvizExporter;
use Laraflow\Tests\Fixtures\Definitions;

test('exports digraph header', function () {
    $output = GraphvizExporter::export(Definitions::orderStateMachine());
    expect($output)->toContain('digraph order {');
    expect($output)->toContain('rankdir=LR;');
});

test('exports start point node', function () {
    $output = GraphvizExporter::export(Definitions::orderStateMachine());
    expect($output)->toContain('__start__ [shape=point');
});

test('exports place nodes', function () {
    $output = GraphvizExporter::export(Definitions::orderStateMachine());
    expect($output)->toContain('draft [shape=circle');
});

test('exports final state as doublecircle', function () {
    $output = GraphvizExporter::export(Definitions::orderStateMachine());
    expect($output)->toContain('fulfilled [shape=doublecircle');
});

test('exports initial edge', function () {
    $output = GraphvizExporter::export(Definitions::orderStateMachine());
    expect($output)->toContain('__start__ -> draft;');
});

test('exports transition edge labels', function () {
    $output = GraphvizExporter::export(Definitions::orderStateMachine());
    expect($output)->toContain('draft -> submitted [label=submit];');
});

test('exports AND-split with intermediate node', function () {
    $output = GraphvizExporter::export(Definitions::articleReviewWorkflow());
    expect($output)->toContain('__t_start_review__');
    expect($output)->toContain('draft -> __t_start_review__');
    expect($output)->toContain('__t_start_review__ -> checking_content');
});

test('exports weight annotations', function () {
    $output = GraphvizExporter::export(Definitions::weightedWorkflow());
    expect($output)->toContain('(3:2)');
});
