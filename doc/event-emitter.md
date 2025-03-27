## 📡 EventEmitter Integration

Symflow supports emitting events via Node.js `EventEmitter` for full flexibility and code-splitting.

### 🔧 Setup

```ts
import { EventEmitter } from 'events';
import { Symflow } from 'symflow';
import type { WorkflowDefinition } from 'symflow';

const emitter = new EventEmitter();

const workflowDefinition: WorkflowDefinition<any> = {
  name: 'article',
  type: 'workflow',
  stateField: 'state',
  initialState: ['draft'],
  places: {
    draft: {}, review: {}, published: {}
  },
  transitions: {
    submit: { from: 'draft', to: 'review' },
    publish: { from: 'review', to: 'published' }
  }
};

const workflow = new Symflow(workflowDefinition, emitter);
```

### 📢 Namespaced Events

Symflow emits events on these channels:

| Scope           | Example                                 |
|----------------|------------------------------------------|
| Global          | `symflow.transition`                    |
| Workflow-level  | `symflow.article.transition`            |
| Transition-specific | `symflow.article.transition.submit`     |

### 🛠 Listen to Events

```ts
emitter.on('symflow.article.transition.submit', (event) => {
  console.log('📦 Submit triggered for article', event.entity.id);
});

emitter.on('symflow.transition', (event) => {
  console.log(`[Global] ${event.transition} -`, event.entity.id);
});
```

You can use this to separate logic into modules or microservices, decoupling the workflow engine from business logic.