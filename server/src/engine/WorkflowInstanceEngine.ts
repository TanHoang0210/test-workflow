import type { WorkflowJSON } from '../types/workflow.js';
import type { ExecutionStep } from './types.js';
import { resolveConditionTarget } from './conditions.js';
import { executeAutomaticNode } from './automaticNode.js';

const MAX_STEPS = 500;

// Các loại node cần một người thao tác trực tiếp — engine phải dừng lại và chờ "next".
const INTERACTIVE_TYPES = new Set(['form', 'attach-file', 'view-sign']);

type WorkflowNode = WorkflowJSON['nodes'][number];

export interface InstanceState {
  /** null = chưa chạy lần nào, bắt đầu từ start-event. Khác null = chạy tiếp từ node này. */
  currentNodeId: string | null;
  variables: Record<string, unknown>;
}

export type InstanceStatus = 'waiting' | 'completed' | 'failed';

export interface InstanceRunResult {
  status: InstanceStatus;
  currentNodeId: string | null;
  pendingNodeId: string | null;
  variables: Record<string, unknown>;
  steps: ExecutionStep[];
  error?: string;
}

// Engine có thể tạm dừng & chạy tiếp — dùng để chạy "instance" thật của một quy trình đã lưu.
//
// Khác với WorkflowExecutor (dry-run, luôn chạy một lèo từ start-event tới end-event):
//   - Engine này DỪNG LẠI khi gặp node cần thao tác từ người dùng (form / đính kèm tệp / ký)
//     và trả về pendingNodeId để client biết cần hiển thị gì.
//   - Có thể khởi tạo lại từ một trạng thái đã lưu (currentNodeId + variables) — khi "next"
//     được gọi, route handler merge dữ liệu người dùng gửi lên vào variables rồi tạo engine
//     mới với currentNodeId = node đang chờ; engine coi node đó là đã hoàn tất và chạy tiếp.
export class WorkflowInstanceEngine {
  private workflow: WorkflowJSON;
  private variables: Record<string, unknown>;
  private steps: ExecutionStep[] = [];
  private resumeFromNodeId: string | null;

  constructor(workflow: WorkflowJSON, state: InstanceState) {
    this.workflow = workflow;
    this.variables = { ...state.variables };
    this.resumeFromNodeId = state.currentNodeId;
  }

  run(): InstanceRunResult {
    let current: WorkflowNode | undefined;
    let resuming = false;

    if (this.resumeFromNodeId) {
      current = this.workflow.nodes.find((n) => n.id === this.resumeFromNodeId);
      if (!current) {
        return this.fail(this.resumeFromNodeId, `Không tìm thấy node "${this.resumeFromNodeId}" để chạy tiếp`);
      }
      resuming = true;
    } else {
      current = this.workflow.nodes.find((n) => n.type === 'start-event');
      if (!current) {
        return this.fail(null, 'Workflow has no start-event node');
      }
    }

    let lastNodeId: string | null = null;
    const visitedCount = new Map<string, number>();

    try {
      while (current) {
        const seen = (visitedCount.get(current.id) ?? 0) + 1;
        visitedCount.set(current.id, seen);

        if (this.steps.length >= MAX_STEPS || seen > MAX_STEPS) {
          throw new Error(`Execution aborted — possible infinite loop at node "${current.label}" (${current.id})`);
        }

        const isResumeTarget = resuming && current.id === this.resumeFromNodeId;

        // Node cần người dùng thao tác mà chưa nhận dữ liệu resume → dừng lại tại đây.
        if (INTERACTIVE_TYPES.has(current.type) && !isResumeTarget) {
          this.log(current, 'waiting', this.pauseMessage(current));
          return {
            status: 'waiting',
            currentNodeId: current.id,
            pendingNodeId: current.id,
            variables: this.variables,
            steps: this.steps,
          };
        }

        if (isResumeTarget) {
          this.log(current, 'ok', this.resumeMessage(current));
          resuming = false;
        } else {
          executeAutomaticNode(current, this.variables, (n, status, message) => this.log(n, status, message));
        }

        lastNodeId = current.id;

        if (current.type === 'end-event') {
          return {
            status: 'completed',
            currentNodeId: current.id,
            pendingNodeId: null,
            variables: this.variables,
            steps: this.steps,
          };
        }

        const nextId = this.resolveNext(current);
        current = nextId ? this.workflow.nodes.find((n) => n.id === nextId) : undefined;
      }

      // Hết đường đi mà chưa gặp end-event — coi quy trình đã hoàn tất tại bước cuối cùng.
      return {
        status: 'completed',
        currentNodeId: lastNodeId,
        pendingNodeId: null,
        variables: this.variables,
        steps: this.steps,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.fail(current?.id ?? lastNodeId, message);
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
      this.log(node, 'skipped', 'Không có nhánh điều kiện nào khớp — đi theo đường mặc định (nếu có)');
      return outgoing[0]?.target ?? null;
    }

    return outgoing[0].target;
  }

  private pauseMessage(node: WorkflowNode): string {
    switch (node.type) {
      case 'form':        return 'Chờ người dùng nhập biểu mẫu';
      case 'attach-file': return 'Chờ người dùng đính kèm tệp';
      case 'view-sign':   return 'Chờ người dùng ký tài liệu';
      default:            return 'Chờ thao tác từ người dùng';
    }
  }

  private resumeMessage(node: WorkflowNode): string {
    switch (node.type) {
      case 'form':        return 'Đã nhận dữ liệu biểu mẫu từ người dùng';
      case 'attach-file': return 'Đã nhận tệp đính kèm từ người dùng';
      case 'view-sign':   return 'Đã nhận chữ ký từ người dùng';
      default:            return 'Đã nhận dữ liệu từ người dùng';
    }
  }

  private fail(currentNodeId: string | null, message: string): InstanceRunResult {
    return {
      status: 'failed',
      currentNodeId,
      pendingNodeId: null,
      variables: this.variables,
      steps: this.steps,
      error: message,
    };
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
