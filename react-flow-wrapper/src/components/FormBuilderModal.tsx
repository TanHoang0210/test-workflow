import React from "react";
import type { Edge } from "reactflow";
import type { Node as FlowNode } from "reactflow";
import type { FieldType, FormField, NodeFormData, WorkflowNodeData, WorkflowNodeType } from "../workflow/types";
import { HAS_OPTIONS, PALETTE } from "../workflow/constants";
import { getOutgoingBranchTargets } from "../workflow/graphUtils";
import { uid } from "../workflow/uid";
import { FormFieldRow } from "./FormFieldRow";
import { NodeConfigPropertiesEditor } from "./NodeConfigPropertiesEditor";

type BuilderModalTab = "conditions" | "form" | "config";

export type FormBuilderModalProps = {
  form: NodeFormData;
  nodeType: WorkflowNodeType;
  conditionSourceNodeId?: string | null;
  graphEdges?: Edge[];
  graphNodes?: FlowNode<WorkflowNodeData>[];
  onSave: (form: NodeFormData) => void;
  onClose: () => void;
};

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  form,
  nodeType,
  conditionSourceNodeId,
  graphEdges = [],
  graphNodes = [],
  onSave,
  onClose
}) => {
  const conditionBranchTargets = React.useMemo(() => {
    if (nodeType !== "condition" || !conditionSourceNodeId) return [];
    return getOutgoingBranchTargets(conditionSourceNodeId, graphEdges, graphNodes);
  }, [nodeType, conditionSourceNodeId, graphEdges, graphNodes]);

  const conditionIncomingCount = React.useMemo(() => {
    if (nodeType !== "condition" || !conditionSourceNodeId) return 0;
    return graphEdges.filter((e) => e.target === conditionSourceNodeId).length;
  }, [nodeType, conditionSourceNodeId, graphEdges]);

  const [modalTab, setModalTab] = React.useState<BuilderModalTab>(() =>
    nodeType === "condition" ? "conditions" : "form"
  );

  React.useEffect(() => {
    setModalTab(nodeType === "condition" ? "conditions" : "form");
  }, [nodeType]);

  const [localForm, setLocalForm] = React.useState<NodeFormData>(() => ({
    label: form.label,
    routingCondition: form.routingCondition ?? "",
    branchConditions: { ...(form.branchConditions ?? {}) },
    fields: form.fields.map((f) => ({ ...f, options: f.options.map((o) => ({ ...o })) })),
    configProperties: (form.configProperties ?? []).map((c) => ({ ...c }))
  }));

  React.useEffect(() => {
    if (nodeType !== "condition") return;
    setLocalForm((prev) => {
      const next: Record<string, string> = { ...prev.branchConditions };
      for (const t of conditionBranchTargets) {
        if (!(t.targetId in next)) next[t.targetId] = "";
      }
      const keep = new Set(conditionBranchTargets.map((x) => x.targetId));
      for (const k of Object.keys(next)) {
        if (!keep.has(k)) delete next[k];
      }
      return { ...prev, branchConditions: next };
    });
  }, [nodeType, conditionBranchTargets]);

  const [dragPayload, setDragPayload] = React.useState<string | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const [canvasOver, setCanvasOver] = React.useState(false);

  const insertField = (type: FieldType, at: number) => {
    const newField = {
      id: uid("field"),
      type,
      label: "",
      options: HAS_OPTIONS.includes(type)
        ? [{ id: uid("opt"), label: "" }, { id: uid("opt"), label: "" }]
        : []
    };
    setLocalForm((prev) => {
      const fields = [...prev.fields];
      fields.splice(at, 0, newField);
      return { ...prev, fields };
    });
  };

  const reorderField = (fromId: string, toIndex: number) => {
    setLocalForm((prev) => {
      const from = prev.fields.findIndex((f) => f.id === fromId);
      if (from < 0) return prev;
      const fields = [...prev.fields];
      const [moved] = fields.splice(from, 1);
      const adjusted = toIndex > from ? toIndex - 1 : toIndex;
      fields.splice(adjusted, 0, moved);
      return { ...prev, fields };
    });
  };

  const updateField = (id: string, patch: Partial<FormField>) =>
    setLocalForm((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...patch } : f))
    }));

  const removeField = (id: string) =>
    setLocalForm((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== id) }));

  const moveField = (id: string, dir: -1 | 1) =>
    setLocalForm((prev) => {
      const idx = prev.fields.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.fields.length) return prev;
      const fields = [...prev.fields];
      [fields[idx], fields[next]] = [fields[next], fields[idx]];
      return { ...prev, fields };
    });

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
    if (dropIndex === null) setDropIndex(localForm.fields.length);
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
    const at = dropIndex ?? localForm.fields.length;
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

  const formBuilderBody = (
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
            title="Kéo thả để thêm vào Form"
          >
            <span className="fb-palette__icon">{meta.icon}</span>
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
        {localForm.fields.length === 0 ? (
          <div className="fb-canvas__empty">
            <span className="fb-canvas__empty-icon">⊕</span>
            <p>
              Kéo trường từ bên trái và thả vào đây
              <br />
              để xây dựng form
            </p>
          </div>
        ) : (
          <div className="fb-canvas__list">
            {localForm.fields.map((field, idx) => (
              <React.Fragment key={field.id}>
                <div
                  className={`fb-drop-line${dropIndex === idx && canvasOver ? " fb-drop-line--active" : ""}`}
                />
                <FormFieldRow
                  field={field}
                  index={idx}
                  total={localForm.fields.length}
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
              className={`fb-drop-line${dropIndex === localForm.fields.length && canvasOver ? " fb-drop-line--active" : ""}`}
            />
          </div>
        )}
      </div>
    </div>
  );

  const conditionRoutingPanel = (
    <div className="fb-routing">
      <p className="fb-routing__label">Điều kiện theo từng nhánh</p>
      {conditionBranchTargets.length === 0 ? (
        <>
          <p className="fb-routing__empty">Chưa có flow để thêm điều kiện.</p>
          {conditionIncomingCount > 0 && (
            <p className="fb-routing__hint fb-routing__hint--incoming">
              Bạn đang có {conditionIncomingCount} cạnh <strong>vào</strong> node này; ô điều kiện chỉ tính theo
              cạnh <strong>đi ra</strong> (từ node điều kiện tới bước sau). Hãy nối từ thoi sang node tiếp theo.
            </p>
          )}
        </>
      ) : (
        <div className="fb-routing__branches">
          {conditionBranchTargets.map((t) => (
            <div key={t.targetId} className="fb-routing__branch">
              <label className="fb-routing__branch-label" htmlFor={`fb-branch-${t.targetId}`}>
                → {t.targetLabel}
                <span className="fb-routing__branch-id">({t.targetId})</span>
              </label>
              <textarea
                id={`fb-branch-${t.targetId}`}
                className="fb-routing__textarea"
                rows={2}
                value={localForm.branchConditions[t.targetId] ?? ""}
                onChange={(e) =>
                  setLocalForm((p) => ({
                    ...p,
                    branchConditions: { ...p.branchConditions, [t.targetId]: e.target.value }
                  }))
                }
                placeholder="Điều kiện khi đi nhánh này..."
              />
            </div>
          ))}
        </div>
      )}
      {/* <p className="fb-routing__hint">
        Số ô bằng số node đích được nối từ node điều kiện (mỗi đích một ô).
      </p> */}
    </div>
  );

  return (
    <div className="fb-backdrop" onClick={onClose}>
      <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fb-header">
          <div className="fb-header__name-area">
            <label className="fb-header__name-label" htmlFor="fb-form-name-input">
              Tên form
            </label>
            <input
              id="fb-form-name-input"
              className="fb-header__name-input"
              value={localForm.label}
              onChange={(e) => setLocalForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="Tiêu đề form / tên bước..."
              autoFocus
            />
          </div>
          <button type="button" className="fb-header__close" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        <div className="fb-modal__scroll fb-modal__scroll--tabs">
          <div
            className="fb-tabs"
            role="tablist"
            aria-label={nodeType === "condition" ? "Chỉnh sửa node điều kiện" : "Chỉnh sửa form node"}
          >
            {nodeType === "condition" && (
              <button
                type="button"
                role="tab"
                id="fb-tab-conditions"
                aria-selected={modalTab === "conditions"}
                aria-controls="fb-panel-conditions"
                className={`fb-tab${modalTab === "conditions" ? " fb-tab--active" : ""}`}
                onClick={() => setModalTab("conditions")}
              >
                Điều kiện nhánh
              </button>
            )}
            <button
              type="button"
              role="tab"
              id="fb-tab-form"
              aria-selected={modalTab === "form"}
              aria-controls="fb-panel-form"
              className={`fb-tab${modalTab === "form" ? " fb-tab--active" : ""}`}
              onClick={() => setModalTab("form")}
            >
              Form
            </button>
            <button
              type="button"
              role="tab"
              id="fb-tab-config"
              aria-selected={modalTab === "config"}
              aria-controls="fb-panel-config"
              className={`fb-tab${modalTab === "config" ? " fb-tab--active" : ""}`}
              onClick={() => setModalTab("config")}
            >
              Cấu hình mở rộng
            </button>
          </div>
          {nodeType === "condition" && modalTab === "conditions" && (
            <div
              className="fb-tab-panel fb-tab-panel--scroll"
              id="fb-panel-conditions"
              role="tabpanel"
              aria-labelledby="fb-tab-conditions"
            >
              {conditionRoutingPanel}
            </div>
          )}
          {modalTab === "form" && (
            <div
              className="fb-tab-panel fb-tab-panel--form"
              id="fb-panel-form"
              role="tabpanel"
              aria-labelledby="fb-tab-form"
            >
              {formBuilderBody}
            </div>
          )}
          {modalTab === "config" && (
            <div
              className="fb-tab-panel fb-tab-panel--scroll fb-tab-panel--config"
              id="fb-panel-config"
              role="tabpanel"
              aria-labelledby="fb-tab-config"
            >
              <NodeConfigPropertiesEditor
                items={localForm.configProperties}
                onChange={(configProperties) => setLocalForm((p) => ({ ...p, configProperties }))}
              />
            </div>
          )}
        </div>

        <div className="fb-footer">
          <button type="button" className="fb-btn fb-btn--ghost" onClick={onClose}>
            HỦY BỎ
          </button>
          <button type="button" className="fb-btn fb-btn--primary" onClick={() => onSave(localForm)}>
            LƯU
          </button>
        </div>
      </div>
    </div>
  );
};
