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
import { uid } from "./workflow/uid";

import { useGraphHistory } from "./workflow/useGraphHistory";

import { DeletableEdge } from "./components/DeletableEdge";
import { FormBuilderModal } from "./components/FormBuilderModal";
import { WorkflowFlowCanvas } from "./components/WorkflowFlowCanvas";
import { WorkflowNodeView } from "./components/WorkflowNodeView";
import { WorkflowSidebar } from "./components/WorkflowSidebar";

/** Props khi dùng qua web component (Angular: [attr.save-trigger], (workflowSaved)=...) */
export type FlowWidgetProps = {
  saveTrigger?: number;
};

const FlowComponent: React.FC<FlowWidgetProps> = ({ saveTrigger }) => {
  const idRef = React.useRef(4);
  const configureNodeRef = React.useRef<(id: string) => void>(() => {});
  const duplicateNodeRef = React.useRef<(id: string) => void>(() => {});
  const deleteNodeRef = React.useRef<(id: string) => void>(() => {});
  const deleteEdgeRef = React.useRef<(id: string) => void>(() => {});

  const makeNodeData = (type: WorkflowNodeType): WorkflowNodeData => ({
    nodeType: type,
    formData: defaultFormData(type),
    onConfigure: (id) => configureNodeRef.current(id),
    onDuplicate: (id) => duplicateNodeRef.current(id),
    onDelete: (id) => deleteNodeRef.current(id)
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
      setNodes((ns) => ns.filter((n) => n.id !== nodeId));
      setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
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
    if (!p || p.nodes.length === 0) return;
    const hydrated = hydrateWorkflowNodes(p.nodes, makeNodeData);
    if (hydrated.length === 0) return;
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
    const cur = graphStateRef.current;
    const restored = history.undo({ nodes: cur.nodes, edges: cur.edges });
    if (!restored) return;
    setNodes(reattachCallbacks(restored.nodes));
    setEdges(reattachEdgeCallbacks(restored.edges));
  }, [history, setNodes, setEdges, reattachCallbacks, reattachEdgeCallbacks]);

  const handleRedo = React.useCallback(() => {
    const cur = graphStateRef.current;
    const restored = history.redo({ nodes: cur.nodes, edges: cur.edges });
    if (!restored) return;
    setNodes(reattachCallbacks(restored.nodes));
    setEdges(reattachEdgeCallbacks(restored.edges));
  }, [history, setNodes, setEdges, reattachCallbacks, reattachEdgeCallbacks]);

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

  const nodeTypes = React.useMemo(
    () => ({
      "start-event": WorkflowNodeView,
      activity: WorkflowNodeView,
      condition: WorkflowNodeView,
      "end-event": WorkflowNodeView
    }),
    []
  );

  const edgeTypes = React.useMemo(() => ({ deletable: DeletableEdge }), []);

  return (
    <div className="flow-wrapper" ref={flowRootRef} tabIndex={-1}>
      <div className="flow-stage">
        <WorkflowSidebar onAddNode={addNode} />
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
