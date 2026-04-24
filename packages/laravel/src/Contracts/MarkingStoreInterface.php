<?php

declare(strict_types=1);

namespace Laraflow\Contracts;

use Laraflow\Data\Marking;

interface MarkingStoreInterface
{
    public function read(object $subject): Marking;

    public function write(object $subject, Marking $marking): void;
}
