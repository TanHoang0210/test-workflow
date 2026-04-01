import React from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  Handle,
  Position,
  useEdgesState,
  useNodesState,
  useReactFlow,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  type Connection,
  type Edge,
  type NodeProps,
  type EdgeProps,
  type XYPosition,
  type OnNodesChange,
  type OnEdgesChange
} from "reactflow";
import type { Node as FlowNode } from "reactflow";
import "reactflow/dist/style.css";
import "./FlowComponent.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType = "text" | "textarea" | "date" | "select" | "radio" | "checklist";

type FieldOption = { id: string; label: string };

type FormField = {
  id: string;
  type: FieldType;
  label: string;
  options: FieldOption[];
};

type NodeFormData = {
  label: string;
  /**
   * Node điều kiện: một ô điều kiện cho mỗi node đích (theo số cạnh nối ra, unique theo target).
   * Key = id node target.
   */
  branchConditions: Record<string, string>;
  /** JSON cũ: migrate sang branchConditions khi mở form */
  routingCondition?: string;
  fields: FormField[];
};

type WorkflowNodeType = "start-event" | "activity" | "condition" | "end-event";

type WorkflowNodeData = {
  nodeType: WorkflowNodeType;
  formData: NodeFormData;
  onConfigure: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
};

type ModalState = {
  isOpen: boolean;
  nodeId: string | null;
  nodeType: WorkflowNodeType | null;
  form: NodeFormData;
};

type EdgeData = {
  onDeleteEdge: (edgeId: string) => void;
};

// ─── ID helpers ───────────────────────────────────────────────────────────────

let _cnt = 0;
const uid = (prefix: string) => `${prefix}_${Date.now()}_${_cnt++}`;

// ─── Palette metadata ─────────────────────────────────────────────────────────

type FieldMeta = { type: FieldType; label: string; desc: string; icon: string };

const PALETTE: FieldMeta[] = [
  { type: "text",      label: "Text",    desc: "Trường nhập văn bản ngắn, một dòng",       icon: "T"  },
  { type: "textarea",  label: "Textarea",   desc: "Trường nhập văn bản dài, nhiều dòng",       icon: "¶"  },
  { type: "date",      label: "Date", desc: "Chọn ngày, tháng, năm cụ thể",              icon: "▦"  },
  { type: "select",    label: "Select",  desc: "Chọn một giá trị từ danh sách lựa chọn",    icon: "☰"  },
  { type: "radio",     label: "Radio",      desc: "Chọn duy nhất một trong các lựa chọn",      icon: "◉"  },
  { type: "checklist", label: "Checklist",  desc: "Chọn một hoặc nhiều giá trị từ danh sách",  icon: "☑"  }
];

const PALETTE_MAP = Object.fromEntries(PALETTE.map((p) => [p.type, p])) as Record<FieldType, FieldMeta>;

const HAS_OPTIONS: FieldType[] = ["select", "radio", "checklist"];

const NODE_TYPE_LABELS: Record<WorkflowNodeType, string> = {
  "start-event": "Bắt đầu",
  activity: "Hoạt động",
  condition: "Điều kiện",
  "end-event": "Kết thúc"
};

/** MIME dùng cho kéo từ sidebar vào canvas */
const WORKFLOW_NODE_DRAG_MIME = "text/workflow-node-type";

/** Persist: trình duyệt + file tĩnh (Angular/Vite public/) */
const WORKFLOW_STORAGE_KEY = "workflow-builder-state-v1";
const WORKFLOW_PUBLIC_JSON = "/workflow-save.json";

type WorkflowPersistPayloadV1 = {
  version: "1.0";
  savedAt?: string;
  nodes: Array<{
    id: string;
    type: string;
    position: XYPosition;
    label: string;
    routingCondition?: string;
    branchConditions?: Record<string, string>;
    fields: FormField[];
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }>;
};

