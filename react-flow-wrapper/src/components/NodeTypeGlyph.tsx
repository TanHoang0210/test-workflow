import React from "react";
import type { WorkflowNodeType } from "../workflow/types";

type GlyphProps = { nodeType: WorkflowNodeType; className?: string };

export const NodeTypeGlyph: React.FC<GlyphProps> = ({ nodeType, className }) => {
  const cls = className ?? "workflow-node__glyph";
  switch (nodeType) {
    case "start-event":
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M10.2 8.4v7.2L15.8 12 10.2 8.4z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "end-event":
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <rect x="5.5" y="5.5" width="13" height="13" rx="2.5" fill="currentColor" stroke="none" opacity={0.95} />
        </svg>
      );
    case "condition":
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2.5l8.5 9.5L12 21.5 3.5 12 12 2.5z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity={0.92}
          />
        </svg>
      );
    case "activity":
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 4.5L19 12l-7 7.5-7-7.5L12 4.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};
