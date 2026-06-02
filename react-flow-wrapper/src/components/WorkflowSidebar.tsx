import React from "react";
import type { WorkflowNodeType } from "../workflow/types";
import { NODE_TYPE_LABELS, SIDEBAR_NODE_ITEMS, WORKFLOW_NODE_DRAG_MIME } from "../workflow/constants";
import { NodeTypeGlyph } from "./NodeTypeGlyph";

export type WorkflowSidebarProps = {
  onAddNode: (type: WorkflowNodeType) => void;
};

export const WorkflowSidebar: React.FC<WorkflowSidebarProps> = ({ onAddNode }) => {
  const [search, setSearch] = React.useState("");

  const filtered = SIDEBAR_NODE_ITEMS.filter((item) =>
    NODE_TYPE_LABELS[item.type].toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="flow-sidebar">
      <div className="flow-sidebar__header">Nodes</div>

      <div className="flow-sidebar__search-wrap">
        <input
          className="flow-sidebar__search"
          type="text"
          placeholder="Tìm kiếm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <svg className="flow-sidebar__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <div className="flow-sidebar__list">
        {filtered.map((item) => (
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
      </div>
    </aside>
  );
};
