import React from "react";
import {
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeProps,
  type NodeProps,
  type XYPosition
} from "reactflow";
import type { Node as FlowNode } from "reactflow";
import { ArrowRotateLeft, ArrowRotateRight } from "vuesax-icons-react";
import wflogo from "../public/wflogo.png";
import "reactflow/dist/style.css";
import "./FlowComponent.css";

import type { ModalState, NodeFormData, WorkflowNodeData, WorkflowNodeType } from "./workflow/types";
import type { WorkflowPersistPayloadV1 } from "./workflow/types";
import { WORKFLOW_PUBLIC_JSON, WORKFLOW_STORAGE_KEY } from "./workflow/constants";
import {
  buildWorkflowPayloadV1,
  computeNextNodeIdFromPersisted,
  defaultFormData,
  getOutgoingBranchTargets,
  hydrateWorkflowEdges,
  hydrateWorkflowNodes,
  mergeBranchFormData,
  parseWorkflowPayload,
  tryReadPersistedPayload
} from "./workflow/graphUtils";
import { applyLayout } from "./workflow/layoutUtils";
import { uid } from "./workflow/uid";

import { useGraphHistory } from "./workflow/useGraphHistory";

import { DeletableEdge } from "./components/DeletableEdge";
import { WorkflowFlowCanvas } from "./components/WorkflowFlowCanvas";
import { WorkflowSidebar } from "./components/WorkflowSidebar";
import { AIAssistantPanel } from "./components/AIAssistantPanel";
import { StartEventNodeView } from "./components/nodes/StartEventNodeView";
import { ActivityNodeView } from "./components/nodes/ActivityNodeView";
import { ConditionNodeView } from "./components/nodes/ConditionNodeView";
import { EndEventNodeView } from "./components/nodes/EndEventNodeView";
import { StartEventNodeForm } from "./components/forms/StartEventNodeForm";
import { ActivityNodeForm } from "./components/forms/ActivityNodeForm";
import { ConditionNodeForm } from "./components/forms/ConditionNodeForm";
import { EndEventNodeForm } from "./components/forms/EndEventNodeForm";
import { NotificationNodeForm } from "./components/forms/NotificationNodeForm";
import type { NodeConfigFormProps } from "./components/forms/nodeFormTypes";

/** Props khi dùng qua web component (Angular: (workflowSaved)=...) */
export type FlowWidgetProps = {
  saveTrigger?: number; // legacy — prefer dispatching "requestSave" event on the element
  showHeader?: boolean; // show/hide header with controls
  onSave?: () => void; // custom save handler
  onImport?: () => void; // custom import handler
  onExport?: () => void; // custom export handler
  onUndo?: () => void; // custom undo handler
  onRedo?: () => void; // custom redo handler
};

