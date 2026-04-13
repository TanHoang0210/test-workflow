import type { Edge } from "reactflow";
import type { Node as FlowNode } from "reactflow";
import type {
  NodeConfigProperty,
  NodeFormData,
  WorkflowNodeData,
  WorkflowNodeType,
  WorkflowPersistPayloadV1
} from "./types";
import { NODE_TYPE_LABELS } from "./constants";
import { uid } from "./uid";

function normalizeConfigProperties(
  raw: WorkflowPersistPayloadV1["nodes"][number]["configProperties"] | undefined
): NodeConfigProperty[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    id: item && typeof item.id === "string" && item.id ? item.id : uid("cfg"),
    displayName: typeof item?.displayName === "string" ? item.displayName : "",
    key: typeof item?.key === "string" ? item.key : "",
    value: typeof item?.value === "string" ? item.value : ""
  }));
}

/** Gộp các dòng cấu hình thành object { [key]: value } (bỏ qua key rỗng). */
export function configPropertiesToPlainObject(items: NodeConfigProperty[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of items) {
    const k = p.key.trim();
    if (k) out[k] = p.value;
  }
  return out;
}

export function defaultFormData(type: WorkflowNodeType): NodeFormData {
  const empty: NodeFormData = {
    label: "",
    branchConditions: {},
    routingCondition: "",
    fields: [],
    configProperties: []
  };
  if (type === "start-event") {
    return { ...empty, label: "Bắt đầu", routingCondition: "" };
  }
  if (type === "end-event") {
    return { ...empty, label: "Kết thúc", routingCondition: "" };
  }
  if (type === "condition") {
    return { ...empty, label: "Điều kiện", routingCondition: "" };
  }
  return { ...empty, label: "Bước", routingCondition: "" };
}

export function getOutgoingBranchTargets(
  sourceId: string,
  edgeList: Edge[],
  nodeList: FlowNode<WorkflowNodeData>[]
): { targetId: string; targetLabel: string }[] {
  const seen = new Set<string>();
  const out: { targetId: string; targetLabel: string }[] = [];
  for (const e of edgeList) {
    if (e.source !== sourceId) continue;
    if (seen.has(e.target)) continue;
    seen.add(e.target);
    const tn = nodeList.find((n) => n.id === e.target);
    const lab = tn?.data.formData.label?.trim();
    out.push({
      targetId: e.target,
      targetLabel: lab && lab.length > 0 ? lab : `Node ${e.target}`
    });
  }
  return out;
}

export type ConnectableTargetSummary = {
  id: string;
  label: string;
  typeLabel: string;
  nodeType: WorkflowNodeType;
  alreadyLinked: boolean;
};

/** Node đích có handle target (không phải Bắt đầu). */
export function nodeAcceptsIncomingEdges(nodeType: WorkflowNodeType): boolean {
  return nodeType !== "start-event";
}

/** Node nguồn có handle source (không phải Kết thúc). */
export function nodeCanEmitOutgoingEdges(nodeType: WorkflowNodeType): boolean {
  return nodeType !== "end-event";
}

/** Các node có thể nối từ `sourceId` (theo handle hiện có trên canvas). */
export function getConnectableTargetSummaries(
  sourceId: string,
  nodeList: FlowNode<WorkflowNodeData>[],
  edgeList: Edge[]
): { canConnectOut: boolean; targets: ConnectableTargetSummary[] } {
  const source = nodeList.find((n) => n.id === sourceId);
  if (!source?.type || !isWorkflowNodeTypeString(source.type)) {
    return { canConnectOut: false, targets: [] };
  }
  if (!nodeCanEmitOutgoingEdges(source.type)) {
    return { canConnectOut: false, targets: [] };
  }
  const targets: ConnectableTargetSummary[] = [];
  for (const n of nodeList) {
    if (n.id === sourceId || !n.type || !isWorkflowNodeTypeString(n.type)) continue;
    if (!nodeAcceptsIncomingEdges(n.type)) continue;
    const nt = n.type;
    targets.push({
      id: n.id,
      label: n.data.formData.label.trim() || `Node ${n.id}`,
      typeLabel: NODE_TYPE_LABELS[nt],
      nodeType: nt,
      alreadyLinked: edgeList.some((e) => e.source === sourceId && e.target === n.id)
    });
  }
  targets.sort((a, b) => a.label.localeCompare(b.label, "vi"));
  return { canConnectOut: true, targets };
}

