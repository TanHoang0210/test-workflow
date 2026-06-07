import type { WorkflowJSON } from '../types/workflow.js';
import type { ExecutionStep } from './types.js';

type WorkflowNode = WorkflowJSON['nodes'][number];

export type LogFn = (node: WorkflowNode, status: ExecutionStep['status'], message: string) => void;

function parseJSONArray(raw: string | undefined): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Thực thi các node "tự động" — chạy theo cấu hình, không cần thao tác từ người dùng.
// Dùng chung bởi WorkflowExecutor (dry-run) và WorkflowInstanceEngine (chạy instance thật):
// cả hai chỉ khác nhau ở cách xử lý các node cần người dùng thao tác (form/attach-file/view-sign).
export function executeAutomaticNode(
  node: WorkflowNode,
  variables: Record<string, unknown>,
  log: LogFn,
): void {
  const cfg = node.configMap ?? {};

  switch (node.type) {
    case 'start-event':
      log(node, 'ok', 'Bắt đầu quy trình');
      break;

    case 'end-event':
      log(node, 'ok', 'Kết thúc quy trình');
      break;

    case 'condition':
    case 'switch':
      log(node, 'ok', 'Đánh giá các nhánh điều kiện');
      break;

    case 'notification': {
      const recipients = parseJSONArray(cfg['recipients']);
      const channel = cfg['channel'] ?? 'email';
      log(node, 'ok', `Gửi thông báo (${channel}) tới ${recipients.length || 0} người nhận: ${cfg['subject'] ?? node.label}`);
      break;
    }

    case 'find-records': {
      const outputVar = cfg['outputVar'] ?? 'records';
      variables[outputVar] = [];
      log(node, 'ok', `Tìm bản ghi từ "${cfg['source'] ?? 'default'}" → lưu vào biến "${outputVar}" (kết quả rỗng — chưa cấu hình nguồn dữ liệu thật)`);
      break;
    }

    case 'submit':
      log(node, 'ok', 'Gửi/lưu dữ liệu của quy trình');
      break;

    case 'history-log':
      log(node, 'ok', `Ghi log lịch sử (mức ${cfg['logLevel'] ?? 'info'})`);
      break;

    case 'redirect': {
      const mode = cfg['mode'] ?? 'node';
      log(node, 'ok', `Điều hướng (${mode}) → ${cfg['targetNodeId'] ?? cfg['targetWorkflowId'] ?? 'không xác định'}`);
      break;
    }

    case 'alert-error':
      log(node, 'ok', `Cảnh báo lỗi: ${node.label}`);
      break;

    default:
      log(node, 'ok', `Thực thi bước "${node.label}"`);
  }
}
