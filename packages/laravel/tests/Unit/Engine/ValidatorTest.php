<?php

declare(strict_types=1);

use Laraflow\Data\Place;
use Laraflow\Data\Transition;
use Laraflow\Data\WorkflowDefinition;
use Laraflow\Engine\Validator;
use Laraflow\Enums\WorkflowType;
use Laraflow\Tests\Fixtures\Definitions;

test('valid definition returns no errors', function () {
    $result = Validator::validate(Definitions::orderStateMachine());
    expect($result->valid)->toBeTrue();
    expect($result->errors)->toBe([]);
});

test('valid workflow definition returns no errors', function () {
    $result = Validator::validate(Definitions::articleReviewWorkflow());
    expect($result->valid)->toBeTrue();
});

test('detects no initial marking', function () {
    $def = new WorkflowDefinition('test', WorkflowType::StateMachine, Definitions::orderStateMachine()->places, Definitions::orderStateMachine()->transitions, []);
    $result = Validator::validate($def);
    expect($result->valid)->toBeFalse();
    expect(collect($result->errors)->contains(fn ($e) => $e->type->value === 'no_initial_marking'))->toBeTrue();
});

test('detects invalid initial marking', function () {
    $def = new WorkflowDefinition('test', WorkflowType::StateMachine, Definitions::orderStateMachine()->places, Definitions::orderStateMachine()->transitions, ['nonexistent']);
    $result = Validator::validate($def);
    expect($result->valid)->toBeFalse();
    expect(collect($result->errors)->contains(fn ($e) => $e->type->value === 'invalid_initial_marking'))->toBeTrue();
});

test('detects invalid transition source', function () {
    $def = new WorkflowDefinition('test', WorkflowType::StateMachine, Definitions::orderStateMachine()->places, [new Transition(name: 'bad', froms: ['nonexistent'], tos: ['submitted'])], ['draft']);
    $result = Validator::validate($def);
    expect(collect($result->errors)->contains(fn ($e) => $e->type->value === 'invalid_transition_source'))->toBeTrue();
});

test('detects invalid transition target', function () {
    $def = new WorkflowDefinition('test', WorkflowType::StateMachine, Definitions::orderStateMachine()->places, [new Transition(name: 'bad', froms: ['draft'], tos: ['nonexistent'])], ['draft']);
    $result = Validator::validate($def);
    expect(collect($result->errors)->contains(fn ($e) => $e->type->value === 'invalid_transition_target'))->toBeTrue();
});

test('detects unreachable places', function () {
    $def = new WorkflowDefinition('test', WorkflowType::StateMachine, [new Place('a'), new Place('b'), new Place('isolated')], [new Transition(name: 'go', froms: ['a'], tos: ['b'])], ['a']);
    $result = Validator::validate($def);
    expect(collect($result->errors)->contains(fn ($e) => $e->type->value === 'unreachable_place'))->toBeTrue();
});

test('detects dead transitions', function () {
    $def = new WorkflowDefinition('test', WorkflowType::StateMachine, [new Place('a'), new Place('b'), new Place('c')], [new Transition(name: 'go', froms: ['a'], tos: ['b']), new Transition(name: 'dead', froms: ['c'], tos: ['a'])], ['a']);
    $result = Validator::validate($def);
    expect(collect($result->errors)->contains(fn ($e) => $e->type->value === 'dead_transition'))->toBeTrue();
});

test('detects orphan places', function () {
    $def = new WorkflowDefinition('test', WorkflowType::StateMachine, [new Place('a'), new Place('b'), new Place('orphan')], [new Transition(name: 'go', froms: ['a'], tos: ['b'])], ['a']);
    $result = Validator::validate($def);
    expect(collect($result->errors)->contains(fn ($e) => $e->type->value === 'orphan_place'))->toBeTrue();
});

test('valid weighted workflow returns no errors', function () {
    $result = Validator::validate(Definitions::weightedWorkflow());
    expect($result->valid)->toBeTrue();
});

test('detects invalid consumeWeight (zero)', function () {
    $def = new WorkflowDefinition('test', WorkflowType::StateMachine, Definitions::orderStateMachine()->places, [new Transition(name: 'submit', froms: ['draft'], tos: ['submitted'], consumeWeight: 0)], ['draft']);
    $result = Validator::validate($def);
    expect(collect($result->errors)->contains(fn ($e) => $e->type->value === 'invalid_weight'))->toBeTrue();
});

test('detects invalid consumeWeight (negative)', function () {
    $def = new WorkflowDefinition('test', WorkflowType::StateMachine, Definitions::orderStateMachine()->places, [new Transition(name: 'submit', froms: ['draft'], tos: ['submitted'], consumeWeight: -1)], ['draft']);
    $result = Validator::validate($def);
    expect(collect($result->errors)->contains(fn ($e) => $e->type->value === 'invalid_weight'))->toBeTrue();
});
