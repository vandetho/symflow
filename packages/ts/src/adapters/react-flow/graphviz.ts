import type { Node, Edge } from "@xyflow/react";
import type { WorkflowMeta } from "../../types";
import { exportWorkflowDot as exportPure } from "../../graphviz";
import { buildDefinition } from "./definition-builder";

/**
 * Build a WorkflowDefinition from a React Flow graph and dump it as Graphviz DOT.
 */
export function exportGraphToDot(options: {
    nodes: Node[];
    edges: Edge[];
    meta: WorkflowMeta;
}): string {
    const definition = buildDefinition(options.nodes, options.edges, options.meta);
    return exportPure({ definition, meta: options.meta });
}