function buildWorkflowPayloadV1(
  nodeList: FlowNode<WorkflowNodeData>[],
  edgeList: Edge[]
): WorkflowPersistPayloadV1 {
  return {
    version: "1.0",
    savedAt: new Date().toISOString(),
    nodes: nodeList.map((n) => ({
      id: n.id,
      type: n.data.nodeType,
      position: n.position,
      label: n.data.formData.label,
      routingCondition: n.data.formData.routingCondition ?? "",
      branchConditions: n.data.formData.branchConditions ?? {},
      fields: n.data.formData.fields
    })),
    edges: edgeList.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null
    }))
  };
}

const SIDEBAR_NODE_ITEMS: { type: WorkflowNodeType; tooltip: string }[] = [
  {
    type: "start-event",
    tooltip: "Bắt đầu — kéo thả vào lưới để tạo node, hoặc click để thêm nhanh"
  },
  {
    type: "activity",
    tooltip: "Hoạt động — kéo thả vào lưới hoặc click để thêm nhanh"
  },
  {
    type: "condition",
    tooltip: "Điều kiện — mô tả nhánh IF / ELSE trong form"
  },
  {
    type: "end-event",
    tooltip: "Kết thúc — kéo thả vào lưới hoặc click để thêm nhanh"
  }
];

/** Icon riêng từng loại node — nhãn đầy đủ chỉ trong title (tooltip). */
const NodeTypeGlyph: React.FC<{ nodeType: WorkflowNodeType; className?: string }> = ({ nodeType, className }) => {
  const cls = className ?? "workflow-node__glyph";
  switch (nodeType) {
    case "start-event":
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M10.2 8.4v7.2L15.8 12 10.2 8.4z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "end-event":
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <rect x="5.5" y="5.5" width="13" height="13" rx="2.5" fill="currentColor" stroke="none" opacity={0.95} />
        </svg>
      );
    case "condition":
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2.5l8.5 9.5L12 21.5 3.5 12 12 2.5z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity={0.92}
          />
        </svg>
      );
    case "activity":
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 4.5L19 12l-7 7.5-7-7.5L12 4.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};

