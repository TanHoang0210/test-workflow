import React from "react";
import { useStore } from "reactflow";
import type { Node as FlowNode } from "reactflow";
import type { WorkflowNodeData, WorkflowNodeType } from "../workflow/types";
import { nodeCanEmitOutgoingEdges } from "../workflow/graphUtils";
import { NodeTypeGlyph } from "./NodeTypeGlyph";

const APPEND_TYPES = ["activity", "condition", "end-event"] as const satisfies readonly WorkflowNodeType[];

const APPEND_TOOLTIP: Record<(typeof APPEND_TYPES)[number], string> = {
  activity: "Hoạt động — thêm bước và nối từ node này",
  condition: "Điều kiện — thêm bước và nối từ node này",
  "end-event": "Kết thúc — thêm bước và nối từ node này"
};

export type NodeConnectionHintsProps = {
  containerRef: React.RefObject<HTMLElement | null>;
  selectedNodeId: string | null;
  nodes: FlowNode<WorkflowNodeData>[];
  onAppendConnected?: (sourceId: string, type: WorkflowNodeType) => void;
};

function escapeSelector(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export const NodeConnectionHints: React.FC<NodeConnectionHintsProps> = ({
  containerRef,
  selectedNodeId,
  nodes,
  onAppendConnected
}) => {
  const transform = useStore((s) => s.transform);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  const sourceType = React.useMemo(() => {
    if (!selectedNodeId) return undefined;
    const n = nodes.find((x) => x.id === selectedNodeId);
    return n?.type as WorkflowNodeType | undefined;
  }, [selectedNodeId, nodes]);

  const showPad = Boolean(sourceType && nodeCanEmitOutgoingEdges(sourceType));

  React.useLayoutEffect(() => {
    if (!selectedNodeId || !showPad) {
      setPos(null);
      return;
    }
    const root = containerRef.current;
    if (!root) {
      setPos(null);
      return;
    }
    const nodeEl = root.querySelector(
      `.react-flow__node[data-id="${escapeSelector(selectedNodeId)}"]`
    ) as HTMLElement | null;
    if (!nodeEl) {
      setPos(null);
      return;
    }
    const rRoot = root.getBoundingClientRect();
    const rNode = nodeEl.getBoundingClientRect();
    setPos({
      top: rNode.top - rRoot.top,
      left: rNode.right - rRoot.left + 8
    });
  }, [selectedNodeId, showPad, transform, nodes, containerRef]);

  if (!selectedNodeId || !pos || !showPad) return null;

  return (
    <div
      className="wf-context-pad nodrag nopan"
      style={{ top: pos.top, left: pos.left }}
      role="toolbar"
      aria-label="Thêm bước: hoạt động, điều kiện, kết thúc"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="wf-context-pad__row" role="group">
        {APPEND_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className="wf-context-pad__btn"
            title={APPEND_TOOLTIP[t]}
            disabled={!onAppendConnected}
            onClick={() => onAppendConnected?.(selectedNodeId, t)}
          >
            <NodeTypeGlyph nodeType={t} className="wf-context-pad__glyph" />
            <span className="sr-only">{APPEND_TOOLTIP[t]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
