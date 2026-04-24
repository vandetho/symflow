<?php

declare(strict_types=1);

use Laraflow\Data\Marking;
use Laraflow\Subject\MethodMarkingStore;
use Laraflow\Subject\PropertyMarkingStore;

// --- PropertyMarkingStore ---

test('property store reads single string as marking', function () {
    $store = new PropertyMarkingStore('state');
    $subject = new stdClass();
    $subject->state = 'draft';
    $marking = $store->read($subject);
    expect($marking->toArray())->toBe(['draft' => 1]);
});

test('property store reads array as marking', function () {
    $store = new PropertyMarkingStore('state');
    $subject = new stdClass();
    $subject->state = ['a', 'b'];
    $marking = $store->read($subject);
    expect($marking->toArray())->toBe(['a' => 1, 'b' => 1]);
});

test('property store reads empty as empty marking', function () {
    $store = new PropertyMarkingStore('state');
    $subject = new stdClass();
    $subject->state = '';
    $marking = $store->read($subject);
    expect($marking->toArray())->toBe([]);
});

test('property store writes single place as string', function () {
    $store = new PropertyMarkingStore('state');
    $subject = new stdClass();
    $subject->state = '';
    $store->write($subject, new Marking(['a' => 1, 'b' => 0]));
    expect($subject->state)->toBe('a');
});

test('property store writes multiple places as array', function () {
    $store = new PropertyMarkingStore('state');
    $subject = new stdClass();
    $subject->state = '';
    $store->write($subject, new Marking(['a' => 1, 'b' => 1]));
    expect($subject->state)->toBe(['a', 'b']);
});

// --- MethodMarkingStore ---

test('method store reads via getter', function () {
    $store = new MethodMarkingStore();
    $subject = new class {
        public function getMarking(): string { return 'draft'; }
        public function setMarking(mixed $v): void {}
    };
    $marking = $store->read($subject);
    expect($marking->toArray())->toBe(['draft' => 1]);
});

test('method store writes via setter', function () {
    $store = new MethodMarkingStore();
    $subject = new class {
        public mixed $state = '';
        public function getMarking(): string { return ''; }
        public function setMarking(mixed $v): void { $this->state = $v; }
    };
    $store->write($subject, new Marking(['submitted' => 1, 'draft' => 0]));
    expect($subject->state)->toBe('submitted');
});

test('method store supports custom method names', function () {
    $store = new MethodMarkingStore(getter: 'getState', setter: 'setState');
    $subject = new class {
        public mixed $s = 'a';
        public function getState(): string { return $this->s; }
        public function setState(mixed $v): void { $this->s = $v; }
    };
    expect($store->read($subject)->toArray())->toBe(['a' => 1]);
    $store->write($subject, new Marking(['b' => 1]));
    expect($subject->s)->toBe('b');
});

test('method store throws if getter missing', function () {
    $store = new MethodMarkingStore();
    expect(fn () => $store->read(new stdClass()))->toThrow(RuntimeException::class, 'missing getter method');
});

test('method store throws if setter missing', function () {
    $store = new MethodMarkingStore();
    expect(fn () => $store->write(new stdClass(), new Marking(['a' => 1])))->toThrow(RuntimeException::class, 'missing setter method');
});
