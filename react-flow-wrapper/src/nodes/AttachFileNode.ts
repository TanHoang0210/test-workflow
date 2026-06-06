import type { WorkflowEngine } from '../WorkflowEngine'

export interface AttachFileNodeConfig {
  nodeId: string
  allowedTypes?: string[]
  maxSizeMB?: number
  multiple?: boolean
  storageTarget?: string
}

export class AttachFileNode {
  async execute(
    config: AttachFileNodeConfig,
    file: File,
    engine: WorkflowEngine
  ): Promise<void> {
    const ctx = engine.getContext()
    engine.clearLastError()

    try {
      const result = await engine.getAdapter().uploadFile(
        file,
        {
          nodeId: config.nodeId,
          workflowId: ctx.workflowId,
          allowedTypes: config.allowedTypes,
          maxSizeMB: config.maxSizeMB,
        },
        ctx
      )

      engine.setVariable('attached_file_url', result.url)
      engine.setVariable('attached_file_id', result.fileId)
      engine.setVariable('attached_file_name', result.name)
      engine.setVariable('attached_file_size', result.sizeBytes)
      engine.setVariable('attached_file_mime', result.mimeType)
      engine.setVariable('attached_file_result', result)
    } catch (err) {
      engine.setLastError(err)
      throw err
    }
  }
}
