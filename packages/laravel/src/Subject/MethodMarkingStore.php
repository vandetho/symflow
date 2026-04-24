<?php

declare(strict_types=1);

namespace Laraflow\Subject;

use Laraflow\Contracts\MarkingStoreInterface;
use Laraflow\Data\Marking;

final class MethodMarkingStore implements MarkingStoreInterface
{
    public function __construct(
        private readonly string $getter = 'getMarking',
        private readonly string $setter = 'setMarking',
    ) {}

    public function read(object $subject): Marking
    {
        if (! method_exists($subject, $this->getter)) {
            throw new \RuntimeException(
                get_class($subject) . " missing getter method \"{$this->getter}()\"",
            );
        }

        $value = $subject->{$this->getter}();

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
        if (! method_exists($subject, $this->setter)) {
            throw new \RuntimeException(
                get_class($subject) . " missing setter method \"{$this->setter}(value)\"",
            );
        }

        $activePlaces = $marking->getActivePlaces();

        if (count($activePlaces) === 1) {
            $subject->{$this->setter}($activePlaces[0]);
        } else {
            $subject->{$this->setter}($activePlaces);
        }
    }
}
