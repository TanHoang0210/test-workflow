// Public API — host app imports from here
export { WorkflowEngine } from './WorkflowEngine'
export type { WorkflowEngineOptions, WorkflowDefinition, TriggerOptions, TriggerResult } from './WorkflowEngine'

export type {
  WorkflowAdapter,
  FlowContext,
  UserOption,
  UploadMeta,
  FileResult,
  NotifPayload,
  SendResult,
  RecordFilter,
  RecordItem,
} from './adapter/WorkflowAdapter'

export { MockAdapter } from './adapter/MockAdapter'

export { NotificationNode } from './nodes/NotificationNode'
export { AttachFileNode }   from './nodes/AttachFileNode'
export { FindRecordsNode }  from './nodes/FindRecordsNode'
export { SubmitNode }       from './nodes/SubmitNode'
export { HistoryLogNode, getInternalLog, clearInternalLog } from './nodes/HistoryLogNode'
export { RedirectNode } from './nodes/RedirectNode'
export type { RedirectNodeConfig, RedirectParam, RedirectResult, NodeJumpResult, WorkflowHandoffResult } from './nodes/RedirectNode'

export { resolveTemplate, resolveRecipients, extractTemplateVars } from './utils/resolveTemplate'
