import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../workflow/types";
import { NODE_TYPE_LABELS } from "../workflow/constants";
import { NodeTypeGlyph } from "./NodeTypeGlyph";

const DuplicateToolbarIcon: React.FC = () => (
  <svg className="workflow-node__toolbar-svg" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const TrashToolbarIcon: React.FC = () => (
  <svg className="workflow-node__toolbar-svg" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
    />
  </svg>
);

export const WorkflowNodeView: React.FC<NodeProps<WorkflowNodeData>> = ({ id, data }) => {
  const isStart = data.nodeType === "start-event";
  const isEnd = data.nodeType === "end-event";
  const isCondition = data.nodeType === "condition";
  const { formData } = data;

  const branchPreview = isCondition
    ? Object.values(formData.branchConditions ?? {})
        .map((s) => (s ?? "").trim())
        .filter(Boolean)
        .join(" · ")
    : (formData.routingCondition ?? "").trim();
  const tip = `${NODE_TYPE_LABELS[data.nodeType]} · ${formData.label}${branchPreview ? ` — ${branchPreview.slice(0, 80)}${branchPreview.length > 80 ? "…" : ""}` : ""} — double-click để sửa`;

  const toolbar = (
    <div className="workflow-node__float-toolbar nodrag nopan">
      <button
        type="button"
        className="workflow-node__toolbar-btn"
        title="Nhân bản node — tạo bản sao cạnh node này"
        onClick={(e) => {
          e.stopPropagation();
          data.onDuplicate(id);
        }}
      >
        <DuplicateToolbarIcon />
        <span className="sr-only">Nhân bản</span>
      </button>
      <button
        type="button"
        className="workflow-node__toolbar-btn"
        title="Xóa node — gỡ node và mọi kết nối"
        onClick={(e) => {
          e.stopPropagation();
          data.onDelete(id);
        }}
      >
        <TrashToolbarIcon />
        <span className="sr-only">Xóa</span>
      </button>
    </div>
  );

  const coreRow = (
    <div className={`workflow-node__row${isCondition ? " workflow-node__row--in-diamond" : ""}`}>
      {!isCondition && (
        <span className={`workflow-node__icon-wrap workflow-node__icon-wrap--${data.nodeType}`}>
          <NodeTypeGlyph nodeType={data.nodeType} />
          <span className="sr-only">{NODE_TYPE_LABELS[data.nodeType]}</span>
        </span>
      )}
      <p className="workflow-node__title">{formData.label}</p>
    </div>
  );

  if (isCondition) {
    return (
      <div
        className="workflow-node workflow-node--condition"
        title={tip}
        onDoubleClick={(e) => {
          e.stopPropagation();
          data.onConfigure(id);
        }}
      >
        {toolbar}
        {!isStart && <Handle type="target" position={Position.Left} className="workflow-node__handle" />}
        <div className="workflow-node__diamond-outer">
          <div className="workflow-node__diamond-rot">
            <div className="workflow-node__diamond-face">{coreRow}</div>
          </div>
        </div>
        {!isEnd && <Handle type="source" position={Position.Right} className="workflow-node__handle" />}
      </div>
    );
  }

  return (
    <div
      className={`workflow-node workflow-node--${data.nodeType}`}
      title={tip}
      onDoubleClick={(e) => {
        e.stopPropagation();
        data.onConfigure(id);
      }}
    >
      {toolbar}
      {!isStart && <Handle type="target" position={Position.Left} className="workflow-node__handle" />}
      {coreRow}
      {!isEnd && <Handle type="source" position={Position.Right} className="workflow-node__handle" />}
    </div>
  );
};
