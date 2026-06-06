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
import { NgClass } from '@angular/common';
// import { DemoAdapter } from './adapters/demo.adapter'; // dùng khi có backend thật
import { WorkflowRunner }  from './workflow-runner';
import type { WorkflowJSON } from './workflow-runner';
import { MockAdapter }     from '@workflow-engine/adapter/MockAdapter';

export interface ExecLogEntry {
  level: 'info' | 'success' | 'error' | 'warn' | 'jump' | 'handoff';
  text: string;
  time: string;
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

  @ViewChild('flowBuilder') flowBuilderRef!: ElementRef;

  // Adapter cho toàn bộ app — thay DemoAdapter bằng adapter thật
  private adapter = new MockAdapter(); // ← đổi thành DemoAdapter() khi có backend thật

  constructor(private zone: NgZone) {}

  ngAfterViewInit() {
    const el = this.flowBuilderRef.nativeElement;

    // Lắng nghe event khi user nhấn Save trong builder
    el.addEventListener('workflowSaved', this.onWorkflowSaved);

    el.onSave   = this.onSave;
    el.onImport = this.onImport;
    el.onExport = this.onExport;
    el.onUndo   = this.onUndo;
    el.onRedo   = this.onRedo;
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
      if (!payload) return;

      this.saveStatus.set('saving');
      this.execLogs.set([]);
      this.addLog('info', `▶ Bắt đầu chạy workflow (${payload.nodes.length} node)`);

      try {
        await this.saveWorkflowToBackend(payload);

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
        this.addLog('error', `✗ ${(err as Error).message}`);
        console.error('[App] Workflow execution error:', err);
        this.saveStatus.set('idle');
      } finally {
        setTimeout(() => this.saveStatus.set('idle'), 3000);
      }
    });
  };

  // ── Lưu JSON workflow vào backend ─────────────────────────────────────

  private async saveWorkflowToBackend(payload: WorkflowJSON): Promise<void> {
    const json = JSON.stringify(payload, null, 2);
    // Lưu vào localStorage (demo) — thay bằng API call thật
    localStorage.setItem('workflow-saved-payload', json);
    console.log('[App] Workflow saved to backend:', json.length, 'bytes');
  }

  // ── Handler buttons ────────────────────────────────────────────────────

  onSave = () => {
    this.saveStatus.set('saving');
    this.flowBuilderRef.nativeElement.dispatchEvent(new CustomEvent('requestSave'));
  };

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
