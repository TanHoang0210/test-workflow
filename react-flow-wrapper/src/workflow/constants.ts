import type { FieldType, WorkflowNodeType } from "./types";

export type FieldCategory = "basic" | "selection" | "advanced";
export type FieldMeta = { type: FieldType; label: string; desc: string; icon: string; category: FieldCategory };

export const PALETTE: FieldMeta[] = [
  { type: "text",        label: "Text",        desc: "Văn bản ngắn, một dòng",        icon: "isax-text",           category: "basic" },
  { type: "textarea",    label: "Textarea",     desc: "Văn bản dài, nhiều dòng",       icon: "isax-document-text",  category: "basic" },
  { type: "date",        label: "Date",         desc: "Chọn ngày, tháng, năm",         icon: "isax-calendar",       category: "basic" },
  { type: "number",      label: "Number",       desc: "Nhập số nguyên hoặc thập phân", icon: "isax-hashtag",        category: "basic" },
  { type: "select",      label: "Select",       desc: "Dropdown chọn một giá trị",     icon: "isax-arrow-down",     category: "selection" },
  { type: "radio",       label: "Radio",        desc: "Chọn duy nhất một lựa chọn",    icon: "isax-menu1",          category: "selection" },
  { type: "checklist",   label: "Checklist",    desc: "Chọn một hoặc nhiều giá trị",   icon: "isax-tick-square",    category: "selection" },
  { type: "file-upload", label: "File Upload",  desc: "Đính kèm tệp / tải lên",        icon: "isax-document-upload",category: "advanced" },
  { type: "rating",      label: "Rating",       desc: "Đánh giá sao (1–5)",            icon: "isax-star",           category: "advanced" },
];

export const PALETTE_MAP = Object.fromEntries(PALETTE.map((p) => [p.type, p])) as Record<FieldType, FieldMeta>;

export const HAS_OPTIONS: FieldType[] = ["select", "radio", "checklist"];

export const PALETTE_CATEGORIES: { id: FieldCategory; label: string }[] = [
  { id: "basic",     label: "Basic" },
  { id: "selection", label: "Selection" },
  { id: "advanced",  label: "Advanced" },
];

export const NODE_TYPE_LABELS: Record<WorkflowNodeType, string> = {
  "start-event": "Start",
  "end-event": "End",
  activity: "Task",
  form: "Form",
  notification: "Notification",
  condition: "Condition",
  redirect: "Redirect",
  "alert-error": "Alert_Error",
  "create-keyword": "Create_Keyword",
  "attach-file": "Attach file",
  submit: "Submit",
  "view-sign": "View and sign",
  "history-log": "History log",
  "find-records": "Find_Records",
  switch: "Switch",
};

export const WORKFLOW_NODE_DRAG_MIME = "text/workflow-node-type";

export const WORKFLOW_STORAGE_KEY = "workflow-builder-state-v1";
export const WORKFLOW_PUBLIC_JSON = "/workflow-save.json";

export const SIDEBAR_NODE_ITEMS: { type: WorkflowNodeType; tooltip: string }[] = [
  { type: "start-event",    tooltip: "Điểm bắt đầu của workflow — mỗi luồng chỉ có một" },
  { type: "end-event",      tooltip: "Điểm kết thúc của workflow — đánh dấu hoàn thành" },
  { type: "form",           tooltip: "Thu thập dữ liệu từ người dùng qua biểu mẫu" },
  { type: "notification",   tooltip: "Gửi thông báo đến người dùng hoặc nhóm" },
  { type: "condition",      tooltip: "Phân nhánh luồng theo điều kiện True/False" },
  { type: "redirect",       tooltip: "Chuyển hướng sang node hoặc workflow khác" },
  { type: "alert-error",    tooltip: "Xử lý lỗi và hiển thị cảnh báo" },
  { type: "create-keyword", tooltip: "Tạo hoặc gán từ khóa cho đối tượng" },
  { type: "attach-file",    tooltip: "Đính kèm tệp vào workflow" },
  { type: "submit",         tooltip: "Xác nhận và gửi dữ liệu đã thu thập" },
  { type: "view-sign",      tooltip: "Xem và ký số tài liệu" },
  { type: "history-log",    tooltip: "Ghi lại lịch sử hành động trong workflow" },
  { type: "find-records",   tooltip: "Tìm kiếm và truy vấn dữ liệu" },
  { type: "switch",         tooltip: "Phân nhánh theo nhiều trường hợp (switch-case)" },
];
