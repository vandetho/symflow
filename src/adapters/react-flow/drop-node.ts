import type { Node, Edge } from "@xyflow/react";
import type { StateNodeData, TransitionNodeData } from "./types";

export interface ConnectWithBranchResult {
    /** The edge connecting the state to the target transition */
    connectionEdge: Edge;
    /** The new transition and state nodes for the auto-created branch */
    nodes: [Node, Node];
    /** The two edges for the branch: state → newTransition, newTransition → newState */
    branchEdges: [Edge, Edge];
}

/**
 * Connects a state node to a transition node and auto-creates a new branch
 * from that state.
 *
 * Given `s1 → t1 → s2 → t2 → s3`, connecting `s1` to `t2` produces:
 * - Connection edge: `s1 → t2`
 * - New branch: `s1 → t3 → s4`
 *
 * Result graph:
 * ```
 * s1 → t1 → s2 → t2 → s3
 * s1 → t2
 * s1 → t3 → s4
 * ```
 */
export function connectWithBranch(options: {
    /** ID of the state node being connected */
    stateNodeId: string;
    /** ID of the target transition node */
    targetTransitionId: string;
    /** Current nodes in the graph */
    nodes: Node[];
}): ConnectWithBranchResult {
    const { stateNodeId, targetTransitionId, nodes } = options;
    const stateNode = nodes.find((n) => n.id === stateNodeId);

    const baseX = stateNode?.position.x ?? 0;
    const baseY = stateNode?.position.y ?? 0;

    // 1. Connection edge: state → target transition
    const connectionEdge: Edge = {
        id: `edge-${stateNodeId}-${targetTransitionId}`,
        source: stateNodeId,
        target: targetTransitionId,
        type: "connector",
    };

    // 2. New branch: state → newTransition → newState
    const transitionLabel = uniqueTransitionLabel(nodes);
    const transitionId = `transition-${transitionLabel}`;

    const transitionNode: Node = {
        id: transitionId,
        type: "transition",
        position: { x: baseX + 140, y: baseY + 120 },
        data: {
            label: transitionLabel,
            listeners: [],
            metadata: {},
        } satisfies TransitionNodeData,
    };

    const stateLabel = uniqueStateLabel(nodes);
    const newStateId = `state-${stateLabel}`;

    const newStateNode: Node = {
        id: newStateId,
        type: "state",
        position: { x: baseX + 280, y: baseY + 120 },
        data: {
            label: stateLabel,
            isInitial: false,
            isFinal: false,
            metadata: {},
        } satisfies StateNodeData,
    };

    const branchEdges: [Edge, Edge] = [
        {
            id: `edge-${stateNodeId}-${transitionId}`,
            source: stateNodeId,
            target: transitionId,
            type: "connector",
        },
        {
            id: `edge-${transitionId}-${newStateId}`,
            source: transitionId,
            target: newStateId,
            type: "connector",
        },
    ];

    return {
        connectionEdge,
        nodes: [transitionNode, newStateNode],
        branchEdges,
    };
}

function uniqueStateLabel(nodes: Node[]): string {
    const prefix = "new_state";
    const existing = new Set(
        nodes
            .filter((n) => n.type === "state")
            .map((n) => (n.data as unknown as StateNodeData).label),
    );

    if (!existing.has(prefix)) return prefix;

    let i = 1;
    while (existing.has(`${prefix}_${i}`)) i++;
    return `${prefix}_${i}`;
}

function uniqueTransitionLabel(nodes: Node[]): string {
    const prefix = "new_transition";
    const existing = new Set(
        nodes
            .filter((n) => n.type === "transition")
            .map((n) => (n.data as unknown as TransitionNodeData).label),
    );

    if (!existing.has(prefix)) return prefix;

    let i = 1;
    while (existing.has(`${prefix}_${i}`)) i++;
    return `${prefix}_${i}`;
}
