<?php

declare(strict_types=1);

namespace Laraflow\Subject;

use Laraflow\Contracts\MarkingStoreInterface;
use Laraflow\Data\Marking;

final class PropertyMarkingStore implements MarkingStoreInterface
{
    public function __construct(
        private readonly string $property,
    ) {}

    public function read(object $subject): Marking
    {
        $value = $subject->{$this->property} ?? null;

        if ($value === null || $value === '' || $value === []) {
            return new Marking();
        }

        $marking = new Marking();

        if (is_array($value)) {
            foreach ($value as $place) {
                $marking->set((string) $place, 1);
            }
        } else {
            $marking->set((string) $value, 1);
        }

        return $marking;
    }

    public function write(object $subject, Marking $marking): void
    {
        $activePlaces = $marking->getActivePlaces();

        if (count($activePlaces) === 1) {
            $subject->{$this->property} = $activePlaces[0];
        } else {
            $subject->{$this->property} = $activePlaces;
        }
    }
}
