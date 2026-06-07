import type { WorkflowJSON } from '../types/workflow.js';
import type { ExecutionResult, ExecutionStep } from './types.js';
import { resolveConditionTarget } from './conditions.js';
import { executeAutomaticNode } from './automaticNode.js';

const MAX_STEPS = 500;

type WorkflowNode = WorkflowJSON['nodes'][number];

export interface ExecutorOptions {
  initialVariables?: Record<string, unknown>;
}

// Server-side "dry run" engine — walks the graph, evaluates condition branches against
// the variable bag, and logs what each node would do. It does not perform real side effects
// (sending emails, uploading files, …) since the server has no integrations configured yet.
export class WorkflowExecutor {
  private workflow: WorkflowJSON;
  private variables: Record<string, unknown>;
  private steps: ExecutionStep[] = [];

  constructor(workflow: WorkflowJSON, options: ExecutorOptions = {}) {
    this.workflow = workflow;
    this.variables = { ...(options.initialVariables ?? {}) };
  }

  async run(): Promise<ExecutionResult> {
    const instanceId = crypto.randomUUID();
    const startNode = this.workflow.nodes.find((n) => n.type === 'start-event');

    if (!startNode) {
      return {
        instanceId,
        status: 'failed',
        steps: [],
        variables: this.variables,
        error: 'Workflow has no start-event node',
      };
    }

    let current: WorkflowNode | undefined = startNode;
    const visitedCount = new Map<string, number>();

    try {
      while (current) {
        const seen = (visitedCount.get(current.id) ?? 0) + 1;
        visitedCount.set(current.id, seen);

        if (this.steps.length >= MAX_STEPS || seen > MAX_STEPS) {
          throw new Error(`Execution aborted — possible infinite loop at node "${current.label}" (${current.id})`);
        }

        this.executeNode(current);

        if (current.type === 'end-event') break;

        const nextId = this.resolveNext(current);
        current = nextId ? this.workflow.nodes.find((n) => n.id === nextId) : undefined;
      }

      return {
        instanceId,
        status: 'completed',
        steps: this.steps,
        variables: this.variables,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        instanceId,
        status: 'failed',
        steps: this.steps,
        variables: this.variables,
        error: message,
      };
    }
  }

  private resolveNext(node: WorkflowNode): string | null {
    const outgoing = this.workflow.edges.filter((e) => e.source === node.id);
    if (outgoing.length === 0) return null;

    if (node.type === 'condition' || node.type === 'switch') {
      const cfg = node.configMap ?? {};
      const matchedTargetId = resolveConditionTarget(cfg['__conditionBranches'], this.variables);
      if (matchedTargetId && outgoing.some((e) => e.target === matchedTargetId)) {
        return matchedTargetId;
      }
      // No branch matched — fall through to the first outgoing edge as the default path, if any.
      this.log(node, 'skipped', 'Không có nhánh điều kiện nào khớp — đi theo đường mặc định (nếu có)');
      return outgoing[0]?.target ?? null;
    }

    return outgoing[0].target;
  }

  private executeNode(node: WorkflowNode): void {
    switch (node.type) {
      case 'attach-file':
        this.log(node, 'skipped', 'Bước đính kèm tệp cần thao tác từ người dùng — bỏ qua khi chạy phía server');
        break;

      case 'form':
        this.variables[`form_${node.id}_label`] = node.label;
        this.log(node, 'skipped', 'Bước biểu mẫu cần nhập liệu từ người dùng — bỏ qua khi chạy phía server');
        break;

      case 'view-sign':
        this.log(node, 'skipped', 'Bước ký tài liệu cần thao tác từ người dùng — bỏ qua khi chạy phía server');
        break;

      default:
        executeAutomaticNode(node, this.variables, (n, status, message) => this.log(n, status, message));
    }
  }

  private log(node: WorkflowNode, status: ExecutionStep['status'], message: string): void {
    this.steps.push({
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: node.label,
      status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
