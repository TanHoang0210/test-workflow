import type { WorkflowEngine } from '../WorkflowEngine'

export interface HistoryLogNodeConfig {
  logLevel: 'info' | 'debug' | 'error'
  includeFields?: string[]
  retentionDays?: number
  exportable?: boolean
}

// Internal log entry kept for UI display regardless of adapter
export interface LogEntry {
  timestamp: string
  level: 'info' | 'debug' | 'error'
  nodeId: string
  event: string
  snapshot: Record<string, unknown>
}

const internalLog: LogEntry[] = []

export function getInternalLog(): ReadonlyArray<LogEntry> {
  return internalLog
}

export function clearInternalLog(): void {
  internalLog.length = 0
}

export class HistoryLogNode {
  async execute(config: HistoryLogNodeConfig, engine: WorkflowEngine): Promise<void> {
    const ctx = engine.getContext()

    // Build snapshot — only include specified fields or all non-__ vars
    const snapshot: Record<string, unknown> = {}
    const fields = config.includeFields ?? []
    for (const [k, v] of Object.entries(ctx.variables)) {
      if (k.startsWith('__')) continue
      if (fields.length === 0 || fields.includes(k)) {
        snapshot[k] = v
      }
    }

    const event = JSON.stringify({ node: ctx.currentNodeId, vars: snapshot })

    // Always write to internal log for UI
    internalLog.push({
      timestamp: new Date().toISOString(),
      level: config.logLevel,
      nodeId: ctx.currentNodeId,
      event,
      snapshot,
    })

    // Optionally delegate to host app adapter
    if (engine.getAdapter().writeLog) {
      try {
        await engine.getAdapter().writeLog!(config.logLevel, event, ctx)
      } catch {
        // writeLog failure is non-fatal — internal log already captured
      }
    }
  }
}
