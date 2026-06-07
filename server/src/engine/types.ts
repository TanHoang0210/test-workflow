export interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: 'ok' | 'skipped' | 'error';
  message: string;
  timestamp: string;
}

export interface ExecutionResult {
  instanceId: string;
  status: 'completed' | 'failed';
  steps: ExecutionStep[];
  variables: Record<string, unknown>;
  error?: string;
}
