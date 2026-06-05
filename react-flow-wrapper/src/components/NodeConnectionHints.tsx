import React from "react";
import { useStore } from "reactflow";
import type { Node as FlowNode } from "reactflow";
import type { WorkflowNodeData, WorkflowNodeType } from "../workflow/types";
import { nodeCanEmitOutgoingEdges } from "../workflow/graphUtils";
import { NODE_TYPE_LABELS, SIDEBAR_NODE_ITEMS } from "../workflow/constants";
import { NodeTypeGlyph } from "./NodeTypeGlyph";

const CONNECTABLE_ITEMS = SIDEBAR_NODE_ITEMS.filter((i) => i.type !== "start-event");

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
    if (!selectedNodeId || !showPad) { setPos(null); return; }
    const root = containerRef.current;
    if (!root) { setPos(null); return; }
    const nodeEl = root.querySelector(
      `.react-flow__node[data-id="${escapeSelector(selectedNodeId)}"]`
    ) as HTMLElement | null;
    if (!nodeEl) { setPos(null); return; }
    const rRoot = root.getBoundingClientRect();
    const rNode = nodeEl.getBoundingClientRect();
    setPos({
      top: rNode.top - rRoot.top,
      left: rNode.right - rRoot.left + 12
    });
  }, [selectedNodeId, showPad, transform, nodes, containerRef]);

  if (!selectedNodeId || !pos || !showPad) return null;

  return (
    <div
      className="wf-node-menu nodrag nopan"
      style={{ top: pos.top, left: pos.left }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p className="wf-node-menu__heading">Thêm và nối</p>
      <div className="wf-node-menu__list">
        {CONNECTABLE_ITEMS.map((item) => (
          <button
            key={item.type}
            type="button"
            className={`wf-node-menu__item wf-node-menu__item--${item.type}`}
            title={item.tooltip}
            disabled={!onAppendConnected}
            onClick={() => onAppendConnected?.(selectedNodeId, item.type)}
          >
            <div className="wf-node-menu__icon">
              <NodeTypeGlyph nodeType={item.type} className="wf-node-menu__glyph" />
            </div>
            <span className="wf-node-menu__label">{NODE_TYPE_LABELS[item.type]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
