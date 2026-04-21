# Contributing to SymFlow

Thanks for your interest in contributing to SymFlow! This guide will help you get started.

## Development Setup

```bash
git clone https://github.com/vandetho/symflow.git
cd symflow
npm install
```

## Commands

```bash
npm run typecheck   # Type-check with tsc
npm run lint        # Lint with ESLint
npm run format      # Format with Prettier
npm test            # Run tests with Vitest
npm run build       # Build with tsup
```

## Making Changes

1. Fork the repo and create a branch from `main`.
2. Make your changes.
3. Add or update tests for any new or changed behavior.
4. Ensure all checks pass: `npm run typecheck && npm run lint && npm test`
5. Submit a pull request.

## Code Style

- 4-space indentation
- Double quotes
- Trailing commas
- Files in kebab-case (`workflow-engine.ts`)
- Types in PascalCase, constants in UPPER_SNAKE_CASE, functions in camelCase
- Use `import type` for type-only imports

Prettier and ESLint enforce most of these automatically. Run `npm run format` and `npm run lint:fix` before committing.

## Adding a New Export Format

Follow the existing pattern (yaml, json, typescript, mermaid):

1. Create `src/{format}/export.ts` with a pure function taking `{ definition, meta }`
2. Create `src/{format}/index.ts` as a barrel export
3. Add to `src/index.ts`
4. Create `src/adapters/react-flow/{format}.ts` wrapper
5. Add to `src/adapters/react-flow/index.ts`
6. Add entry to `tsup.config.ts` and export map in `package.json`
7. Add tests in `tests/{format}.test.ts`

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature (triggers minor release)
- `fix:` — bug fix (triggers patch release)
- `chore:` — maintenance (no release)
- `docs:` — documentation (no release)

## Reporting Bugs

Open an issue at [github.com/vandetho/symflow/issues](https://github.com/vandetho/symflow/issues). Include steps to reproduce, expected behavior, and actual behavior.

## Security Issues

Please **do not** open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for how to report them privately.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
