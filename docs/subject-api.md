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

workflow.can(invoice, "submit");     // { allowed: true, blockers: [] }
workflow.apply(invoice, "submit");   // reads + writes invoice.currentState
console.log(invoice.currentState);   // "submitted"

// Events include the subject
workflow.on("entered", (event) => {
    console.log(event.subject.id);        // "inv_1"
    console.log(event.transition.name);   // "submit"
});

// Get enabled transitions for a subject
workflow.getEnabledTransitions(invoice);  // [{ name: "approve", ... }, ...]
```

## Marking Stores

| Store                                  | Symfony equivalent | How it works                                            |
| -------------------------------------- | ------------------ | ------------------------------------------------------- |
| `propertyMarkingStore("field")`        | `type: property`   | Reads/writes `subject.field` directly                   |
| `methodMarkingStore()`                 | `type: method`     | Calls `subject.getMarking()` / `subject.setMarking(v)`  |
| `methodMarkingStore({ getter, setter })` | `type: method`  | Custom method names                                     |

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
        const active = Object.entries(marking).filter(([, v]) => v > 0).map(([k]) => k);
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
