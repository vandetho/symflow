<?php

declare(strict_types=1);

use Laraflow\Data\Marking;
use Laraflow\Data\SubjectEvent;
use Laraflow\Enums\WorkflowEventType;
use Laraflow\Subject\PropertyMarkingStore;
use Laraflow\Subject\Workflow;
use Laraflow\Tests\Fixtures\Definitions;

test('can() checks transition for subject', function () {
    $workflow = new Workflow(Definitions::orderStateMachine(), new PropertyMarkingStore('status'));
    $order = new stdClass();
    $order->status = 'draft';
    expect($workflow->can($order, 'submit')->allowed)->toBeTrue();
    expect($workflow->can($order, 'approve')->allowed)->toBeFalse();
});

test('apply() updates subject state', function () {
    $workflow = new Workflow(Definitions::orderStateMachine(), new PropertyMarkingStore('status'));
    $order = new stdClass();
    $order->status = 'draft';
    $workflow->apply($order, 'submit');
    expect($order->status)->toBe('submitted');
});

test('getEnabledTransitions() returns available transitions', function () {
    $workflow = new Workflow(Definitions::orderStateMachine(), new PropertyMarkingStore('status'));
    $order = new stdClass();
    $order->status = 'submitted';
    $names = array_map(fn ($t) => $t->name, $workflow->getEnabledTransitions($order));
    sort($names);
    expect($names)->toBe(['approve', 'reject']);
});

test('getMarking() reads from subject', function () {
    $workflow = new Workflow(Definitions::orderStateMachine(), new PropertyMarkingStore('status'));
    $order = new stdClass();
    $order->status = 'approved';
    $marking = $workflow->getMarking($order);
    expect($marking->get('approved'))->toBe(1);
});

test('events include subject', function () {
    $workflow = new Workflow(Definitions::orderStateMachine(), new PropertyMarkingStore('status'));
    $order = new stdClass();
    $order->status = 'draft';
    $order->id = '1';

    $receivedSubject = null;
    $workflow->on(WorkflowEventType::Entered, function (SubjectEvent $event) use (&$receivedSubject) {
        $receivedSubject = $event->subject;
    });

    $workflow->apply($order, 'submit');
    expect($receivedSubject)->toBe($order);
});

test('full flow through subject', function () {
    $workflow = new Workflow(Definitions::orderStateMachine(), new PropertyMarkingStore('status'));
    $order = new stdClass();
    $order->status = 'draft';
    $workflow->apply($order, 'submit');
    $workflow->apply($order, 'approve');
    $workflow->apply($order, 'fulfill');
    expect($order->status)->toBe('fulfilled');
});

test('subject middleware receives subject in context', function () {
    $workflow = new Workflow(
        Definitions::orderStateMachine(),
        new PropertyMarkingStore('status'),
        middleware: [
            function ($ctx, $next) {
                expect($ctx->subject)->toBeObject();
                expect($ctx->subject->id)->toBe('1');
                return $next();
            },
        ],
    );
    $order = new stdClass();
    $order->status = 'draft';
    $order->id = '1';
    $workflow->apply($order, 'submit');
});

test('subject middleware wraps the transition', function () {
    $log = [];
    $workflow = new Workflow(
        Definitions::orderStateMachine(),
        new PropertyMarkingStore('status'),
        middleware: [
            function ($ctx, $next) use (&$log) {
                $log[] = 'before';
                $result = $next();
                $log[] = 'after';
                return $result;
            },
        ],
    );
    $order = new stdClass();
    $order->status = 'draft';
    $workflow->apply($order, 'submit');
    expect($log)->toBe(['before', 'after']);
});

test('use() adds middleware at runtime', function () {
    $log = [];
    $workflow = new Workflow(Definitions::orderStateMachine(), new PropertyMarkingStore('status'));
    $workflow->use(function ($ctx, $next) use (&$log) {
        $log[] = 'runtime-mw';
        return $next();
    });
    $order = new stdClass();
    $order->status = 'draft';
    $workflow->apply($order, 'submit');
    expect($log)->toBe(['runtime-mw']);
});
