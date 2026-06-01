import React from "react";
import type { WorkflowNodeType } from "../workflow/types";
import { NODE_TYPE_LABELS, SIDEBAR_NODE_ITEMS, WORKFLOW_NODE_DRAG_MIME } from "../workflow/constants";
import { NodeTypeGlyph } from "./NodeTypeGlyph";

export type WorkflowSidebarProps = {
  onAddNode: (type: WorkflowNodeType) => void;
};

export const WorkflowSidebar: React.FC<WorkflowSidebarProps> = ({ onAddNode }) => (
  <aside className="flow-sidebar">
    {SIDEBAR_NODE_ITEMS.map((item) => (
      <button
        key={item.type}
        type="button"
        className={`flow-sidebar__item flow-sidebar__item--${item.type} nodrag nopan`}
        title={item.tooltip}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(WORKFLOW_NODE_DRAG_MIME, item.type);
          e.dataTransfer.setData("text/plain", item.type);
          e.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() => onAddNode(item.type)}
      >
        <div className="flow-sidebar__item-icon">
          <NodeTypeGlyph nodeType={item.type} className="flow-sidebar__glyph" />
        </div>
        <span className="flow-sidebar__item-label">{NODE_TYPE_LABELS[item.type]}</span>
      </button>
    ))}
  </aside>
);
