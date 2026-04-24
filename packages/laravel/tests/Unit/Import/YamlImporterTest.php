<?php

declare(strict_types=1);

use Laraflow\Import\YamlImporter;

test('imports framework-wrapped YAML', function () {
    $yaml = <<<'YAML'
framework:
    workflows:
        my_flow:
            type: workflow
            marking_store:
                type: property
                property: state
            supports: [App\Entity\Ticket]
            initial_marking: new
            places: [new, open, closed]
            transitions:
                open_ticket:
                    from: new
                    to: open
                close_ticket:
                    from: open
                    to: closed
YAML;
    $result = YamlImporter::import($yaml);
    expect($result['definition']->name)->toBe('my_flow');
    expect($result['definition']->places)->toHaveCount(3);
    expect($result['definition']->transitions)->toHaveCount(2);
    expect($result['definition']->initialMarking)->toBe(['new']);
    expect($result['meta']->markingStore->value)->toBe('property');
    expect($result['meta']->property)->toBe('state');
});

test('imports bare YAML', function () {
    $yaml = <<<'YAML'
places: [a, b]
transitions:
    go:
        from: a
        to: b
initial_marking: a
YAML;
    $result = YamlImporter::import($yaml);
    $names = array_map(fn ($p) => $p->name, $result['definition']->places);
    expect($names)->toBe(['a', 'b']);
    expect($result['definition']->transitions[0]->name)->toBe('go');
});

test('imports places with metadata', function () {
    $yaml = <<<'YAML'
framework:
    workflows:
        test:
            type: state_machine
            initial_marking: draft
            places:
                draft: ~
                review:
                    metadata:
                        description: Human review
                        bg_color: DeepSkyBlue
            transitions:
                submit:
                    from: draft
                    to: review
YAML;
    $result = YamlImporter::import($yaml);
    expect($result['definition']->places[0]->name)->toBe('draft');
    expect($result['definition']->places[1]->metadata)->toBe([
        'description' => 'Human review',
        'bg_color' => 'DeepSkyBlue',
    ]);
});

test('imports guards', function () {
    $yaml = <<<'YAML'
framework:
    workflows:
        test:
            type: state_machine
            initial_marking: draft
            places: [draft, approved]
            transitions:
                approve:
                    from: draft
                    to: approved
                    guard: 'is_granted("ROLE_ADMIN")'
YAML;
    $result = YamlImporter::import($yaml);
    expect($result['definition']->transitions[0]->guard)->toBe('is_granted("ROLE_ADMIN")');
});

test('imports multiple from/to as arrays', function () {
    $yaml = <<<'YAML'
framework:
    workflows:
        test:
            type: workflow
            initial_marking: draft
            places: [draft, a, b, done]
            transitions:
                fork:
                    from: draft
                    to: [a, b]
                join:
                    from: [a, b]
                    to: done
YAML;
    $result = YamlImporter::import($yaml);
    expect($result['definition']->transitions[0]->tos)->toBe(['a', 'b']);
    expect($result['definition']->transitions[1]->froms)->toBe(['a', 'b']);
});

test('imports weights', function () {
    $yaml = <<<'YAML'
framework:
    workflows:
        test:
            type: workflow
            initial_marking: a
            places: [a, b]
            transitions:
                go:
                    from: a
                    to: b
                    consumeWeight: 3
                    produceWeight: 2
YAML;
    $result = YamlImporter::import($yaml);
    expect($result['definition']->transitions[0]->consumeWeight)->toBe(3);
    expect($result['definition']->transitions[0]->produceWeight)->toBe(2);
});

test('throws on empty YAML', function () {
    $threw = false;
    try {
        YamlImporter::import('');
    } catch (\Throwable) {
        $threw = true;
    }
    expect($threw)->toBeTrue();
});

test('imports article-workflow fixture', function () {
    $yaml = file_get_contents(__DIR__ . '/../../Fixtures/article-workflow.yaml');
    $result = YamlImporter::import($yaml);
    expect($result['definition']->name)->toBe('article_workflow');
    expect($result['definition']->places)->toHaveCount(6);
    expect($result['definition']->transitions)->toHaveCount(4);
});

test('imports blog-event fixture with php/const tags', function () {
    $yaml = file_get_contents(__DIR__ . '/../../Fixtures/blog-event.yaml');
    $result = YamlImporter::import($yaml);
    $placeNames = array_map(fn ($p) => $p->name, $result['definition']->places);
    expect($placeNames)->toContain('NEW_BLOG');
    expect($placeNames)->toContain('PUBLISHED');
});

test('imports php-enum fixture', function () {
    $yaml = file_get_contents(__DIR__ . '/../../Fixtures/php-enum.yaml');
    $result = YamlImporter::import($yaml);
    expect($result['definition']->places)->not->toBeEmpty();
});