const DuplicateToolbarIcon: React.FC = () => (
  <svg className="workflow-node__toolbar-svg" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const TrashToolbarIcon: React.FC = () => (
  <svg className="workflow-node__toolbar-svg" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
    />
  </svg>
);

const defaultFormData = (type: WorkflowNodeType): NodeFormData => {
  const empty: NodeFormData = {
    label: "",
    branchConditions: {},
    routingCondition: "",
    fields: []
  };
  if (type === "start-event") {
    return { ...empty, label: "Bắt đầu", routingCondition: "" };
  }
  if (type === "end-event") {
    return { ...empty, label: "Kết thúc", routingCondition: "" };
  }
  if (type === "condition") {
    return { ...empty, label: "Điều kiện", routingCondition: "" };
  }
  return { ...empty, label: "Bước", routingCondition: "" };
};

/** Các node đích (unique, thứ tự theo cạnh nối ra) từ node điều kiện */
function getOutgoingBranchTargets(
  sourceId: string,
  edgeList: Edge[],
  nodeList: FlowNode<WorkflowNodeData>[]
): { targetId: string; targetLabel: string }[] {
  const seen = new Set<string>();
  const out: { targetId: string; targetLabel: string }[] = [];
  for (const e of edgeList) {
    if (e.source !== sourceId) continue;
    if (seen.has(e.target)) continue;
    seen.add(e.target);
    const tn = nodeList.find((n) => n.id === e.target);
    const lab = tn?.data.formData.label?.trim();
    out.push({
      targetId: e.target,
      targetLabel: lab && lab.length > 0 ? lab : `Node ${e.target}`
    });
  }
  return out;
}

/** Gộp dữ liệu form với danh sách target hiện tại; migrate routingCondition cũ */
function mergeBranchFormData(
  form: NodeFormData,
  targetIds: string[]
): NodeFormData {
  const prev = form.branchConditions ?? {};
  const legacy = (form.routingCondition ?? "").trim();
  const next: Record<string, string> = {};
  for (const tid of targetIds) {
    next[tid] = prev[tid] ?? "";
  }
  const allEmpty = targetIds.every((tid) => !next[tid]?.trim());
  if (legacy && allEmpty && targetIds.length > 0) {
    next[targetIds[0]] = legacy;
  }
  return { ...form, branchConditions: next };
}

function isWorkflowNodeTypeString(s: string): s is WorkflowNodeType {
  return (
    s === "start-event" ||
    s === "activity" ||
    s === "condition" ||
    s === "end-event"
  );
}

function computeNextNodeIdFromPersisted(
  persistedNodes: Array<{ id: string }>
): number {
  let max = 0;
  for (const n of persistedNodes) {
    const v = parseInt(n.id, 10);
    if (!Number.isNaN(v)) max = Math.max(max, v);
  }
  return max + 1;
}

function hydrateWorkflowNodes(
  list: WorkflowPersistPayloadV1["nodes"],
  makeData: (t: WorkflowNodeType) => WorkflowNodeData
): FlowNode<WorkflowNodeData>[] {
  const out: FlowNode<WorkflowNodeData>[] = [];
  for (const n of list) {
    if (!isWorkflowNodeTypeString(n.type)) continue;
    const t = n.type;
    out.push({
      id: String(n.id),
      type: t,
      position: n.position,
      data: {
        ...makeData(t),
        formData: {
          label: typeof n.label === "string" ? n.label : defaultFormData(t).label,
          routingCondition:
            typeof n.routingCondition === "string" ? n.routingCondition : "",
          branchConditions:
            n.branchConditions &&
            typeof n.branchConditions === "object" &&
            !Array.isArray(n.branchConditions)
              ? { ...n.branchConditions }
              : {},
          fields: Array.isArray(n.fields) ? n.fields : []
        }
      }
    });
  }
  return out;
}

function hydrateWorkflowEdges(
  list: WorkflowPersistPayloadV1["edges"] | undefined,
  onDeleteEdge: (edgeId: string) => void
): Edge[] {
  if (!Array.isArray(list)) return [];
  return list.map((e) => ({
    id: String(e.id),
    source: String(e.source),
    target: String(e.target),
    type: "deletable" as const,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    data: { onDeleteEdge: (edgeId: string) => onDeleteEdge(edgeId) }
  }));
}

function parseWorkflowPayload(raw: string): WorkflowPersistPayloadV1 | null {
  try {
    const p = JSON.parse(raw) as WorkflowPersistPayloadV1;
    if (p?.version !== "1.0" || !Array.isArray(p.nodes)) return null;
    return p;
  } catch {
    return null;
  }
}

function tryReadPersistedPayload(): WorkflowPersistPayloadV1 | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!raw) return null;
    return parseWorkflowPayload(raw);
  } catch {
    return null;
  }
}

// ─── Custom Edge ──────────────────────────────────────────────────────────────

const DeletableEdge: React.FC<EdgeProps<EdgeData>> = ({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition
  });
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: selected ? "#2563eb" : "#94a3b8", strokeWidth: selected ? 2.5 : 1.5 }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 10
            }}
            className="nodrag nopan"
          >
            <button
              className="edge-delete-btn"
              onClick={(e) => { e.stopPropagation(); data?.onDeleteEdge(id); }}
              title="Xóa kết nối"
            >✕</button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// ─── Workflow Node Card ───────────────────────────────────────────────────────

