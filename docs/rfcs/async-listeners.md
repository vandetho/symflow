# RFC: Async Listener Support

**Status:** Implemented
**Last updated:** 2026-05-01

Design rationale for letting event listeners, middleware, and marking stores do asynchronous work without losing the atomicity guarantees that `apply()` already provides for sync code.

This document is preserved for historical context. For user-facing usage, see [`docs/engine-api.md`](../engine-api.md), [`docs/subject-api.md`](../subject-api.md), and [`docs/middleware.md`](../middleware.md).

---

## Problem

Symfony's listener system is sync because PHP's request lifecycle is sync. Node consumers naturally want to do async work in listeners — log to a database, send a webhook, queue a job:

```ts
engine.on("entered", async (event) => {
    await db.log(event);
});
engine.apply("submit");
```

Today this has three failure modes:

1. **The promise is silently discarded** — `apply()` returns before `db.log` resolves. Race conditions; no way to know when listeners finish.
2. **Unhandled rejections** — if `db.log` throws, the rejection bubbles to `process.on("unhandledRejection")`, not to the caller of `apply()`.
3. **Atomicity regression** — the rollback contract (added in 3.3.1) only catches _synchronous_ throws inside `applyCore`. An async listener rejecting _after_ `apply()` returns leaves the marking already updated, with no way to roll back.

The same applies to middleware (sync-only today) and marking stores (sync-only today).

---

## Decisions

| #   | Question                                       | Decision                                                                         |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | One method or two?                             | **Add `applyAsync()`** parallel to `apply()`; do not break the existing sync API |
| 2   | Listener signature                             | **Unified:** `(event) => void \| Promise<void>`                                  |
| 3   | Middleware signature                           | **Sync + async as a union** type; existing middleware unchanged                  |
| 4   | Marking store                                  | **Bundle `AsyncMarkingStore<T>`** in the same release                            |
| 2a  | Listener returns promise during sync `apply()` | **Warn once per listener**, with opt-in throw via `strictSyncListeners: true`    |

The driving principle: _zero overhead for sync users, opt-in async with full atomicity guarantees._

---

## Design

### Listener signature (Decision 2)

```ts
export type WorkflowEventListener = (event: WorkflowEvent) => void | Promise<void>;
export type SubjectEventListener<T> = (event: SubjectEvent<T>) => void | Promise<void>;
```

The same listener works for both `apply()` and `applyAsync()`. The user decides at the call site whether to await — the type signals the option.

### `applyAsync()` (Decision 1)

```ts
class WorkflowEngine {
    apply(transitionName: string): Marking; // unchanged
    applyAsync(transitionName: string): Promise<Marking>; // new
}
```

`applyAsync()` mirrors `apply()` exactly except:

- Listener returns are awaited sequentially within each event phase (`leave`, `enter`, etc.). Sequential — not `Promise.all` — to preserve registration order, which matches the sync semantics of insertion-order iteration over the listener `Set`.
- Middleware can be sync or async; the async branch awaits `next()` if it returns a Promise.
- The rollback contract still holds: any listener rejection or middleware throw rolls the marking back to the pre-apply snapshot and re-throws.

### Sync `apply()` with async listeners (Decision 2a)

When a listener registered with `engine.on()` returns a Promise during a sync `apply()` call, the engine warns:

```
[symflow] Listener for "entered" returned a Promise during sync apply().
The promise is not awaited and rejections will be unhandled.
Use engine.applyAsync() if you need async listener support.
```

The warning fires **once per listener** (cached via WeakSet), not once per event. To turn warnings into thrown errors:

```ts
new WorkflowEngine(definition, { strictSyncListeners: true });
```

Detection cost is one `instanceof Promise` check on each listener's return value — negligible.

### Middleware signature (Decision 3)

```ts
export type WorkflowMiddleware = (context: MiddlewareContext, next: () => Marking) => Marking;

export type WorkflowMiddlewareAsync = (
    context: MiddlewareContext,
    next: () => Promise<Marking>,
) => Promise<Marking>;
```

`apply()` runs only `middleware` (sync). `applyAsync()` runs only `asyncMiddleware`. Engine option:

```ts
interface WorkflowEngineOptions {
    middleware?: WorkflowMiddleware[];
    asyncMiddleware?: WorkflowMiddlewareAsync[];
}
```

**Sync middleware is not auto-promoted into the async chain.** A sync middleware that calls `next()` expects a `Marking` return; in an async chain, `next()` returns `Promise<Marking>`, and there's no way to bridge sync code waiting on an async value (Node has no blocking await). The honest answer is to keep the chains separate: if you want the same logic in both paths, register it twice (once via `use()`, once via `useAsync()` with `Promise.resolve(next())` semantics).

Two slots rather than one tagged-union slot — keeps both call paths' type-checking strict and avoids the mixed-mode pitfall described above.

### Async marking stores (Decision 4)

```ts
export interface AsyncMarkingStore<T> {
    read(subject: T): Promise<Marking>;
    write(subject: T, marking: Marking): Promise<void>;
}

export interface CreateWorkflowOptions<T> {
    markingStore?: MarkingStore<T>;
    asyncMarkingStore?: AsyncMarkingStore<T>;
    // ...
}
```

`Workflow<T>` accepts one or the other:

- `markingStore` only → both `apply()` and `applyAsync()` work; sync read/write
- `asyncMarkingStore` only → only `applyAsync()` works; calling `apply()` throws at runtime with a clear message
- Both → constructor throws

