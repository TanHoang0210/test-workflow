import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import type { SaveWorkflowBody, WorkflowJSON } from '../types/workflow.js';
import { WorkflowExecutor } from '../engine/WorkflowExecutor.js';

export const workflowsRouter = Router();

const TABLE = 'workflows';

function isWorkflowJSON(value: unknown): value is WorkflowJSON {
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

// DELETE /api/workflows/:id
workflowsRouter.delete('/:id', async (req, res) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});
