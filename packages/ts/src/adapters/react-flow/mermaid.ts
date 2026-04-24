import type { Node, Edge } from "@xyflow/react";
import type { WorkflowMeta } from "../../types";
import { exportWorkflowMermaid as exportPure } from "../../mermaid";
import { buildDefinition } from "./definition-builder";

/**
 * Build a WorkflowDefinition from a React Flow graph and dump it as Mermaid stateDiagram-v2.
 */
export function exportGraphToMermaid(options: {
    nodes: Node[];
    edges: Edge[];
    meta: WorkflowMeta;
}): string {
    const definition = buildDefinition(options.nodes, options.edges, options.meta);
    return exportPure({ definition, meta: options.meta });
}
