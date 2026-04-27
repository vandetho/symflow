import type { WorkflowDefinition } from "../engine";
import type { WorkflowMeta } from "../types";

export interface SvgPositionedNode {
    id: string;
    type: "state" | "transition";
    label: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    isInitial?: boolean;
    isFinal?: boolean;
    bgColor?: string;
    description?: string;
}

export interface SvgPositionedEdge {
    id: string;
    source: string;
    target: string;
    color?: string;
}

export interface SvgRenderOptions {
    nodes: SvgPositionedNode[];
    edges: SvgPositionedEdge[];
    title?: string;
    theme?: "dark" | "light";
    padding?: number;
}

export interface SvgExportOptions {
    definition: WorkflowDefinition;
    meta: WorkflowMeta;
    theme?: "dark" | "light";
}

interface ThemeColors {
    bg: string;
    surface: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    edge: string;
    initialFill: string;
    finalFill: string;
    transitionFill: string;
}

const DARK: ThemeColors = {
    bg: "#0a0a14",
    surface: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.12)",
    text: "#e8e8f0",
    textMuted: "rgba(232,232,240,0.55)",
    accent: "#7dd3fc",
    edge: "rgba(255,255,255,0.35)",
    initialFill: "rgba(125,211,252,0.10)",
    finalFill: "rgba(34,197,94,0.10)",
    transitionFill: "rgba(217,70,239,0.10)",
};

const LIGHT: ThemeColors = {
    bg: "#ffffff",
    surface: "rgba(0,0,0,0.03)",
    border: "rgba(0,0,0,0.15)",
    text: "#0a0a14",
    textMuted: "rgba(10,10,20,0.55)",
    accent: "#0284c7",
    edge: "rgba(0,0,0,0.40)",
    initialFill: "rgba(2,132,199,0.10)",
    finalFill: "rgba(22,163,74,0.10)",
    transitionFill: "rgba(168,85,247,0.10)",
};

const STATE_W = 160;
const STATE_H = 56;
const TRANSITION_W = 130;
const TRANSITION_H = 44;

function escapeXml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function nodeSize(n: SvgPositionedNode): { w: number; h: number } {
    const w = n.width ?? (n.type === "state" ? STATE_W : TRANSITION_W);
    const h = n.height ?? (n.type === "state" ? STATE_H : TRANSITION_H);
    return { w, h };
}

function nodeCenter(n: SvgPositionedNode): { cx: number; cy: number } {
    const { w, h } = nodeSize(n);
    return { cx: n.x + w / 2, cy: n.y + h / 2 };
}

/**
 * Lay places into columns by BFS depth from initial places, transitions between them.
 * Acyclic-friendly; cycles fall back to insertion order.
 */
function autoLayout(definition: WorkflowDefinition): SvgPositionedNode[] {
    const colSpacing = 220;
    const rowSpacing = 90;
    const startX = 40;
    const startY = 40;

    const placeColumn = new Map<string, number>();
    for (const initial of definition.initialMarking) {
        placeColumn.set(initial, 0);
    }
    let changed = true;
    let safety = definition.places.length * definition.transitions.length + 10;
    while (changed && safety-- > 0) {
        changed = false;
        for (const t of definition.transitions) {
            const fromCols = t.froms
                .map((f) => placeColumn.get(f))
                .filter((c): c is number => c !== undefined);
            if (!fromCols.length) continue;
            const transitionCol = Math.max(...fromCols) + 1;
            for (const to of t.tos) {
                const targetCol = transitionCol + 1;
                const existing = placeColumn.get(to);
                if (existing === undefined || existing < targetCol) {
                    placeColumn.set(to, targetCol);
                    changed = true;
                }
            }
        }
    }
    let fallbackCol = 0;
    for (const place of definition.places) {
        if (!placeColumn.has(place.name)) {
            placeColumn.set(place.name, fallbackCol);
            fallbackCol += 2;
        }
    }

    const transitionColumn = new Map<string, number>();
    for (const t of definition.transitions) {
        const fromCols = t.froms
            .map((f) => placeColumn.get(f) ?? 0)
            .reduce((a, b) => Math.max(a, b), 0);
        transitionColumn.set(t.name, fromCols + 1);
    }

    const colMembers = new Map<number, string[]>();
    const pushMember = (col: number, id: string) => {
        if (!colMembers.has(col)) colMembers.set(col, []);
        colMembers.get(col)!.push(id);
    };
    for (const place of definition.places) {
        pushMember(placeColumn.get(place.name)!, `state:${place.name}`);
    }
    for (const t of definition.transitions) {
        pushMember(transitionColumn.get(t.name)!, `transition:${t.name}`);
    }

    const placesWithOutgoing = new Set(definition.transitions.flatMap((t) => t.froms));
    const positioned: SvgPositionedNode[] = [];

    for (const [col, members] of [...colMembers.entries()].sort((a, b) => a[0] - b[0])) {
        members.forEach((memberId, idx) => {
            const [kind, name] = memberId.split(":") as ["state" | "transition", string];
            if (kind === "state") {
                const place = definition.places.find((p) => p.name === name)!;
                positioned.push({
                    id: name,
                    type: "state",
                    label: name,
                    description: place.metadata?.description,
                    x: startX + col * colSpacing,
                    y: startY + idx * rowSpacing,
                    isInitial: definition.initialMarking.includes(name),
                    isFinal: !placesWithOutgoing.has(name),
                    bgColor: place.metadata?.bg_color,
                });
            } else {
                const t = definition.transitions.find((tr) => tr.name === name)!;
                let label = name;
                const cw = t.consumeWeight ?? 1;
                const pw = t.produceWeight ?? 1;
                if (cw !== 1 || pw !== 1) {
                    label = `${label} (${cw}:${pw})`;
                }
                if (t.guard) {
                    label = `${label} [${t.guard}]`;
                }
                positioned.push({
                    id: name,
                    type: "transition",
                    label,
                    x: startX + col * colSpacing + (STATE_W - TRANSITION_W) / 2,
                    y: startY + idx * rowSpacing,
                });
            }
        });
    }

    return positioned;
}

