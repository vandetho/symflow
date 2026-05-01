# Subject-Driven API

For applications where workflow state lives on domain objects, the `Workflow<T>` class mirrors Symfony's `Workflow` service.

## Basic Usage

```ts
import { createWorkflow, propertyMarkingStore } from "symflow/subject";

interface Invoice {
    id: string;
    total: number;
    currentState: string | string[];
}

const workflow = createWorkflow<Invoice>(definition, {
    markingStore: propertyMarkingStore("currentState"),
    guardEvaluator: (expression, { subject, marking, transition }) => {
        if (expression === "subject.total < 10000") {
            return subject.total < 10000;
        }
        return true;
    },
});

const invoice: Invoice = { id: "inv_1", total: 500, currentState: "draft" };

workflow.can(invoice, "submit"); // { allowed: true, blockers: [] }
workflow.apply(invoice, "submit"); // reads + writes invoice.currentState
console.log(invoice.currentState); // "submitted"

// Events include the subject
workflow.on("entered", (event) => {
    console.log(event.subject.id); // "inv_1"
    console.log(event.transition.name); // "submit"
});

// Get enabled transitions for a subject
workflow.getEnabledTransitions(invoice); // [{ name: "approve", ... }, ...]
```

## Marking Stores

| Store                                    | Symfony equivalent | How it works                                           |
| ---------------------------------------- | ------------------ | ------------------------------------------------------ |
| `propertyMarkingStore("field")`          | `type: property`   | Reads/writes `subject.field` directly                  |
| `methodMarkingStore()`                   | `type: method`     | Calls `subject.getMarking()` / `subject.setMarking(v)` |
| `methodMarkingStore({ getter, setter })` | `type: method`     | Custom method names                                    |

Implement `MarkingStore<T>` for custom storage (Prisma column, Redis, event-sourced aggregate, etc.):

```ts
import type { MarkingStore, Marking } from "symflow/subject";

const prismaStore: MarkingStore<Order> = {
    read(order: Order): Marking {
        // Read marking from your storage
        return { [order.status]: 1 };
    },
    write(order: Order, marking: Marking): void {
        // Write marking to your storage
        const active = Object.entries(marking)
            .filter(([, v]) => v > 0)
            .map(([k]) => k);
        order.status = active[0];
    },
};
```

## Middleware

The subject-driven API supports middleware with access to the domain object:

```ts
const workflow = createWorkflow<Invoice>(definition, {
    markingStore: propertyMarkingStore("currentState"),
    middleware: [
        (ctx, next) => {
            console.log(`Invoice ${ctx.subject.id}: ${ctx.transition.name}`);
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

See [Middleware](./middleware.md) for the full middleware guide.

## Async API

For workflows with I/O-backed persistence (database, external API) or async listeners, use the async API. Pass an `AsyncMarkingStore<T>` instead of (or alongside, exclusively) a sync `MarkingStore<T>`:

```ts
import type { AsyncMarkingStore } from "symflow/subject";

const prismaStore: AsyncMarkingStore<Order> = {
    async read(order: Order): Promise<Marking> {
        const row = await prisma.order.findUnique({ where: { id: order.id } });
        return { [row.status]: 1 };
    },
    async write(order: Order, marking: Marking): Promise<void> {
        const active = Object.entries(marking)
            .filter(([, v]) => v > 0)
            .map(([k]) => k);
        await prisma.order.update({
            where: { id: order.id },
            data: { status: active[0] },
        });
    },
};

const workflow = createWorkflow<Order>(definition, {
    asyncMarkingStore: prismaStore,
    asyncMiddleware: [
        async (ctx, next) => {
            const span = tracer.startSpan(ctx.transition.name);
            try {
                return await next();
            } finally {
                span.end();
            }
        },
    ],
});

await workflow.applyAsync(order, "submit");

// Async equivalents of sync methods
await workflow.canAsync(order, "submit");
await workflow.getMarkingAsync(order);
await workflow.getEnabledTransitionsAsync(order);
```

**Mutual exclusion.** A `Workflow<T>` accepts either `markingStore` _or_ `asyncMarkingStore`, never both. Sync `apply()`, `can()`, `getMarking()`, and `getEnabledTransitions()` throw at runtime if only an async store is configured — use the async equivalents.

**Atomicity.** If a listener rejects, async middleware throws, or the marking store's `write()` rejects, the in-memory engine state is restored to the pre-apply snapshot. Note: if your durable store partially persisted state before rejecting, your store implementation is responsible for that recovery — `Workflow` only guarantees engine-state consistency.

**Mixing sync and async.** A `Workflow` configured with a sync `markingStore` can use _both_ `apply()` (sync) and `applyAsync()` (async). The async path lets you add async listeners or async middleware while keeping a sync store. The reverse is not true: an async store rules out the sync API.

See [`docs/rfcs/async-listeners.md`](./rfcs/async-listeners.md) for the design rationale and `engine-api.md` for the underlying engine semantics.