const WorkflowNodeView: React.FC<NodeProps<WorkflowNodeData>> = ({ id, data }) => {
  const isStart = data.nodeType === "start-event";
  const isEnd = data.nodeType === "end-event";
  const isCondition = data.nodeType === "condition";
  const { formData } = data;

  const branchPreview = isCondition
    ? Object.values(formData.branchConditions ?? {})
        .map((s) => (s ?? "").trim())
        .filter(Boolean)
        .join(" · ")
    : (formData.routingCondition ?? "").trim();
  const tip = `${NODE_TYPE_LABELS[data.nodeType]} · ${formData.label}${branchPreview ? ` — ${branchPreview.slice(0, 80)}${branchPreview.length > 80 ? "…" : ""}` : ""} — double-click để sửa`;

  const toolbar = (
    <div className="workflow-node__float-toolbar nodrag nopan">
      <button
        type="button"
        className="workflow-node__toolbar-btn"
        title="Nhân bản node — tạo bản sao cạnh node này"
        onClick={(e) => {
          e.stopPropagation();
          data.onDuplicate(id);
        }}
      >
        <DuplicateToolbarIcon />
        <span className="sr-only">Nhân bản</span>
      </button>
      <button
        type="button"
        className="workflow-node__toolbar-btn"
        title="Xóa node — gỡ node và mọi kết nối"
        onClick={(e) => {
          e.stopPropagation();
          data.onDelete(id);
        }}
      >
        <TrashToolbarIcon />
        <span className="sr-only">Xóa</span>
      </button>
    </div>
  );

  const coreRow = (
    <div className={`workflow-node__row${isCondition ? " workflow-node__row--in-diamond" : ""}`}>
      {!isCondition && (
        <span className={`workflow-node__icon-wrap workflow-node__icon-wrap--${data.nodeType}`}>
          <NodeTypeGlyph nodeType={data.nodeType} />
          <span className="sr-only">{NODE_TYPE_LABELS[data.nodeType]}</span>
        </span>
      )}
      <p className="workflow-node__title">{formData.label}</p>
    </div>
  );

  if (isCondition) {
    return (
      <div
        className="workflow-node workflow-node--condition"
        title={tip}
        onDoubleClick={(e) => {
          e.stopPropagation();
          data.onConfigure(id);
        }}
      >
        {toolbar}
        {!isStart && <Handle type="target" position={Position.Left} className="workflow-node__handle" />}
        <div className="workflow-node__diamond-outer">
          <div className="workflow-node__diamond-rot">
            <div className="workflow-node__diamond-face">{coreRow}</div>
          </div>
        </div>
        {!isEnd && <Handle type="source" position={Position.Right} className="workflow-node__handle" />}
      </div>
    );
  }

  return (
    <div
      className={`workflow-node workflow-node--${data.nodeType}`}
      title={tip}
      onDoubleClick={(e) => {
        e.stopPropagation();
        data.onConfigure(id);
      }}
    >
      {toolbar}
      {!isStart && <Handle type="target" position={Position.Left} className="workflow-node__handle" />}
      {coreRow}
      {!isEnd && <Handle type="source" position={Position.Right} className="workflow-node__handle" />}
    </div>
  );
};

// ─── Field Row (inside form builder) ─────────────────────────────────────────

