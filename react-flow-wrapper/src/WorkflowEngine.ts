import type { WorkflowAdapter, FlowContext } from './adapter/WorkflowAdapter'

export interface WorkflowEngineOptions {
  adapter: WorkflowAdapter
  initialContext?: Record<string, unknown>
  workflowId: string
  instanceId?: string
}

export class WorkflowEngine {
  private adapter: WorkflowAdapter
  private context: FlowContext

  constructor(options: WorkflowEngineOptions) {
    this.adapter = options.adapter
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
}
