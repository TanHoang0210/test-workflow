import React from "react";
import type {
  FieldType, FormField,
  FieldValidation, FieldDefaultValue, FieldConditionalVisibility
} from "../workflow/types";
import { HAS_OPTIONS, PALETTE, PALETTE_CATEGORIES } from "../workflow/constants";
import { uid } from "../workflow/uid";

// ── Helpers ────────────────────────────────────────────────────────────────

function toKey(label: string) {
  return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 30) || "field";
}

function makeField(type: FieldType): FormField {
  return {
    id: uid("field"),
    type,
    label: "",
    options: HAS_OPTIONS.includes(type)
      ? [{ id: uid("opt"), label: "" }, { id: uid("opt"), label: "" }]
      : [],
    key: "",
    placeholder: "",
    description: "",
    required: false,
    readOnly: false,
    validation: { type: null },
    defaultValue: { source: "fixed", value: "" },
    conditionalVisibility: null,
  };
}

// ── Field type icon ────────────────────────────────────────────────────────

const FieldIcon: React.FC<{ type: FieldType }> = ({ type }) => {
  const icons: Record<FieldType, string> = {
    text: "isax-text", textarea: "isax-document-text", date: "isax-calendar",
    number: "isax-hashtag", select: "isax-arrow-down", radio: "isax-menu1",
    checklist: "isax-tick-square", "file-upload": "isax-document-upload", rating: "isax-star",
  };
  return <i className={`ffb-type-icon ${icons[type] ?? "isax-text"}`} />;
};

// ── Field Card ────────────────────────────────────────────────────────────

