<?php

declare(strict_types=1);

namespace Laraflow\Eloquent;

use Laraflow\Contracts\WorkflowRegistryInterface;
use Laraflow\Data\Marking;
use Laraflow\Data\Transition;
use Laraflow\Subject\Workflow;

trait HasWorkflowTrait
{
    public function workflow(?string $workflowName = null): Workflow
    {
        $name = $workflowName ?? $this->getDefaultWorkflowName();

        return app(WorkflowRegistryInterface::class)->get($name);
    }

    public function canTransition(string $transition, ?string $workflowName = null): bool
    {
        return $this->workflow($workflowName)->can($this, $transition)->allowed;
    }

    public function applyTransition(string $transition, ?string $workflowName = null): Marking
    {
        return $this->workflow($workflowName)->apply($this, $transition);
    }

    /**
     * @return array<Transition>
     */
    public function getEnabledTransitions(?string $workflowName = null): array
    {
        return $this->workflow($workflowName)->getEnabledTransitions($this);
    }

    public function getWorkflowMarking(?string $workflowName = null): Marking
    {
        return $this->workflow($workflowName)->getMarking($this);
    }

    abstract protected function getDefaultWorkflowName(): string;
}
