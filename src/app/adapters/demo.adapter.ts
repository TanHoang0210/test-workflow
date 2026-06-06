const BASE = 'http://localhost:8080';

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
} from '@workflow-engine/adapter/WorkflowAdapter';

export class DemoAdapter implements WorkflowAdapter {

  // ── Gửi thông báo ────────────────────────────────────────────────────────
  async sendNotification(payload: NotifPayload, context: FlowContext): Promise<SendResult> {
    console.log('[DemoAdapter] sendNotification →', payload.channel, payload.recipients);

    const res = await fetch('${BASE}/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel:    payload.channel,
        recipients: payload.recipients,
        subject:    payload.subject,
        body:       payload.body,
        templateId: payload.templateId,
        meta: {
          workflowId:  context.workflowId,
          instanceId:  context.instanceId,
          currentNode: context.currentNodeId,
        },
      }),
    });

    if (!res.ok) {
      return { success: false, failedRecipients: payload.recipients };
    }

    const json = await res.json() as { messageId?: string };
    return { success: true, messageId: json.messageId };
  }

  // ── Upload file ───────────────────────────────────────────────────────────
  async uploadFile(file: File, meta: UploadMeta, context: FlowContext): Promise<FileResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('workflowId', meta.workflowId);
    form.append('nodeId', meta.nodeId);
    form.append('instanceId', context.instanceId);

    const res = await fetch('${BASE}/api/files/upload', { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);

    const json = await res.json() as { id: string; url: string };
    return {
      fileId:    json.id,
      url:       json.url,
      name:      file.name,
      sizeBytes: file.size,
      mimeType:  file.type || 'application/octet-stream',
    };
  }

  // ── Truy vấn dữ liệu ─────────────────────────────────────────────────────
  async queryRecords(
    source: string,
    filters: RecordFilter[],
    fields: string[],
    limit: number,
    context: FlowContext,
  ): Promise<RecordItem[]> {
    const res = await fetch('${BASE}/api/records/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, filters, fields, limit, instanceId: context.instanceId }),
    });

    if (!res.ok) throw new Error(`Query failed: ${res.statusText}`);
    return res.json() as Promise<RecordItem[]>;
  }

  // ── Submit workflow ───────────────────────────────────────────────────────
  async onSubmit(data: Record<string, unknown>, context: FlowContext): Promise<void> {
    await fetch('${BASE}/api/workflow/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId:  context.workflowId,
        instanceId:  context.instanceId,
        submittedAt: new Date().toISOString(),
        data,
      }),
    });
  }

  // ── Tìm kiếm người dùng (cho recipient picker) ────────────────────────────
  async resolveUsers(query?: string, _context?: FlowContext): Promise<UserOption[]> {
    const url = `${BASE}/api/users/search${query ? `?q=${encodeURIComponent(query)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json() as Promise<UserOption[]>;
  }

  // ── Ghi log (optional) ────────────────────────────────────────────────────
  async writeLog(
    level: 'info' | 'debug' | 'error',
    event: string,
    context: FlowContext,
  ): Promise<void> {
    await fetch('${BASE}/api/workflow/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        event,
        workflowId:  context.workflowId,
        instanceId:  context.instanceId,
        currentNode: context.currentNodeId,
        timestamp:   new Date().toISOString(),
      }),
    });
  }
}
