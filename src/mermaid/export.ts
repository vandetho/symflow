import type { WorkflowDefinition } from "../engine";
import type { WorkflowMeta } from "../types";

interface ExportOptions {
    definition: WorkflowDefinition;
    meta: WorkflowMeta;
}

/**
 * Sanitises a label for safe use as a Mermaid state id.
 */
function sanitizeId(label: string): string {
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(label)) return label;
    return label.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Converts a WorkflowDefinition to Mermaid stateDiagram-v2 syntax.
 * Pure function — no side effects.
 */
export function exportWorkflowMermaid({ definition }: ExportOptions): string {
    const lines: string[] = [];
    lines.push("stateDiagram-v2");
    lines.push("    direction LR");

    // State descriptions from place metadata
    for (const place of definition.places) {
        const description = place.metadata?.description;
        if (description) {
            lines.push(`    ${sanitizeId(place.name)} : ${description}`);
        }
    }

    // Initial transitions
    for (const placeName of definition.initialMarking) {
        lines.push(`    [*] --> ${sanitizeId(placeName)}`);
    }

    // Transitions
    for (const transition of definition.transitions) {
        let label = transition.name;
        if (transition.guard) {
            label = `${label} [${transition.guard}]`;
        }

        for (const from of transition.froms) {
            for (const to of transition.tos) {
                lines.push(`    ${sanitizeId(from)} --> ${sanitizeId(to)} : ${label}`);
            }
        }
    }

    // Final states — places with no outgoing transitions
    const placesWithOutgoing = new Set(definition.transitions.flatMap((t) => t.froms));
    for (const place of definition.places) {
        if (!placesWithOutgoing.has(place.name)) {
            lines.push(`    ${sanitizeId(place.name)} --> [*]`);
        }
    }

    return lines.join("\n") + "\n";
}
