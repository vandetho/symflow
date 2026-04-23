import type { WorkflowDefinition } from "../engine";
import type { WorkflowMeta } from "../types";

interface ExportOptions {
    definition: WorkflowDefinition;
    meta: WorkflowMeta;
}

/**
 * Sanitises a label for safe use as a DOT node id.
 * Wraps in double quotes if the label contains non-alphanumeric characters.
 */
function sanitizeId(label: string): string {
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) return label;
    return `"${label.replace(/"/g, '\\"')}"`;
}

/**
 * Converts a WorkflowDefinition to Graphviz DOT syntax.
 * Pure function — no side effects.
 */
export function exportWorkflowDot({ definition }: ExportOptions): string {
    const lines: string[] = [];
    const graphName = sanitizeId(definition.name);

    lines.push(`digraph ${graphName} {`);
    lines.push("    rankdir=LR;");
    lines.push("");

    // Initial marker node(s)
    lines.push("    __start__ [shape=point, width=0.2, height=0.2];");

    // Place nodes
    const placesWithOutgoing = new Set(definition.transitions.flatMap((t) => t.froms));
    for (const place of definition.places) {
        const isFinal = !placesWithOutgoing.has(place.name);
        const shape = isFinal ? "doublecircle" : "circle";
        const label = place.metadata?.description ?? place.name;
        lines.push(
            `    ${sanitizeId(place.name)} [shape=${shape}, label=${sanitizeId(label)}];`,
        );
    }

    lines.push("");

    // Initial marking edges
    for (const placeName of definition.initialMarking) {
        lines.push(`    __start__ -> ${sanitizeId(placeName)};`);
    }

    // Transition edges
    for (const transition of definition.transitions) {
        let label = transition.name;
        const cw = transition.consumeWeight ?? 1;
        const pw = transition.produceWeight ?? 1;
        if (cw !== 1 || pw !== 1) {
            label = `${label}\\n(${cw}:${pw})`;
        }
        if (transition.guard) {
            label = `${label}\\n[${transition.guard}]`;
        }

        if (transition.froms.length === 1 && transition.tos.length === 1) {
            lines.push(
                `    ${sanitizeId(transition.froms[0])} -> ${sanitizeId(transition.tos[0])} [label=${sanitizeId(label)}];`,
            );
        } else {
            // AND-split / AND-join: use an intermediate point node for the transition
            const tId = `__t_${transition.name.replace(/[^a-zA-Z0-9_]/g, "_")}__`;
            lines.push(`    ${tId} [shape=rect, width=0.3, height=0.2, label=${sanitizeId(transition.name)}];`);
            for (const from of transition.froms) {
                const edgeLabel = cw !== 1 ? ` [label="${cw}"]` : "";
                lines.push(`    ${sanitizeId(from)} -> ${tId}${edgeLabel};`);
            }
            for (const to of transition.tos) {
                const edgeLabel = pw !== 1 ? ` [label="${pw}"]` : "";
                lines.push(`    ${tId} -> ${sanitizeId(to)}${edgeLabel};`);
            }
        }
    }

    lines.push("}");
    return lines.join("\n") + "\n";
}
