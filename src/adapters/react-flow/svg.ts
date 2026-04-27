import type { Node, Edge } from "@xyflow/react";
import type { WorkflowMeta } from "../../types";
import { renderPositionedSvg, type SvgPositionedEdge, type SvgPositionedNode } from "../../svg";
import type { StateNodeData, TransitionNodeData } from "./types";

/**
 * Render a React Flow graph as a self-contained SVG string using the live canvas
 * positions. No engine round-trip — uses the on-canvas layout directly so the
 * exported SVG looks like what the user sees in the editor.
 */
export function exportGraphToSvg(options: {
    nodes: Node[];
    edges: Edge[];
    meta: WorkflowMeta;
    theme?: "dark" | "light";
}): string {
    const positioned: SvgPositionedNode[] = [];

    for (const n of options.nodes) {
        if (n.type === "state") {
            const d = n.data as unknown as StateNodeData;
            positioned.push({
                id: n.id,
                type: "state",
                label: d.label,
                description: d.metadata?.description,
                x: n.position.x,
                y: n.position.y,
                width: n.width ?? undefined,
                height: n.height ?? undefined,
                isInitial: d.isInitial,
                isFinal: d.isFinal,
                bgColor: d.metadata?.bg_color,
            });
        } else if (n.type === "transition") {
            const d = n.data as unknown as TransitionNodeData;
            let label = d.label;
            const cw = d.consumeWeight ?? 1;
            const pw = d.produceWeight ?? 1;
            if (cw !== 1 || pw !== 1) label = `${label} (${cw}:${pw})`;
            if (d.guard) label = `${label} [${d.guard}]`;
            positioned.push({
                id: n.id,
                type: "transition",
                label,
                x: n.position.x,
                y: n.position.y,
                width: n.width ?? undefined,
                height: n.height ?? undefined,
            });
        } else if (n.type === "subworkflow") {
            const d = n.data as unknown as { workflowName?: string; label?: string };
            positioned.push({
                id: n.id,
                type: "state",
                label: d.workflowName ?? d.label ?? "subworkflow",
                x: n.position.x,
                y: n.position.y,
                width: n.width ?? undefined,
                height: n.height ?? undefined,
            });
        }
    }

    const positionedEdges: SvgPositionedEdge[] = options.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        color: typeof e.style?.stroke === "string" ? e.style.stroke : undefined,
    }));

    return renderPositionedSvg({
        nodes: positioned,
        edges: positionedEdges,
        title: options.meta.name,
        theme: options.theme ?? "dark",
    });
}
