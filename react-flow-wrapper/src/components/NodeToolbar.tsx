import React from "react";
import type { WorkflowNodeData } from "../workflow/types";

const DuplicateIcon: React.FC = () => (
  <svg className="workflow-node__toolbar-svg" viewBox="0 0 24 24" aria-hidden>
    <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg className="workflow-node__toolbar-svg" viewBox="0 0 24 24" aria-hidden>
    <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
  </svg>
);

type Props = { id: string; data: WorkflowNodeData };

export const NodeToolbar: React.FC<Props> = ({ id, data }) => (
  <div className="workflow-node__float-toolbar nodrag nopan">
    <button
      type="button"
      className="workflow-node__toolbar-btn"
      title="Nhân bản node — tạo bản sao cạnh node này"
      onClick={(e) => { e.stopPropagation(); data.onDuplicate(id); }}
    >
      <DuplicateIcon />
      <span className="sr-only">Nhân bản</span>
    </button>
    <button
      type="button"
      className="workflow-node__toolbar-btn"
      title="Xóa node — gỡ node và mọi kết nối"
      onClick={(e) => { e.stopPropagation(); data.onDelete(id); }}
    >
      <TrashIcon />
      <span className="sr-only">Xóa</span>
    </button>
  </div>
);
