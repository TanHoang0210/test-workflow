import type { XYPosition } from "reactflow";

export type FieldType =
  | "text" | "textarea" | "date"
  | "select" | "radio" | "checklist"
  | "number" | "file-upload" | "rating";

export type FieldOption = { id: string; label: string };

export type FieldValidation = {
  type: "email" | "phone" | "regex" | "length" | null;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
};

export type FieldDefaultValue = {
  source: "fixed" | "variable" | "previous";
  value: string;
};

export type FieldConditionalVisibility = {
  fieldKey: string;
  operator: "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";
  value: string;
};

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  options: FieldOption[];
  // Extended (optional, backward compat)
  key?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  validation?: FieldValidation;
  defaultValue?: FieldDefaultValue;
  conditionalVisibility?: FieldConditionalVisibility | null;
  /** Độ rộng hiển thị của trường, tính theo % chiều ngang form (25 | 33 | 50 | 66 | 75 | 100) */
  width?: number;
};

export type FormButtonType = "submit" | "cancel";

export type FormButton = {
  id: string;
  type: FormButtonType;
  label: string;
};

export type FormButtonsLayout = "left" | "center" | "right";

export type FormButtonsConfig = {
  items: FormButton[];
  layout: FormButtonsLayout;
};

export type ConfigPropertySource = "fixed" | "variable" | "previous" | "expression";

/** Thuộc tính mở rộng trên node: tên hiển thị + key + giá trị (xuất trong JSON workflow). */
export type NodeConfigProperty = {
  id: string;
  /** Tên trường (nhãn hiển thị cho key) */
  displayName: string;
  /** Key kỹ thuật */
  key: string;
  value: string;
  source?: ConfigPropertySource;
};

export type NodeFormData = {
  label: string;
  branchConditions: Record<string, string>;
  routingCondition?: string;
  fields: FormField[];
  configProperties: NodeConfigProperty[];
  buttons?: FormButtonsConfig;
};

export type WorkflowNodeType =
  | "start-event"
  | "end-event"
  | "activity"
  | "form"
  | "notification"
  | "condition"
  | "redirect"
  | "alert-error"
  | "create-keyword"
  | "attach-file"
  | "submit"
  | "view-sign"
  | "history-log"
  | "find-records"
  | "switch";

export type WorkflowNodeData = {
  nodeType: WorkflowNodeType;
  formData: NodeFormData;
  onConfigure: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  isAnimating?: boolean;
};

export type ModalState = {
  isOpen: boolean;
  nodeId: string | null;
  nodeType: WorkflowNodeType | null;
  form: NodeFormData;
};

export type EdgeData = {
  onDeleteEdge: (edgeId: string) => void;
  color?: string;
};

export type WorkflowPersistPayloadV1 = {
  version: "1.0";
  savedAt?: string;
  nodes: Array<{
    id: string;
    type: string;
    position: XYPosition;
    label: string;
    routingCondition?: string;
    branchConditions?: Record<string, string>;
    fields: FormField[];
    buttons?: FormButtonsConfig;
    configProperties?: Array<{
      id?: string;
      displayName?: string;
      key?: string;
      value?: string;
    }>;
    /** Gộp từ configProperties: { [key]: value } (key rỗng bị bỏ) */
    configMap?: Record<string, string>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }>;
};
