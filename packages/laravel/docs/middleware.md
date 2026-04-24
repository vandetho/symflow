# Middleware

Middleware wraps the `apply()` lifecycle with composable before/after hooks.

## API

```php
// Signature: callable(MiddlewareContext $ctx, Closure $next): Marking

$engine->use(function (MiddlewareContext $ctx, Closure $next): Marking {
    // before transition
    $result = $next();
    // after transition
    return $result;
});
```

The `MiddlewareContext` contains:

| Property | Type | Description |
|----------|------|-------------|
| `$ctx->definition` | `WorkflowDefinition` | The workflow definition |
| `$ctx->transition` | `Transition` | The transition being fired |
| `$ctx->marking` | `Marking` | Snapshot before the transition |
| `$ctx->workflowName` | `string` | Name of the workflow |

## Usage

### Via Constructor

```php
$engine = new WorkflowEngine(
    definition: $definition,
    middleware: [
        function ($ctx, $next) {
            Log::info("Firing: {$ctx->transition->name}");
            $result = $next();
            Log::info("Done: {$ctx->transition->name}");
            return $result;
        },
    ],
);
```

### Via `use()`

```php
$engine->use(function ($ctx, $next) {
    $start = microtime(true);
    $result = $next();
    $ms = round((microtime(true) - $start) * 1000, 2);
    Log::info("{$ctx->transition->name} took {$ms}ms");
    return $result;
});
```

## Chain Order

First registered = outermost wrapper:

```php
$engine->use(function ($ctx, $next) {
    echo "mw1-before\n";
    $result = $next();
    echo "mw1-after\n";
    return $result;
});

$engine->use(function ($ctx, $next) {
    echo "mw2-before\n";
    $result = $next();
    echo "mw2-after\n";
    return $result;
});

$engine->apply('submit');
// mw1-before
// mw2-before
// mw2-after
// mw1-after
```

## Blocking

Skip the transition by not calling `$next()`:

```php
$engine->use(function ($ctx, $next) {
    if ($ctx->transition->name === 'delete' && !auth()->user()->isAdmin()) {
        return $ctx->marking; // return original marking unchanged
    }
    return $next();
});
```

## `can()` Is Not Wrapped

Middleware only wraps `apply()`. The `can()` method runs outside the middleware chain. Guards handle authorization; middleware handles lifecycle.

## Subject Middleware

The `Workflow` class supports middleware with access to the subject:

```php
$workflow = new Workflow(
    definition: $definition,
    markingStore: new PropertyMarkingStore('status'),
    middleware: [
        function (SubjectMiddlewareContext $ctx, Closure $next) {
            Log::info("Order {$ctx->subject->id}: {$ctx->transition->name}");
            return $next();
        },
    ],
);

// Or at runtime
$workflow->use(function ($ctx, $next) {
    if ($ctx->transition->name === 'approve' && $ctx->subject->total > 10000) {
        Notification::send($ctx->subject->manager, new LargeOrderApproval($ctx->subject));
    }
    return $next();
});
```

## Examples

### Database Transaction

```php
$engine->use(function ($ctx, $next) {
    return DB::transaction(fn () => $next());
});
```

### Audit Log

```php
$engine->use(function ($ctx, $next) {
    $before = $ctx->marking->toArray();
    $result = $next();
    AuditLog::create([
        'workflow' => $ctx->workflowName,
        'transition' => $ctx->transition->name,
        'before' => $before,
        'after' => $result->toArray(),
        'user_id' => auth()->id(),
    ]);
    return $result;
});
```

### Error Reporting

```php
$engine->use(function ($ctx, $next) {
    try {
        return $next();
    } catch (\Throwable $e) {
        Sentry::captureException($e, [
            'transition' => $ctx->transition->name,
            'marking' => $ctx->marking->toArray(),
        ]);
        throw $e;
    }
});
```