const FieldCard: React.FC<{
  field: FormField;
  selected: boolean;
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  isDropTarget: boolean;
}> = ({ field, selected, onClick, onDuplicate, onDelete, onDragStart, onDragOver, isDropTarget }) => {
  const meta = PALETTE.find((p) => p.type === field.type);

  return (
    <div
      className={`ffb-card${selected ? " ffb-card--selected" : ""}${isDropTarget ? " ffb-card--drop" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onClick={onClick}
    >
      <div className="ffb-card__icon-wrap">
        <FieldIcon type={field.type} />
      </div>
      <div className="ffb-card__body">
        <div className="ffb-card__top">
          <span className="ffb-card__label">{field.label || `(${meta?.label})`}</span>
          {field.key && <span className="ffb-card__key">{`{{${field.key}}}`}</span>}
        </div>
        <div className="ffb-card__badges">
          {field.required && <span className="ffb-badge ffb-badge--required">Required</span>}
          {field.validation?.type === "email" && <span className="ffb-badge ffb-badge--info">Email</span>}
          {field.validation?.type === "phone" && <span className="ffb-badge ffb-badge--info">Phone</span>}
          {field.validation?.type === "regex" && <span className="ffb-badge ffb-badge--info">Regex</span>}
          {field.validation?.maxLength && <span className="ffb-badge ffb-badge--neutral">Max: {field.validation.maxLength}</span>}
          {field.readOnly && <span className="ffb-badge ffb-badge--neutral">Read-only</span>}
          {field.conditionalVisibility && <span className="ffb-badge ffb-badge--cond">Conditional</span>}
          {!field.required && !field.validation?.type && !field.conditionalVisibility && (
            <span className="ffb-badge ffb-badge--opt">Optional</span>
          )}
        </div>
        {field.placeholder && (
          <p className="ffb-card__placeholder">Placeholder: "{field.placeholder}"</p>
        )}
      </div>
      <div className="ffb-card__actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ffb-card__btn" onClick={onDuplicate} title="Nhân bản">⧉</button>
        <button type="button" className="ffb-card__btn ffb-card__btn--del" onClick={onDelete} title="Xóa">✕</button>
      </div>
    </div>
  );
};

// ── Section Collapse ──────────────────────────────────────────────────────

const Section: React.FC<{ title: string; index: number; children: React.ReactNode }> = ({
  title, index, children,
}) => {
  const [open, setOpen] = React.useState(index === 0);
  return (
    <div className="ffb-section">
      <button type="button" className="ffb-section__head" onClick={() => setOpen((v) => !v)}>
        <span className="ffb-section__num">{index}.</span>
        <span className="ffb-section__title">{title}</span>
        <span className={`ffb-section__arrow${open ? " ffb-section__arrow--open" : ""}`}>›</span>
      </button>
      {open && <div className="ffb-section__body">{children}</div>}
    </div>
  );
};

// ── Field Properties Panel ─────────────────────────────────────────────────

const FieldProperties: React.FC<{
  field: FormField;
  allFields: FormField[];
  onChange: (patch: Partial<FormField>) => void;
  onClose: () => void;
}> = ({ field, allFields, onChange, onClose }) => {
  const setValidation = (patch: Partial<FieldValidation>) =>
    onChange({ validation: { ...field.validation, ...patch } as FieldValidation });

  const setDefault = (patch: Partial<FieldDefaultValue>) =>
    onChange({ defaultValue: { ...field.defaultValue, source: "fixed", value: "", ...patch } });

  const setCond = (patch: Partial<FieldConditionalVisibility> | null) => {
    if (patch === null) { onChange({ conditionalVisibility: null }); return; }
    onChange({
      conditionalVisibility: {
        fieldKey: "", operator: "equals", value: "",
        ...(field.conditionalVisibility ?? {}),
        ...patch,
      }
    });
  };

  const otherFields = allFields.filter((f) => f.id !== field.id && f.key);

  return (
    <div className="ffb-props">
      <div className="ffb-props__head">
        <span className="ffb-props__title">Cấu hình trường</span>
        <button type="button" className="ffb-props__close" onClick={onClose} title="Đóng">✕</button>
      </div>

      {/* 1. Cơ bản */}
      <Section title="Cơ bản" index={1}>
        <label className="ffb-field-label">Field Label</label>
        <input className="ffb-input" value={field.label}
          onChange={(e) => onChange({ label: e.target.value })} placeholder="Tên trường..." />

        <label className="ffb-field-label">Variable Key (Key)
          <span className="ffb-key-hint">{"{{ "}…{"  }}"}</span>
        </label>
        <div className="ffb-key-wrap">
          <span className="ffb-key-prefix">{"{{ "}</span>
          <input className="ffb-input ffb-input--key" value={field.key ?? ""}
            onChange={(e) => onChange({ key: e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase() })}
            placeholder={toKey(field.label || "field")} />
          <span className="ffb-key-suffix">{" }}"}</span>
        </div>

        <label className="ffb-field-label">Placeholder</label>
        <input className="ffb-input" value={field.placeholder ?? ""}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          placeholder="e.g. Nhập giá trị..." />

        <label className="ffb-field-label">Mô tả hướng dẫn</label>
        <textarea className="ffb-input ffb-input--ta" rows={2} value={field.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Gợi ý để người dùng hiểu cách điền..." />

        {HAS_OPTIONS.includes(field.type) && (
          <>
            <label className="ffb-field-label">Lựa chọn</label>
            {(field.options ?? []).map((opt, i) => (
              <div key={opt.id} className="ffb-opt-row">
                <input className="ffb-input ffb-opt-row__input" value={opt.label}
                  onChange={(e) => {
                    const opts = [...(field.options ?? [])];
                    opts[i] = { ...opt, label: e.target.value };
                    onChange({ options: opts });
                  }} placeholder={`Lựa chọn ${i + 1}`} />
                <button type="button" className="ffb-opt-row__del"
                  onClick={() => onChange({ options: field.options.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            <button type="button" className="ffb-add-opt"
              onClick={() => onChange({ options: [...(field.options ?? []), { id: uid("opt"), label: "" }] })}>
              + Thêm lựa chọn
            </button>
          </>
        )}
      </Section>

      {/* 2. Điều kiện */}
      <Section title="Điều kiện" index={2}>
        <label className="ffb-toggle">
          <input type="checkbox" checked={field.required ?? false}
            onChange={(e) => onChange({ required: e.target.checked })} />
          <span>Bắt buộc (Required)</span>
        </label>
        <label className="ffb-toggle">
          <input type="checkbox" checked={field.readOnly ?? false}
            onChange={(e) => onChange({ readOnly: e.target.checked })} />
          <span>Chỉ đọc (Read-only)</span>
        </label>

        <label className="ffb-field-label" style={{ marginTop: 10 }}>Kiểu validation</label>
        <select className="ffb-input" value={field.validation?.type ?? ""}
          onChange={(e) => setValidation({ type: (e.target.value || null) as FieldValidation["type"] })}>
          <option value="">Không có</option>
          <option value="email">Email</option>
          <option value="phone">Số điện thoại</option>
          <option value="regex">Regex tùy chỉnh</option>
          <option value="length">Độ dài</option>
        </select>

        {field.validation?.type === "regex" && (
          <>
            <label className="ffb-field-label">Pattern (Regex)</label>
            <input className="ffb-input ffb-input--mono" value={field.validation.pattern ?? ""}
              onChange={(e) => setValidation({ pattern: e.target.value })} placeholder="^[A-Z].*" />
          </>
        )}
        {(field.validation?.type === "length" || field.validation?.type === null) && (
          <div className="ffb-row-2">
            <div>
              <label className="ffb-field-label">Min length</label>
              <input type="number" className="ffb-input" min={0}
                value={field.validation?.minLength ?? ""}
                onChange={(e) => setValidation({ minLength: e.target.value ? +e.target.value : undefined })} />
            </div>
            <div>
              <label className="ffb-field-label">Max length</label>
              <input type="number" className="ffb-input" min={0}
                value={field.validation?.maxLength ?? ""}
                onChange={(e) => setValidation({ maxLength: e.target.value ? +e.target.value : undefined })} />
            </div>
          </div>
        )}
      </Section>

      {/* 3. Conditional visibility */}
      <Section title="Cấu hình hiển thị" index={3}>
        <label className="ffb-toggle">
          <input type="checkbox" checked={!!field.conditionalVisibility}
            onChange={(e) => setCond(e.target.checked ? { fieldKey: "", operator: "equals", value: "" } : null)} />
          <span>Ẩn/hiện theo điều kiện</span>
        </label>
        {field.conditionalVisibility && (
          <div className="ffb-cond">
            <label className="ffb-field-label">Hiện khi field</label>
            <select className="ffb-input" value={field.conditionalVisibility.fieldKey}
              onChange={(e) => setCond({ fieldKey: e.target.value })}>
              <option value="">— chọn field —</option>
              {otherFields.map((f) => (
                <option key={f.id} value={f.key}>{f.label || f.key} ({`{{${f.key}}}`})</option>
              ))}
            </select>
            <select className="ffb-input" value={field.conditionalVisibility.operator}
              onChange={(e) => setCond({ operator: e.target.value as FieldConditionalVisibility["operator"] })}>
              <option value="equals">Bằng</option>
              <option value="not_equals">Khác</option>
              <option value="contains">Chứa</option>
              <option value="is_empty">Là rỗng</option>
              <option value="is_not_empty">Không rỗng</option>
            </select>
            {!["is_empty", "is_not_empty"].includes(field.conditionalVisibility.operator) && (
              <input className="ffb-input" value={field.conditionalVisibility.value}
                onChange={(e) => setCond({ value: e.target.value })} placeholder="Giá trị so sánh" />
            )}
          </div>
        )}
      </Section>

      {/* 4. Default values */}
      <Section title="Cấu hình dữ liệu" index={4}>
        <label className="ffb-field-label">Nguồn giá trị mặc định</label>
        <select className="ffb-input" value={field.defaultValue?.source ?? "fixed"}
          onChange={(e) => setDefault({ source: e.target.value as FieldDefaultValue["source"] })}>
          <option value="fixed">Cố định</option>
          <option value="variable">Từ biến flow {"{{var}}"}</option>
          <option value="previous">Từ bước trước</option>
        </select>
        <input className="ffb-input" value={field.defaultValue?.value ?? ""}
          onChange={(e) => setDefault({ value: e.target.value })}
          placeholder={
            field.defaultValue?.source === "variable" ? "{{biến_flow}}" :
            field.defaultValue?.source === "previous" ? "tên_bước.field_key" :
            "Giá trị mặc định..."
          } />
      </Section>
    </div>
  );
};

// ── Main FormBuilder ───────────────────────────────────────────────────────

type Props = {
  fields: FormField[];
  onChangeFields: (fields: FormField[]) => void;
};

export const FormBuilder: React.FC<Props> = ({ fields, onChangeFields }) => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [dragPayload, setDragPayload] = React.useState<string | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const [canvasOver, setCanvasOver] = React.useState(false);

  const selectedField = fields.find((f) => f.id === selectedId) ?? null;

  const insertField = (type: FieldType, at: number) => {
    const f = makeField(type);
    const next = [...fields];
    next.splice(at, 0, f);
    onChangeFields(next);
    setSelectedId(f.id);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    const updated = fields.map((f) => f.id === id ? { ...f, ...patch } : f);
    // Auto-generate key from label if key is empty
    const field = updated.find((f) => f.id === id);
    if (field && !field.key && "label" in patch) {
      return onChangeFields(updated.map((f) => f.id === id ? { ...f, key: toKey(f.label) } : f));
    }
    onChangeFields(updated);
  };

  const duplicateField = (id: string) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const copy: FormField = {
      ...fields[idx],
      id: uid("field"),
      key: fields[idx].key ? `${fields[idx].key}_copy` : "",
      options: (fields[idx].options ?? []).map((o) => ({ ...o, id: uid("opt") })),
    };
    const next = [...fields];
    next.splice(idx + 1, 0, copy);
    onChangeFields(next);
    setSelectedId(copy.id);
  };

  const removeField = (id: string) => {
    onChangeFields(fields.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const reorderField = (fromId: string, toIndex: number) => {
    const from = fields.findIndex((f) => f.id === fromId);
    if (from < 0) return;
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    const adjusted = toIndex > from ? toIndex - 1 : toIndex;
    next.splice(adjusted, 0, moved);
    onChangeFields(next);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setCanvasOver(true);
    if (dropIndex === null) setDropIndex(fields.length);
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) {
      setCanvasOver(false);
      setDropIndex(null);
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData("text/plain") || dragPayload;
    const at = dropIndex ?? fields.length;
    if (payload?.startsWith("palette:")) insertField(payload.replace("palette:", "") as FieldType, at);
    else if (payload?.startsWith("field:")) reorderField(payload.replace("field:", ""), at);
    setCanvasOver(false); setDropIndex(null); setDragPayload(null);
  };

  return (
    <div className="ffb-root">
      {/* Left: Field Library */}
      <div className="ffb-library">
        <p className="ffb-library__title">Thành phần</p>
        <p className="ffb-library__sub">Kéo thả các trường để cấu hình</p>
        {PALETTE_CATEGORIES.map((cat) => (
          <div key={cat.id} className="ffb-library__cat">
            <p className="ffb-library__cat-label">{cat.label.toUpperCase()}</p>
            {PALETTE.filter((p) => p.category === cat.id).map((meta) => (
              <div
                key={meta.type}
                className="ffb-library__item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", `palette:${meta.type}`);
                  e.dataTransfer.effectAllowed = "copy";
                  setDragPayload(`palette:${meta.type}`);
                }}
                onClick={() => insertField(meta.type, fields.length)}
                title={meta.desc}
              >
                <i className={`ffb-library__icon ${meta.icon}`} />
                <span className="ffb-library__label">{meta.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Center: Canvas */}
      <div className="ffb-center">
        <div className="ffb-center__head">
          <span className="ffb-center__title">Cấu hình form</span>
        </div>
        <div
          className={`ffb-canvas2${canvasOver ? " ffb-canvas2--over" : ""}`}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {fields.length === 0 ? (
            <div className="ffb-canvas2__empty">
              <span className="ffb-canvas2__empty-icon">⊕</span>
              <p>Drop a new field here</p>
            </div>
          ) : (
            <>
              {fields.map((field, idx) => (
                <React.Fragment key={field.id}>
                  <div className={`ffb-drop-zone${dropIndex === idx && canvasOver ? " ffb-drop-zone--active" : ""}`}
                    onDragOver={(e) => { e.stopPropagation(); e.preventDefault(); setDropIndex(idx); setCanvasOver(true); }}
                  />
                  <FieldCard
                    field={field}
                    selected={selectedId === field.id}
                    onClick={() => setSelectedId(field.id === selectedId ? null : field.id)}
                    onDuplicate={() => duplicateField(field.id)}
                    onDelete={() => removeField(field.id)}
                    isDropTarget={dropIndex === idx && canvasOver}
                    onDragOver={(e) => { e.stopPropagation(); e.preventDefault(); setDropIndex(idx); setCanvasOver(true); }}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", `field:${field.id}`);
                      e.dataTransfer.effectAllowed = "move";
                      setDragPayload(`field:${field.id}`);
                    }}
                  />
                </React.Fragment>
              ))}
              <div className={`ffb-drop-zone${dropIndex === fields.length && canvasOver ? " ffb-drop-zone--active" : ""}`}
                onDragOver={(e) => { e.stopPropagation(); e.preventDefault(); setDropIndex(fields.length); setCanvasOver(true); }}
              >
                <span>⊕ Drop a new field here</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Properties */}
      {selectedField ? (
        <FieldProperties
          field={selectedField}
          allFields={fields}
          onChange={(patch) => updateField(selectedField.id, patch)}
          onClose={() => setSelectedId(null)}
        />
      ) : (
        <div className="ffb-props ffb-props--empty">
          <p>Click a field to configure</p>
        </div>
      )}
    </div>
  );
};