const FlowComponent: React.FC<FlowWidgetProps> = ({
  saveTrigger,
  showHeader = true,
  onSave: customOnSave,
  onImport: customOnImport,
  onExport: customOnExport,
  onUndo: customOnUndo,
  onRedo: customOnRedo
}) => {
  const idRef = React.useRef(4);
  const configureNodeRef = React.useRef<(id: string) => void>(() => {});
  const duplicateNodeRef = React.useRef<(id: string) => void>(() => {});
  const deleteNodeRef = React.useRef<(id: string) => void>(() => {});
  const deleteEdgeRef = React.useRef<(id: string) => void>(() => {});

  const makeNodeData = React.useCallback(
    (type: WorkflowNodeType): WorkflowNodeData => ({
      nodeType: type,
      formData: defaultFormData(type),
      onConfigure: (id) => configureNodeRef.current(id),
      onDuplicate: (id) => duplicateNodeRef.current(id),
      onDelete: (id) => deleteNodeRef.current(id)
    }),
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [_isLoadingWorkflow, setIsLoadingWorkflow] = React.useState(false);

  const history = useGraphHistory();

  const snap = () =>
    history.takeSnapshot(graphStateRef.current.nodes, graphStateRef.current.edges);

  const reattachCallbacks = React.useCallback(
    (ns: FlowNode<WorkflowNodeData>[]): FlowNode<WorkflowNodeData>[] =>
      ns.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onConfigure: (id: string) => configureNodeRef.current(id),
          onDuplicate: (id: string) => duplicateNodeRef.current(id),
          onDelete: (id: string) => deleteNodeRef.current(id)
        }
      })),
    []
  );

  const reattachEdgeCallbacks = React.useCallback(
    (es: Edge[]): Edge[] =>
      es.map((e) => ({
        ...e,
        type: "deletable",
        data: { ...e.data, onDeleteEdge: (eid: string) => deleteEdgeRef.current(eid) }
      })),
    []
  );

  const [modal, setModal] = React.useState<ModalState>({
    isOpen: false,
    nodeId: null,
    nodeType: null,
    form: defaultFormData("activity")
  });

  const [isAIPanelOpen, setIsAIPanelOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const flowRootRef = React.useRef<HTMLDivElement>(null);
  const graphStateRef = React.useRef({ nodes: [] as FlowNode<WorkflowNodeData>[], edges: [] as Edge[] });
  graphStateRef.current = { nodes, edges };

  // Sync edge colors from condition node branch config
  React.useEffect(() => {
    const conditionNodes = nodes.filter((n) => n.data.nodeType === "condition");
    if (conditionNodes.length === 0) return;

    const branchColorMap = new Map<string, string>(); // targetId → color
    for (const node of conditionNodes) {
      const branchProp = node.data.formData.configProperties?.find(
        (c) => c.key === "__conditionBranches"
      );
      if (!branchProp?.value) continue;
      try {
        const branches: { targetId?: string; color?: string }[] = JSON.parse(branchProp.value);
        for (const b of branches) {
          if (b.targetId && b.color) branchColorMap.set(b.targetId, b.color);
        }
      } catch { /* ignore */ }
    }

    if (branchColorMap.size === 0) return;

    setEdges((prev) =>
      prev.map((e) => {
        const color = branchColorMap.get(e.target);
        if (!color) return e;
        if ((e.data as { color?: string })?.color === color) return e;
        return { ...e, data: { ...e.data, color } };
      })
    );
  }, [nodes, setEdges]);

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

  React.useEffect(() => {
    const root = flowRootRef.current;
    if (!root) return;
    // requestSave is dispatched on the host element (<react-flow-builder>), not on this
    // inner div — events bubble up, not down, so we must listen on the host.
    const rootNode = root.getRootNode();
    const host: EventTarget =
      rootNode instanceof ShadowRoot
        ? rootNode.host
        : (root.closest("react-flow-builder") ?? root);
    const handler = () => {
      const { nodes: ns, edges: es } = graphStateRef.current;
      const payload = buildWorkflowPayloadV1(ns, es);
      const json = JSON.stringify(payload, null, 2);
      try { localStorage.setItem(WORKFLOW_STORAGE_KEY, json); } catch { /* ignore */ }
      emitWorkflowSaved(payload, json);
    };
    host.addEventListener("requestSave", handler);
    return () => host.removeEventListener("requestSave", handler);
  }, [emitWorkflowSaved]);

  const openConfigModal = React.useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const base: NodeFormData = {
        label: node.data.formData.label,
        routingCondition: node.data.formData.routingCondition ?? "",
        branchConditions: { ...(node.data.formData.branchConditions ?? {}) },
        fields: node.data.formData.fields.map((f) => ({
          ...f,
          options: f.options.map((o) => ({ ...o }))
        })),
        configProperties: (node.data.formData.configProperties ?? []).map((c) => ({ ...c }))
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
    },
    [nodes, edges]
  );
  configureNodeRef.current = openConfigModal;

  const deleteNode = React.useCallback(
    (nodeId: string) => {
      snap();
      const { nodes: ns, edges: es } = graphStateRef.current;
      const target = ns.find((n) => n.id === nodeId);
      let actualId = nodeId;
      if (target?.data.nodeType === "start-event") {
        const unconnected = ns.find(
          (n) =>
            n.data.nodeType === "start-event" &&
            !es.some((e) => e.source === n.id || e.target === n.id)
        );
        if (unconnected) actualId = unconnected.id;
      }
      setNodes((prev) => prev.filter((n) => n.id !== actualId));
      setEdges((prev) => prev.filter((e) => e.source !== actualId && e.target !== actualId));
    },
    [setNodes, setEdges]
  );
  deleteNodeRef.current = deleteNode;

  const duplicateNode = React.useCallback(
    (nodeId: string) => {
      snap();
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
              fields,
              configProperties: (source.data.formData.configProperties ?? []).map((c) => ({
                ...c,
                id: uid("cfg")
              }))
            },
            onConfigure: (id) => configureNodeRef.current(id),
            onDuplicate: (id) => duplicateNodeRef.current(id),
            onDelete: (id) => deleteNodeRef.current(id)
          }
        };
        return [...ns, duplicated];
      });
    },
    [setNodes]
  );
  duplicateNodeRef.current = duplicateNode;

  const deleteEdge = React.useCallback(
    (edgeId: string) => {
      snap();
      setEdges((es) => es.filter((e) => e.id !== edgeId));
    },
    [setEdges]
  );
  deleteEdgeRef.current = deleteEdge;

  React.useLayoutEffect(() => {
    const p = tryReadPersistedPayload(WORKFLOW_STORAGE_KEY);
    if (!p || p.nodes.length === 0) {
      setNodes([{ id: '1', type: 'start-event', position: { x: 300, y: 100 }, data: makeNodeData('start-event') }]);
      idRef.current = 2;
      return;
    }
    const hydrated = hydrateWorkflowNodes(p.nodes, makeNodeData);
    if (hydrated.length === 0) {
      setNodes([{ id: '1', type: 'start-event', position: { x: 300, y: 100 }, data: makeNodeData('start-event') }]);
      idRef.current = 2;
      return;
    }
    setNodes(hydrated);
    setEdges(hydrateWorkflowEdges(p.edges, (id) => deleteEdgeRef.current(id)));
    idRef.current = computeNextNodeIdFromPersisted(p.nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const fromLs = tryReadPersistedPayload(WORKFLOW_STORAGE_KEY);
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
        setEdges(hydrateWorkflowEdges(p.edges, (id) => deleteEdgeRef.current(id)));
        idRef.current = computeNextNodeIdFromPersisted(p.nodes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addNode = (type: WorkflowNodeType) => {
    snap();
    const id = String(idRef.current++);
    setNodes((ns) => [
      ...ns,
      {
        id,
        type,
        position: { x: Math.round(Math.random() * 300 + 150), y: Math.round(Math.random() * 200 + 100) },
        data: makeNodeData(type)
      }
    ]);
  };

  const addNodeAt = React.useCallback(
    (type: WorkflowNodeType, position: XYPosition) => {
      snap();
      const id = String(idRef.current++);
      setNodes((ns) => [...ns, { id, type, position, data: makeNodeData(type) }]);
    },
    [setNodes]
  );

  const onConnect = React.useCallback(
    (connection: Connection) => {
      snap();
      const id = `e${connection.source}-${connection.target}-${Date.now()}`;
      setEdges((es) =>
        addEdge(
          {
            ...connection,
            id,
            type: "deletable",
            data: { onDeleteEdge: (eid: string) => deleteEdgeRef.current(eid) }
          },
          es
        )
      );
    },
    [setEdges]
  );

  const appendConnectedFromSelection = React.useCallback(
    (sourceId: string, type: WorkflowNodeType) => {
      snap();
      const newId = String(idRef.current++);
      setNodes((ns) => {
        const src = ns.find((n) => n.id === sourceId);
        if (!src) return ns;
        const position = {
          x: Math.round(src.position.x + 240),
          y: Math.round(src.position.y)
        };
        const newNode: FlowNode<WorkflowNodeData> = {
          id: newId,
          type,
          position,
          selected: true,
          data: makeNodeData(type)
        };
        return [...ns.map((n) => ({ ...n, selected: false })), newNode];
      });
      setEdges((es) =>
        addEdge(
          {
            id: `e${sourceId}-${newId}-${Date.now()}`,
            source: sourceId,
            target: newId,
            type: "deletable",
            data: { onDeleteEdge: (eid: string) => deleteEdgeRef.current(eid) }
          },
          es
        )
      );
    },
    [setNodes, setEdges]
  );

  const onNodeDragStart = React.useCallback(() => {
    snap();
  }, []);

  const handleUndo = React.useCallback(() => {
    if (customOnUndo) {
      customOnUndo();
      return;
    }
    const cur = graphStateRef.current;
    const restored = history.undo({ nodes: cur.nodes, edges: cur.edges });
    if (!restored) return;
    setNodes(reattachCallbacks(restored.nodes));
    setEdges(reattachEdgeCallbacks(restored.edges));
  }, [customOnUndo, history, setNodes, setEdges, reattachCallbacks, reattachEdgeCallbacks]);

  const handleRedo = React.useCallback(() => {
    if (customOnRedo) {
      customOnRedo();
      return;
    }
    const cur = graphStateRef.current;
    const restored = history.redo({ nodes: cur.nodes, edges: cur.edges });
    if (!restored) return;
    setNodes(reattachCallbacks(restored.nodes));
    setEdges(reattachEdgeCallbacks(restored.edges));
  }, [customOnRedo, history, setNodes, setEdges, reattachCallbacks, reattachEdgeCallbacks]);

  React.useEffect(() => {
    const root = flowRootRef.current;
    if (!root) return;
    const handler = (e: KeyboardEvent) => {
      const isZ = e.key === "z" || e.key === "Z";
      if (!isZ || !e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) handleRedo();
      else handleUndo();
    };
    root.addEventListener("keydown", handler, true);
    return () => root.removeEventListener("keydown", handler, true);
  }, [handleUndo, handleRedo]);

  const saveModal = (form: NodeFormData) => {
    if (!modal.nodeId) return;
    snap();
    const finalForm: NodeFormData =
      modal.nodeType === "condition" ? { ...form, routingCondition: undefined } : form;
    setNodes((ns) =>
      ns.map((n) =>
        n.id === modal.nodeId ? { ...n, data: { ...n.data, formData: finalForm } } : n
      )
    );
    setModal((p) => ({ ...p, isOpen: false }));
  };

  const NODE_FORM_MAP: Record<string, React.ComponentType<NodeConfigFormProps>> = React.useMemo(
    () => ({
      "start-event": StartEventNodeForm,
      "end-event": EndEventNodeForm,
      activity: ActivityNodeForm,
      condition: ConditionNodeForm,
      notification: NotificationNodeForm,
    }),
    []
  );

  const nodeTypes = React.useMemo(
    () => ({
      "start-event": StartEventNodeView,
      "end-event": EndEventNodeView,
      activity: ActivityNodeView,
      form: ActivityNodeView,
      notification: ActivityNodeView,
      condition: ConditionNodeView,
      redirect: ActivityNodeView,
      "alert-error": ActivityNodeView,
      "create-keyword": ActivityNodeView,
      "attach-file": ActivityNodeView,
      submit: ActivityNodeView,
      "view-sign": ActivityNodeView,
      "history-log": ActivityNodeView,
      "find-records": ActivityNodeView,
      switch: ActivityNodeView,
    }),
    []
  );

  const edgeTypes = React.useMemo(() => ({ deletable: DeletableEdge }), []);

  const handleExport = () => {
    if (customOnExport) {
      customOnExport();
      return;
    }
    const { nodes: ns, edges: es } = graphStateRef.current;
    const payload = buildWorkflowPayloadV1(ns, es);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = React.useCallback(() => {
    if (customOnImport) {
      customOnImport();
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const payload = parseWorkflowPayload(json);
          if (!payload) throw new Error("Invalid payload");
          const ns = hydrateWorkflowNodes(payload.nodes, makeNodeData);
          const es = hydrateWorkflowEdges(payload.edges, deleteEdgeRef.current);
          setNodes(ns);
          setEdges(es);
          idRef.current = computeNextNodeIdFromPersisted(payload.nodes);
        } catch (err) {
          console.error("Failed to import workflow:", err);
          alert("Invalid workflow file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [customOnImport, makeNodeData, setNodes, setEdges]);

  const handleSave = () => {
    if (customOnSave) {
      customOnSave();
      return;
    }
    const { nodes: ns, edges: es } = graphStateRef.current;
    const payload = buildWorkflowPayloadV1(ns, es);
    const json = JSON.stringify(payload, null, 2);
    try {
      localStorage.setItem(WORKFLOW_STORAGE_KEY, json);
      alert("Workflow saved successfully!");
    } catch {
      alert("Failed to save workflow");
    }
    emitWorkflowSaved(payload, json);
  };

  return (
    <div className="flow-wrapper" ref={flowRootRef} tabIndex={-1}>
      {showHeader && (
        <div className="flow-header">
          <div className="flow-header__left">
            <div className="flow-header__logo">
              <img src={wflogo} alt="Logo" className="flow-header__logo-img" />
            </div>
            {/* <div className="flow-header__menu">
              <button className="flow-header__menu-item">File</button>
              <button className="flow-header__menu-item">Edit</button>
              <button className="flow-header__menu-item">View</button>
              <button className="flow-header__menu-item">Assets</button>
            </div> */}
          </div>
          <div className="flow-header__center">
            <button className="flow-header__icon-btn" title="Undo (Ctrl+Z)" onClick={handleUndo}>
              <ArrowRotateLeft size={16} />
            </button>
            <button className="flow-header__icon-btn" title="Redo (Ctrl+Shift+Z)" onClick={handleRedo}>
              <ArrowRotateRight size={16} />
            </button>
            <div className="flow-header__separator"></div>
          </div>
          <div className="flow-header__right">
            <button className="flow-header__btn flow-header__btn--save" onClick={handleSave}>
              Save
            </button>
            <button className="flow-header__btn" onClick={handleImport} title="Import JSON">
              Import
            </button>
            <button className="flow-header__btn flow-header__btn--dark" onClick={handleExport}>
              Export
            </button>
            {/* <button className="flow-header__btn flow-header__btn--circle" title="Settings">
              <Setting size={16} />
            </button> */}
          </div>
        </div>
      )}
      <div className="flow-stage">
        <WorkflowSidebar onAddNode={addNode} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {!sidebarOpen && (
          <button
            className="flow-sidebar-toggle"
            title="Mở bảng node"
            onClick={() => setSidebarOpen(true)}
          >
            <i className="isax-element-31" />
          </button>
        )}
        {!isAIPanelOpen && (
          <button
            className="flow-ai-toggle"
            title="Mở AI Assistant"
            onClick={() => setIsAIPanelOpen(true)}
          >
            <i className="isax-flash-1" />
          </button>
        )}
        <AIAssistantPanel
          isOpen={isAIPanelOpen}
          onClose={() => setIsAIPanelOpen(false)}
          onWorkflowGenerated={(workflow) => {
            const ns = hydrateWorkflowNodes(workflow.nodes, makeNodeData);
            const es = hydrateWorkflowEdges(workflow.edges, deleteEdgeRef.current);
            const layoutedNodes = applyLayout(ns, workflow.edges);
            setNodes([]);
            setEdges([]);
            setIsLoadingWorkflow(true);
            layoutedNodes.forEach((node, index) => {
              setTimeout(() => {
                setNodes((prev) => [...prev, { ...node, data: { ...node.data, isAnimating: true } }]);
                setTimeout(() => {
                  setNodes((prev) =>
                    prev.map((n) => n.id === node.id ? { ...n, data: { ...n.data, isAnimating: false } } : n)
                  );
                }, 600);
              }, index * 150);
            });
            setTimeout(() => {
              setEdges(es);
              idRef.current = computeNextNodeIdFromPersisted(workflow.nodes);
              setIsLoadingWorkflow(false);
            }, layoutedNodes.length * 150 + 400);
          }}
        />
        <div className="flow-canvas">
          <ReactFlowProvider>
            <WorkflowFlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes as Record<string, React.ComponentType<NodeProps>>}
              edgeTypes={edgeTypes as Record<string, React.ComponentType<EdgeProps>>}
              onDropNodeType={addNodeAt}
              onAppendConnected={appendConnectedFromSelection}
              onNodeDragStart={onNodeDragStart}
            />
          </ReactFlowProvider>
        </div>
      </div>

      {modal.isOpen && modal.nodeId && modal.nodeType && (() => {
        const FormComp = NODE_FORM_MAP[modal.nodeType] ?? ActivityNodeForm;
        return (
          <FormComp
            key={modal.nodeId}
            form={modal.form}
            nodeId={modal.nodeId}
            nodeType={modal.nodeType}
            graphEdges={edges}
            graphNodes={nodes}
            onSave={saveModal}
            onClose={() => setModal((p) => ({ ...p, isOpen: false }))}
          />
        );
      })()}

    </div>
  );
};

export default FlowComponent;
