import { describe, it, expect } from "vitest";
import type { Node } from "@xyflow/react";
import { connectWithBranch } from "../src/adapters/react-flow/drop-node";
import type { StateNodeData, TransitionNodeData } from "../src/adapters/react-flow/types";

function makeStateNode(id: string, label: string, x = 0, y = 0): Node {
    return {
        id: `state-${id}`,
        type: "state",
        position: { x, y },
        data: {
            label,
            isInitial: false,
            isFinal: false,
            metadata: {},
        } satisfies StateNodeData,
    };
}

function makeTransitionNode(id: string, label: string, x = 0, y = 0): Node {
    return {
        id: `transition-${id}`,
        type: "transition",
        position: { x, y },
        data: {
            label,
            listeners: [],
            metadata: {},
        } satisfies TransitionNodeData,
    };
}

// s1 -> t1 -> s2 -> t2 -> s3
const baseNodes: Node[] = [
    makeStateNode("s1", "s1", 0, 0),
    makeTransitionNode("t1", "t1", 140, 0),
    makeStateNode("s2", "s2", 280, 0),
    makeTransitionNode("t2", "t2", 420, 0),
    makeStateNode("s3", "s3", 560, 0),
];

describe("connectWithBranch", () => {
    it("creates the connection edge from state to target transition", () => {
        const result = connectWithBranch({
            stateNodeId: "state-s1",
            targetTransitionId: "transition-t2",
            nodes: baseNodes,
        });

        expect(result.connectionEdge.source).toBe("state-s1");
        expect(result.connectionEdge.target).toBe("transition-t2");
        expect(result.connectionEdge.type).toBe("connector");
    });

    it("creates a new transition and a new state for the branch", () => {
        const result = connectWithBranch({
            stateNodeId: "state-s1",
            targetTransitionId: "transition-t2",
            nodes: baseNodes,
        });

        const [transitionNode, stateNode] = result.nodes;

        expect(transitionNode.type).toBe("transition");
        expect((transitionNode.data as unknown as TransitionNodeData).label).toBe(
            "new_transition",
        );

        expect(stateNode.type).toBe("state");
        expect((stateNode.data as unknown as StateNodeData).label).toBe("new_state");
    });

    it("creates branch edges: state → newTransition → newState", () => {
        const result = connectWithBranch({
            stateNodeId: "state-s1",
            targetTransitionId: "transition-t2",
            nodes: baseNodes,
        });

        const [edgeToTransition, edgeToState] = result.branchEdges;
        const [transitionNode, stateNode] = result.nodes;

        expect(edgeToTransition.source).toBe("state-s1");
        expect(edgeToTransition.target).toBe(transitionNode.id);
        expect(edgeToTransition.type).toBe("connector");

        expect(edgeToState.source).toBe(transitionNode.id);
        expect(edgeToState.target).toBe(stateNode.id);
        expect(edgeToState.type).toBe("connector");
    });

    it("generates unique labels when defaults already exist", () => {
        const nodesWithExisting = [
            ...baseNodes,
            makeStateNode("new_state", "new_state", 0, 100),
            makeTransitionNode("new_transition", "new_transition", 0, 200),
        ];

        const result = connectWithBranch({
            stateNodeId: "state-s1",
            targetTransitionId: "transition-t2",
            nodes: nodesWithExisting,
        });

        const [transitionNode, stateNode] = result.nodes;

        expect((transitionNode.data as unknown as TransitionNodeData).label).toBe(
            "new_transition_1",
        );
        expect((stateNode.data as unknown as StateNodeData).label).toBe("new_state_1");
    });

    it("new state is not initial and not final", () => {
        const result = connectWithBranch({
            stateNodeId: "state-s1",
            targetTransitionId: "transition-t2",
            nodes: baseNodes,
        });

        const stateData = result.nodes[1].data as unknown as StateNodeData;
        expect(stateData.isInitial).toBe(false);
        expect(stateData.isFinal).toBe(false);
    });

    it("new transition has empty listeners and metadata", () => {
        const result = connectWithBranch({
            stateNodeId: "state-s1",
            targetTransitionId: "transition-t2",
            nodes: baseNodes,
        });

        const transitionData = result.nodes[0].data as unknown as TransitionNodeData;
        expect(transitionData.listeners).toEqual([]);
        expect(transitionData.metadata).toEqual({});
    });

    it("positions branch nodes offset from the source state", () => {
        const result = connectWithBranch({
            stateNodeId: "state-s1",
            targetTransitionId: "transition-t2",
            nodes: baseNodes,
        });

        const [transitionNode, stateNode] = result.nodes;

        // s1 is at (0, 0), branch should be offset below
        expect(transitionNode.position.x).toBe(140);
        expect(transitionNode.position.y).toBe(120);
        expect(stateNode.position.x).toBe(280);
        expect(stateNode.position.y).toBe(120);
    });
});
