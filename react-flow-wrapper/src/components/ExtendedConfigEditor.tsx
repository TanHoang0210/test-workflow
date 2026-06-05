import React from "react";
import type { NodeConfigProperty, ConfigPropertySource, FormField } from "../workflow/types";
import { uid } from "../workflow/uid";

const SOURCE_OPTIONS: { value: ConfigPropertySource; label: string; placeholder: string }[] = [
  { value: "fixed",      label: "Giá trị cố định",  placeholder: "Giá trị tĩnh..." },
  { value: "variable",   label: "Từ biến flow",      placeholder: "{{tên_biến}}" },
  { value: "previous",   label: "Từ bước trước",     placeholder: "bước_trước.field_key" },
  { value: "expression", label: "Expression",        placeholder: "{{a}} + ' ' + {{b}}" },
];

export type ExtendedConfigEditorProps = {
  items: NodeConfigProperty[];
  fields?: FormField[];
  description?: string;
  onDescriptionChange?: (v: string) => void;
  onChange: (items: NodeConfigProperty[]) => void;
};

export const ExtendedConfigEditor: React.FC<ExtendedConfigEditorProps> = ({
  items,
  fields = [],
  description = "",
  onDescriptionChange,
  onChange,
}) => {
  const [jsonOpen, setJsonOpen] = React.useState(false);

  const visibleItems = items.filter(
    (r) => !r.key.startsWith("__") && r.key !== "routingCondition" && r.key !== "outputVariable"
      && r.key !== "timeout" && r.key !== "enableLogging"
  );

  // Duplicate key detection
  const keyCounts = visibleItems.reduce<Record<string, number>>((acc, r) => {
    if (r.key) acc[r.key] = (acc[r.key] ?? 0) + 1;
    return acc;
  }, {});
  const isDuplicate = (key: string) => !!key && (keyCounts[key] ?? 0) > 1;

  const validCount = visibleItems.filter((r) => r.key && !isDuplicate(r.key)).length;
  const errorCount = visibleItems.filter((r) => !r.key || isDuplicate(r.key)).length;

  const updateRow = (id: string, patch: Partial<NodeConfigProperty>) =>
    onChange(items.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () =>
    onChange([...items, { id: uid("cfg"), displayName: "", key: "", value: "", source: "fixed" }]);

  const removeRow = (id: string) =>
    onChange(items.filter((r) => r.id !== id));

  // JSON preview
  const formFieldsPreview = Object.fromEntries(
    fields.filter((f) => f.key).map((f) => [f.key!, null])
  );
  const extendedPreview = Object.fromEntries(
    visibleItems.filter((r) => r.key && !isDuplicate(r.key)).map((r) => [r.key, r.value || null])
  );
  const jsonPreview = JSON.stringify(
    { form_fields: formFieldsPreview, extended: extendedPreview },
    null, 2
  );

  return (
    <div className="ecfg">
      {/* Description */}
      {onDescriptionChange !== undefined && (
        <div className="ecfg__desc-section">
          <label className="ecfg__section-label">Mô tả mục đích node</label>
          <textarea
            className="ecfg__desc-input"
            rows={2}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Mô tả ngắn để người khác hiểu node này làm gì..."
          />
        </div>
      )}

      {/* Table */}
      <div className="ecfg__table-wrap">
        <div className="ecfg__table-head">
          <span className="ecfg__col ecfg__col--key">Tên biến (key)</span>
          <span className="ecfg__col ecfg__col--source">Nguồn</span>
          <span className="ecfg__col ecfg__col--value">Giá trị</span>
          <span className="ecfg__col ecfg__col--del" />
        </div>

        {visibleItems.length === 0 ? (
          <div className="ecfg__empty">Chưa có biến — bấm "Thêm biến" để thêm.</div>
        ) : (
          <div className="ecfg__rows">
            {visibleItems.map((row) => {
              const dup = isDuplicate(row.key);
              const noKey = !row.key;
              const hasError = dup || noKey;
              const src = row.source ?? "fixed";
              const placeholder = SOURCE_OPTIONS.find((s) => s.value === src)?.placeholder ?? "";
              return (
                <div key={row.id} className={`ecfg__row${hasError ? " ecfg__row--error" : ""}`}>
                  <div className="ecfg__col ecfg__col--key">
                    <input
                      className="ecfg__input ecfg__input--mono"
                      value={row.key}
                      onChange={(e) => updateRow(row.id, { key: e.target.value.replace(/\s/g, "_") })}
                      placeholder="variable_key"
                    />
                    {dup && <span className="ecfg__error-hint">Key trùng lặp</span>}
                    {noKey && <span className="ecfg__error-hint">Key không được rỗng</span>}
                  </div>
                  <div className="ecfg__col ecfg__col--source">
                    <select
                      className="ecfg__select"
                      value={src}
                      onChange={(e) => updateRow(row.id, { source: e.target.value as ConfigPropertySource })}
                    >
                      {SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ecfg__col ecfg__col--value">
                    <input
                      className="ecfg__input"
                      value={row.value}
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                      placeholder={placeholder}
                    />
                  </div>
                  <div className="ecfg__col ecfg__col--del">
                    <button type="button" className="ecfg__del" onClick={() => removeRow(row.id)} title="Xóa">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button type="button" className="ecfg__add" onClick={addRow}>
          + Thêm biến
        </button>
      </div>

      {/* Footer */}
      <div className="ecfg__footer">
        <span className="ecfg__footer-valid">{validCount} biến hợp lệ</span>
        {errorCount > 0 && <span className="ecfg__footer-error">· {errorCount} lỗi</span>}
      </div>

      {/* JSON Preview */}
      <div className="ecfg__json-wrap">
        <button
          type="button"
          className="ecfg__json-toggle"
          onClick={() => setJsonOpen((v) => !v)}
        >
          <span className={`ecfg__json-arrow${jsonOpen ? " ecfg__json-arrow--open" : ""}`}>›</span>
          JSON Preview
          <span className="ecfg__json-hint">Kiểm tra output trước khi lưu</span>
        </button>
        {jsonOpen && (
          <div className="ecfg__json-body">
            <div className="ecfg__json-legend">
              <span className="ecfg__json-badge ecfg__json-badge--form">form_fields</span>
              <span className="ecfg__json-legend-desc">dữ liệu người dùng nhập</span>
              <span className="ecfg__json-badge ecfg__json-badge--ext">extended</span>
              <span className="ecfg__json-legend-desc">biến bổ sung từ tab này</span>
            </div>
            <pre className="ecfg__json-pre">{jsonPreview}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
