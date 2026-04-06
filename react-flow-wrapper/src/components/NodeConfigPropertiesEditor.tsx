import React from "react";
import type { NodeConfigProperty } from "../workflow/types";
import { uid } from "../workflow/uid";

export type NodeConfigPropertiesEditorProps = {
  items: NodeConfigProperty[];
  onChange: (items: NodeConfigProperty[]) => void;
};

export const NodeConfigPropertiesEditor: React.FC<NodeConfigPropertiesEditorProps> = ({
  items,
  onChange
}) => {
  const updateRow = (id: string, patch: Partial<Pick<NodeConfigProperty, "displayName" | "key" | "value">>) => {
    onChange(items.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    onChange([...items, { id: uid("cfg"), displayName: "", key: "", value: "" }]);
  };

  const removeRow = (id: string) => {
    onChange(items.filter((row) => row.id !== id));
  };

  return (
    <div className="fb-config-props">
      <div className="fb-config-props__head">
        <p className="fb-config-props__title">Cấu hình mở rộng</p>
      </div>

      {items.length === 0 ? (
        <p className="fb-config-props__empty">Chưa có cấu hình nào — bấm &quot;Thêm dòng&quot; để thêm.</p>
      ) : (
        <div className="fb-config-props__table" role="table" aria-label="Danh sách key-value">
          <div className="fb-config-props__row fb-config-props__row--header" role="row">
            <span role="columnheader">Tên trường</span>
            <span role="columnheader">Key</span>
            <span role="columnheader">Giá trị</span>
            <span className="fb-config-props__col-actions" role="columnheader" />
          </div>
          {items.map((row) => (
            <div key={row.id} className="fb-config-props__row" role="row">
              <input
                role="cell"
                className="fb-config-props__input"
                value={row.displayName}
                onChange={(e) => updateRow(row.id, { displayName: e.target.value })}
                placeholder="Tên hiển thị"
                aria-label="Tên trường"
              />
              <input
                role="cell"
                className="fb-config-props__input fb-config-props__input--key"
                value={row.key}
                onChange={(e) => updateRow(row.id, { key: e.target.value })}
                placeholder="key_ky_thuat"
                aria-label="Key"
              />
              <input
                role="cell"
                className="fb-config-props__input"
                value={row.value}
                onChange={(e) => updateRow(row.id, { value: e.target.value })}
                placeholder="Giá trị"
                aria-label="Giá trị"
              />
              <div className="fb-config-props__col-actions" role="cell">
                <button
                  type="button"
                  className="fb-config-props__remove"
                  onClick={() => removeRow(row.id)}
                  title="Xóa dòng"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="fb-config-props__add" onClick={addRow}>
        + Thêm dòng
      </button>
    </div>
  );
};
