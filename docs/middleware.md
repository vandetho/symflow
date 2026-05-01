# Middleware

Middleware wraps the `apply()` lifecycle with composable before/after hooks. Use it for logging, metrics, transactions, error handling, access control, or any cross-cutting concern.

## API

```ts
type WorkflowMiddleware = (context: MiddlewareContext, next: () => Marking) => Marking;

interface MiddlewareContext {
    readonly definition: WorkflowDefinition;
    readonly transition: Transition;
    readonly marking: Marking; // snapshot before the transition fires
    readonly workflowName: string;
}
```

Each middleware receives:

- `context` -- a read-only snapshot of the workflow state at the time `apply()` was called
- `next` -- a function that invokes the rest of the middleware chain and eventually the transition itself

The middleware must return a `Marking`.

## Basic Usage

### Via Constructor

```ts
import { WorkflowEngine } from "symflow/engine";

const engine = new WorkflowEngine(definition, {
    middleware: [
        (ctx, next) => {
            console.log(`[${ctx.workflowName}] Firing: ${ctx.transition.name}`);
            const result = next();
            console.log(`[${ctx.workflowName}] Done:`, result);
            return result;
        },
    ],
});
```

### Via `use()`

```ts
const engine = new WorkflowEngine(definition);

engine.use((ctx, next) => {
    console.log(`Firing: ${ctx.transition.name}`);
    return next();
});
```

## Middleware Chain

Middleware executes in registration order. The first registered middleware is the outermost wrapper:

```ts
engine.use((_ctx, next) => {
    console.log("mw1 before");
    const result = next();
    console.log("mw1 after");
    return result;
});

engine.use((_ctx, next) => {
    console.log("mw2 before");
    const result = next();
    console.log("mw2 after");
    return result;
});

engine.apply("submit");
// Output:
//   mw1 before
//   mw2 before
//   mw2 after
//   mw1 after
```

## Blocking a Transition

A middleware can skip the transition by not calling `next()`:

```ts
engine.use((ctx, next) => {
    if (ctx.transition.name === "delete" && !isAdmin) {
        return ctx.marking; // return original marking, transition does not fire
    }
    return next();
});
```

## `can()` Is Not Wrapped

Middleware only wraps `apply()`. The `can()` method (including guard evaluation) runs outside the middleware chain. This separation is intentional:

- **Guards** are authorization -- they determine whether a transition is allowed
- **Middleware** is lifecycle -- it wraps the execution of an allowed transition

## Examples

### Timing

```ts
engine.use((ctx, next) => {
    const start = performance.now();
    const result = next();
    const ms = (performance.now() - start).toFixed(2);
    console.log(`${ctx.transition.name} took ${ms}ms`);
    return result;
});
```

### Audit Log

```ts
engine.use((ctx, next) => {
    const before = { ...ctx.marking };
    const after = next();
    auditLog.push({
        transition: ctx.transition.name,
        workflow: ctx.workflowName,
        before,
        after,
        timestamp: new Date(),
    });
    return after;
});
```

### Error Handling

```ts
engine.use((ctx, next) => {
    try {
        return next();
    } catch (err) {
        errorTracker.capture(err, {
            transition: ctx.transition.name,
            marking: ctx.marking,
        });
        throw err;
    }
});
```

### Transaction Wrapper

```ts
engine.use((ctx, next) => {
    db.beginTransaction();
    try {
        const result = next();
        db.commit();
        return result;
    } catch (err) {
        db.rollback();
        throw err;
    }
});
```

## Subject Middleware

The subject-driven `Workflow<T>` supports middleware with access to the domain object:

```ts
import { createWorkflow, propertyMarkingStore } from "symflow/subject";

interface Order {
    id: string;
    status: string;
    total: number;
}

const workflow = createWorkflow<Order>(definition, {
    markingStore: propertyMarkingStore("status"),
    middleware: [
        (ctx, next) => {
            console.log(`Order ${ctx.subject.id}: ${ctx.transition.name}`);
            return next();
        },
    ],
});

// Or add at runtime
workflow.use((ctx, next) => {
    if (ctx.transition.name === "approve" && ctx.subject.total > 10000) {
        notifyManager(ctx.subject);
    }
    return next();
});
```

Subject middleware has the same `MiddlewareContext` fields plus a `subject` property:

```ts
type SubjectMiddleware<T> = (context: SubjectMiddlewareContext<T>, next: () => Marking) => Marking;

interface SubjectMiddlewareContext<T> extends MiddlewareContext {
    readonly subject: T;
}
```

## Async Middleware

For middleware that needs to do async work (DB transactions, distributed tracing, external API calls), register async middleware separately and use `applyAsync()`:

```ts
type WorkflowMiddlewareAsync = (
    context: MiddlewareContext,
    next: () => Promise<Marking>,
) => Promise<Marking>;
```

```ts
const engine = new WorkflowEngine(definition, {
    asyncMiddleware: [
        async (ctx, next) => {
            return await db.$transaction(async () => {
                return await next();
            });
        },
    ],
});

await engine.applyAsync("submit");
```

Or register at runtime:

```ts
engine.useAsync(async (ctx, next) => {
    const span = tracer.startSpan(ctx.transition.name);
    try {
        return await next();
    } finally {
        span.end();
    }
});
```

**Sync and async middleware run in separate chains.** `apply()` runs only `middleware` (sync); `applyAsync()` runs only `asyncMiddleware`. Sync middleware is **not** automatically promoted into the async chain — see `docs/rfcs/async-listeners.md` for why (sync middleware that calls `next()` expects a sync return, which can't be satisfied when the inner chain is async).

If you want the same logic in both paths, register it twice:

```ts
const log: WorkflowMiddleware = (ctx, next) => {
    console.log(ctx.transition.name);
    return next();
};

const logAsync: WorkflowMiddlewareAsync = async (ctx, next) => {
    console.log(ctx.transition.name);
    return next();
};

engine.use(log);
engine.useAsync(logAsync);
```

The subject-driven `Workflow<T>` accepts `SubjectMiddlewareAsync<T>` via `asyncMiddleware` and `useAsync()` with the same semantics.

## Middleware vs Event Listeners

| Feature         | Middleware                                   | Event Listeners (`on()`)                                 |
| --------------- | -------------------------------------------- | -------------------------------------------------------- |
| Wraps lifecycle | Yes (before/after `apply()`)                 | No (fire-and-forget)                                     |
| Can block       | Yes (skip `next()`)                          | No                                                       |
| Per-event       | No (wraps entire transition)                 | Yes (guard, leave, enter, ...)                           |
| Return value    | Returns `Marking`                            | `void` or `Promise<void>`                                |
| Registration    | `use()` / `useAsync()`                       | `on(eventType, listener)`                                |
| Sync/async      | Sync via `apply()`, async via `applyAsync()` | `void \| Promise<void>` — awaited only by `applyAsync()` |

Use middleware for cross-cutting concerns that wrap the transition. Use event listeners for reacting to specific phases of the transition lifecycle.
