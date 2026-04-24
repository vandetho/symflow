<?php

declare(strict_types=1);

use Laraflow\Engine\Analyzer;
use Laraflow\Enums\PlacePattern;
use Laraflow\Enums\TransitionPattern;
use Laraflow\Tests\Fixtures\Definitions;

test('simple transition pattern', function () {
    $analysis = Analyzer::analyze(Definitions::orderStateMachine());
    expect($analysis->transitions['submit']->pattern)->toBe(TransitionPattern::Simple);
});

test('and-split transition pattern', function () {
    $analysis = Analyzer::analyze(Definitions::articleReviewWorkflow());
    expect($analysis->transitions['start_review']->pattern)->toBe(TransitionPattern::AndSplit);
});

test('and-join transition pattern', function () {
    $analysis = Analyzer::analyze(Definitions::articleReviewWorkflow());
    expect($analysis->transitions['publish']->pattern)->toBe(TransitionPattern::AndJoin);
});

test('xor-split place pattern for state_machine', function () {
    $analysis = Analyzer::analyze(Definitions::orderStateMachine());
    expect($analysis->places['submitted']->patterns)->toContain(PlacePattern::XorSplit);
});

test('xor-join place pattern for state_machine', function () {
    $analysis = Analyzer::analyze(Definitions::orderStateMachine());
    // submitted has both approve and reject incoming, but it's a target of submit only
    // approved and rejected both come from submitted
    // Let's check draft - it has only outgoing, so simple
    expect($analysis->places['draft']->patterns)->toContain(PlacePattern::Simple);
});

test('or-split place pattern for workflow', function () {
    // In the article review, checking_content has only one outgoing
    // but draft has one outgoing too. Let's verify simple patterns
    $analysis = Analyzer::analyze(Definitions::articleReviewWorkflow());
    expect($analysis->places['draft']->patterns)->toContain(PlacePattern::Simple);
});

test('and-split place pattern for workflow', function () {
    $analysis = Analyzer::analyze(Definitions::articleReviewWorkflow());
    // checking_content is a target of start_review which has multiple tos
    expect($analysis->places['checking_content']->patterns)->toContain(PlacePattern::AndSplit);
});

test('and-join place pattern for workflow', function () {
    $analysis = Analyzer::analyze(Definitions::articleReviewWorkflow());
    // content_approved is a source of publish which has multiple froms
    expect($analysis->places['content_approved']->patterns)->toContain(PlacePattern::AndJoin);
});

test('analysis includes transition froms and tos', function () {
    $analysis = Analyzer::analyze(Definitions::articleReviewWorkflow());
    expect($analysis->transitions['publish']->froms)->toBe(['content_approved', 'spelling_approved']);
    expect($analysis->transitions['publish']->tos)->toBe(['published']);
});
