import type { WorkflowAdapter, FlowContext } from './adapter/WorkflowAdapter'

export interface WorkflowDefinition {
  version: string
  nodes: Array<{
    id: string
    type: string
    label?: string
    configMap?: Record<string, string>
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string | null
  }>
}

export interface TriggerOptions {
  definitionId: string
  initialVars?: Record<string, unknown>
}

export interface TriggerResult {
  instanceId: string
}

export interface WorkflowEngineOptions {
  adapter: WorkflowAdapter
  initialContext?: Record<string, unknown>
  workflowId: string
  instanceId?: string
  definition?: WorkflowDefinition
  onTrigger?: (options: TriggerOptions) => Promise<TriggerResult>
}

export class WorkflowEngine {
  private adapter: WorkflowAdapter
  private context: FlowContext
  private definition?: WorkflowDefinition
  private onTriggerFn?: (options: TriggerOptions) => Promise<TriggerResult>
  private instanceStatus: string = 'running'

  constructor(options: WorkflowEngineOptions) {
    this.adapter = options.adapter
    this.definition = options.definition
    this.onTriggerFn = options.onTrigger
    this.context = {
      workflowId: options.workflowId,
      instanceId: options.instanceId ?? crypto.randomUUID(),
      currentNodeId: '',
      variables: options.initialContext ?? {},
    }
  }

  getAdapter(): WorkflowAdapter {
    return this.adapter
  }

  getContext(): FlowContext {
    return { ...this.context }
  }

  setCurrentNode(nodeId: string): void {
    this.context.currentNodeId = nodeId
  }

  setVariable(key: string, value: unknown): void {
    this.context.variables[key] = value
  }

  getVariable(key: string): unknown {
    return this.context.variables[key]
  }

  setLastError(error: unknown): void {
    this.context.variables['__last_error'] =
      error instanceof Error ? error.message : String(error)
  }

  clearLastError(): void {
    delete this.context.variables['__last_error']
  }

  getDefinition(): WorkflowDefinition {
    if (!this.definition) {
      throw new Error('[WorkflowEngine] No workflow definition provided — pass definition in options')
    }
    return this.definition
  }

  async trigger(options: TriggerOptions): Promise<TriggerResult> {
    if (!this.onTriggerFn) {
      throw new Error(
        '[WorkflowEngine] trigger() requires onTrigger callback in options — ' +
        'provide it when constructing WorkflowEngine for cross-workflow redirects',
      )
    }
    return this.onTriggerFn(options)
  }

  updateInstance(updates: { status?: string }): void {
    if (updates.status !== undefined) {
      this.instanceStatus = updates.status
    }
  }

  getInstanceStatus(): string {
    return this.instanceStatus
  }
}
