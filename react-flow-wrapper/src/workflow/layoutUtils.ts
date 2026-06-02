import type { Node as FlowNode } from 'reactflow';
import type { WorkflowNodeData } from './types';

export function calculateDagLayout(
  nodes: FlowNode<WorkflowNodeData>[],
  edges: Array<{ source: string; target: string }>
): Record<string, { x: number; y: number }> {
  const layout: Record<string, { x: number; y: number }> = {};

  if (nodes.length === 0) return layout;

  // Build adjacency map
  const graph: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  nodes.forEach(node => {
    graph[node.id] = [];
    inDegree[node.id] = 0;
  });

  edges.forEach(edge => {
    graph[edge.source]?.push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });

  // Find root nodes (start-event or nodes with no incoming edges)
  const roots = nodes.filter(n =>
    n.data.nodeType === 'start-event' || inDegree[n.id] === 0
  );

  // BFS to assign levels
  const levels: Record<string, number> = {};
  const queue = [...roots];
  roots.forEach(n => { levels[n.id] = 0; });

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;

    const currentLevel = levels[node.id] || 0;

    graph[node.id]?.forEach(childId => {
      levels[childId] = Math.max(levels[childId] || 0, currentLevel + 1);
      if (!queue.find(n => n.id === childId)) {
        queue.push(nodes.find(n => n.id === childId)!);
      }
    });
  }

  // Group nodes by level
  const levelGroups: Record<number, string[]> = {};
  Object.entries(levels).forEach(([nodeId, level]) => {
    if (!levelGroups[level]) levelGroups[level] = [];
    levelGroups[level].push(nodeId);
  });

  // Calculate positions - horizontal layout (left to right)
  const levelWidth = 320; // horizontal spacing between levels
  const verticalSpacing = 180; // vertical spacing between nodes in same level

  Object.entries(levelGroups).forEach(([levelStr, nodeIds]) => {
    const level = parseInt(levelStr);
    const x = 150 + level * levelWidth; // start from left, go right

    // Center nodes vertically
    const totalHeight = (nodeIds.length - 1) * verticalSpacing;
    const startY = 300 - totalHeight / 2; // center vertically

    nodeIds.forEach((nodeId, idx) => {
      layout[nodeId] = {
        x: x,
        y: startY + idx * verticalSpacing
      };
    });
  });

  return layout;
}

export function applyLayout(
  nodes: FlowNode<WorkflowNodeData>[],
  edges: Array<{ source: string; target: string }>
): FlowNode<WorkflowNodeData>[] {
  const positions = calculateDagLayout(nodes, edges);

  return nodes.map(node => ({
    ...node,
    position: positions[node.id] || node.position
  }));
}
