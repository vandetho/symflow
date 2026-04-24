<?php

declare(strict_types=1);

namespace Laraflow\Engine;

use Laraflow\Data\PlaceAnalysis;
use Laraflow\Data\TransitionAnalysis;
use Laraflow\Data\WorkflowAnalysis;
use Laraflow\Data\WorkflowDefinition;
use Laraflow\Enums\PlacePattern;
use Laraflow\Enums\TransitionPattern;
use Laraflow\Enums\WorkflowType;

final class Analyzer
{
    public static function analyze(WorkflowDefinition $definition): WorkflowAnalysis
    {
        $isStateMachine = $definition->type === WorkflowType::StateMachine;

        // Build adjacency info
        /** @var array<string, array<string>> */
        $placeOutgoing = [];
        /** @var array<string, array<string>> */
        $placeIncoming = [];

        foreach ($definition->places as $place) {
            $placeOutgoing[$place->name] = [];
            $placeIncoming[$place->name] = [];
        }

        foreach ($definition->transitions as $transition) {
            foreach ($transition->froms as $from) {
                $placeOutgoing[$from][] = $transition->name;
            }

            foreach ($transition->tos as $to) {
                $placeIncoming[$to][] = $transition->name;
            }
        }

        // Analyze transitions
        $transitions = [];

        foreach ($definition->transitions as $t) {
            if (count($t->froms) > 1 && count($t->tos) > 1) {
                $pattern = TransitionPattern::AndSplitJoin;
            } elseif (count($t->froms) > 1) {
                $pattern = TransitionPattern::AndJoin;
            } elseif (count($t->tos) > 1) {
                $pattern = TransitionPattern::AndSplit;
            } else {
                $pattern = TransitionPattern::Simple;
            }

            $transitions[$t->name] = new TransitionAnalysis(
                name: $t->name,
                pattern: $pattern,
                froms: $t->froms,
                tos: $t->tos,
            );
        }

        // Analyze places
        $places = [];

        foreach ($definition->places as $place) {
            $outgoing = $placeOutgoing[$place->name] ?? [];
            $incoming = $placeIncoming[$place->name] ?? [];
            $patterns = [];

            // Multiple outgoing transitions = choice point
            if (count($outgoing) > 1) {
                $patterns[] = $isStateMachine ? PlacePattern::XorSplit : PlacePattern::OrSplit;
            }

            // Multiple incoming transitions = join
            if (count($incoming) > 1) {
                $patterns[] = $isStateMachine ? PlacePattern::XorJoin : PlacePattern::OrJoin;
            }

            // AND-split: this place is a target of a transition with multiple tos
            if (! $isStateMachine) {
                foreach ($incoming as $tName) {
                    foreach ($definition->transitions as $t) {
                        if ($t->name === $tName && count($t->tos) > 1) {
                            $patterns[] = PlacePattern::AndSplit;

                            break 2;
                        }
                    }
                }
            }

            // AND-join: this place is a source of a transition with multiple froms
            if (! $isStateMachine) {
                foreach ($outgoing as $tName) {
                    foreach ($definition->transitions as $t) {
                        if ($t->name === $tName && count($t->froms) > 1) {
                            $patterns[] = PlacePattern::AndJoin;

                            break 2;
                        }
                    }
                }
            }

            if (count($patterns) === 0) {
                $patterns[] = PlacePattern::Simple;
            }

            $places[$place->name] = new PlaceAnalysis(
                name: $place->name,
                patterns: $patterns,
                incomingTransitions: $incoming,
                outgoingTransitions: $outgoing,
            );
        }

        return new WorkflowAnalysis(places: $places, transitions: $transitions);
    }
}
