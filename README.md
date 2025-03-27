# **Symflow: A Flexible Workflow Engine for Node.js**

[![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://github.com/vandetho/symflow/actions/workflows/ci.yaml/badge.svg)](https://github.com/vandetho/symflow/actions/workflows/ci.yaml)
[![npm downloads](https://img.shields.io/npm/dt/symflow.svg)](https://www.npmjs.com/package/symflow)
[![GitHub stars](https://img.shields.io/github/stars/vandetho/symflow.svg?style=social)](https://github.com/vandetho/symflow/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/vandetho/symflow.svg?color=orange)](https://github.com/vandetho/symflow/issues)
[![npm version](https://img.shields.io/npm/v/symflow.svg)](https://www.npmjs.com/package/symflow)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Symflow** is a powerful **workflow and state machine engine** for **Node.js**, inspired by **Symfony Workflow**.  
It allows you to define **workflows**, transition **entities between states**, and optionally **log audit trails**.

> ✅ **Works like Sequelize models or Mongoose schemas**  
> ✅ **Explicitly define workflows and retrieve them globally**  
> ✅ **Supports event-driven transitions and audit trails**  
> ✅ **No reliance on JSON or YAML configuration files**  
> ✅ **Works with or without Express.js**  

## Table of Contents
- [📦 Introduction](#-installation)
- [🚀 Getting Started](#-getting-started)
- [⚡ Using Symflow with Express.js](#-using-symflow-with-expressjs)
- [📜 Features](#-features)
- [🔥 Event Handling in Symflow](#-event-handling-in-symflow)
- [📚 API Reference](#-api-reference)
- [📌 Roadmap](#-roadmap)
- [📜 License](#-license)
- [🤝 Contributing](#-contributing)
- [⭐ Support](#-support)
- [📜 Workflow Definition Structure](#-workflow-definition-structure)
- [📜 Place Structure](#-place-structure)
- [📜 Transition Structure](#-transition-structure)

---

## **📦 Installation**
```sh
npm install symflow
```

---

## **🚀 Getting Started**
### **1️⃣ Defining a Workflow**
You can **define a workflow** like a Sequelize model or Mongoose schema.

📂 **`src/workflows/order.workflow.ts`**
```typescript
import { Symflow } from 'symflow';

export const OrderWorkflow = new Symflow({
    name: 'order',
    auditTrail: { enabled: true },
    stateField: 'state',
    initialState: ['draft'],
    places: {
        draft: {},
        pending: {},
        confirmed: {},
    },
    transitions: {
        initiate: { from: ['draft'], to: ['pending'] },
        confirm: { from: ['pending'], to: ['confirmed'] },
    }, 
    events: {
        [WorkflowEventType.GUARD]: [
            (event) => {
                if (event.entity.userRole !== 'admin') {
                    console.log('❌ Access Denied: Only admins can approve orders.');
                    return false;
                }
                return true;
            },
        ],
        [WorkflowEventType.COMPLETED]: [
            (event) => console.log(`✅ Order transitioned to ${event.toState}`),
        ],
    },
});


```

---

### **2️⃣ Retrieving a Workflow**
Once a workflow is defined, you can retrieve it from **anywhere** in your project.

```typescript
import { Symflow } from "symflow";

const workflow = Symflow.use("order"); // Retrieve registered workflow

const order = { id: 1, state: ["draft"] };

workflow.apply(order, "initiate");
console.log(order.state); // Output: ["pending"]
```

---

### **3️⃣ Checking Available Transitions**
```typescript
const transitions = workflow.getAvailableTransitions(order);
console.log(transitions); // Output: ["confirm"]
```

---

### **4️⃣ Applying a Transition**
```typescript
if (workflow.canTransition(order, "confirm")) {
    workflow.apply(order, "confirm");
}

console.log(order.state); // Output: ["confirmed"]
```

---

### **5️⃣ Retrieve Audit Trail (if enabled)**
```typescript
import { AuditTrail } from "symflow/audit-trail";

const logs = await AuditTrail.getAuditTrail("order", order.id);
console.log(logs);
```

---

## **⚡ Using Symflow with Express.js**
### **📌 Setting Up Express API**
Symflow **does not require Express**, but you can integrate it into your Express.js project.

📂 **Project Structure**
```
/your-express-app
│── /src
│   ├── server.ts      # Express server
│   ├── workflows      # Folder for workflow definitions
│   │   ├── order.workflow.ts
│── package.json       # Your project's dependencies
```

✅ **Example API (`src/server.ts`)**
```typescript
import express from "express";
import bodyParser from "body-parser";
import { Symflow } from "symflow";
import { AuditTrail } from "symflow/audit-trail";
import "./workflows/order.workflow"; // Ensures workflows are registered

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const entities: Record<number, { id: number; state: string[] }> = {
    1: { id: 1, state: ["draft"] },
};

// 🔹 Retrieve the registered workflow
const orderWorkflow = Symflow.use("order");

app.get("/entities/:id", (req, res) => {
    const entityId = Number(req.params.id);
    res.json(entities[entityId]);
});

app.post("/entities/:id/transition", async (req, res) => {
    const entityId = Number(req.params.id);
    const { transition } = req.body;

    if (!orderWorkflow.canTransition(entities[entityId], transition)) {
        return res.status(400).json({ error: "Transition not allowed" });
    }

    await orderWorkflow.apply(entities[entityId], transition);
    res.json({ message: "Transition applied", entity: entities[entityId] });
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
```

✅ **Run the Express API**
```sh
npx ts-node src/server.ts
```

✅ **Test the API**
```sh
curl http://localhost:3000/entities/1
curl -X POST http://localhost:3000/entities/1/transition -H "Content-Type: application/json" -d '{ "transition": "initiate" }'
curl http://localhost:3000/entities/1/audit-trail
```

**Example**

You can find a complete example of using **Symflow with Express.js** at: [Symflow-Express Example](https://github.com/vandetho/symflow-express)

---

## **📜 Features**
### ✅ **Works Like Sequelize Models or Mongoose Schemas**
- Workflows are explicitly defined and can be retrieved globally.
- No automatic singleton behavior – workflows must be registered manually.

### ✅ **State Machines & Workflows**
- **State Machine**: Enforces a **single** active state.
- **Workflow**: Allows **multiple** active states.

### ✅ **Transition Logic**
- Supports **AND/OR conditions** for complex transitions.

### ✅ **Event-Driven Architecture**
- Define external event listeners for transitions.

### ✅ **Audit Trail**
- Logs **state changes** to JSON files or a database.

### ✅ **Express.js API Support**
- Works **optionally** with Express.js **without modifying the core package**.


---

## **📜 Event Handling in Symflow**

Symflow allows you to **hook into various workflow events** using event listeners.

### 📌 **Available Events**
| Event Type   | Description                                          |
|--------------|------------------------------------------------------|
| `ANNOUNCE`   | Fires **before** a transition begins.                |
| `GUARD`      | **Prevents** transitions if conditions are not met.  |
| `LEAVE`      | Fires **before leaving** a state.                    |
| `ENTER`      | Fires **before entering** a state.                   |
| `TRANSITION` | Fires **during** a transition.                       |
| `COMPLETED`  | Fires **after** a transition successfully completes. |
| `ENTERED`    | Fires **after** a state is successfully entered.     |

## ✨ **Using Event Listeners**
You can **register event listeners** to customize transition behavior.

### 🛠 **Example: Blocking a Transition with `GUARD`**
```typescript
import { Symflow, WorkflowEventType } from "symflow";

// Define the workflow
const workflowDefinition = {
    name: "order_workflow",
    stateField: "status",
    initialState: ["draft"],
    places: { draft: {}, pending: {}, confirmed: {} },
    transitions: { approve: { from: ["draft"], to: ["pending"] } },
    /* or */
    events: {
        [WorkflowEventType.GUARD]: [
            (event) => {
                if (event.entity.userRole !== "admin") {
                    console.log("❌ Access Denied: Only admins can approve orders.");
                    return false;
                }
                return true;
            },
        ],
    },
};

// Create a workflow instance
const workflow = new Symflow(workflowDefinition);

// Register a Guard event to prevent unauthorized transitions
workflow.on(WorkflowEventType.GUARD, (event) => {
    console.log(`Checking guard for transition "${event.transition}"`);
    if (event.entity.userRole !== "admin") {
        console.log("❌ Access Denied: Only admins can approve orders.");
        return false; // 🚫 Prevent transition
    }
    return true;
});

// Sample order entity
const order = { id: 1, status: ["draft"], userRole: "customer" };

// Attempt transition
workflow.apply(order, "approve").catch((err) => console.log(err.message));

// Output: ❌ Access Denied: Only admins can approve orders.
```
---
### 📜 **Metadata in Workflow Events**

Metadata can be included in transitions and is accessible inside events.
```typescript
workflow.on(WorkflowEventType.COMPLETED, (event) => {
    console.log(`✅ Transition "${event.transition}" completed!`);
    console.log(`📌 Metadata:`, event.metadata); // ✅ Metadata is now accessible
});
```

---

### ✅ **Example: Logging Transitions with `COMPLETED`**
You can use the `COMPLETED` event to **log successful state changes**.
```typescript
workflow.on(WorkflowEventType.COMPLETED, (event) => {
    console.log(`✅ Order ${event.entity.id} successfully transitioned to ${event.toState}`);
});
```
---
### 📡 **EventEmitter Integration**
Symflow supports emitting events via Node.js `EventEmitter` for full flexibility and code-splitting.
[event-emitter.md](doc/event-emitter.md)

---


## **📚 API Reference**
### **`new Symflow(definition)`**
- **Defines a new workflow** that can be used globally.

### **`new Workflow(definition)`**
- **Defines a new workflow** that can be used locally.

### **`new StateMachine(definition)`**
- **Defines a new state machine** that can be used locally.

### **`workflow.canTransition(entity, transition)`**
Returns `true` if the entity can transition.

### **`workflow.getAvailableTransitions(entity)`**
Returns a list of available transitions.

### **`workflow.apply(entity, transition)`**
Applies a state transition.

### **`AuditTrail.getAuditTrail(workflowName, entityId)`**
Retrieves past transitions.

---

## **📌 Roadmap**
🚀 **Upcoming Features**
- [ ] **Database support for audit trails** (MongoDB, PostgreSQL)
- [ ] **CLI Tool (`symflow list-workflows`)**
- [ ] **Hot-reloading for workflow changes**
- [ ] **Real-time WebSocket events**

---

## **📜 License**
MIT License. Free to use and modify.

---

## **🤝 Contributing**
Pull requests are welcome! Open an issue if you have feature requests.

---

## **⭐ Support**
If you like **Symflow**, give it a ⭐ on [GitHub](https://github.com/vandetho/symflow) and [npm](https://www.npmjs.com/package/symflow).

---
🚀 **Symflow – The Simple & Flexible Workflow Engine for Node.js!**

---

## **📜 Workflow Definition Structure**
A **workflow definition** consists of the following properties:

| Property       | Type                                                   | Description                                |
|----------------|--------------------------------------------------------|--------------------------------------------|
| `name`         | `string`                                               | Unique name for the workflow.              |
| `auditTrail`   | `boolean`                    or `{ enabled: boolean }` | Enables or disables audit trail logging.   |
| `stateField`   | `string`                                               | The field in the entity that tracks state. |
| `initialState` | `string` or `string[]`                                 | The initial state(s) of the workflow.      |
| `places`       | `Record<string, Place>`                                | A dictionary of valid places (states).     |
| `transitions`  | `Record<string, Transition>`                           | A dictionary of allowed transitions.       |
| `events`       | `Record<WorkflowEventType, WorkflowEventHandler<T>[]>` | Event listeners for workflow events.       |'

---

## **📜 Place Structure**
Each **place** (or state) in the workflow is defined as:

| Property   | Type                             | Description                        |
|------------|----------------------------------|------------------------------------|
| `metadata` | `Record<string, any>` (optional) | Additional metadata for the place. |

✅ **Example Place Definition:**
```typescript
places: {
    draft: { metadata: { label: "Draft Order" } },
    pending: { metadata: { label: "Awaiting Approval" } },
    confirmed: { metadata: { label: "Confirmed Order" } }
}
```

---

## **📜 Transition Structure**
Each **transition** defines how an entity moves between states.

| Property   | Type                             | Description                              |
|------------|----------------------------------|------------------------------------------|
| `from`     | `string` or `string[]`           | The state(s) the transition starts from. |
| `to`       | `string` or `string[]`           | The state(s) the transition moves to.    |
| `metadata` | `Record<string, any>` (optional) | Additional metadata for the transition.  |

✅ **Example Transition Definition:**
```typescript
transitions: {
    initiate: { from: ["draft"], to: ["pending"], metadata: { action: "User submits order" } },
    confirm: { from: ["pending"], to: ["confirmed"], metadata: { action: "Admin confirms order" } }
}
```



