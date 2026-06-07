import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import type { ExecutionStep } from '../engine/types.js';
import { WorkflowInstanceEngine } from '../engine/WorkflowInstanceEngine.js';
import type { WorkflowInstanceRecord } from '../types/workflow.js';
import { isWorkflowJSON } from './workflows.js';

export const instancesRouter = Router();

const INSTANCES_TABLE = 'workflow_instances';
const WORKFLOWS_TABLE = 'workflows';

// GET /api/instances/:instanceId — xem trạng thái hiện tại của một instance
instancesRouter.get('/:instanceId', async (req, res) => {
  const { data, error } = await supabase
    .from(INSTANCES_TABLE)
    .select('*')
    .eq('id', req.params.instanceId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Instance not found' });
  res.json({ instance: data as WorkflowInstanceRecord });
});

// POST /api/instances/:instanceId/next — gửi dữ liệu người dùng vừa nhập (biểu mẫu / tệp đính
// kèm / chữ ký) để chạy tiếp instance đang ở trạng thái "waiting" cho tới khi gặp điểm dừng
// kế tiếp hoặc hoàn tất.
instancesRouter.post('/:instanceId/next', async (req, res) => {
  const { data: instance, error: fetchError } = await supabase
    .from(INSTANCES_TABLE)
    .select('*')
    .eq('id', req.params.instanceId)
    .maybeSingle();

  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!instance) return res.status(404).json({ error: 'Instance not found' });

  const record = instance as WorkflowInstanceRecord;
  if (record.status !== 'waiting' || !record.pending_node_id) {
    return res.status(409).json({ error: `Instance không ở trạng thái chờ (status hiện tại: "${record.status}")` });
  }

  const body = req.body as { variables?: Record<string, unknown> } | undefined;
  const submittedVariables = body?.variables && typeof body.variables === 'object' ? body.variables : {};
  const mergedVariables = { ...record.variables, ...submittedVariables };

  const { data: workflow, error: workflowError } = await supabase
    .from(WORKFLOWS_TABLE)
    .select('id, definition')
    .eq('id', record.workflow_id)
    .maybeSingle();

  if (workflowError) return res.status(500).json({ error: workflowError.message });
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  if (!isWorkflowJSON(workflow.definition)) {
    return res.status(422).json({ error: 'Stored workflow definition is invalid (missing nodes[] / edges[])' });
  }

  const engine = new WorkflowInstanceEngine(workflow.definition, {
    currentNodeId: record.pending_node_id,
    variables: mergedVariables,
  });
  const result = engine.run();

  const combinedSteps: ExecutionStep[] = [...record.steps, ...result.steps];

  const { data: updated, error: updateError } = await supabase
    .from(INSTANCES_TABLE)
    .update({
      status: result.status,
      current_node_id: result.currentNodeId,
      pending_node_id: result.pendingNodeId,
      variables: result.variables,
      steps: combinedSteps,
      error: result.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', record.id)
    .select('*')
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });
  res.json({ instance: updated as WorkflowInstanceRecord });
});
