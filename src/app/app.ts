import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Location, NgClass } from '@angular/common';
// import { DemoAdapter } from './adapters/demo.adapter'; // dùng khi có backend thật
import { WorkflowRunner }  from './workflow-runner';
import type { WorkflowJSON } from './workflow-runner';
import { MockAdapter }     from '@workflow-engine/adapter/MockAdapter';

// Mirrors SaveWorkflowMeta from react-flow-wrapper/src/components/SaveWorkflowModal.tsx —
// the "Lưu quy trình" modal lives inside the widget; the host only receives the result.
export interface SaveWorkflowMeta {
  code: string;
  name: string;
  description: string;
}

export interface ExecLogEntry {
  level: 'info' | 'success' | 'error' | 'warn' | 'jump' | 'handoff';
  text: string;
  time: string;
}

// Mirrors WorkflowListItem from react-flow-wrapper/src/FlowComponent.tsx —
// dữ liệu hiển thị trong dropdown "Mở quy trình" (chỉ cần các cột nhẹ, không cần "definition").
export interface WorkflowSummary {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  updated_at?: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgClass],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly title = signal('workflow-builder');
  protected saveStatus = signal<'idle' | 'saving' | 'saved'>('idle');
  protected execLogs = signal<ExecLogEntry[]>([]);

  // Phản hồi sau khi lưu — modal "Lưu quy trình" (mã/tên/mô tả) được xử lý bên trong
  // react-flow-wrapper (SaveWorkflowModal); ở đây chỉ cần đọc `meta` từ event và gọi API.
  protected saveResult = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Gọi thẳng Supabase REST API (PostgREST) từ Angular — bỏ qua Node server.
  // Chỉ dùng anon/public key (an toàn để lộ ở client khi bảng đã bật Row Level Security).
  // KHÔNG bao giờ đặt service_role key ở đây.
  private readonly supabaseUrl = 'https://ahrfoasfdrdywkpkpzpk.supabase.co';
  private readonly supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocmZvYXNmZHJkeXdrcGtwenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDcwNzYsImV4cCI6MjA5NjM4MzA3Nn0.Yi4OGWa3oYc6afLIW98msp98P8O3q-I0Le88j7JGjCE';

  // id của quy trình đang mở (gắn lên đường dẫn URL) — null nghĩa là quy trình mới chưa lưu.
  // Khi đã có id, lưu sẽ gọi API update (PATCH) thay vì tạo mới (POST).
  private currentWorkflowId: string | null = null;

  @ViewChild('flowBuilder') flowBuilderRef!: ElementRef;

  // Adapter cho toàn bộ app — thay DemoAdapter bằng adapter thật
  private adapter = new MockAdapter(); // ← đổi thành DemoAdapter() khi có backend thật

  constructor(private zone: NgZone, private location: Location) {}

  private get supabaseHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      apikey: this.supabaseAnonKey,
      Authorization: `Bearer ${this.supabaseAnonKey}`,
    };
  }

  ngAfterViewInit() {
    const el = this.flowBuilderRef.nativeElement;

    // Lắng nghe event khi user nhấn Save trong builder
    // (modal "Lưu quy trình" mã/tên/mô tả được xử lý bên trong react-flow-wrapper —
    // ở đây chỉ cần nhận kết quả qua event "workflowSaved")
    el.addEventListener('workflowSaved', this.onWorkflowSaved);

    el.onImport = this.onImport;
    el.onExport = this.onExport;
    el.onUndo   = this.onUndo;
    el.onRedo   = this.onRedo;
    el.onOpenWorkflowList = this.onOpenWorkflowList;
    el.onSelectWorkflow   = this.onSelectWorkflow;
  }

  ngOnDestroy() {
    this.flowBuilderRef.nativeElement.removeEventListener('workflowSaved', this.onWorkflowSaved);
  }

  protected clearLogs() {
    this.execLogs.set([]);
  }

  private addLog(level: ExecLogEntry['level'], text: string) {
    const entry: ExecLogEntry = { level, text, time: new Date().toLocaleTimeString() };
    this.execLogs.update(logs => [...logs, entry]);
  }

  // ── Nhận JSON từ builder và chạy workflow ──────────────────────────────

  private onWorkflowSaved = (event: CustomEvent) => {
    this.zone.run(async () => {
      const payload = event.detail?.payload as WorkflowJSON;
      const meta = event.detail?.meta as SaveWorkflowMeta | undefined;
      if (!payload) return;

      this.saveStatus.set('saving');
      this.execLogs.set([]);
      this.addLog('info', `▶ Bắt đầu chạy workflow (${payload.nodes.length} node)`);

      try {
        if (meta) {
          await this.saveWorkflowToBackend(payload, meta);
          this.saveResult.set({ type: 'success', text: `Đã lưu quy trình "${meta.name}"` });
          setTimeout(() => this.saveResult.set(null), 4000);
        }

        const runner = new WorkflowRunner(payload, {
          adapter:    this.adapter,
          workflowId: payload.nodes[0]?.id ?? 'wf-default',
          initialContext: {
            current_user: { id: 'u1', name: 'Nguyễn Văn A', email: 'a@company.com' },
            app_name:     'VNPT Office',
            started_at:   new Date().toISOString(),
          },
        });

        await runner.run();

        const ctx = runner.getEngine().getContext();
        const status = runner.getEngine().getInstanceStatus();

        // Hiển thị kết quả redirect nếu có
        const childId = ctx.variables['__child_instance_id'];
        if (childId) {
          this.addLog('handoff', `↪ workflow_handoff → new instance: ${childId}  status: ${status}`);
        }

        // Các biến redirect count
        const redirectKeys = Object.keys(ctx.variables).filter(k => k.startsWith('__redirect_count_'));
        for (const k of redirectKeys) {
          this.addLog('jump', `↩ node_jump  ${k} = ${ctx.variables[k]}`);
        }

        const lastError = ctx.variables['__last_error'];
        if (lastError) {
          this.addLog('error', `✗ Lỗi: ${lastError}`);
        } else {
          this.addLog('success', `✓ Workflow hoàn thành  (instance status: ${status})`);
        }

        // Log toàn bộ biến cuối
        const varLines = Object.entries(ctx.variables)
          .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
          .join('\n');
        this.addLog('info', `📦 Context cuối:\n${varLines}`);

        this.saveStatus.set('saved');
      } catch (err) {
        const message = (err as Error).message;
        this.saveResult.set({ type: 'error', text: message });
        setTimeout(() => this.saveResult.set(null), 5000);

        this.addLog('error', `✗ ${message}`);
        console.error('[App] Workflow execution error:', err);
        this.saveStatus.set('idle');
      } finally {
        setTimeout(() => this.saveStatus.set('idle'), 3000);
      }
    });
  };

  // ── Lưu JSON workflow vào backend ─────────────────────────────────────

  private async saveWorkflowToBackend(payload: WorkflowJSON, meta: SaveWorkflowMeta): Promise<void> {
    const json = JSON.stringify(payload, null, 2);
    localStorage.setItem('workflow-saved-payload', json);

    const row = {
      code: meta.code?.trim() || null,
      name: meta.name,
      description: meta.description || null,
      definition: payload,
    };

    // Có id đang mở → cập nhật quy trình đó (PATCH); chưa có id → tạo mới (POST).
    const isUpdate = !!this.currentWorkflowId;
    const url = isUpdate
      ? `${this.supabaseUrl}/rest/v1/workflows?id=eq.${encodeURIComponent(this.currentWorkflowId!)}`
      : `${this.supabaseUrl}/rest/v1/workflows`;

    const res = await fetch(url, {
      method: isUpdate ? 'PATCH' : 'POST',
      headers: { ...this.supabaseHeaders, Prefer: 'return=representation' },
      body: JSON.stringify(isUpdate ? { ...row, updated_at: new Date().toISOString() } : row),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({} as { code?: string; message?: string }));
      if (body?.code === '23505') {
        throw new Error(`Mã quy trình "${row.code}" đã tồn tại`);
      }
      throw new Error(body?.message ?? `Lưu quy trình thất bại (HTTP ${res.status})`);
    }

    const [data] = await res.json();
    console.log(`[App] Workflow ${isUpdate ? 'updated in' : 'saved to'} Supabase:`, data);

    // Quy trình vừa tạo mới → coi như đang mở quy trình đó, gắn id lên đường dẫn để lần lưu sau là update.
    if (!isUpdate && data?.id) {
      this.currentWorkflowId = data.id;
      this.location.go(`/flow/${data.id}`);
    }
  }

  // ── Mở quy trình đã lưu (danh sách + nạp lên canvas) ───────────────────

  private onOpenWorkflowList = async (): Promise<WorkflowSummary[]> => {
    const res = await fetch(
      `${this.supabaseUrl}/rest/v1/workflows?select=id,code,name,description,updated_at&order=updated_at.desc`,
      { headers: this.supabaseHeaders },
    );
    if (!res.ok) {
      console.error('[App] Failed to load workflow list:', res.status);
      return [];
    }
    return (await res.json()) as WorkflowSummary[];
  };

  private onSelectWorkflow = async (
    id: string,
  ): Promise<{ payload: WorkflowJSON; meta: SaveWorkflowMeta } | null> => {
    const res = await fetch(
      `${this.supabaseUrl}/rest/v1/workflows?id=eq.${encodeURIComponent(id)}&select=id,code,name,description,definition`,
      { headers: this.supabaseHeaders },
    );
    if (!res.ok) {
      console.error('[App] Failed to load workflow detail:', res.status);
      return null;
    }
    type Row = { id: string; code: string | null; name: string; description: string | null; definition: WorkflowJSON };
    const [row] = (await res.json()) as Row[];
    if (!row) return null;

    this.currentWorkflowId = row.id;
    this.location.go(`/flow/${row.id}`);
    return {
      payload: row.definition,
      meta: { code: row.code ?? '', name: row.name, description: row.description ?? '' },
    };
  };

  // ── Handler buttons ────────────────────────────────────────────────────

  onImport = () => {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const payload = JSON.parse(ev.target?.result as string) as WorkflowJSON;
          console.log('[App] Imported workflow:', payload);
          // TODO: load vào builder qua custom event
        } catch (err) {
          alert('Import failed: ' + (err as Error).message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  onExport = () => {
    const saved = localStorage.getItem('workflow-saved-payload');
    const json  = saved ?? JSON.stringify({ version: '1.0', nodes: [], edges: [] }, null, 2);
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href     = url;
    a.download = `workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  onUndo = () => {
    this.flowBuilderRef.nativeElement.dispatchEvent(new CustomEvent('requestUndo'));
  };

  onRedo = () => {
    this.flowBuilderRef.nativeElement.dispatchEvent(new CustomEvent('requestRedo'));
  };
}
