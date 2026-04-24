<?php

declare(strict_types=1);

namespace Laraflow\Data;

final class Marking implements \ArrayAccess, \JsonSerializable
{
    /**
     * @param  array<string, int>  $places
     */
    public function __construct(
        private array $places = [],
    ) {}

    public function get(string $place): int
    {
        return $this->places[$place] ?? 0;
    }

    public function set(string $place, int $count): void
    {
        $this->places[$place] = $count;
    }

    /**
     * @return array<string>
     */
    public function getActivePlaces(): array
    {
        return array_keys(array_filter($this->places, fn (int $count): bool => $count > 0));
    }

    /**
     * @return array<string, int>
     */
    public function toArray(): array
    {
        return $this->places;
    }

    public function clone(): self
    {
        return new self($this->places);
    }

    public function offsetExists(mixed $offset): bool
    {
        return isset($this->places[$offset]);
    }

    public function offsetGet(mixed $offset): int
    {
        return $this->places[$offset] ?? 0;
    }

    public function offsetSet(mixed $offset, mixed $value): void
    {
        $this->places[$offset] = $value;
    }

    public function offsetUnset(mixed $offset): void
    {
        unset($this->places[$offset]);
    }

    /**
     * @return array<string, int>
     */
    public function jsonSerialize(): array
    {
        return $this->places;
    }
}
