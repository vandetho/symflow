import { Node, Edge } from '@xyflow/react';
import { WorkflowMeta, TransitionListener } from './types.cjs';
import { i as WorkflowDefinition } from './types-CGhrS6jV.cjs';

interface StateNodeData {
    label: string;
    isInitial: boolean;
    isFinal: boolean;
    metadata: Record<string, string>;
}
interface TransitionNodeData {
    label: string;
    guard?: string;
    listeners: TransitionListener[];
    metadata: Record<string, string>;
}
/** @deprecated Use TransitionNodeData — transitions are now nodes, not edges */
interface TransitionEdgeData {
    label: string;
    guard?: string;
    listeners: TransitionListener[];
    metadata: Record<string, string>;
}
interface GraphJson {
    nodes: Node[];
    edges: Edge[];
    meta: WorkflowMeta;
}
interface Snapshot {
    nodes: Node[];
    edges: Edge[];
}

/**
 * Converts React Flow graph state into a pure WorkflowDefinition
 * for the engine to consume. Reads transition data from transition nodes.
 */
declare function buildDefinition(nodes: Node[], edges: Edge[], meta: WorkflowMeta): WorkflowDefinition;

declare function autoLayoutNodes(nodes: Node[], edges: Edge[]): Node[];

interface GraphData {
    nodes: Node[];
    edges: Edge[];
}
/**
 * Migrates old edge-based workflow data (where transitions are edges with
 * TransitionEdgeData) to the new node-based format (where transitions are
 * intermediate nodes between state nodes).
 *
 * Idempotent: returns data unchanged if already in the new format.
 */
declare function migrateGraphData(data: GraphData): GraphData;

interface ImportGraphResult {
    nodes: Node[];
    edges: Edge[];
    meta: WorkflowMeta;
}
/**
 * Parse a Symfony workflow YAML and produce an auto-laid-out React Flow graph.
 * Wraps the pure YAML importer and materialises the definition as nodes/edges.
 */
declare function importWorkflowYamlToGraph(yamlString: string): ImportGraphResult;
/**
 * Build a WorkflowDefinition from a React Flow graph and dump it as YAML.
 */
declare function exportGraphToYaml(options: {
    nodes: Node[];
    edges: Edge[];
    meta: WorkflowMeta;
}): string;

/**
 * Parse a workflow JSON document and produce an auto-laid-out React Flow graph.
 * Mirrors `importWorkflowYamlToGraph` but skips the YAML parser.
 */
declare function importWorkflowJsonToGraph(jsonString: string): ImportGraphResult;
/**
 * Build a WorkflowDefinition from a React Flow graph and serialise it as JSON.
 */
declare function exportGraphToJson(options: {
    nodes: Node[];
    edges: Edge[];
    meta: WorkflowMeta;
    indent?: number;
}): string;

/**
 * Build a WorkflowDefinition from a React Flow graph and emit it as a
 * standalone `.ts` module string ready to be written to disk.
 */
declare function exportGraphToTs(options: {
    nodes: Node[];
    edges: Edge[];
    meta: WorkflowMeta;
    exportName?: string;
    importFrom?: string;
}): string;

export { type GraphJson, type ImportGraphResult, type Snapshot, type StateNodeData, type TransitionEdgeData, type TransitionNodeData, autoLayoutNodes, buildDefinition, exportGraphToJson, exportGraphToTs, exportGraphToYaml, importWorkflowJsonToGraph, importWorkflowYamlToGraph, migrateGraphData };
