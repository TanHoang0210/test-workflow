import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../../workflow/types";
import { NODE_TYPE_LABELS } from "../../workflow/constants";
import { NodeToolbar } from "../NodeToolbar";

export const ConditionNodeView: React.FC<NodeProps<WorkflowNodeData>> = ({ id, data }) => {
  const branchPreview = Object.values(data.formData.branchConditions ?? {})
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" · ");
  const tip = `${NODE_TYPE_LABELS["condition"]} · ${data.formData.label}${
    branchPreview ? ` — ${branchPreview.slice(0, 80)}${branchPreview.length > 80 ? "…" : ""}` : ""
  } — double-click để sửa`;

  return (
    <div
      className={`workflow-node workflow-node--condition${data.isAnimating ? " workflow-node--animating" : ""}`}
      title={tip}
      onDoubleClick={(e) => { e.stopPropagation(); data.onConfigure(id); }}
    >
      <NodeToolbar id={id} data={data} />
      <Handle type="target" position={Position.Left} className="workflow-node__handle" />
      <div className="workflow-node__diamond-outer">
        <div className="workflow-node__diamond-rot">
          <div className="workflow-node__diamond-face">
            <div className="workflow-node__row workflow-node__row--in-diamond">
              <p className="workflow-node__title">{data.formData.label}</p>
            </div>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="workflow-node__handle" />
    </div>
  );
};
