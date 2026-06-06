/**
 * WorkflowRunner — nhận JSON từ builder, chạy từng node theo thứ tự.
 *
 * Đây là "execution engine" phía Angular:
 *   builder  →  JSON  →  WorkflowRunner  →  adapter calls  →  backend
 */

import { WorkflowEngine }  from '@workflow-engine/WorkflowEngine';
import { NotificationNode } from '@workflow-engine/nodes/NotificationNode';
import { AttachFileNode }   from '@workflow-engine/nodes/AttachFileNode';
import { FindRecordsNode }  from '@workflow-engine/nodes/FindRecordsNode';
import { SubmitNode }       from '@workflow-engine/nodes/SubmitNode';
import { HistoryLogNode }   from '@workflow-engine/nodes/HistoryLogNode';
import type { WorkflowAdapter } from '@workflow-engine/adapter/WorkflowAdapter';

// JSON schema trả ra từ builder
export interface WorkflowJSON {
  version: string;
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
    fields: unknown[];
    branchConditions?: Record<string, string>;
    routingCondition?: string;
    configMap?: Record<string, string>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
  }>;
}

export interface RunOptions {
  adapter: WorkflowAdapter;
  workflowId: string;
  initialContext?: Record<string, unknown>;
  /** File đính kèm nếu có node attach-file */
  attachedFiles?: Record<string, File>;
}

export class WorkflowRunner {
  private engine: WorkflowEngine;
  private workflow: WorkflowJSON;

  constructor(workflow: WorkflowJSON, options: RunOptions) {
    this.workflow = workflow;
    this.engine = new WorkflowEngine({
      adapter:        options.adapter,
      workflowId:     options.workflowId,
      initialContext: options.initialContext ?? {},
    });
  }

  getEngine(): WorkflowEngine {
    return this.engine;
  }

  // Chạy toàn bộ workflow theo thứ tự edges
  async run(attachedFiles: Record<string, File> = {}): Promise<void> {
    const executionOrder = this.topologicalSort();

    for (const nodeId of executionOrder) {
      const node = this.workflow.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      this.engine.setCurrentNode(nodeId);
      await this.executeNode(node, attachedFiles);

      // Dừng lại nếu có lỗi nghiêm trọng và không có fallback
      const lastError = this.engine.getVariable('__last_error');
      if (lastError) {
        const alertNode = this.workflow.nodes.find(n => n.type === 'alert-error');
        if (!alertNode) {
          console.error('[WorkflowRunner] Stopped at node', nodeId, '— error:', lastError);
          break;
        }
      }
    }
  }

  private async executeNode(
    node: WorkflowJSON['nodes'][0],
    files: Record<string, File>,
  ): Promise<void> {
    const cfg = node.configMap ?? {};

    try {
      switch (node.type) {

        case 'notification':
          await new NotificationNode().execute({
            channel:    (cfg['channel'] as 'email' | 'app' | 'sms') ?? 'email',
            recipients: cfg['recipients'] ? JSON.parse(cfg['recipients']) : [],
            subject:    cfg['subject']  ?? node.label,
            template:   cfg['template'] ?? node.label,
            templateId: cfg['templateId'],
          }, this.engine);
          break;

        case 'attach-file': {
          const file = files[node.id];
          if (file) {
            await new AttachFileNode().execute({
              nodeId:       node.id,
              allowedTypes: cfg['allowedTypes'] ? JSON.parse(cfg['allowedTypes']) : undefined,
              maxSizeMB:    cfg['maxSizeMB'] ? Number(cfg['maxSizeMB']) : undefined,
            }, file, this.engine);
          }
          break;
        }

        case 'find-records':
          await new FindRecordsNode().execute({
            source:    cfg['source'] ?? 'default',
            filters:   cfg['filters'] ? JSON.parse(cfg['filters']) : [],
            fields:    cfg['fields']  ? JSON.parse(cfg['fields'])  : [],
            limit:     cfg['limit']   ? Number(cfg['limit'])       : 20,
            outputVar: cfg['outputVar'] ?? 'records',
          }, this.engine);
          break;

        case 'submit':
          await new SubmitNode().execute({
            confirmMessage: cfg['confirmMessage'],
            saveData:       cfg['saveData'] !== 'false',
          }, this.engine);
          break;

        case 'history-log':
          await new HistoryLogNode().execute({
            logLevel:       (cfg['logLevel'] as 'info' | 'debug' | 'error') ?? 'info',
            includeFields:  cfg['includeFields'] ? JSON.parse(cfg['includeFields']) : undefined,
            retentionDays:  cfg['retentionDays'] ? Number(cfg['retentionDays']) : undefined,
          }, this.engine);
          break;

        case 'form':
          // Form node thu thập input từ người dùng — lưu vào context
          this.engine.setVariable(`form_${node.id}_label`, node.label);
          break;

        case 'start-event':
        case 'end-event':
        case 'condition':
        case 'switch':
        case 'redirect':
          // Pure logic nodes — không cần adapter
          break;

        default:
          console.warn('[WorkflowRunner] Unknown node type:', node.type);
      }
    } catch (err) {
      this.engine.setLastError(err);
      console.error(`[WorkflowRunner] Node ${node.id} (${node.type}) failed:`, err);
    }
  }

  // Sắp xếp nodes theo thứ tự thực thi (BFS từ start-event)
  private topologicalSort(): string[] {
    const startNode = this.workflow.nodes.find(n => n.type === 'start-event');
    if (!startNode) return this.workflow.nodes.map(n => n.id);

    const visited = new Set<string>();
    const order: string[] = [];
    const queue = [startNode.id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      order.push(current);

      const nextNodes = this.workflow.edges
        .filter(e => e.source === current)
        .map(e => e.target);
      queue.push(...nextNodes);
    }

    return order;
  }
}
