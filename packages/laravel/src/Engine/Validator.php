<?php

declare(strict_types=1);

namespace Laraflow\Engine;

use Laraflow\Data\ValidationError;
use Laraflow\Data\ValidationResult;
use Laraflow\Data\WorkflowDefinition;
use Laraflow\Enums\ValidationErrorType;

final class Validator
{
    public static function validate(WorkflowDefinition $definition): ValidationResult
    {
        $errors = [];
        $placeNames = [];

        foreach ($definition->places as $place) {
            $placeNames[$place->name] = true;
        }

        // No initial marking
        if (count($definition->initialMarking) === 0) {
            $errors[] = new ValidationError(
                type: ValidationErrorType::NoInitialMarking,
                message: 'Workflow has no initial marking',
            );
        }

        // Invalid initial marking
        foreach ($definition->initialMarking as $place) {
            if (! isset($placeNames[$place])) {
                $errors[] = new ValidationError(
                    type: ValidationErrorType::InvalidInitialMarking,
                    message: "Initial marking references unknown place \"{$place}\"",
                    details: ['place' => $place],
                );
            }
        }

        // Invalid transition sources/targets and weights
        foreach ($definition->transitions as $transition) {
            foreach ($transition->froms as $from) {
                if (! isset($placeNames[$from])) {
                    $errors[] = new ValidationError(
                        type: ValidationErrorType::InvalidTransitionSource,
                        message: "Transition \"{$transition->name}\" references unknown source place \"{$from}\"",
                        details: ['transition' => $transition->name, 'place' => $from],
                    );
                }
            }

            foreach ($transition->tos as $to) {
                if (! isset($placeNames[$to])) {
                    $errors[] = new ValidationError(
                        type: ValidationErrorType::InvalidTransitionTarget,
                        message: "Transition \"{$transition->name}\" references unknown target place \"{$to}\"",
                        details: ['transition' => $transition->name, 'place' => $to],
                    );
                }
            }

            if ($transition->consumeWeight !== null && (! is_int($transition->consumeWeight) || $transition->consumeWeight <= 0)) {
                $errors[] = new ValidationError(
                    type: ValidationErrorType::InvalidWeight,
                    message: "Transition \"{$transition->name}\" has invalid consumeWeight: {$transition->consumeWeight} (must be a positive integer)",
                    details: ['transition' => $transition->name, 'field' => 'consumeWeight', 'value' => $transition->consumeWeight],
                );
            }

            if ($transition->produceWeight !== null && (! is_int($transition->produceWeight) || $transition->produceWeight <= 0)) {
                $errors[] = new ValidationError(
                    type: ValidationErrorType::InvalidWeight,
                    message: "Transition \"{$transition->name}\" has invalid produceWeight: {$transition->produceWeight} (must be a positive integer)",
                    details: ['transition' => $transition->name, 'field' => 'produceWeight', 'value' => $transition->produceWeight],
                );
            }
        }

        // BFS reachability from initial marking
        $reachable = [];

        foreach ($definition->initialMarking as $place) {
            $reachable[$place] = true;
        }

        $queue = $definition->initialMarking;

        while (count($queue) > 0) {
            $current = array_shift($queue);

            foreach ($definition->transitions as $transition) {
                if (in_array($current, $transition->froms, true)) {
                    foreach ($transition->tos as $to) {
                        if (! isset($reachable[$to])) {
                            $reachable[$to] = true;
                            $queue[] = $to;
                        }
                    }
                }
            }
        }

        // Unreachable places
        foreach ($definition->places as $place) {
            if (! isset($reachable[$place->name])) {
                $errors[] = new ValidationError(
                    type: ValidationErrorType::UnreachablePlace,
                    message: "Place \"{$place->name}\" is unreachable from the initial marking",
                    details: ['place' => $place->name],
                );
            }
        }

        // Dead transitions
        foreach ($definition->transitions as $transition) {
            $allFromsReachable = true;

            foreach ($transition->froms as $from) {
                if (! isset($reachable[$from])) {
                    $allFromsReachable = false;

                    break;
                }
            }

            if (! $allFromsReachable) {
                $errors[] = new ValidationError(
                    type: ValidationErrorType::DeadTransition,
                    message: "Transition \"{$transition->name}\" can never fire — not all source places are reachable",
                    details: ['transition' => $transition->name],
                );
            }
        }

        // Orphan places
        $hasIncoming = [];
        $hasOutgoing = [];

        foreach ($definition->transitions as $transition) {
            foreach ($transition->froms as $from) {
                $hasOutgoing[$from] = true;
            }

            foreach ($transition->tos as $to) {
                $hasIncoming[$to] = true;
            }
        }

        foreach ($definition->places as $place) {
            $isInitial = in_array($place->name, $definition->initialMarking, true);

            if (! isset($hasIncoming[$place->name]) && ! isset($hasOutgoing[$place->name])) {
                $errors[] = new ValidationError(
                    type: ValidationErrorType::OrphanPlace,
                    message: "Place \"{$place->name}\" has no transitions" . ($isInitial ? ' (initial place)' : ''),
                    details: ['place' => $place->name, 'isInitial' => $isInitial],
                );
            }
        }

        return new ValidationResult(
            valid: count($errors) === 0,
            errors: $errors,
        );
    }
}
