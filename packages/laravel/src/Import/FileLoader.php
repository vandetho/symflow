<?php

declare(strict_types=1);

namespace Laraflow\Import;

use Laraflow\Data\WorkflowDefinition;
use Laraflow\Data\WorkflowMeta;

final class FileLoader
{
    /**
     * @return array{definition: WorkflowDefinition, meta: WorkflowMeta}
     */
    public static function load(string $filePath): array
    {
        if (! file_exists($filePath)) {
            throw new \RuntimeException("File not found: {$filePath}");
        }

        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        return match ($ext) {
            'yaml', 'yml' => YamlImporter::import(file_get_contents($filePath)),
            'json' => JsonImporter::import(file_get_contents($filePath)),
            'php' => self::loadPhp($filePath),
            default => throw new \RuntimeException(
                "Unsupported file format \".{$ext}\". Use .yaml, .yml, .json, or .php",
            ),
        };
    }

    /**
     * @return array{definition: WorkflowDefinition, meta: WorkflowMeta}
     */
    private static function loadPhp(string $filePath): array
    {
        $result = require $filePath;

        if (! is_array($result) || ! isset($result['definition']) || ! isset($result['meta'])) {
            throw new \RuntimeException(
                "PHP file must return ['definition' => WorkflowDefinition, 'meta' => WorkflowMeta]",
            );
        }

        return $result;
    }
}
