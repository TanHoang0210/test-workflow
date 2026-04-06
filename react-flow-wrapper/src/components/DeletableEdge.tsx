import React from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "reactflow";
import type { EdgeData } from "../workflow/types";

export const DeletableEdge: React.FC<EdgeProps<EdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: selected ? "#2563eb" : "#94a3b8", strokeWidth: selected ? 2.5 : 1.5 }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 10
            }}
            className="nodrag nopan"
          >
            <button
              type="button"
              className="edge-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                data?.onDeleteEdge(id);
              }}
              title="Xóa kết nối"
            >
              ✕
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
