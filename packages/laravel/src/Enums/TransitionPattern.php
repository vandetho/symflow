<?php

declare(strict_types=1);

namespace Laraflow\Enums;

enum TransitionPattern: string
{
    case Simple = 'simple';
    case AndSplit = 'and-split';
    case AndJoin = 'and-join';
    case AndSplitJoin = 'and-split-join';
    case OrSplit = 'or-split';
    case OrJoin = 'or-join';
}
