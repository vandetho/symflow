<?php

declare(strict_types=1);

namespace Laraflow\Subject;

use Closure;
use Laraflow\Contracts\GuardEvaluatorInterface;
use Laraflow\Contracts\MarkingStoreInterface;
use Laraflow\Data\Marking;
use Laraflow\Data\MiddlewareContext;
use Laraflow\Data\SubjectEvent;
use Laraflow\Data\SubjectMiddlewareContext;
use Laraflow\Data\Transition;
use Laraflow\Data\TransitionResult;
use Laraflow\Data\WorkflowDefinition;
use Laraflow\Engine\WorkflowEngine;
use Laraflow\Enums\WorkflowEventType;

class Workflow
{
    /** @var array<string, array<callable>> */
    private array $listeners = [];

    /** @var array<callable> */
    private array $subjectMiddleware;

    /**
     * @param  array<callable>  $middleware
     */
    public function __construct(
        public readonly WorkflowDefinition $definition,
        private readonly MarkingStoreInterface $markingStore,
        private readonly ?GuardEvaluatorInterface $guardEvaluator = null,
        array $middleware = [],
    ) {
        $this->subjectMiddleware = $middleware;
    }

    public function use(callable $middleware): void
    {
        $this->subjectMiddleware[] = $middleware;
    }

    public function getMarking(object $subject): Marking
    {
        return $this->markingStore->read($subject);
    }

    public function setMarking(object $subject, Marking $marking): void
    {
        $this->markingStore->write($subject, $marking);
    }

    /**
     * @return array<Transition>
     */
    public function getEnabledTransitions(object $subject): array
    {
        return $this->buildEngine($subject)->getEnabledTransitions();
    }

    public function can(object $subject, string $transitionName): TransitionResult
    {
        return $this->buildEngine($subject)->can($transitionName);
    }

    public function apply(object $subject, string $transitionName): Marking
    {
        $engine = $this->buildEngine($subject);

        // Convert subject middleware to engine middleware
        foreach ($this->subjectMiddleware as $mw) {
            $engine->use(function (MiddlewareContext $ctx, Closure $next) use ($mw, $subject): Marking {
                $subjectCtx = new SubjectMiddlewareContext(
                    definition: $ctx->definition,
                    transition: $ctx->transition,
                    marking: $ctx->marking,
                    workflowName: $ctx->workflowName,
                    subject: $subject,
                );

                return $mw($subjectCtx, $next);
            });
        }

        // Forward events with subject
        $unsubscribers = [];

        foreach ($this->listeners as $typeValue => $typeListeners) {
            $eventType = WorkflowEventType::from($typeValue);
            $unsubscribers[] = $engine->on($eventType, function ($event) use ($typeListeners, $subject): void {
                $subjectEvent = new SubjectEvent(
                    type: $event->type,
                    transition: $event->transition,
                    marking: $event->marking,
                    workflowName: $event->workflowName,
                    subject: $subject,
                );

                foreach ($typeListeners as $listener) {
                    $listener($subjectEvent);
                }
            });
        }

        try {
            $newMarking = $engine->apply($transitionName);
            $this->markingStore->write($subject, $newMarking);

            return $newMarking;
        } finally {
            foreach ($unsubscribers as $unsub) {
                $unsub();
            }
        }
    }

    public function on(WorkflowEventType $type, callable $listener): Closure
    {
        $key = $type->value;
        $this->listeners[$key] ??= [];
        $this->listeners[$key][] = $listener;

        return function () use ($key, $listener): void {
            $this->listeners[$key] = array_values(array_filter(
                $this->listeners[$key] ?? [],
                fn (callable $l): bool => $l !== $listener,
            ));
        };
    }

    private function buildEngine(object $subject): WorkflowEngine
    {
        $guardEvaluator = $this->guardEvaluator;

        $engine = new WorkflowEngine(
            definition: $this->definition,
            guardEvaluator: $guardEvaluator,
        );

        $engine->setMarking($this->markingStore->read($subject));

        return $engine;
    }
}
