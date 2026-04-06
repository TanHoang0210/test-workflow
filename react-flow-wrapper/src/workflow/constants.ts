import type { FieldType, WorkflowNodeType } from "./types";

export type FieldMeta = { type: FieldType; label: string; desc: string; icon: string };

export const PALETTE: FieldMeta[] = [
  { type: "text", label: "Text", desc: "Trường nhập văn bản ngắn, một dòng", icon: "T" },
  { type: "textarea", label: "Textarea", desc: "Trường nhập văn bản dài, nhiều dòng", icon: "¶" },
  { type: "date", label: "Date", desc: "Chọn ngày, tháng, năm cụ thể", icon: "▦" },
  { type: "select", label: "Select", desc: "Chọn một giá trị từ danh sách lựa chọn", icon: "☰" },
  { type: "radio", label: "Radio", desc: "Chọn duy nhất một trong các lựa chọn", icon: "◉" },
  { type: "checklist", label: "Checklist", desc: "Chọn một hoặc nhiều giá trị từ danh sách", icon: "☑" }
];

export const PALETTE_MAP = Object.fromEntries(PALETTE.map((p) => [p.type, p])) as Record<FieldType, FieldMeta>;

export const HAS_OPTIONS: FieldType[] = ["select", "radio", "checklist"];

export const NODE_TYPE_LABELS: Record<WorkflowNodeType, string> = {
  "start-event": "Bắt đầu",
  activity: "Hoạt động",
  condition: "Điều kiện",
  "end-event": "Kết thúc"
};

export const WORKFLOW_NODE_DRAG_MIME = "text/workflow-node-type";

export const WORKFLOW_STORAGE_KEY = "workflow-builder-state-v1";
export const WORKFLOW_PUBLIC_JSON = "/workflow-save.json";

export const SIDEBAR_NODE_ITEMS: { type: WorkflowNodeType; tooltip: string }[] = [
  {
    type: "start-event",
    tooltip: "Bắt đầu — kéo thả vào lưới để tạo node, hoặc click để thêm nhanh"
  },
  {
    type: "activity",
    tooltip: "Hoạt động — kéo thả vào lưới hoặc click để thêm nhanh"
  },
  {
    type: "condition",
    tooltip: "Điều kiện — kéo thả vào lưới hoặc click để thêm nhanh"
  },
  {
    type: "end-event",
    tooltip: "Kết thúc — kéo thả vào lưới hoặc click để thêm nhanh"
  }
];
