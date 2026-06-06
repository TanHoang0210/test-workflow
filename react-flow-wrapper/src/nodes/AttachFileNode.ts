import type { WorkflowEngine } from '../WorkflowEngine'

export interface AttachFileNodeConfig {
  nodeId: string
  outputVar?: string       // base name, e.g. "contract_file" → generates sub-vars
  allowedTypes?: string[]  // MIME types or extensions
  maxSizeMB?: number
  multiple?: boolean
  required?: boolean
  allowDelete?: boolean
  storageTarget?: string
}

export class AttachFileNode {
  async execute(
    config: AttachFileNodeConfig,
    file: File | File[],
    engine: WorkflowEngine
  ): Promise<void> {
    const ctx = engine.getContext()
    const base = config.outputVar ?? 'attached_file'
    engine.clearLastError()

    try {
      const files = Array.isArray(file) ? file : [file]

      if (config.multiple && files.length > 1) {
        // Upload all files, collect results
        const results = await Promise.all(
          files.map((f) =>
            engine.getAdapter().uploadFile(
              f,
              {
                nodeId: config.nodeId,
                workflowId: ctx.workflowId,
                allowedTypes: config.allowedTypes,
                maxSizeMB: config.maxSizeMB,
              },
              ctx
            )
          )
        )

        // Primary (first file) individual vars
        const first = results[0]
        engine.setVariable(`${base}_url`,  first.url)
        engine.setVariable(`${base}_id`,   first.fileId)
        engine.setVariable(`${base}_name`, first.name)
        engine.setVariable(`${base}_size`, first.sizeBytes)
        engine.setVariable(`${base}_mime`, first.mimeType)

        // Multiple: array vars for downstream nodes
        engine.setVariable(`${base}_urls`,  results.map((r) => r.url))
        engine.setVariable(`${base}_ids`,   results.map((r) => r.fileId))
        engine.setVariable(`${base}_names`, results.map((r) => r.name))
        engine.setVariable(`${base}_results`, results)
      } else {
        const result = await engine.getAdapter().uploadFile(
          files[0],
          {
            nodeId: config.nodeId,
            workflowId: ctx.workflowId,
            allowedTypes: config.allowedTypes,
            maxSizeMB: config.maxSizeMB,
          },
          ctx
        )

        engine.setVariable(`${base}_url`,    result.url)
        engine.setVariable(`${base}_id`,     result.fileId)
        engine.setVariable(`${base}_name`,   result.name)
        engine.setVariable(`${base}_size`,   result.sizeBytes)
        engine.setVariable(`${base}_mime`,   result.mimeType)
        engine.setVariable(`${base}_result`, result)
      }
    } catch (err) {
      engine.setLastError(err)
      throw err
    }
  }
}
