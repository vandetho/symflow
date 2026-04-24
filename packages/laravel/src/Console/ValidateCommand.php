<?php

declare(strict_types=1);

namespace Laraflow\Console;

use Illuminate\Console\Command;
use Laraflow\Engine\Validator;
use Laraflow\Import\FileLoader;

class ValidateCommand extends Command
{
    protected $signature = 'laraflow:validate {file : Path to workflow definition file}';

    protected $description = 'Validate a workflow definition';

    public function handle(): int
    {
        $file = $this->argument('file');

        try {
            $loaded = FileLoader::load($file);
        } catch (\Throwable $e) {
            $this->error("Error loading \"{$file}\": {$e->getMessage()}");

            return self::FAILURE;
        }

        $result = Validator::validate($loaded['definition']);
        $def = $loaded['definition'];

        if ($result->valid) {
            $placeCount = count($def->places);
            $transitionCount = count($def->transitions);
            $this->info("\"{$def->name}\" is valid ({$placeCount} places, {$transitionCount} transitions)");

            return self::SUCCESS;
        }

        $this->error("\"{$def->name}\" has " . count($result->errors) . ' error(s):');
        $this->line('');

        foreach ($result->errors as $error) {
            $this->line("  [{$error->type->value}] {$error->message}");
        }

        return self::FAILURE;
    }
}
