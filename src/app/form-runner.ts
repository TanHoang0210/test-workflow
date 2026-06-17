import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Mirrors FormField / FormButtonsConfig (react-flow-wrapper/src/workflow/types.ts) — chỉ giữ
// những gì cần để render UI nhập liệu, không cần validate đầy đủ như builder.
export interface RunnerFieldOption {
  id: string;
  label: string;
}

export interface RunnerField {
  id: string;
  type: string;
  label: string;
  options: RunnerFieldOption[];
  key?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
}

export interface RunnerButton {
  id: string;
  type: 'submit' | 'cancel';
  label: string;
}

export interface RunnerButtonsConfig {
  items: RunnerButton[];
  layout: 'left' | 'center' | 'right';
}

export interface PendingNode {
  id: string;
  type: string;
  label: string;
  fields: RunnerField[];
  buttons: RunnerButtonsConfig | null;
  configMap: Record<string, string>;
}

@Component({
  selector: 'app-form-runner',
  standalone: true,
  imports: [NgClass, FormsModule],
  template: `
    <div class="form-runner">
      <div class="form-runner__header">
        <button class="form-runner__back" (click)="back.emit()">← Quay lại</button>
        <div class="form-runner__title">Nhập biểu mẫu</div>
      </div>

      <div class="form-runner__body">
        @if (loading()) {
          <div class="form-runner__hint">Đang tải cấu hình biểu mẫu…</div>
        }

        @if (loadError(); as err) {
          <div class="form-runner__error">{{ err }}</div>
        }

        @if (pendingNode(); as node) {
          <div class="form-runner__node-label">{{ node.label }}</div>

          @if (node.fields.length === 0) {
            <div class="form-runner__hint">Node này chưa cấu hình trường nhập liệu nào.</div>
          }

          @for (field of node.fields; track field.id) {
            <div class="form-runner__field">
              <label class="form-runner__label">
                {{ field.label }}
                @if (field.required) { <span class="form-runner__required">*</span> }
              </label>

              @if (field.description) {
                <div class="form-runner__description">{{ field.description }}</div>
              }

              @switch (field.type) {
                @case ('textarea') {
                  <textarea
                    class="form-runner__input"
                    rows="3"
                    [placeholder]="field.placeholder ?? ''"
                    [disabled]="!!field.readOnly"
                    [(ngModel)]="values[fieldKey(field)]"
                  ></textarea>
                }
                @case ('number') {
                  <input
                    class="form-runner__input"
                    type="number"
                    [placeholder]="field.placeholder ?? ''"
                    [disabled]="!!field.readOnly"
                    [(ngModel)]="values[fieldKey(field)]"
                  />
                }
                @case ('date') {
                  <input
                    class="form-runner__input"
                    type="date"
                    [disabled]="!!field.readOnly"
                    [(ngModel)]="values[fieldKey(field)]"
                  />
                }
                @case ('select') {
                  <select
                    class="form-runner__input"
                    [disabled]="!!field.readOnly"
                    [(ngModel)]="values[fieldKey(field)]"
                  >
                    <option [ngValue]="null">— Chọn —</option>
                    @for (opt of field.options; track opt.id) {
                      <option [ngValue]="opt.label">{{ opt.label }}</option>
                    }
                  </select>
                }
                @case ('radio') {
                  <div class="form-runner__choices">
                    @for (opt of field.options; track opt.id) {
                      <label class="form-runner__choice">
                        <input
                          type="radio"
                          [name]="fieldKey(field)"
                          [value]="opt.label"
                          [checked]="values[fieldKey(field)] === opt.label"
                          [disabled]="!!field.readOnly"
                          (change)="values[fieldKey(field)] = opt.label"
                        />
                        {{ opt.label }}
                      </label>
                    }
                  </div>
                }
                @case ('checklist') {
                  <div class="form-runner__choices">
                    @for (opt of field.options; track opt.id) {
                      <label class="form-runner__choice">
                        <input
                          type="checkbox"
                          [checked]="isChecked(field, opt.label)"
                          [disabled]="!!field.readOnly"
                          (change)="toggleChecklist(field, opt.label, $any($event.target).checked)"
                        />
                        {{ opt.label }}
                      </label>
                    }
                  </div>
                }
                @case ('rating') {
                  <div class="form-runner__rating">
                    @for (star of ratingStars; track star) {
                      <button
                        type="button"
                        class="form-runner__star"
                        [ngClass]="{ 'form-runner__star--active': ratingValue(field) >= star }"
                        [disabled]="!!field.readOnly"
                        (click)="values[fieldKey(field)] = star"
                      >★</button>
                    }
                  </div>
                }
                @case ('file-upload') {
                  <input
                    class="form-runner__input"
                    type="file"
                    [disabled]="!!field.readOnly"
                    (change)="onFileSelected(field, $any($event.target).files)"
                  />
                  @if (values[fieldKey(field)]) {
                    <div class="form-runner__file-name">Đã chọn: {{ values[fieldKey(field)] }}</div>
                  }
                }
                @default {
                  <input
                    class="form-runner__input"
                    type="text"
                    [placeholder]="field.placeholder ?? ''"
                    [disabled]="!!field.readOnly"
                    [(ngModel)]="values[fieldKey(field)]"
                  />
                }
              }
            </div>
          }

          <div class="form-runner__actions" [ngClass]="'form-runner__actions--' + (node.buttons?.layout ?? 'right')">
            @if (node.buttons && node.buttons.items.length > 0) {
              @for (btn of node.buttons.items; track btn.id) {
                <button
                  class="form-runner__btn"
                  [ngClass]="{ 'form-runner__btn--primary': btn.type === 'submit' }"
                  [disabled]="submitting()"
                  (click)="onAction(btn)"
                >{{ btn.label }}</button>
              }
            } @else {
              <button class="form-runner__btn form-runner__btn--primary" [disabled]="submitting()" (click)="submit()">
                Gửi
              </button>
            }
          </div>

          @if (submitError(); as err) {
            <div class="form-runner__error">{{ err }}</div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .form-runner {
      max-width: 640px;
      margin: 32px auto;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .form-runner__header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    .form-runner__back {
      background: none;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 12px;
      cursor: pointer;
      color: #475569;
      font-size: 13px;
    }
    .form-runner__back:hover { background: #f1f5f9; }
    .form-runner__title { font-weight: 600; font-size: 16px; color: #0f172a; }
    .form-runner__body { padding: 20px; }
    .form-runner__node-label { font-size: 14px; color: #64748b; margin-bottom: 16px; }
    .form-runner__hint { color: #64748b; font-size: 13px; }
    .form-runner__error {
      color: #dc2626;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
      margin-top: 12px;
      white-space: pre-wrap;
    }
    .form-runner__field { margin-bottom: 16px; }
    .form-runner__label { display: block; font-size: 13px; font-weight: 500; color: #334155; margin-bottom: 6px; }
    .form-runner__required { color: #dc2626; margin-left: 2px; }
    .form-runner__description { font-size: 12px; color: #94a3b8; margin-bottom: 6px; }
    .form-runner__input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
    }
    .form-runner__input:focus { outline: none; border-color: #2563eb; }
    .form-runner__choices { display: flex; flex-direction: column; gap: 6px; }
    .form-runner__choice { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #334155; cursor: pointer; }
    .form-runner__rating { display: flex; gap: 4px; }
    .form-runner__star {
      background: none;
      border: none;
      font-size: 22px;
      color: #cbd5e1;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .form-runner__star--active { color: #f59e0b; }
    .form-runner__file-name { margin-top: 6px; font-size: 12px; color: #64748b; }
    .form-runner__actions { display: flex; gap: 8px; margin-top: 8px; }
    .form-runner__actions--left { justify-content: flex-start; }
    .form-runner__actions--center { justify-content: center; }
    .form-runner__actions--right { justify-content: flex-end; }
    .form-runner__btn {
      padding: 8px 18px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      color: #334155;
      font-size: 14px;
      cursor: pointer;
    }
    .form-runner__btn:hover { background: #f1f5f9; }
    .form-runner__btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .form-runner__btn--primary { background: #2563eb; border-color: #2563eb; color: #fff; }
    .form-runner__btn--primary:hover { background: #1d4ed8; }
  `],
})
export class FormRunnerComponent implements OnInit {
  @Input({ required: true }) instanceId!: string;
  @Input() serverUrl = 'http://localhost:8080';
  @Output() back = new EventEmitter<void>();
  /** Phát ra khi instance đã chạy tiếp thành công — host có thể làm mới trạng thái test panel. */
  @Output() submitted = new EventEmitter<unknown>();

