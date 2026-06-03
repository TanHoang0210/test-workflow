import React from "react";
import type { FieldType, FormField } from "../workflow/types";
import { HAS_OPTIONS, PALETTE } from "../workflow/constants";
import { uid } from "../workflow/uid";
import { FormFieldRow } from "./FormFieldRow";

type Props = {
  fields: FormField[];
  onChangeFields: (fields: FormField[]) => void;
};

export const FormBuilder: React.FC<Props> = ({ fields, onChangeFields }) => {
  const [dragPayload, setDragPayload] = React.useState<string | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const [canvasOver, setCanvasOver] = React.useState(false);

  const insertField = (type: FieldType, at: number) => {
    const newField: FormField = {
      id: uid("field"),
      type,
      label: "",
      options: HAS_OPTIONS.includes(type)
        ? [{ id: uid("opt"), label: "" }, { id: uid("opt"), label: "" }]
        : [],
    };
    const next = [...fields];
    next.splice(at, 0, newField);
    onChangeFields(next);
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

  const updateField = (id: string, patch: Partial<FormField>) =>
    onChangeFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const removeField = (id: string) =>
    onChangeFields(fields.filter((f) => f.id !== id));

  const moveField = (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= fields.length) return;
    const arr = [...fields];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onChangeFields(arr);
  };

  const handlePaletteDragStart = (e: React.DragEvent, type: FieldType) => {
    e.dataTransfer.setData("text/plain", `palette:${type}`);
    e.dataTransfer.effectAllowed = "copy";
    setDragPayload(`palette:${type}`);
  };

  const handleFieldDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", `field:${id}`);
    e.dataTransfer.effectAllowed = "move";
    setDragPayload(`field:${id}`);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragPayload?.startsWith("palette:") ? "copy" : "move";
    setCanvasOver(true);
    if (dropIndex === null) setDropIndex(fields.length);
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as globalThis.Node | null)) {
      setCanvasOver(false);
      setDropIndex(null);
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData("text/plain") || dragPayload;
    const at = dropIndex ?? fields.length;
    if (payload?.startsWith("palette:")) {
      insertField(payload.replace("palette:", "") as FieldType, at);
    } else if (payload?.startsWith("field:")) {
      reorderField(payload.replace("field:", ""), at);
    }
    setCanvasOver(false);
    setDropIndex(null);
    setDragPayload(null);
  };

  const handleFieldRowDragOver = (e: React.DragEvent, idx: number) => {
    e.stopPropagation();
    e.preventDefault();
    setDropIndex(idx);
    setCanvasOver(true);
  };

  const handleDragEnd = () => {
    setDragPayload(null);
    setDropIndex(null);
    setCanvasOver(false);
  };

  return (
    <div className="fb-body">
      <div className="fb-palette">
        <p className="fb-palette__heading">Các tùy chọn</p>
        {PALETTE.map((meta) => (
          <div
            key={meta.type}
            className="fb-palette__item"
            draggable
            onDragStart={(e) => handlePaletteDragStart(e, meta.type)}
            onDragEnd={handleDragEnd}
            onClick={() => insertField(meta.type, fields.length)}
            title="Click để thêm hoặc kéo thả vào Form"
          >
            <span className="fb-palette__icon"><i className={meta.icon} /></span>
            <div className="fb-palette__info">
              <span className="fb-palette__label">{meta.label}</span>
              <span className="fb-palette__desc">{meta.desc}</span>
            </div>
          </div>
        ))}
        <div className="fb-palette__footer">Kéo thả để thêm vào Form</div>
      </div>
      <div className="fb-divider" />
      <div
        className={`fb-canvas${canvasOver ? " fb-canvas--over" : ""}`}
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
        onDrop={handleCanvasDrop}
      >
        {fields.length === 0 ? (
          <div className="fb-canvas__empty">
            <span className="fb-canvas__empty-icon">⊕</span>
            <p>Kéo trường từ bên trái và thả vào đây<br />để xây dựng form</p>
          </div>
        ) : (
          <div className="fb-canvas__list">
            {fields.map((field, idx) => (
              <React.Fragment key={field.id}>
                <div
                  className={`fb-drop-line${dropIndex === idx && canvasOver ? " fb-drop-line--active" : ""}`}
                />
                <FormFieldRow
                  field={field}
                  index={idx}
                  total={fields.length}
                  onChange={updateField}
                  onDelete={removeField}
                  onMove={moveField}
                  isDropTarget={dropIndex === idx && canvasOver}
                  onDragOver={(e) => handleFieldRowDragOver(e, idx)}
                  onDragStart={(e) => handleFieldDragStart(e, field.id)}
                />
              </React.Fragment>
            ))}
            <div
              className={`fb-drop-line${dropIndex === fields.length && canvasOver ? " fb-drop-line--active" : ""}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};
