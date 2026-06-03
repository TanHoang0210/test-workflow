import type { Edge } from "reactflow";
import type { Node as FlowNode } from "reactflow";
import type { NodeFormData, WorkflowNodeData, WorkflowNodeType } from "../../workflow/types";

export type NodeConfigFormProps = {
  form: NodeFormData;
  nodeId: string;
  nodeType: WorkflowNodeType;
  graphEdges: Edge[];
  graphNodes: FlowNode<WorkflowNodeData>[];
  onSave: (form: NodeFormData) => void;
  onClose: () => void;
};
