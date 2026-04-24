<?php

declare(strict_types=1);

namespace Laraflow\Console;

use Illuminate\Console\Command;
use Laraflow\Export\MermaidExporter;
use Laraflow\Import\FileLoader;

class MermaidCommand extends Command
{
    protected $signature = 'laraflow:mermaid {file : Path to workflow definition file} {--output= : Write output to file}';

    protected $description = 'Export workflow as Mermaid stateDiagram-v2';

    public function handle(): int
    {
        $file = $this->argument('file');

        try {
            $loaded = FileLoader::load($file);
        } catch (\Throwable $e) {
            $this->error("Error loading \"{$file}\": {$e->getMessage()}");

            return self::FAILURE;
        }

        $output = MermaidExporter::export($loaded['definition']);
        $outputFile = $this->option('output');

        if ($outputFile !== null) {
            file_put_contents($outputFile, $output);
            $this->info("Written to {$outputFile}");
        } else {
            $this->line($output);
        }

        return self::SUCCESS;
    }
}
