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
    <button
      type="button"
      className="event-node__delete-btn nodrag nopan"
      title="Xóa node"
      onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
    ><svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/></svg></button>
    <Handle type="target" position={Position.Left} className="workflow-node__handle end-event-icon__handle" />
    <svg viewBox="0 0 40 40" className="end-event-icon__svg" aria-hidden>
      <circle cx="20" cy="20" r="18" className="end-event-icon__ring-outer" />
      <circle cx="20" cy="20" r="12" className="end-event-icon__ring-inner" />
    </svg>
  </div>
);
