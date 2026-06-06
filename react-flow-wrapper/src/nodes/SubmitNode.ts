import type { WorkflowEngine } from '../WorkflowEngine'

export interface SubmitNodeConfig {
  confirmMessage?: string
  saveData?: boolean
  triggerEvent?: string
}

export class SubmitNode {
  async execute(_config: SubmitNodeConfig, engine: WorkflowEngine): Promise<void> {
    const ctx = engine.getContext()
    engine.clearLastError()

    try {
      // Collect all variables that represent form/user-entered data
      // (exclude internal __ prefixed vars)
      const collectedData: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(ctx.variables)) {
        if (!k.startsWith('__')) {
          collectedData[k] = v
        }
      }

      await engine.getAdapter().onSubmit(collectedData, ctx)

      engine.setVariable('submit_success', true)
      engine.setVariable('submit_timestamp', new Date().toISOString())
    } catch (err) {
      engine.setLastError(err)
      engine.setVariable('submit_success', false)
      throw err
    }
  }
}
