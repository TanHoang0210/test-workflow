import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../../workflow/types";
import { NODE_TYPE_LABELS } from "../../workflow/constants";
import { NodeTypeGlyph } from "../NodeTypeGlyph";
import { NodeToolbar } from "../NodeToolbar";

export const ActivityNodeView: React.FC<NodeProps<WorkflowNodeData>> = ({ id, data }) => {
  const label = NODE_TYPE_LABELS[data.nodeType] ?? data.nodeType;
  const tip = `${label} · ${data.formData.label} — double-click để sửa`;

  return (
    <div
      className={`workflow-node workflow-node--${data.nodeType}${data.isAnimating ? " workflow-node--animating" : ""}`}
      title={tip}
      onDoubleClick={(e) => { e.stopPropagation(); data.onConfigure(id); }}
    >
      <NodeToolbar id={id} data={data} />
      <Handle type="target" position={Position.Left} className="workflow-node__handle" />
      <div className="workflow-node__header">
        <div className="workflow-node__header-icon">
          <NodeTypeGlyph nodeType={data.nodeType} />
        </div>
        <span className="workflow-node__type-label">{label}</span>
      </div>
      <div className="workflow-node__body">
        <div className="workflow-node__content">
          <p className="workflow-node__title">{data.formData.label}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="workflow-node__handle" />
    </div>
  );
};
