<?php

declare(strict_types=1);

test('validate command succeeds for valid file', function () {
    $file = __DIR__ . '/../../Fixtures/article-workflow.yaml';
    $this->artisan('laraflow:validate', ['file' => $file])
        ->expectsOutputToContain('is valid')
        ->assertSuccessful();
});

test('validate command fails for nonexistent file', function () {
    $this->artisan('laraflow:validate', ['file' => '/nonexistent.yaml'])
        ->assertFailed();
});

test('mermaid command outputs diagram', function () {
    $file = __DIR__ . '/../../Fixtures/article-workflow.yaml';
    $this->artisan('laraflow:mermaid', ['file' => $file])
        ->expectsOutputToContain('stateDiagram-v2')
        ->assertSuccessful();
});

test('dot command outputs digraph', function () {
    $file = __DIR__ . '/../../Fixtures/article-workflow.yaml';
    $this->artisan('laraflow:dot', ['file' => $file])
        ->expectsOutputToContain('digraph')
        ->assertSuccessful();
});
