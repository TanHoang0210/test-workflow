import type { WorkflowEngine } from '../WorkflowEngine'
import type { FlowContext } from '../adapter/WorkflowAdapter'
import { resolveTemplate } from '../utils/resolveTemplate'

// ─── Config ─────────────────────────────────────────────────────────────────

export interface RedirectParam {
  key: string
  /** How to resolve `value`:
   *  flow_var   → resolveTemplate("{{value}}", variables)
   *  fixed      → use value as-is
   *  expression → resolveTemplate first, then basic arithmetic / type coercion
   */
  source: 'flow_var' | 'fixed' | 'expression'
  value: string
}

export interface RedirectNodeConfig {
  mode: 'node' | 'workflow'

  // mode = "node"
  targetNodeId?: string
  /** Max allowed redirects to the same node before throwing. Default: 3 */
  maxRedirectCount?: number

  // mode = "workflow"
  targetWorkflowId?: string
  /** Copy all current variables into the new instance before applying params. Default: false */
  inheritContext?: boolean
  params?: RedirectParam[]
  /** Keep current instance in 'waiting_child' instead of 'redirected'. Default: false */
  waitForCompletion?: boolean
}

// ─── Result types ────────────────────────────────────────────────────────────

export interface NodeJumpResult {
  type: 'node_jump'
  nextNodeId: string
}

export interface WorkflowHandoffResult {
  type: 'workflow_handoff'
  newInstanceId: string
  currentInstanceStatus: 'waiting_child' | 'redirected'
}

export type RedirectResult = NodeJumpResult | WorkflowHandoffResult

// ─── Node ────────────────────────────────────────────────────────────────────

export class RedirectNode {
  async execute(config: RedirectNodeConfig, engine: WorkflowEngine): Promise<RedirectResult> {
    const ctx = engine.getContext()

    if (config.mode === 'node') {
      return this.executeNodeMode(config, engine, ctx)
    }
    return this.executeWorkflowMode(config, engine, ctx)
  }

  // ── MODE "node" ────────────────────────────────────────────────────────────

  private async executeNodeMode(
    config: RedirectNodeConfig,
    engine: WorkflowEngine,
    ctx: FlowContext,
  ): Promise<NodeJumpResult> {
    const { targetNodeId, maxRedirectCount = 3 } = config

    if (!targetNodeId) {
      throw new Error('[RedirectNode] mode=node requires targetNodeId')
    }

    // Validate target exists in current workflow
    const definition = engine.getDefinition()
    if (!definition.nodes.some(n => n.id === targetNodeId)) {
      throw new Error(
        `[RedirectNode] targetNodeId "${targetNodeId}" does not exist in workflow "${ctx.workflowId}"`,
      )
    }

    // Guard against redirect loops
    const countKey = `__redirect_count_${ctx.currentNodeId}`
    const currentCount = (ctx.variables[countKey] as number | undefined) ?? 0

    if (currentCount >= maxRedirectCount) {
      throw new Error(
        `[RedirectNode] Redirect loop detected on node "${ctx.currentNodeId}": ` +
        `redirect count ${currentCount} has reached maxRedirectCount ${maxRedirectCount}`,
      )
    }

    engine.setVariable(countKey, currentCount + 1)

    const adapter = engine.getAdapter()
    if (adapter.writeLog) {
      await adapter.writeLog(
        'info',
        JSON.stringify({
          event: 'redirect_node',
          from: ctx.currentNodeId,
          to: targetNodeId,
          redirectCount: currentCount + 1,
        }),
        ctx,
      )
    }

    return { type: 'node_jump', nextNodeId: targetNodeId }
  }

  // ── MODE "workflow" ────────────────────────────────────────────────────────

  private async executeWorkflowMode(
    config: RedirectNodeConfig,
    engine: WorkflowEngine,
    ctx: FlowContext,
  ): Promise<WorkflowHandoffResult> {
    const {
      targetWorkflowId,
      inheritContext = false,
      params = [],
      waitForCompletion = false,
    } = config

    if (!targetWorkflowId) {
      throw new Error('[RedirectNode] mode=workflow requires targetWorkflowId')
    }

    // Build initialVars: inherit current context first (if requested), then overlay params
    const initialVars: Record<string, unknown> = inheritContext
      ? { ...ctx.variables }
      : {}

    for (const param of params) {
      initialVars[param.key] = resolveParam(param, ctx.variables)
    }

    // Always inject provenance metadata
    initialVars['__redirect_from_instance'] = ctx.instanceId
    initialVars['__redirect_from_workflow'] = ctx.workflowId

    // Start the new workflow instance
    const { instanceId: newInstanceId } = await engine.trigger({
      definitionId: targetWorkflowId,
      initialVars,
    })

    // Update current instance state so the runner knows to stop
    engine.updateInstance({ status: waitForCompletion ? 'waiting_child' : 'redirected' })
    engine.setVariable('__child_instance_id', newInstanceId)

    const adapter = engine.getAdapter()
    if (adapter.writeLog) {
      await adapter.writeLog(
        'info',
        JSON.stringify({
          event: 'redirect_workflow',
          to: targetWorkflowId,
          newInstanceId,
          waitForCompletion,
        }),
        ctx,
      )
    }

    return {
      type: 'workflow_handoff',
      newInstanceId,
      currentInstanceStatus: waitForCompletion ? 'waiting_child' : 'redirected',
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveParam(param: RedirectParam, variables: Record<string, unknown>): unknown {
  switch (param.source) {
    case 'flow_var':
      return resolveTemplate(`{{${param.value}}}`, variables)

    case 'fixed':
      return param.value

    case 'expression': {
      const resolved = resolveTemplate(param.value, variables)
      return evaluateBasicExpression(resolved)
    }
  }
}

/**
 * Safe evaluator — no eval(). Handles:
 *   • boolean literals  (true / false)
 *   • null literal
 *   • numeric literals  (integer and float)
 *   • single binary arithmetic op on two numeric literals  (a +|-|*|/ b)
 *   • anything else returned as trimmed string
 */
function evaluateBasicExpression(expr: string): unknown {
  const s = expr.trim()

  if (s === 'true') return true
  if (s === 'false') return false
  if (s === 'null') return null

  const num = Number(s)
  if (s !== '' && !isNaN(num)) return num

  // Single binary op: <number> <op> <number>
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)$/)
  if (m) {
    const a = parseFloat(m[1])
    const op = m[2]
    const b = parseFloat(m[3])
    if (op === '+') return a + b
    if (op === '-') return a - b
    if (op === '*') return a * b
    if (op === '/') return b !== 0 ? a / b : null
  }

  return s
}
