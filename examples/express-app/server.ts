import express from 'express';
import bodyParser from 'body-parser';
import { Symflow } from '@/symflow/symflow';
import { AuditTrail } from '@/symflow/audit-trail';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Simulated database
const entities: Record<number, { id: number; state: string[] }> = {
    1: { id: 1, state: ['draft'] },
    2: { id: 2, state: ['draft'] },
};

// 🔹 Load workflow dynamically
const workflowName = 'order';
const workflow = new Symflow(workflowName);

/**
 * Get entity state
 */
app.get('/entities/:id', async (req, res) => {
    const entityId = Number(req.params.id);
    const entity = entities[entityId];

    if (!entity) return res.status(404).json({ error: 'Entity not found' });

    res.json({ id: entityId, state: entity.state });
});

/**
 * Get available transitions
 */
app.get('/entities/:id/transitions', async (req, res) => {
    const entityId = Number(req.params.id);
    const entity = entities[entityId];

    if (!entity) return res.status(404).json({ error: 'Entity not found' });

    res.json({ id: entityId, availableTransitions: workflow.getAvailableTransitions(entity) });
});

/**
 * Apply a transition
 */
app.post('/entities/:id/transition', async (req, res) => {
    const entityId = Number(req.params.id);
    const { transition } = req.body;
    if (!transition) return res.status(400).json({ error: 'Transition is required' });

    const entity = entities[entityId];
    if (!entity) return res.status(404).json({ error: 'Entity not found' });

    try {
        await workflow.apply(entity, transition);
        res.json({ message: `Transition '${transition}' applied successfully`, entity });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * Get audit trail
 */
app.get('/entities/:id/audit-trail', async (req, res) => {
    const entityId = Number(req.params.id);
    const auditLogs = await AuditTrail.getAuditTrail(workflowName, entityId);

    res.json({ id: entityId, auditTrail: auditLogs });
});

// Start Express server
app.listen(PORT, () => {
    console.log(`🚀 Express API running at http://localhost:${PORT}`);
});
