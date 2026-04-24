<?php

declare(strict_types=1);

namespace Laraflow\Engine;

use Closure;
use Laraflow\Contracts\GuardEvaluatorInterface;
use Laraflow\Data\Marking;
use Laraflow\Data\MiddlewareContext;
use Laraflow\Data\Transition;
use Laraflow\Data\TransitionBlocker;
use Laraflow\Data\TransitionResult;
use Laraflow\Data\WorkflowDefinition;
use Laraflow\Data\WorkflowEvent;
use Laraflow\Enums\WorkflowEventType;

class WorkflowEngine
{
    private Marking $marking;

    /** @var array<string, bool> */
    private array $placeNames;

    /** @var array<string, array<callable>> */
    private array $listeners = [];

    /** @var array<callable> */
    private array $middleware;

    /**
     * @param  array<callable>  $middleware
     */
    public function __construct(
        private readonly WorkflowDefinition $definition,
        private readonly ?GuardEvaluatorInterface $guardEvaluator = null,
        array $middleware = [],
    ) {
        $this->middleware = $middleware;
        $this->placeNames = array_flip(array_map(fn ($p) => $p->name, $definition->places));
        $this->marking = $this->buildInitialMarking();
    }

    public function use(callable $middleware): void
    {
        $this->middleware[] = $middleware;
    }

    public function getDefinition(): WorkflowDefinition
    {
        return $this->definition;
    }

    public function getMarking(): Marking
    {
        return $this->marking->clone();
    }

    public function setMarking(Marking $marking): void
    {
        $this->marking = $marking->clone();
    }

    public function getInitialMarking(): Marking
    {
        return $this->buildInitialMarking();
    }

    /**
     * @return array<string>
     */
    public function getActivePlaces(): array
    {
        return $this->marking->getActivePlaces();
    }

    /**
     * @return array<Transition>
     */
    public function getEnabledTransitions(): array
    {
        return array_values(array_filter(
            $this->definition->transitions,
            fn (Transition $t): bool => $this->can($t->name)->allowed,
        ));
    }

    public function can(string $transitionName): TransitionResult
    {
        $transition = $this->findTransition($transitionName);

        if ($transition === null) {
            return new TransitionResult(
                allowed: false,
                blockers: [new TransitionBlocker(
                    code: 'unknown_transition',
                    message: "Transition \"{$transitionName}\" does not exist",
                )],
            );
        }

        $blockers = [];

        if ($this->definition->type === \Laraflow\Enums\WorkflowType::StateMachine) {
            $activePlaces = $this->getActivePlaces();

            if (count($activePlaces) !== 1) {
                $blockers[] = new TransitionBlocker(
                    code: 'invalid_marking',
                    message: 'State machine must have exactly one active place, found ' . count($activePlaces),
                );

                return new TransitionResult(allowed: false, blockers: $blockers);
            }

            if (! in_array($activePlaces[0], $transition->froms, true)) {
                $blockers[] = new TransitionBlocker(
                    code: 'not_in_place',
                    message: "Current state \"{$activePlaces[0]}\" is not in transition's from places",
                );

                return new TransitionResult(allowed: false, blockers: $blockers);
            }
        } else {
            $weight = $transition->consumeWeight ?? 1;

            foreach ($transition->froms as $from) {
                if ($this->marking->get($from) < $weight) {
                    $blockers[] = new TransitionBlocker(
                        code: 'not_in_place',
                        message: "Place \"{$from}\" has {$this->marking->get($from)} token(s), needs {$weight}",
                    );
                }
            }
        }

        if (count($blockers) > 0) {
            return new TransitionResult(allowed: false, blockers: $blockers);
        }

        if ($transition->guard !== null && $this->guardEvaluator !== null) {
            $guardPassed = $this->guardEvaluator->evaluate(
                $transition->guard,
                $this->getMarking(),
                $transition,
            );

            if (! $guardPassed) {
                $blockers[] = new TransitionBlocker(
                    code: 'guard_blocked',
                    message: "Guard \"{$transition->guard}\" blocked the transition",
                );

                return new TransitionResult(allowed: false, blockers: $blockers);
            }
        }

        return new TransitionResult(allowed: true);
    }

    public function apply(string $transitionName): Marking
    {
        $result = $this->can($transitionName);

        if (! $result->allowed) {
            $messages = implode(', ', array_map(fn ($b) => $b->message, $result->blockers));

            throw new \RuntimeException(
                "Cannot apply transition \"{$transitionName}\": {$messages}",
            );
        }

        $transition = $this->findTransition($transitionName);
        assert($transition !== null);

        if (count($this->middleware) === 0) {
            return $this->applyCore($transition);
        }

        $context = new MiddlewareContext(
            definition: $this->definition,
            transition: $transition,
            marking: $this->getMarking(),
            workflowName: $this->definition->name,
        );

        $chain = array_reduce(
            array_reverse($this->middleware),
            fn (Closure $next, callable $mw): Closure => fn (): Marking => $mw($context, $next),
            fn (): Marking => $this->applyCore($transition),
        );

        return $chain();
    }

    public function reset(): void
    {
        $this->marking = $this->buildInitialMarking();
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

    private function applyCore(Transition $transition): Marking
    {
        // 1. Guard event
        $this->emit(WorkflowEventType::Guard, $transition);

        // 2. Leave — fire per from-place, then remove tokens
        for ($i = 0; $i < count($transition->froms); $i++) {
            $this->emit(WorkflowEventType::Leave, $transition);
        }

        $cw = $transition->consumeWeight ?? 1;

        foreach ($transition->froms as $from) {
            $this->marking->set($from, max(0, $this->marking->get($from) - $cw));
        }

        // 3. Transition
        $this->emit(WorkflowEventType::Transition, $transition);

        // 4. Enter — fire per to-place (before marking update)
        for ($i = 0; $i < count($transition->tos); $i++) {
            $this->emit(WorkflowEventType::Enter, $transition);
        }

        // 5. Update marking
        $pw = $transition->produceWeight ?? 1;

        foreach ($transition->tos as $to) {
            $this->marking->set($to, $this->marking->get($to) + $pw);
        }

        // 6. Entered
        $this->emit(WorkflowEventType::Entered, $transition);

        // 7. Completed
        $this->emit(WorkflowEventType::Completed, $transition);

        // 8. Announce — fire for each newly enabled transition
        $enabled = $this->getEnabledTransitions();

        for ($i = 0; $i < count($enabled); $i++) {
            $this->emit(WorkflowEventType::Announce, $transition);
        }

        return $this->getMarking();
    }

    private function emit(WorkflowEventType $type, Transition $transition): void
    {
        $event = new WorkflowEvent(
            type: $type,
            transition: $transition,
            marking: $this->getMarking(),
            workflowName: $this->definition->name,
        );

        foreach ($this->listeners[$type->value] ?? [] as $listener) {
            $listener($event);
        }
    }

    private function findTransition(string $name): ?Transition
    {
        foreach ($this->definition->transitions as $transition) {
            if ($transition->name === $name) {
                return $transition;
            }
        }

        return null;
    }

    private function buildInitialMarking(): Marking
    {
        $marking = new Marking();

        foreach ($this->definition->places as $place) {
            $marking->set($place->name, 0);
        }

        foreach ($this->definition->initialMarking as $place) {
            if (isset($this->placeNames[$place])) {
                $marking->set($place, 1);
            }
        }

        return $marking;
    }
}
