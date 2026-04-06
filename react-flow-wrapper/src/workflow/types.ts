import type { XYPosition } from "reactflow";

export type FieldType = "text" | "textarea" | "date" | "select" | "radio" | "checklist";

export type FieldOption = { id: string; label: string };

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  options: FieldOption[];
};

/** Thuộc tính mở rộng trên node: tên hiển thị + key + giá trị (xuất trong JSON workflow). */
export type NodeConfigProperty = {
  id: string;
  /** Tên trường (nhãn hiển thị cho key) */
  displayName: string;
  /** Key kỹ thuật */
  key: string;
  value: string;
};

export type NodeFormData = {
  label: string;
  branchConditions: Record<string, string>;
  routingCondition?: string;
  fields: FormField[];
  configProperties: NodeConfigProperty[];
};

export type WorkflowNodeType = "start-event" | "activity" | "condition" | "end-event";

export type WorkflowNodeData = {
  nodeType: WorkflowNodeType;
  formData: NodeFormData;
  onConfigure: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
};

export type ModalState = {
  isOpen: boolean;
  nodeId: string | null;
  nodeType: WorkflowNodeType | null;
  form: NodeFormData;
};

export type EdgeData = {
  onDeleteEdge: (edgeId: string) => void;
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
