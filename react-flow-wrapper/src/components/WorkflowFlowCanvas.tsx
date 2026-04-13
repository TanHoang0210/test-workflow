import React from "react";
import ReactFlow, {
  Background,
  Controls,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeProps,
  type NodeProps,
  type OnEdgesChange,
  type OnNodesChange,
  type OnSelectionChangeFunc,
  type XYPosition
} from "reactflow";
import type { Node as FlowNode } from "reactflow";
import type { WorkflowNodeData, WorkflowNodeType } from "../workflow/types";
import { WORKFLOW_NODE_DRAG_MIME } from "../workflow/constants";
import { NodeConnectionHints } from "./NodeConnectionHints";

export type WorkflowFlowCanvasProps = {
  nodes: FlowNode<WorkflowNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  nodeTypes: Record<string, React.ComponentType<NodeProps>>;
  edgeTypes: Record<string, React.ComponentType<EdgeProps>>;
  onDropNodeType: (type: WorkflowNodeType, position: XYPosition) => void;
  onAppendConnected?: (sourceId: string, type: WorkflowNodeType) => void;
  onNodeDragStart?: () => void;
};

export const WorkflowFlowCanvas: React.FC<WorkflowFlowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  edgeTypes,
  onDropNodeType,
  onAppendConnected,
  onNodeDragStart
}) => {
  const { screenToFlowPosition } = useReactFlow();
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [selectedHintId, setSelectedHintId] = React.useState<string | null>(null);

  const onSelectionChange = React.useCallback<OnSelectionChangeFunc>(({ nodes: sel }) => {
    setSelectedHintId(sel.length === 1 ? sel[0].id : null);
  }, []);

  const nodesForFlow = React.useMemo(() => {
    if (!selectedHintId) return nodes;
    return nodes.map((n) => {
      if (n.id !== selectedHintId) return n;
      const nextClass = [n.className, "wf-hint--picked"].filter(Boolean).join(" ").trim();
      if (nextClass === (n.className ?? "").trim()) return n;
      return { ...n, className: nextClass };
    });
  }, [nodes, selectedHintId]);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw =
        e.dataTransfer.getData(WORKFLOW_NODE_DRAG_MIME) || e.dataTransfer.getData("text/plain");
      if (
        raw !== "start-event" &&
        raw !== "activity" &&
        raw !== "condition" &&
        raw !== "end-event"
      ) {
        return;
      }
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onDropNodeType(raw as WorkflowNodeType, position);
    },
    [screenToFlowPosition, onDropNodeType]
  );

  return (
    <div className="workflow-canvas-host" ref={hostRef}>
      <ReactFlow
        nodes={nodesForFlow}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDragStart={onNodeDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        deleteKeyCode={null}
        fitView
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls />
        <NodeConnectionHints
          containerRef={hostRef}
          selectedNodeId={selectedHintId}
          nodes={nodes}
          onAppendConnected={onAppendConnected}
        />
      </ReactFlow>
    </div>
  );
};
