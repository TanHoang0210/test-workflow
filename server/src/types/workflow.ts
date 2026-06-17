import type { ExecutionStep } from '../engine/types.js';

// Mirrors the WorkflowJSON shape produced by the React builder
// (see react-flow-wrapper/src/workflow/types.ts and src/app/workflow-runner.ts)

// Mirrors FormField (react-flow-wrapper/src/workflow/types.ts) — kept loose since the
// server only needs to forward this shape to the client for rendering, not validate it.
export interface WorkflowFormField {
  id: string;
  type: string;
  label: string;
  options: Array<{ id: string; label: string }>;
  key?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  validation?: { type: string | null; pattern?: string; maxLength?: number; minLength?: number };
  defaultValue?: { source: string; value: string };
  conditionalVisibility?: { fieldKey: string; operator: string; value: string } | null;
  width?: number;
}

export interface WorkflowFormButton {
  id: string;
  type: 'submit' | 'cancel';
  label: string;
}

export interface WorkflowFormButtonsConfig {
  items: WorkflowFormButton[];
  layout: 'left' | 'center' | 'right';
}

export interface WorkflowJSON {
  version: string;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
    fields: WorkflowFormField[];
    buttons?: WorkflowFormButtonsConfig;
    branchConditions?: Record<string, string>;
    routingCondition?: string;
    configMap?: Record<string, string>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
  }>;
}

// Row stored in Supabase table `workflows`
export interface WorkflowRecord {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  definition: WorkflowJSON;
  created_at: string;
  updated_at: string;
}

export interface SaveWorkflowBody {
  id?: string;
  code?: string;
  name: string;
  description?: string;
  definition: WorkflowJSON;
}

// Row stored in Supabase table `workflow_instances` — trạng thái chạy của một quy trình đã lưu.
export interface WorkflowInstanceRecord {
  id: string;
  workflow_id: string;
  status: 'running' | 'waiting' | 'completed' | 'failed';
  current_node_id: string | null;
  pending_node_id: string | null;
  variables: Record<string, unknown>;
  steps: ExecutionStep[];
  error: string | null;
  created_at: string;
  updated_at: string;
}
