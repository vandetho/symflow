<?php

declare(strict_types=1);

namespace Laraflow\Enums;

enum MarkingStoreType: string
{
    case Method = 'method';
    case Property = 'property';
}
