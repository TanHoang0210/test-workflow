export interface UserOption {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface UploadMeta {
  nodeId: string
  workflowId: string
  allowedTypes?: string[]
  maxSizeMB?: number
}

export interface FileResult {
  fileId: string
  url: string
  name: string
  sizeBytes: number
  mimeType: string
}

export interface NotifPayload {
  channel: 'email' | 'app' | 'sms'
  recipients: string[]
  subject?: string
  body: string
  templateId?: string
  templateVars?: Record<string, string>
}

export interface SendResult {
  success: boolean
  messageId?: string
  failedRecipients?: string[]
}

export interface RecordFilter {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in' | 'is_empty'
  value?: unknown
}

export interface RecordItem {
  id: string
  [key: string]: unknown
}

export interface FlowContext {
  workflowId: string
  instanceId: string
  currentNodeId: string
  variables: Record<string, unknown>
}

export interface WorkflowAdapter {
  sendNotification(payload: NotifPayload, context: FlowContext): Promise<SendResult>
  uploadFile(file: File, meta: UploadMeta, context: FlowContext): Promise<FileResult>
  queryRecords(
    source: string,
    filters: RecordFilter[],
    fields: string[],
    limit: number,
    context: FlowContext
  ): Promise<RecordItem[]>
  onSubmit(data: Record<string, unknown>, context: FlowContext): Promise<void>
  resolveUsers(query?: string, context?: FlowContext): Promise<UserOption[]>
  writeLog?(level: 'info' | 'debug' | 'error', event: string, context: FlowContext): Promise<void>
}