  protected loading = signal(false);
  protected loadError = signal<string | null>(null);
  protected submitting = signal(false);
  protected submitError = signal<string | null>(null);
  protected pendingNode = signal<PendingNode | null>(null);

  protected readonly ratingStars = [1, 2, 3, 4, 5];

  // Giá trị nhập liệu — key theo field.key (fallback field.id), gửi lên dưới dạng
  // variables[nodeId] = { ...values } để tránh đụng tên giữa các form khác nhau.
  protected values: Record<string, unknown> = {};

  ngOnInit(): void {
    this.load();
  }

  protected fieldKey(field: RunnerField): string {
    return field.key || field.id;
  }

  protected ratingValue(field: RunnerField): number {
    const v = this.values[this.fieldKey(field)];
    return typeof v === 'number' ? v : 0;
  }

  protected isChecked(field: RunnerField, optionLabel: string): boolean {
    const current = this.values[this.fieldKey(field)];
    return Array.isArray(current) && current.includes(optionLabel);
  }

  protected toggleChecklist(field: RunnerField, optionLabel: string, checked: boolean): void {
    const key = this.fieldKey(field);
    const current = Array.isArray(this.values[key]) ? [...(this.values[key] as string[])] : [];
    const next = checked
      ? [...current, optionLabel]
      : current.filter((v) => v !== optionLabel);
    this.values[key] = next;
  }

  protected onFileSelected(field: RunnerField, files: FileList | null): void {
    const file = files?.[0];
    this.values[this.fieldKey(field)] = file?.name ?? null;
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    this.pendingNode.set(null);
    this.values = {};
    try {
      const res = await fetch(`${this.serverUrl}/api/instances/${this.instanceId}/pending-node`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      const node = body.node as PendingNode;
      this.pendingNode.set(node);
      for (const field of node.fields) {
        this.values[this.fieldKey(field)] = field.type === 'checklist' ? [] : null;
      }
    } catch (err) {
      this.loadError.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  protected onAction(button: RunnerButton): void {
    if (button.type === 'cancel') {
      this.back.emit();
      return;
    }
    this.submit();
  }

  protected async submit(): Promise<void> {
    const node = this.pendingNode();
    if (!node) return;

    this.submitting.set(true);
    this.submitError.set(null);
    try {
      const res = await fetch(`${this.serverUrl}/api/instances/${this.instanceId}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: { [node.id]: { ...this.values } } }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      this.submitted.emit(body.instance);
      this.back.emit();
    } catch (err) {
      this.submitError.set((err as Error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}
