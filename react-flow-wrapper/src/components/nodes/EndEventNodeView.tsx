import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../../workflow/types";
import { NodeToolbar } from "../NodeToolbar";

export const EndEventNodeView: React.FC<NodeProps<WorkflowNodeData>> = ({ id, data }) => (
  <div
    className={`workflow-node--end-event-icon${data.isAnimating ? " workflow-node--animating" : ""}`}
    title="Kết thúc — điểm kết thúc của workflow"
  >
    <NodeToolbar id={id} data={data} />
    <Handle type="target" position={Position.Left} className="workflow-node__handle end-event-icon__handle" />
    <svg viewBox="0 0 40 40" className="end-event-icon__svg" aria-hidden>
      <circle cx="20" cy="20" r="18" className="end-event-icon__ring-outer" />
      <circle cx="20" cy="20" r="12" className="end-event-icon__ring-inner" />
    </svg>
  </div>
);