type FieldRowProps = {
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

const FieldRow: React.FC<FieldRowProps> = ({
  field, index, total, onChange, onDelete, onMove, isDropTarget, onDragOver, onDragStart
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
        <span className="field-row__drag-handle" title="Kéo để sắp xếp">⠿</span>
        <span className="field-row__type-icon" title={meta.label}>{meta.icon}</span>
        <input
          className="field-row__label-input"
          value={field.label}
          onChange={(e) => onChange(field.id, { label: e.target.value })}
          placeholder={`Tên trường (${meta.label.toLowerCase()})...`}
        />
        <div className="field-row__actions">
          {HAS_OPTIONS.includes(field.type) && (
            <button
              type="button"
              className={`field-row__btn field-row__btn--expand${expanded ? " field-row__btn--expanded" : ""}`}
              onClick={() => setExpanded((v) => !v)}
              title="Cài đặt lựa chọn"
            >☰</button>
          )}
          <button
            type="button"
            className="field-row__btn"
            onClick={() => onMove(field.id, -1)}
            disabled={index === 0}
            title="Di lên"
          >↑</button>
          <button
            type="button"
            className="field-row__btn"
            onClick={() => onMove(field.id, 1)}
            disabled={index === total - 1}
            title="Di xuống"
          >↓</button>
          <button
            type="button"
            className="field-row__btn field-row__btn--delete"
            onClick={() => onDelete(field.id)}
            title="Xóa trường"
          >✕</button>
        </div>
      </div>

      {expanded && HAS_OPTIONS.includes(field.type) && (
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
              >✕</button>
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

// ─── Form Builder Modal ───────────────────────────────────────────────────────

type FormBuilderModalProps = {
  form: NodeFormData;
  nodeType: WorkflowNodeType;
  /** Node điều kiện: tính nhánh từ graph (cạnh nối ra) — luôn khớp edges hiện tại */
  conditionSourceNodeId?: string | null;
  graphEdges?: Edge[];
  graphNodes?: FlowNode<WorkflowNodeData>[];
  onSave: (form: NodeFormData) => void;
  onClose: () => void;
};

const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
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

  const [conditionModalTab, setConditionModalTab] = React.useState<"conditions" | "form">("conditions");

  const [localForm, setLocalForm] = React.useState<NodeFormData>(() => ({
    label: form.label,
    routingCondition: form.routingCondition ?? "",
    branchConditions: { ...(form.branchConditions ?? {}) },
    fields: form.fields.map((f) => ({ ...f, options: f.options.map((o) => ({ ...o })) }))
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

  // drag state: dragging from palette sets "palette:<type>", dragging existing sets "field:<id>"
  const [dragPayload, setDragPayload] = React.useState<string | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const [canvasOver, setCanvasOver] = React.useState(false);

  // ── Field operations ────────────────────────────────────────────────────

  const insertField = (type: FieldType, at: number) => {
    const newField: FormField = {
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

  // ── Drag from palette ───────────────────────────────────────────────────

  const handlePaletteDragStart = (e: React.DragEvent, type: FieldType) => {
    e.dataTransfer.setData("text/plain", `palette:${type}`);
    e.dataTransfer.effectAllowed = "copy";
    setDragPayload(`palette:${type}`);
  };

  // ── Drag existing field ─────────────────────────────────────────────────

  const handleFieldDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", `field:${id}`);
    e.dataTransfer.effectAllowed = "move";
    setDragPayload(`field:${id}`);
  };

  // ── Canvas drop zone ────────────────────────────────────────────────────

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
            <p>Kéo trường từ bên trái và thả vào đây<br />để xây dựng form</p>
          </div>
        ) : (
          <div className="fb-canvas__list">
            {localForm.fields.map((field, idx) => (
              <React.Fragment key={field.id}>
                <div
                  className={`fb-drop-line${dropIndex === idx && canvasOver ? " fb-drop-line--active" : ""}`}
                />
                <FieldRow
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
          <p className="fb-routing__empty">
            Chưa có flow được nối ra từ node điều kiện.
          </p>
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
      <p className="fb-routing__hint">
        Số ô bằng số node đích được nối từ node điều kiện (mỗi đích một ô).
      </p>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="fb-backdrop" onClick={onClose}>
      <div className="fb-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="fb-header">
          <div className="fb-header__name-area">
            <label className="fb-header__name-label">Tên form</label>
            <input
              className="fb-header__name-input"
              value={localForm.label}
              onChange={(e) => setLocalForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="Tiêu đề form / tên bước..."
              autoFocus
            />
          </div>
          <button className="fb-header__close" onClick={onClose} title="Đóng">✕</button>
        </div>

        <div
          className={`fb-modal__scroll${nodeType === "condition" ? " fb-modal__scroll--tabs" : ""}`}
        >
          {nodeType === "condition" ? (
            <>
              <div className="fb-tabs" role="tablist" aria-label="Chỉnh sửa node điều kiện">
                <button
                  type="button"
                  role="tab"
                  id="fb-tab-conditions"
                  aria-selected={conditionModalTab === "conditions"}
                  aria-controls="fb-panel-conditions"
                  className={`fb-tab${conditionModalTab === "conditions" ? " fb-tab--active" : ""}`}
                  onClick={() => setConditionModalTab("conditions")}
                >
                  Điều kiện nhánh
                </button>
                <button
                  type="button"
                  role="tab"
                  id="fb-tab-form"
                  aria-selected={conditionModalTab === "form"}
                  aria-controls="fb-panel-form"
                  className={`fb-tab${conditionModalTab === "form" ? " fb-tab--active" : ""}`}
                  onClick={() => setConditionModalTab("form")}
                >
                  Form
                </button>
              </div>
              {conditionModalTab === "conditions" && (
                <div
                  className="fb-tab-panel fb-tab-panel--scroll"
                  id="fb-panel-conditions"
                  role="tabpanel"
                  aria-labelledby="fb-tab-conditions"
                >
                  {conditionRoutingPanel}
                </div>
              )}
              {conditionModalTab === "form" && (
                <div
                  className="fb-tab-panel fb-tab-panel--form"
                  id="fb-panel-form"
                  role="tabpanel"
                  aria-labelledby="fb-tab-form"
                >
                  {formBuilderBody}
                </div>
              )}
            </>
          ) : (
            formBuilderBody
          )}
        </div>

        {/* Footer */}
        <div className="fb-footer">
          <button type="button" className="fb-btn fb-btn--ghost" onClick={onClose}>
            HỦY BỎ
          </button>
          <button type="button" className="fb-btn fb-btn--primary" onClick={() => onSave(localForm)}>
            LƯU FORM
          </button>
        </div>

      </div>
    </div>
  );
};

// ─── React Flow canvas (cần provider để screenToFlowPosition khi drop) ───────

type FlowCanvasInnerProps = {
  nodes: FlowNode<WorkflowNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  nodeTypes: Record<string, React.ComponentType<NodeProps>>;
  edgeTypes: Record<string, React.ComponentType<EdgeProps>>;
  onDropNodeType: (type: WorkflowNodeType, position: XYPosition) => void;
};

const FlowCanvasInner: React.FC<FlowCanvasInnerProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  edgeTypes,
  onDropNodeType
}) => {
  const { screenToFlowPosition } = useReactFlow();

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw =
        e.dataTransfer.getData(WORKFLOW_NODE_DRAG_MIME) ||
        e.dataTransfer.getData("text/plain");
      if (
        raw !== "start-event" &&
        raw !== "activity" &&
        raw !== "condition" &&
        raw !== "end-event"
      ) {
        return;
      }
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onDropNodeType(raw as WorkflowNodeType, position);
    },
    [screenToFlowPosition, onDropNodeType]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      deleteKeyCode={null}
      fitView
    >
      <Background gap={20} size={1} color="#e2e8f0" />
      <Controls />
    </ReactFlow>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

/** Props khi dùng qua web component (Angular: [attr.save-trigger], (workflowSaved)=...) */
export type FlowWidgetProps = {
  /** Mỗi lần tăng (0→1, 1→2…) sẽ lưu graph và bắn CustomEvent `workflowSaved` */
  saveTrigger?: number;
};

const FlowComponent: React.FC<FlowWidgetProps> = ({ saveTrigger }) => {
  const idRef = React.useRef(4);
  const configureNodeRef = React.useRef<(id: string) => void>(() => {});
  const duplicateNodeRef = React.useRef<(id: string) => void>(() => {});
  const deleteNodeRef    = React.useRef<(id: string) => void>(() => {});
  const deleteEdgeRef    = React.useRef<(id: string) => void>(() => {});

  const makeNodeData = (type: WorkflowNodeType): WorkflowNodeData => ({
    nodeType: type,
    formData: defaultFormData(type),
    onConfigure: (id) => configureNodeRef.current(id),
    onDuplicate: (id) => duplicateNodeRef.current(id),
    onDelete:    (id) => deleteNodeRef.current(id)
  });

  // Default: render workflow rỗng. Dữ liệu sẽ được hydrate từ `localStorage` (ưu tiên)
  // hoặc từ `public/workflow-save.json` (nếu file tĩnh có nội dung).
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);

  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [modal, setModal] = React.useState<ModalState>({
    isOpen: false,
    nodeId: null,
    nodeType: null,
    form: defaultFormData("activity")
  });

  const flowRootRef = React.useRef<HTMLDivElement>(null);
  const graphStateRef = React.useRef({ nodes: [] as FlowNode<WorkflowNodeData>[], edges: [] as Edge[] });
  graphStateRef.current = { nodes, edges };

  const prevSaveTriggerRef = React.useRef<number | undefined>(undefined);

  const emitWorkflowSaved = React.useCallback(
    (payload: WorkflowPersistPayloadV1, json: string) => {
      flowRootRef.current?.dispatchEvent(
        new CustomEvent("workflowSaved", {
          detail: { json, payload },
          bubbles: true,
          composed: true
        })
      );
    },
    []
  );

  React.useEffect(() => {
    if (saveTrigger === undefined) return;
    if (prevSaveTriggerRef.current === undefined) {
      prevSaveTriggerRef.current = saveTrigger;
      return;
    }
    if (saveTrigger === prevSaveTriggerRef.current) return;
    prevSaveTriggerRef.current = saveTrigger;

    const { nodes: ns, edges: es } = graphStateRef.current;
    const payload = buildWorkflowPayloadV1(ns, es);
    const json = JSON.stringify(payload, null, 2);
    try {
      localStorage.setItem(WORKFLOW_STORAGE_KEY, json);
    } catch {
      /* ignore */
    }
    emitWorkflowSaved(payload, json);
  }, [saveTrigger, emitWorkflowSaved]);

  // ── Operations ───────────────────────────────────────────────────────────

  const openConfigModal = React.useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const base: NodeFormData = {
      label: node.data.formData.label,
      routingCondition: node.data.formData.routingCondition ?? "",
      branchConditions: { ...(node.data.formData.branchConditions ?? {}) },
      fields: node.data.formData.fields.map((f) => ({
        ...f,
        options: f.options.map((o) => ({ ...o }))
      }))
    };
    const nt = node.data.nodeType;
    const form =
      nt === "condition"
        ? mergeBranchFormData(
            base,
            getOutgoingBranchTargets(nodeId, edges, nodes).map((x) => x.targetId)
          )
        : base;
    setModal({
      isOpen: true,
      nodeId,
      nodeType: nt,
      form
    });
  }, [nodes, edges]);
  configureNodeRef.current = openConfigModal;

  const deleteNode = React.useCallback((nodeId: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);
  deleteNodeRef.current = deleteNode;

  const duplicateNode = React.useCallback((nodeId: string) => {
    setNodes((ns) => {
      const source = ns.find((n) => n.id === nodeId);
      if (!source) return ns;
      const newId = String(idRef.current++);
      const base = source.data.formData.label.trim();
      const label = base.length > 0 ? `${base} (bản sao)` : "Bản sao";
      const fields = source.data.formData.fields.map((f) => ({
        ...f,
        id: uid("field"),
        options: f.options.map((o) => ({ ...o, id: uid("opt") }))
      }));
      const duplicated: FlowNode<WorkflowNodeData> = {
        ...source,
        id: newId,
        position: { x: source.position.x + 40, y: source.position.y + 40 },
        selected: false,
        data: {
          ...source.data,
          formData: {
            label,
            routingCondition: source.data.formData.routingCondition ?? "",
            branchConditions:
              source.data.nodeType === "condition"
                ? {}
                : { ...(source.data.formData.branchConditions ?? {}) },
            fields
          },
          onConfigure: (id) => configureNodeRef.current(id),
          onDuplicate: (id) => duplicateNodeRef.current(id),
          onDelete: (id) => deleteNodeRef.current(id)
        }
      };
      return [...ns, duplicated];
    });
  }, [setNodes]);
  duplicateNodeRef.current = duplicateNode;

  const deleteEdge = React.useCallback(
    (edgeId: string) => setEdges((es) => es.filter((e) => e.id !== edgeId)),
    [setEdges]
  );
  deleteEdgeRef.current = deleteEdge;

  React.useLayoutEffect(() => {
    const p = tryReadPersistedPayload();
    if (!p || p.nodes.length === 0) return;
    const hydrated = hydrateWorkflowNodes(p.nodes, makeNodeData);
    if (hydrated.length === 0) return;
    setNodes(hydrated);
    setEdges(
      hydrateWorkflowEdges(p.edges, (id) => deleteEdgeRef.current(id))
    );
    idRef.current = computeNextNodeIdFromPersisted(p.nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ hydrate một lần lúc mount từ localStorage
  }, []);

  React.useEffect(() => {
    const fromLs = tryReadPersistedPayload();
    if (fromLs && fromLs.nodes.length > 0) return;
    let cancelled = false;
    fetch(WORKFLOW_PUBLIC_JSON, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (cancelled || data == null) return;
        const p =
          typeof data === "object" && data !== null
            ? parseWorkflowPayload(JSON.stringify(data))
            : null;
        if (!p || p.nodes.length === 0) return;
        const hydrated = hydrateWorkflowNodes(p.nodes, makeNodeData);
        if (hydrated.length === 0) return;
        setNodes(hydrated);
        setEdges(
          hydrateWorkflowEdges(p.edges, (id) => deleteEdgeRef.current(id))
        );
        idRef.current = computeNextNodeIdFromPersisted(p.nodes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore mặc định từ file tĩnh khi chưa có localStorage
  }, []);

  const addNode = (type: WorkflowNodeType) => {
    const id = String(idRef.current++);
    setNodes((ns) => [...ns, {
      id, type,
      position: { x: Math.round(Math.random() * 300 + 150), y: Math.round(Math.random() * 200 + 100) },
      data: makeNodeData(type)
    }]);
  };

  const addNodeAt = React.useCallback((type: WorkflowNodeType, position: XYPosition) => {
    const id = String(idRef.current++);
    setNodes((ns) => [...ns, { id, type, position, data: makeNodeData(type) }]);
  }, [setNodes]);

  const onConnect = React.useCallback((connection: Connection) => {
    const id = `e${connection.source}-${connection.target}-${Date.now()}`;
    setEdges((es) => addEdge(
      { ...connection, id, type: "deletable", data: { onDeleteEdge: (eid: string) => deleteEdgeRef.current(eid) } },
      es
    ));
  }, [setEdges]);

  const saveModal = (form: NodeFormData) => {
    if (!modal.nodeId) return;
    const finalForm: NodeFormData =
      modal.nodeType === "condition"
        ? { ...form, routingCondition: undefined }
        : form;
    setNodes((ns) => ns.map((n) =>
      n.id === modal.nodeId ? { ...n, data: { ...n.data, formData: finalForm } } : n
    ));
    setModal((p) => ({ ...p, isOpen: false }));
  };

  // ── Type registries ──────────────────────────────────────────────────────

  const nodeTypes = React.useMemo(() => ({
    "start-event": WorkflowNodeView,
    activity:      WorkflowNodeView,
    condition:     WorkflowNodeView,
    "end-event":   WorkflowNodeView
  }), []);

  const edgeTypes = React.useMemo(() => ({ deletable: DeletableEdge }), []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flow-wrapper" ref={flowRootRef}>
      <div className="flow-stage">
        <aside className="flow-sidebar">
          {SIDEBAR_NODE_ITEMS.map((item) => (
            <button
              key={item.type}
              type="button"
              className={`flow-sidebar__icon-btn flow-sidebar__icon-btn--${item.type} nodrag nopan`}
              title={item.tooltip}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(WORKFLOW_NODE_DRAG_MIME, item.type);
                e.dataTransfer.setData("text/plain", item.type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => addNode(item.type)}
            >
              <NodeTypeGlyph nodeType={item.type} className="flow-sidebar__glyph" />
              <span className="sr-only">{NODE_TYPE_LABELS[item.type]}</span>
            </button>
          ))}
        </aside>

        <div className="flow-canvas">
          <ReactFlowProvider>
            <FlowCanvasInner
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onDropNodeType={addNodeAt}
            />
          </ReactFlowProvider>
        </div>
      </div>

      {/* Form Builder Modal */}
      {modal.isOpen && modal.nodeId && modal.nodeType && (
        <FormBuilderModal
          key={modal.nodeId}
          form={modal.form}
          nodeType={modal.nodeType}
          conditionSourceNodeId={modal.nodeType === "condition" ? modal.nodeId : null}
          graphEdges={edges}
          graphNodes={nodes}
          onSave={saveModal}
          onClose={() => setModal((p) => ({ ...p, isOpen: false }))}
        />
      )}
    </div>
  );
};

export default FlowComponent;
