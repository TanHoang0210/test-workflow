import { useCallback, useRef } from "react";
import type { Edge } from "reactflow";
import type { Node as FlowNode } from "reactflow";
import type { WorkflowNodeData } from "./types";

type Snapshot = {
  nodes: FlowNode<WorkflowNodeData>[];
  edges: Edge[];
};

const MAX_HISTORY = 80;

function cloneSnapshot(s: Snapshot): Snapshot {
  return {
    nodes: s.nodes.map((n) => ({
      ...n,
      position: { ...n.position },
      data: {
        ...n.data,
        formData: {
          ...n.data.formData,
          fields: n.data.formData.fields.map((f) => ({
            ...f,
            options: f.options.map((o) => ({ ...o }))
          })),
          branchConditions: { ...(n.data.formData.branchConditions ?? {}) },
          configProperties: (n.data.formData.configProperties ?? []).map((c) => ({ ...c }))
        }
      }
    })),
    edges: s.edges.map((e) => ({ ...e, data: e.data ? { ...e.data } : undefined }))
  };
}

export type GraphHistory = {
  takeSnapshot: (nodes: FlowNode<WorkflowNodeData>[], edges: Edge[]) => void;
  undo: (current: Snapshot) => Snapshot | null;
  redo: (current: Snapshot) => Snapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export function useGraphHistory(): GraphHistory {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);

  const takeSnapshot = useCallback(
    (nodes: FlowNode<WorkflowNodeData>[], edges: Edge[]) => {
      past.current = [...past.current.slice(-(MAX_HISTORY - 1)), cloneSnapshot({ nodes, edges })];
      future.current = [];
    },
    []
  );

  const undo = useCallback((current: Snapshot): Snapshot | null => {
    const prev = past.current.pop();
    if (!prev) return null;
    future.current.push(cloneSnapshot(current));
    return prev;
  }, []);

  const redo = useCallback((current: Snapshot): Snapshot | null => {
    const next = future.current.pop();
    if (!next) return null;
    past.current.push(cloneSnapshot(current));
    return next;
  }, []);

  const canUndo = useCallback(() => past.current.length > 0, []);
  const canRedo = useCallback(() => future.current.length > 0, []);

  return { takeSnapshot, undo, redo, canUndo, canRedo };
}
