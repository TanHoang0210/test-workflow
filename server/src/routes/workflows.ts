import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import type { SaveWorkflowBody, WorkflowInstanceRecord, WorkflowJSON } from '../types/workflow.js';
import { WorkflowExecutor } from '../engine/WorkflowExecutor.js';
import { WorkflowInstanceEngine } from '../engine/WorkflowInstanceEngine.js';

export const workflowsRouter = Router();

const TABLE = 'workflows';
const INSTANCES_TABLE = 'workflow_instances';

export function isWorkflowJSON(value: unknown): value is WorkflowJSON {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v['nodes']) && Array.isArray(v['edges']);
}

// GET /api/workflows — list all saved workflows (without full definition for a lighter payload)
workflowsRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, code, name, description, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ workflows: data });
});

// GET /api/workflows/:id — fetch one workflow including its full definition
workflowsRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Workflow not found' });
  res.json({ workflow: data });
});

// POST /api/workflows — create or update (upsert by id when provided)
workflowsRouter.post('/', async (req, res) => {
  const body = req.body as Partial<SaveWorkflowBody>;

  if (!body.name || typeof body.name !== 'string') {
    return res.status(400).json({ error: '"name" is required' });
  }
  if (!isWorkflowJSON(body.definition)) {
    return res.status(400).json({ error: '"definition" must contain nodes[] and edges[]' });
  }

  const row = {
    ...(body.id ? { id: body.id } : {}),
    code: body.code?.trim() || null,
    name: body.name,
    description: body.description ?? null,
    definition: body.definition,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: `Mã quy trình "${row.code}" đã tồn tại` });
    }
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json({ workflow: data });
});

// POST /api/workflows/:id/run — execute a saved workflow (server-side dry run)
workflowsRouter.post('/:id/run', async (req, res) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, definition')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Workflow not found' });
  if (!isWorkflowJSON(data.definition)) {
    return res.status(422).json({ error: 'Stored workflow definition is invalid (missing nodes[] / edges[])' });
  }

  const body = req.body as { variables?: Record<string, unknown> } | undefined;
  const initialVariables = body?.variables && typeof body.variables === 'object' ? body.variables : undefined;

  const executor = new WorkflowExecutor(data.definition, { initialVariables });
  const result = await executor.run();

  res.json({ workflowId: data.id, workflowName: data.name, result });
});

// POST /api/workflows/:id/start — tạo một instance mới và chạy tới khi gặp node cần
// thao tác từ người dùng (form / đính kèm tệp / ký) hoặc hoàn tất.
workflowsRouter.post('/:id/start', async (req, res) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, definition')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Workflow not found' });
  if (!isWorkflowJSON(data.definition)) {
    return res.status(422).json({ error: 'Stored workflow definition is invalid (missing nodes[] / edges[])' });
  }

  const body = req.body as { variables?: Record<string, unknown> } | undefined;
  const initialVariables = body?.variables && typeof body.variables === 'object' ? body.variables : {};

  const engine = new WorkflowInstanceEngine(data.definition, { currentNodeId: null, variables: initialVariables });
  const result = engine.run();

  const row = {
    workflow_id: data.id,
    status: result.status,
    current_node_id: result.currentNodeId,
    pending_node_id: result.pendingNodeId,
    variables: result.variables,
    steps: result.steps,
    error: result.error ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: instance, error: insertError } = await supabase
    .from(INSTANCES_TABLE)
    .insert(row)
    .select('*')
    .single();

  if (insertError) return res.status(500).json({ error: insertError.message });
  res.status(201).json({ instance: instance as WorkflowInstanceRecord });
});

// GET /api/workflows/:id/instances — danh sách instance của một quy trình (lịch sử chạy)
workflowsRouter.get('/:id/instances', async (req, res) => {
  const { data, error } = await supabase
    .from(INSTANCES_TABLE)
    .select('id, status, current_node_id, pending_node_id, created_at, updated_at')
    .eq('workflow_id', req.params.id)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ instances: data });
});

// DELETE /api/workflows/:id
workflowsRouter.delete('/:id', async (req, res) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});
