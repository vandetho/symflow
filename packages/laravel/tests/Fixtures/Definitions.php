<?php

declare(strict_types=1);

namespace Laraflow\Tests\Fixtures;

use Laraflow\Data\Place;
use Laraflow\Data\Transition;
use Laraflow\Data\WorkflowDefinition;
use Laraflow\Enums\WorkflowType;

final class Definitions
{
    public static function orderStateMachine(): WorkflowDefinition
    {
        return new WorkflowDefinition(
            name: 'order',
            type: WorkflowType::StateMachine,
            places: [
                new Place(name: 'draft'),
                new Place(name: 'submitted'),
                new Place(name: 'approved'),
                new Place(name: 'rejected'),
                new Place(name: 'fulfilled'),
            ],
            transitions: [
                new Transition(name: 'submit', froms: ['draft'], tos: ['submitted']),
                new Transition(name: 'approve', froms: ['submitted'], tos: ['approved']),
                new Transition(name: 'reject', froms: ['submitted'], tos: ['rejected']),
                new Transition(name: 'fulfill', froms: ['approved'], tos: ['fulfilled']),
            ],
            initialMarking: ['draft'],
        );
    }

    public static function articleReviewWorkflow(): WorkflowDefinition
    {
        return new WorkflowDefinition(
            name: 'article_review',
            type: WorkflowType::Workflow,
            places: [
                new Place(name: 'draft'),
                new Place(name: 'checking_content'),
                new Place(name: 'checking_spelling'),
                new Place(name: 'content_approved'),
                new Place(name: 'spelling_approved'),
                new Place(name: 'published'),
            ],
            transitions: [
                new Transition(name: 'start_review', froms: ['draft'], tos: ['checking_content', 'checking_spelling']),
                new Transition(name: 'approve_content', froms: ['checking_content'], tos: ['content_approved']),
                new Transition(name: 'approve_spelling', froms: ['checking_spelling'], tos: ['spelling_approved']),
                new Transition(name: 'publish', froms: ['content_approved', 'spelling_approved'], tos: ['published']),
            ],
            initialMarking: ['draft'],
        );
    }

    public static function weightedWorkflow(): WorkflowDefinition
    {
        return new WorkflowDefinition(
            name: 'factory',
            type: WorkflowType::Workflow,
            places: [
                new Place(name: 'raw_materials'),
                new Place(name: 'components'),
                new Place(name: 'assembled'),
            ],
            transitions: [
                new Transition(
                    name: 'manufacture',
                    froms: ['raw_materials'],
                    tos: ['components'],
                    consumeWeight: 3,
                    produceWeight: 2,
                ),
                new Transition(
                    name: 'assemble',
                    froms: ['components'],
                    tos: ['assembled'],
                    consumeWeight: 2,
                ),
            ],
            initialMarking: ['raw_materials'],
        );
    }

    public static function guardedStateMachine(): WorkflowDefinition
    {
        return new WorkflowDefinition(
            name: 'guarded',
            type: WorkflowType::StateMachine,
            places: [
                new Place(name: 'pending'),
                new Place(name: 'approved'),
                new Place(name: 'denied'),
            ],
            transitions: [
                new Transition(
                    name: 'approve',
                    froms: ['pending'],
                    tos: ['approved'],
                    guard: 'subject.amount < 1000',
                ),
                new Transition(name: 'deny', froms: ['pending'], tos: ['denied']),
            ],
            initialMarking: ['pending'],
        );
    }
}
