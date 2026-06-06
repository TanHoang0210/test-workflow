import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../../workflow/types";
import { NodeToolbar } from "../NodeToolbar";

export const StartEventNodeView: React.FC<NodeProps<WorkflowNodeData>> = ({ id, data }) => (
  <div
    className={`workflow-node--start-event-icon${data.isAnimating ? " workflow-node--animating" : ""}`}
    title="Bắt đầu — điểm khởi đầu của workflow"
  >
    <NodeToolbar id={id} data={data} />
    <button
      type="button"
      className="event-node__delete-btn nodrag nopan"
      title="Xóa node"
      onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
    ><svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/></svg></button>
    <svg viewBox="0 0 40 40" className="start-event-icon__svg" aria-hidden>
      <circle cx="20" cy="20" r="18" className="start-event-icon__ring" />
      <path d="M16 13.5v13l11-6.5-11-6.5z" className="start-event-icon__play" />
    </svg>
    <Handle type="source" position={Position.Right} className="workflow-node__handle start-event-icon__handle" />
  </div>
);
