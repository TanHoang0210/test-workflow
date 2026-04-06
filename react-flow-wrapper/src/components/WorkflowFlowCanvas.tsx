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
  type XYPosition
} from "reactflow";
import type { Node as FlowNode } from "reactflow";
import type { WorkflowNodeData, WorkflowNodeType } from "../workflow/types";
import { WORKFLOW_NODE_DRAG_MIME } from "../workflow/constants";

export type WorkflowFlowCanvasProps = {
  nodes: FlowNode<WorkflowNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  nodeTypes: Record<string, React.ComponentType<NodeProps>>;
  edgeTypes: Record<string, React.ComponentType<EdgeProps>>;
  onDropNodeType: (type: WorkflowNodeType, position: XYPosition) => void;
};

export const WorkflowFlowCanvas: React.FC<WorkflowFlowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  edgeTypes,
  onDropNodeType
}) => {
  const { screenToFlowPosition } = useReactFlow();

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
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      deleteKeyCode={null}
      fitView
    >
      <Background gap={20} size={1} color="#e2e8f0" />
      <Controls />
    </ReactFlow>
  );
};
