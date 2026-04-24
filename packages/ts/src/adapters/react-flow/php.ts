import type { Node, Edge } from "@xyflow/react";
import type { WorkflowMeta } from "../../types";
import { exportWorkflowPhp } from "../../php";
import { buildDefinition } from "./definition-builder";

/**
 * Build a WorkflowDefinition from a React Flow graph and emit it as a
 * Laraflow-compatible `.php` config file string.
 */
export function exportGraphToPhp(options: {
    nodes: Node[];
    edges: Edge[];
    meta: WorkflowMeta;
}): string {
    const definition = buildDefinition(options.nodes, options.edges, options.meta);
    return exportWorkflowPhp({ definition, meta: options.meta });
}
