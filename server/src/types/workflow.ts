import type { ExecutionStep } from '../engine/types.js';

// Mirrors the WorkflowJSON shape produced by the React builder
// (see react-flow-wrapper/src/workflow/types.ts and src/app/workflow-runner.ts)

export interface WorkflowJSON {
  version: string;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
    fields: unknown[];
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
