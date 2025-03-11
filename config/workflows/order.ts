import { WorkflowDefinition } from '../../src';

export default {
    name: 'order',
    type: 'workflow',
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
} as WorkflowDefinition<any>;