export function mergeBranchFormData(form: NodeFormData, targetIds: string[]): NodeFormData {
  const prev = form.branchConditions ?? {};
  const legacy = (form.routingCondition ?? "").trim();
  const next: Record<string, string> = {};
  for (const tid of targetIds) {
    next[tid] = prev[tid] ?? "";
  }
  const allEmpty = targetIds.every((tid) => !next[tid]?.trim());
  if (legacy && allEmpty && targetIds.length > 0) {
    next[targetIds[0]] = legacy;
  }
  return { ...form, branchConditions: next };
}

function isWorkflowNodeTypeString(s: string): s is WorkflowNodeType {
  return (
    s === "start-event" ||
    s === "activity" ||
    s === "condition" ||
    s === "end-event"
  );
}

export function computeNextNodeIdFromPersisted(persistedNodes: Array<{ id: string }>): number {
  let max = 0;
  for (const n of persistedNodes) {
    const v = parseInt(n.id, 10);
    if (!Number.isNaN(v)) max = Math.max(max, v);
  }
  return max + 1;
}

export function hydrateWorkflowNodes(
  list: WorkflowPersistPayloadV1["nodes"],
  makeData: (t: WorkflowNodeType) => WorkflowNodeData
): FlowNode<WorkflowNodeData>[] {
  const out: FlowNode<WorkflowNodeData>[] = [];
  for (const n of list) {
    if (!isWorkflowNodeTypeString(n.type)) continue;
    const t = n.type;
    out.push({
      id: String(n.id),
      type: t,
      position: n.position,
      data: {
        ...makeData(t),
        formData: {
          label: typeof n.label === "string" ? n.label : defaultFormData(t).label,
          routingCondition: typeof n.routingCondition === "string" ? n.routingCondition : "",
          branchConditions:
            n.branchConditions &&
            typeof n.branchConditions === "object" &&
            !Array.isArray(n.branchConditions)
              ? { ...n.branchConditions }
              : {},
          fields: Array.isArray(n.fields) ? n.fields : [],
          configProperties: normalizeConfigProperties(n.configProperties)
        }
      }
    });
  }
  return out;
}

export function hydrateWorkflowEdges(
  list: WorkflowPersistPayloadV1["edges"] | undefined,
  onDeleteEdge: (edgeId: string) => void
): Edge[] {
  if (!Array.isArray(list)) return [];
  return list.map((e) => ({
    id: String(e.id),
    source: String(e.source),
    target: String(e.target),
    type: "deletable" as const,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    data: { onDeleteEdge: (edgeId: string) => onDeleteEdge(edgeId) }
  }));
}

export function parseWorkflowPayload(raw: string): WorkflowPersistPayloadV1 | null {
  try {
    const p = JSON.parse(raw) as WorkflowPersistPayloadV1;
    if (p?.version !== "1.0" || !Array.isArray(p.nodes)) return null;
    return p;
  } catch {
    return null;
  }
}

export function tryReadPersistedPayload(storageKey: string): WorkflowPersistPayloadV1 | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return parseWorkflowPayload(raw);
  } catch {
    return null;
  }
}

export function buildWorkflowPayloadV1(
  nodeList: FlowNode<WorkflowNodeData>[],
  edgeList: Edge[]
): WorkflowPersistPayloadV1 {
  return {
    version: "1.0",
    savedAt: new Date().toISOString(),
    nodes: nodeList.map((n) => ({
      id: n.id,
      type: n.data.nodeType,
      position: n.position,
      label: n.data.formData.label,
      routingCondition: n.data.formData.routingCondition ?? "",
      branchConditions: n.data.formData.branchConditions ?? {},
      fields: n.data.formData.fields,
      configProperties: n.data.formData.configProperties ?? [],
      configMap: configPropertiesToPlainObject(n.data.formData.configProperties ?? [])
    })),
    edges: edgeList.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null
    }))
  };
}
