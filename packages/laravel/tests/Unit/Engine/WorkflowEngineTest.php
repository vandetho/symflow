<?php

declare(strict_types=1);

use Laraflow\Contracts\GuardEvaluatorInterface;
use Laraflow\Data\Marking;
use Laraflow\Data\Transition;
use Laraflow\Data\WorkflowEvent;
use Laraflow\Engine\WorkflowEngine;
use Laraflow\Tests\Fixtures\Definitions;

// --- State Machine ---

test('starts with initial marking', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    expect($engine->getActivePlaces())->toBe(['draft']);
});

test('can() returns allowed for valid transition', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $result = $engine->can('submit');
    expect($result->allowed)->toBeTrue();
    expect($result->blockers)->toBe([]);
});

test('can() returns not_in_place for wrong state', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $result = $engine->can('approve');
    expect($result->allowed)->toBeFalse();
    expect($result->blockers[0]->code)->toBe('not_in_place');
});

test('can() returns unknown_transition for nonexistent transition', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $result = $engine->can('nonexistent');
    expect($result->allowed)->toBeFalse();
    expect($result->blockers[0]->code)->toBe('unknown_transition');
});

test('apply() moves to new state', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $engine->apply('submit');
    expect($engine->getActivePlaces())->toBe(['submitted']);
});

test('apply() throws on blocked transition', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    expect(fn () => $engine->apply('approve'))->toThrow(RuntimeException::class, 'Cannot apply transition');
});

test('getEnabledTransitions() returns correct transitions', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $engine->apply('submit');
    $names = array_map(fn (Transition $t) => $t->name, $engine->getEnabledTransitions());
    sort($names);
    expect($names)->toBe(['approve', 'reject']);
});

test('reset() restores initial marking', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $engine->apply('submit');
    $engine->reset();
    expect($engine->getActivePlaces())->toBe(['draft']);
});

test('full path: draft to fulfilled', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $engine->apply('submit');
    $engine->apply('approve');
    $engine->apply('fulfill');
    expect($engine->getActivePlaces())->toBe(['fulfilled']);
    expect($engine->getEnabledTransitions())->toBe([]);
});

test('setMarking() overrides current state', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $marking = new Marking(['draft' => 0, 'submitted' => 0, 'approved' => 1, 'rejected' => 0, 'fulfilled' => 0]);
    $engine->setMarking($marking);
    expect($engine->getActivePlaces())->toBe(['approved']);
    expect($engine->can('fulfill')->allowed)->toBeTrue();
});

test('getDefinition() returns the definition', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    expect($engine->getDefinition()->name)->toBe('order');
});

test('getInitialMarking() always returns initial state', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $engine->apply('submit');
    $initial = $engine->getInitialMarking();
    expect($initial->get('draft'))->toBe(1);
    expect($initial->get('submitted'))->toBe(0);
});

// --- Petri Net ---

test('workflow: AND-split forks into parallel places', function () {
    $engine = new WorkflowEngine(Definitions::articleReviewWorkflow());
    $engine->apply('start_review');
    $places = $engine->getActivePlaces();
    sort($places);
    expect($places)->toBe(['checking_content', 'checking_spelling']);
});

test('workflow: AND-join requires all source places', function () {
    $engine = new WorkflowEngine(Definitions::articleReviewWorkflow());
    $engine->apply('start_review');
    $engine->apply('approve_content');
    expect($engine->can('publish')->allowed)->toBeFalse();
});

test('workflow: AND-join fires when all sources marked', function () {
    $engine = new WorkflowEngine(Definitions::articleReviewWorkflow());
    $engine->apply('start_review');
    $engine->apply('approve_content');
    $engine->apply('approve_spelling');
    expect($engine->can('publish')->allowed)->toBeTrue();
    $engine->apply('publish');
    expect($engine->getActivePlaces())->toBe(['published']);
});

test('workflow: tokens consumed correctly', function () {
    $engine = new WorkflowEngine(Definitions::articleReviewWorkflow());
    $engine->apply('start_review');
    $marking = $engine->getMarking();
    expect($marking->get('draft'))->toBe(0);
    expect($marking->get('checking_content'))->toBe(1);
    expect($marking->get('checking_spelling'))->toBe(1);
});

// --- Guards ---

test('guard: blocks transition when guard fails', function () {
    $evaluator = new class implements GuardEvaluatorInterface {
        public function evaluate(string $expression, Marking $marking, Transition $transition): bool
        {
            return false;
        }
    };
    $engine = new WorkflowEngine(Definitions::guardedStateMachine(), $evaluator);
    $result = $engine->can('approve');
    expect($result->allowed)->toBeFalse();
    expect($result->blockers[0]->code)->toBe('guard_blocked');
});

test('guard: allows transition when guard passes', function () {
    $evaluator = new class implements GuardEvaluatorInterface {
        public function evaluate(string $expression, Marking $marking, Transition $transition): bool
        {
            return true;
        }
    };
    $engine = new WorkflowEngine(Definitions::guardedStateMachine(), $evaluator);
    expect($engine->can('approve')->allowed)->toBeTrue();
});

test('guard: transitions without guards are not affected', function () {
    $evaluator = new class implements GuardEvaluatorInterface {
        public function evaluate(string $expression, Marking $marking, Transition $transition): bool
        {
            return false;
        }
    };
    $engine = new WorkflowEngine(Definitions::guardedStateMachine(), $evaluator);
    expect($engine->can('deny')->allowed)->toBeTrue();
});

