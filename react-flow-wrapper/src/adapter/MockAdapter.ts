import type {
  WorkflowAdapter,
  NotifPayload,
  FlowContext,
  SendResult,
  FileResult,
  UploadMeta,
  RecordFilter,
  RecordItem,
  UserOption,
} from './WorkflowAdapter'

const MOCK_USERS: UserOption[] = [
  { id: 'u1', name: 'Nguyễn Văn An',    email: 'an.nv@company.com',    avatar: undefined },
  { id: 'u2', name: 'Trần Thị Bình',    email: 'binh.tt@company.com',  avatar: undefined },
  { id: 'u3', name: 'Lê Hoàng Cường',   email: 'cuong.lh@company.com', avatar: undefined },
  { id: 'u4', name: 'Phạm Minh Đức',    email: 'duc.pm@company.com',   avatar: undefined },
  { id: 'u5', name: 'Hoàng Thị Hương',  email: 'huong.ht@company.com', avatar: undefined },
]

const MOCK_RECORDS: RecordItem[] = [
  { id: 'rec-001', name: 'Đơn hàng A', status: 'pending',  amount: 1_500_000 },
  { id: 'rec-002', name: 'Đơn hàng B', status: 'approved', amount: 3_200_000 },
  { id: 'rec-003', name: 'Đơn hàng C', status: 'rejected', amount:   800_000 },
]

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

export class MockAdapter implements WorkflowAdapter {
  async resolveUsers(query?: string, _context?: FlowContext): Promise<UserOption[]> {
    if (!query) return MOCK_USERS
    const q = query.toLowerCase()
    return MOCK_USERS.filter(
      u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }

  async uploadFile(file: File, meta: UploadMeta, _context: FlowContext): Promise<FileResult> {
    await delay(500)
    console.log('[MockAdapter] uploadFile', { name: file.name, meta })
    return {
      fileId: `file-${crypto.randomUUID().slice(0, 8)}`,
      url: `https://mock-storage.example.com/files/${file.name}`,
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
    }
  }

  async sendNotification(payload: NotifPayload, context: FlowContext): Promise<SendResult> {
    console.log('[MockAdapter] sendNotification', {
      channel: payload.channel,
      recipients: payload.recipients,
      subject: payload.subject,
      body: payload.body,
      workflowId: context.workflowId,
    })
    return {
      success: true,
      messageId: `msg-${crypto.randomUUID().slice(0, 8)}`,
    }
  }

  async queryRecords(
    source: string,
    filters: RecordFilter[],
    fields: string[],
    limit: number,
    context: FlowContext
  ): Promise<RecordItem[]> {
    console.log('[MockAdapter] queryRecords', { source, filters, fields, limit, instanceId: context.instanceId })
    return MOCK_RECORDS.slice(0, limit)
  }

  async onSubmit(data: Record<string, unknown>, context: FlowContext): Promise<void> {
    console.log('[MockAdapter] onSubmit', {
      workflowId: context.workflowId,
      instanceId: context.instanceId,
      data,
    })
  }

  async writeLog(
    level: 'info' | 'debug' | 'error',
    event: string,
    context: FlowContext
  ): Promise<void> {
    const prefix = level === 'error' ? '🔴' : level === 'debug' ? '🔵' : '⚪'
    console.log(`${prefix} [WorkflowLog] [${context.workflowId}/${context.currentNodeId}]`, event)
  }
}