function buildEdges(definition: WorkflowDefinition): SvgPositionedEdge[] {
    const edges: SvgPositionedEdge[] = [];
    for (const t of definition.transitions) {
        for (const from of t.froms) {
            edges.push({
                id: `e-${from}-${t.name}`,
                source: from,
                target: t.name,
            });
        }
        for (const to of t.tos) {
            edges.push({
                id: `e-${t.name}-${to}`,
                source: t.name,
                target: to,
            });
        }
    }
    return edges;
}

/**
 * Renders pre-positioned nodes and edges as an SVG string.
 * Pure function — no DOM, no network.
 */
export function renderPositionedSvg(opts: SvgRenderOptions): string {
    const theme = opts.theme === "light" ? LIGHT : DARK;
    const padding = opts.padding ?? 24;

    if (!opts.nodes.length) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120"><rect width="100%" height="100%" fill="${theme.bg}"/><text x="160" y="64" fill="${theme.textMuted}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12">Empty workflow</text></svg>`;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of opts.nodes) {
        const { w, h } = nodeSize(n);
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + w > maxX) maxX = n.x + w;
        if (n.y + h > maxY) maxY = n.y + h;
    }
    const viewX = minX - padding;
    const viewY = minY - padding;
    const viewW = maxX - minX + padding * 2;
    const viewH = maxY - minY + padding * 2;

    const lookup = new Map<string, SvgPositionedNode>();
    for (const n of opts.nodes) lookup.set(n.id, n);

    const out: string[] = [];
    out.push(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewX} ${viewY} ${viewW} ${viewH}" width="${Math.round(viewW)}" height="${Math.round(viewH)}" font-family="system-ui,-apple-system,sans-serif">`,
    );
    if (opts.title) {
        out.push(`<title>${escapeXml(opts.title)}</title>`);
    }
    out.push(
        `<rect x="${viewX}" y="${viewY}" width="${viewW}" height="${viewH}" fill="${theme.bg}"/>`,
    );
    out.push(
        `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="${theme.edge}"/></marker></defs>`,
    );

    for (const e of opts.edges) {
        const s = lookup.get(e.source);
        const t = lookup.get(e.target);
        if (!s || !t) continue;
        const { cx: sx, cy: sy } = nodeCenter(s);
        const { cx: tx, cy: ty } = nodeCenter(t);
        const sw = nodeSize(s).w / 2;
        const tw = nodeSize(t).w / 2;
        const dx = tx - sx;
        const sign = dx === 0 ? 1 : Math.sign(dx);
        const sxEdge = sx + sign * sw;
        const txEdge = tx - sign * tw;
        const cp1x = sxEdge + (txEdge - sxEdge) * 0.5;
        const cp2x = sxEdge + (txEdge - sxEdge) * 0.5;
        const stroke = e.color ?? theme.edge;
        out.push(
            `<path d="M ${sxEdge} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ty}, ${txEdge} ${ty}" stroke="${stroke}" stroke-width="1.5" fill="none" marker-end="url(#arrow)"/>`,
        );
    }

    for (const n of opts.nodes) {
        const { w, h } = nodeSize(n);
        const isState = n.type === "state";
        const fill =
            n.bgColor ??
            (isState
                ? n.isInitial
                    ? theme.initialFill
                    : n.isFinal
                      ? theme.finalFill
                      : theme.surface
                : theme.transitionFill);
        const stroke = isState && (n.isInitial || n.isFinal) ? theme.accent : theme.border;
        const rx = isState ? 12 : 8;
        out.push(
            `<rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${isState && (n.isInitial || n.isFinal) ? 1.5 : 1}"/>`,
        );
        const labelLines: string[] = [];
        labelLines.push(escapeXml(n.label));
        if (isState && n.description) {
            labelLines.push(escapeXml(n.description));
        }
        const fontSize = isState ? 13 : 11;
        const lineH = fontSize + 3;
        const totalH = labelLines.length * lineH;
        const startY = n.y + h / 2 - totalH / 2 + fontSize;
        labelLines.forEach((line, i) => {
            const fill = i === 0 ? theme.text : theme.textMuted;
            const weight = i === 0 ? 500 : 400;
            out.push(
                `<text x="${n.x + w / 2}" y="${startY + i * lineH}" fill="${fill}" font-size="${i === 0 ? fontSize : fontSize - 1}" font-weight="${weight}" text-anchor="middle" font-family="${isState ? "ui-monospace,SFMono-Regular,monospace" : "system-ui,sans-serif"}">${line}</text>`,
            );
        });
    }

    out.push("</svg>");
    return out.join("");
}

/**
 * Converts a WorkflowDefinition to a self-contained SVG string with auto-layout.
 * Pure function — no side effects.
 */
export function exportWorkflowSvg(opts: SvgExportOptions): string {
    const nodes = autoLayout(opts.definition);
    const edges = buildEdges(opts.definition);
    return renderPositionedSvg({
        nodes,
        edges,
        title: opts.meta.name,
        theme: opts.theme ?? "dark",
    });
}