// --- Events ---

test('events: fires in Symfony order', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $events = [];

    $engine->on(\Laraflow\Enums\WorkflowEventType::Guard, function () use (&$events) { $events[] = 'guard'; });
    $engine->on(\Laraflow\Enums\WorkflowEventType::Leave, function () use (&$events) { $events[] = 'leave'; });
    $engine->on(\Laraflow\Enums\WorkflowEventType::Transition, function () use (&$events) { $events[] = 'transition'; });
    $engine->on(\Laraflow\Enums\WorkflowEventType::Enter, function () use (&$events) { $events[] = 'enter'; });
    $engine->on(\Laraflow\Enums\WorkflowEventType::Entered, function () use (&$events) { $events[] = 'entered'; });
    $engine->on(\Laraflow\Enums\WorkflowEventType::Completed, function () use (&$events) { $events[] = 'completed'; });
    $engine->on(\Laraflow\Enums\WorkflowEventType::Announce, function () use (&$events) { $events[] = 'announce'; });

    $engine->apply('submit');

    expect($events[0])->toBe('guard');
    expect($events[1])->toBe('leave');
    expect($events[2])->toBe('transition');
    expect($events[3])->toBe('enter');
    expect($events[4])->toBe('entered');
    expect($events[5])->toBe('completed');
});

test('events: event contains correct data', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $receivedEvent = null;

    $engine->on(\Laraflow\Enums\WorkflowEventType::Entered, function (WorkflowEvent $event) use (&$receivedEvent) {
        $receivedEvent = $event;
    });

    $engine->apply('submit');

    expect($receivedEvent)->not->toBeNull();
    expect($receivedEvent->type)->toBe(\Laraflow\Enums\WorkflowEventType::Entered);
    expect($receivedEvent->transition->name)->toBe('submit');
    expect($receivedEvent->workflowName)->toBe('order');
});

test('events: unsubscribe removes listener', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $called = false;
    $unsub = $engine->on(\Laraflow\Enums\WorkflowEventType::Entered, function () use (&$called) { $called = true; });
    $unsub();
    $engine->apply('submit');
    expect($called)->toBeFalse();
});

// --- Weighted Arcs ---

test('weighted: can() returns false when marking < consumeWeight', function () {
    $engine = new WorkflowEngine(Definitions::weightedWorkflow());
    $result = $engine->can('manufacture');
    expect($result->allowed)->toBeFalse();
    expect($result->blockers[0]->code)->toBe('not_in_place');
});

test('weighted: can() returns true when marking >= consumeWeight', function () {
    $engine = new WorkflowEngine(Definitions::weightedWorkflow());
    $engine->setMarking(new Marking(['raw_materials' => 3, 'components' => 0, 'assembled' => 0]));
    expect($engine->can('manufacture')->allowed)->toBeTrue();
});

test('weighted: apply() consumes and produces correct token counts', function () {
    $engine = new WorkflowEngine(Definitions::weightedWorkflow());
    $engine->setMarking(new Marking(['raw_materials' => 5, 'components' => 0, 'assembled' => 0]));
    $engine->apply('manufacture');
    $marking = $engine->getMarking();
    expect($marking->get('raw_materials'))->toBe(2);
    expect($marking->get('components'))->toBe(2);
});

test('weighted: multi-step accumulation', function () {
    $engine = new WorkflowEngine(Definitions::weightedWorkflow());
    $engine->setMarking(new Marking(['raw_materials' => 6, 'components' => 0, 'assembled' => 0]));
    $engine->apply('manufacture');
    $engine->apply('manufacture');
    expect($engine->can('assemble')->allowed)->toBeTrue();
    $engine->apply('assemble');
    $marking = $engine->getMarking();
    expect($marking->get('raw_materials'))->toBe(0);
    expect($marking->get('components'))->toBe(2);
    expect($marking->get('assembled'))->toBe(1);
});

// --- Middleware ---

test('middleware: called with correct context', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $receivedCtx = null;

    $engine->use(function ($ctx, $next) use (&$receivedCtx) {
        $receivedCtx = $ctx;
        return $next();
    });

    $engine->apply('submit');
    expect($receivedCtx)->not->toBeNull();
    expect($receivedCtx->transition->name)->toBe('submit');
    expect($receivedCtx->workflowName)->toBe('order');
});

test('middleware: chain executes in registration order', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $log = [];

    $engine->use(function ($ctx, $next) use (&$log) {
        $log[] = 'mw1-before';
        $result = $next();
        $log[] = 'mw1-after';
        return $result;
    });

    $engine->use(function ($ctx, $next) use (&$log) {
        $log[] = 'mw2-before';
        $result = $next();
        $log[] = 'mw2-after';
        return $result;
    });

    $engine->apply('submit');
    expect($log)->toBe(['mw1-before', 'mw2-before', 'mw2-after', 'mw1-after']);
});

test('middleware: can block transition by not calling next', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());

    $engine->use(function ($ctx, $next) {
        return $ctx->marking;
    });

    $result = $engine->apply('submit');
    expect($result->get('draft'))->toBe(1);
    expect($engine->getActivePlaces())->toBe(['draft']);
});

test('middleware: can() is not affected by middleware', function () {
    $engine = new WorkflowEngine(Definitions::orderStateMachine());
    $called = false;

    $engine->use(function ($ctx, $next) use (&$called) {
        $called = true;
        return $next();
    });

    $engine->can('submit');
    expect($called)->toBeFalse();
});
