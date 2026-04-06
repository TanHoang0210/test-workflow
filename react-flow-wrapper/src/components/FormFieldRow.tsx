import React from "react";
import type { FieldType, FormField } from "../workflow/types";
import { HAS_OPTIONS, PALETTE_MAP } from "../workflow/constants";
import { uid } from "../workflow/uid";

export type FormFieldRowProps = {
  field: FormField;
  index: number;
  total: number;
  onChange: (id: string, patch: Partial<FormField>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  isDropTarget: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
};

export const FormFieldRow: React.FC<FormFieldRowProps> = ({
  field,
  index,
  total,
  onChange,
  onDelete,
  onMove,
  isDropTarget,
  onDragOver,
  onDragStart
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const meta = PALETTE_MAP[field.type];

  const addOption = () =>
    onChange(field.id, { options: [...field.options, { id: uid("opt"), label: "" }] });

  const updateOption = (optId: string, label: string) =>
    onChange(field.id, { options: field.options.map((o) => (o.id === optId ? { ...o, label } : o)) });

  const removeOption = (optId: string) =>
    onChange(field.id, { options: field.options.filter((o) => o.id !== optId) });

  return (
    <div
      className={`field-row${isDropTarget ? " field-row--drop-target" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
    >
      <div className="field-row__main">
        <span className="field-row__drag-handle" title="Kéo để sắp xếp">
          ⠿
        </span>
        <span className="field-row__type-icon" title={meta.label}>
          {meta.icon}
        </span>
        <input
          className="field-row__label-input"
          value={field.label}
          onChange={(e) => onChange(field.id, { label: e.target.value })}
          placeholder={`Tên trường (${meta.label.toLowerCase()})...`}
        />
        <div className="field-row__actions">
          {HAS_OPTIONS.includes(field.type as FieldType) && (
            <button
              type="button"
              className={`field-row__btn field-row__btn--expand${expanded ? " field-row__btn--expanded" : ""}`}
              onClick={() => setExpanded((v) => !v)}
              title="Cài đặt lựa chọn"
            >
              ☰
            </button>
          )}
          <button
            type="button"
            className="field-row__btn"
            onClick={() => onMove(field.id, -1)}
            disabled={index === 0}
            title="Di lên"
          >
            ↑
          </button>
          <button
            type="button"
            className="field-row__btn"
            onClick={() => onMove(field.id, 1)}
            disabled={index === total - 1}
            title="Di xuống"
          >
            ↓
          </button>
          <button
            type="button"
            className="field-row__btn field-row__btn--delete"
            onClick={() => onDelete(field.id)}
            title="Xóa trường"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && HAS_OPTIONS.includes(field.type as FieldType) && (
        <div className="field-row__options">
          <p className="field-row__options-title">Các lựa chọn</p>
          {field.options.map((opt, i) => (
            <div key={opt.id} className="field-row__option">
              <span className="field-row__option-num">{i + 1}</span>
              <input
                className="field-row__option-input"
                value={opt.label}
                onChange={(e) => updateOption(opt.id, e.target.value)}
                placeholder="Nhập lựa chọn..."
              />
              <button
                type="button"
                className="field-row__btn field-row__btn--delete"
                onClick={() => removeOption(opt.id)}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="field-row__add-option" onClick={addOption}>
            + Thêm lựa chọn
          </button>
        </div>
      )}
    </div>
  );
};
