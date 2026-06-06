import type { WorkflowEngine } from '../WorkflowEngine'
import type { RecordFilter } from '../adapter/WorkflowAdapter'
import { resolveTemplate } from '../utils/resolveTemplate'

export interface FindRecordsNodeConfig {
  source: string
  filters: Array<{
    field: string
    operator: RecordFilter['operator']
    value?: string
  }>
  fields: string[]
  limit: number
  outputVar: string
}

export class FindRecordsNode {
  async execute(config: FindRecordsNodeConfig, engine: WorkflowEngine): Promise<void> {
    const ctx = engine.getContext()
    engine.clearLastError()

    try {
      // Resolve template vars in filter values
      const resolvedFilters: RecordFilter[] = config.filters.map(f => ({
        field: f.field,
        operator: f.operator,
        value: typeof f.value === 'string'
          ? resolveTemplate(f.value, ctx.variables)
          : f.value,
      }))

      const records = await engine.getAdapter().queryRecords(
        config.source,
        resolvedFilters,
        config.fields,
        config.limit,
        ctx
      )

      const outputVar = config.outputVar || 'records'
      engine.setVariable(outputVar, records)
      engine.setVariable(`${outputVar}_count`, records.length)
    } catch (err) {
      engine.setLastError(err)
      throw err
    }
  }
}