`can()` stays sync. With an async store, `can()` cannot read the marking — so callers must use `Workflow.canAsync(subject, transitionName): Promise<TransitionResult>` instead. UI components (the typical `can()` consumer) will already need to handle the async case if their backend store is async; this is an acknowledged ergonomic cost.

---

## Atomicity guarantee

The rollback contract from 3.3.1 extends to `applyAsync()`:

```ts
async applyAsync(name: string): Promise<Marking> {
    const result = this.can(name);
    if (!result.allowed) throw new Error(...);

    const transition = this.findTransition(name);
    const snapshot = { ...this.marking };

    try {
        // ... emit phases, awaiting each listener and async middleware
        return this.getMarking();
    } catch (err) {
        this.marking = snapshot;
        throw err;
    }
}
```

Both rejected promises and synchronous throws unwind the same way: marking restored, error re-thrown.

For async marking stores, an additional concern: if `markingStore.write()` rejects _after_ `applyCore` succeeds, the engine's in-memory marking is updated but the durable store is not. The `Workflow.applyAsync()` facade restores the engine snapshot if the store write fails — so engine state stays consistent with store state.

---

## Migration & backwards compatibility

This is a **non-breaking** change for every existing consumer:

- Existing sync listeners continue to work with `apply()` — no behavior change.
- Existing middleware (`WorkflowMiddleware`) continues to work — no signature change.
- Existing `MarkingStore<T>` continues to work — `AsyncMarkingStore<T>` is purely additive.
- The `apply()` method itself is unchanged.

Consumers who want async opt in by:

1. Calling `applyAsync()` instead of `apply()`.
2. Optionally passing `asyncMarkingStore` instead of `markingStore`.
3. Optionally passing `asyncMiddleware` instead of (or alongside) `middleware`.

The only behavioral change for existing code: listeners that _currently_ return promises during sync `apply()` will start emitting a warning to `console.warn`. They were already broken (just silently); this surfaces the bug.

---

## Out of scope (separate RFCs)

- **Async guards.** `GuardEvaluator` stays sync. Guards run inside `can()`, which UI code calls synchronously to decide whether to render a button. Making guards async forces all `can()` callers to handle promises, which is a much larger ergonomic shift. Defer.
- **Cancellation tokens / timeouts.** Listeners are user code; users can implement their own `AbortSignal` handling. The engine doesn't need to provide it.
- **Parallel listener execution within a phase.** Listeners run sequentially in `applyAsync()` to match the sync engine's insertion-order semantics. If a future use case demands `Promise.all` parallelism, that's a separate `applyParallel()` method or a per-listener flag.
- **Async event listener priorities.** The non-priority decision from the sync RFC carries over.

---

## Implementation outline

### Engine (`src/engine/`)

- `types.ts`: extend `WorkflowEventListener` to `void | Promise<void>` return; add `WorkflowMiddlewareAsync`; add `AsyncMarkingStore<T>` (re-exported from subject)
- `workflow-engine.ts`:
    - Add `applyAsync(): Promise<Marking>`
    - Add `private async applyCoreAsync(transition: Transition): Promise<Marking>` — mirror of `applyCore` with `await` on each emit
    - Add `private async emitAsync(type, transition): Promise<void>` — sequential await
    - Add `strictSyncListeners` option; warn-or-throw on detected promise return in sync `emit()`
    - Add `asyncMiddleware` option

### Subject (`src/subject/`)

- `types.ts`: add `AsyncMarkingStore<T>`
- `workflow.ts`:
    - Accept `asyncMarkingStore` in `CreateWorkflowOptions<T>`
    - Add `applyAsync(subject, transitionName): Promise<Marking>`
    - Add `canAsync(subject, transitionName): Promise<TransitionResult>` (reads via async store)
    - Constructor: throw if both stores provided
    - `apply()` throws if only async store is configured

### Tests

- `applyAsync()` awaits async listeners in registration order
- Promise rejection in listener rolls back marking
- Promise rejection in async middleware rolls back marking
- Async marking store: read/write integration with `Workflow.applyAsync()`
- Async store rejection on write rolls back engine marking
- Sync `apply()` warns when listener returns a Promise
- `strictSyncListeners: true` throws when listener returns a Promise
- Sync `apply()` with async marking store throws clearly
- Mixed sync + async middleware execution order

### Docs

- `docs/middleware.md` — add Async Middleware section
- `docs/engine-api.md` — document `applyAsync()` next to `apply()`
- `docs/subject-api.md` — document `asyncMarkingStore` and `applyAsync()`
- New `docs/async-listeners.md` (user-facing) once shipped; this RFC then becomes historical

---

## Resolved during implementation

- **`applyAsync()` and sync-style listeners.** `applyAsync()` awaits any returned promise (including from listeners that happened to be sync — a `void` return is just an immediately-resolved value). Same listener, same contract on both call paths.

- **Announce event payload with async listeners.** No special handling needed; the event payload is captured before listeners run, async or not.

- **Mixed sync-around-async middleware.** Resolved by keeping the chains fully separate: `apply()` runs only `middleware`, `applyAsync()` runs only `asyncMiddleware`. Sync middleware is **not** promoted into the async chain. Users who want the same logic in both paths register it twice. This avoids the unsolvable problem of a sync middleware needing to await an async `next()`.

- **Suppressing unhandled rejections from discarded sync-listener promises.** When a listener returns a Promise during sync `apply()`, the engine attaches a no-op `.catch()` to suppress unhandled-rejection noise — without this, a rejecting async listener would crash the process via `unhandledRejection` in addition to logging the warning. The actionable signal is the one-time warning (or strict-mode throw); suppressed rejections are an intentional tradeoff.
