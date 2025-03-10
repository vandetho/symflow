# **SymFlow: A Flexible Workflow Engine for Node.js**

**SymFlow** is a powerful **workflow and state machine engine** for **Node.js**, inspired by **Symfony Workflow**.  
It allows you to define **workflows**, transition **entities between states**, and optionally **log audit trails**.

> ✅ **Works like Sequelize models or Mongoose schemas**  
> ✅ **Explicitly define workflows and retrieve them globally**  
> ✅ **Supports event-driven transitions and audit trails**  
> ✅ **No reliance on JSON or YAML configuration files**  
> ✅ **Works with or without Express.js**  

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
import { SymFlow } from "symflow";

export const OrderWorkflow = new SymFlow({
    name: "order",
    auditTrail: { enabled: true },
    stateField: "state",
    initialState: ["draft"],
    places: {
        draft: {},
        pending: {},
        confirmed: {},
    },
    transitions: {
        initiate: { from: ["draft"], to: ["pending"] },
        confirm: { from: ["pending"], to: ["confirmed"] },
    },
});
```

---

### **2️⃣ Retrieving a Workflow**
Once a workflow is defined, you can retrieve it from **anywhere** in your project.

```typescript
import { SymFlow } from "symflow";

const workflow = SymFlow.use("order"); // Retrieve registered workflow

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

## **⚡ Using SymFlow with Express.js**
### **📌 Setting Up Express API**
SymFlow **does not require Express**, but you can integrate it into your Express.js project.

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
import { SymFlow } from "symflow";
import { AuditTrail } from "symflow/audit-trail";
import "./workflows/order.workflow"; // Ensures workflows are registered

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const entities: Record<number, { id: number; state: string[] }> = {
    1: { id: 1, state: ["draft"] },
};

// 🔹 Retrieve the registered workflow
const orderWorkflow = SymFlow.use("order");

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

## **📚 API Reference**
### **`new SymFlow(definition)`**
- **Defines a new workflow** that can be used globally.

### **`SymFlow.use("workflowName")`**
- **Retrieves a registered workflow** by name.

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
If you like **SymFlow**, give it a ⭐ on [GitHub](https://github.com/your-repo/symflow) and [npm](https://www.npmjs.com/package/symflow).

---
🚀 **SymFlow – The Simple & Flexible Workflow Engine for Node.js!**

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

