<?php

declare(strict_types=1);

namespace Laraflow\Enums;

enum PlacePattern: string
{
    case Simple = 'simple';
    case OrSplit = 'or-split';
    case XorSplit = 'xor-split';
    case OrJoin = 'or-join';
    case XorJoin = 'xor-join';
    case AndSplit = 'and-split';
    case AndJoin = 'and-join';
}
