import React from 'react';
import type { NodeConfigFormProps } from './nodeFormTypes';
import { SwitchNodeModal } from '../SwitchNodeModal';
import type { SwitchNodeConfig, FlowField, FlowStep } from '../SwitchNodeModal';
import { NODE_TYPE_LABELS } from '../../workflow/constants';

const STORAGE_KEY = '__switchConfig';

function readConfig(props: NodeConfigFormProps): SwitchNodeConfig {
  const stored = props.form.configProperties?.find(c => c.key === STORAGE_KEY)?.value;
  if (stored) {
    try { return JSON.parse(stored) as SwitchNodeConfig; } catch { /* fall through */ }
  }
  return {
    nodeId: props.nodeId,
    name: props.form.label || 'Switch node',
    switchField: '',
    matchMode: 'equals',
    cases: [],
    defaultAction: 'stop',
  };
}

export const SwitchNodeFormAdapter: React.FC<NodeConfigFormProps> = (props) => {
  const { form, nodeId, graphNodes, onSave, onClose } = props;

  const initialConfig = readConfig(props);

  // Derive availableSteps from all nodes except current
  const availableSteps: FlowStep[] = graphNodes
    .filter(n => n.id !== nodeId)
    .map(n => ({
      id: n.id,
      label: n.data.formData.label || `${NODE_TYPE_LABELS[n.data.nodeType] ?? n.data.nodeType} (${n.id})`,
    }));

  // Derive availableFields: collect from form-type nodes' configProperties
  const fieldSet = new Map<string, FlowField>();
  for (const n of graphNodes) {
    if (n.data.nodeType === 'form') {
      for (const f of n.data.formData.fields ?? []) {
        if (f.label) fieldSet.set(f.label, { key: f.label, icon: '#' });
      }
      for (const cp of n.data.formData.configProperties ?? []) {
        if (cp.key && cp.key !== STORAGE_KEY) fieldSet.set(cp.key, { key: cp.key, icon: '#' });
      }
    }
  }
  // Also add fields referenced in existing switch config
  if (initialConfig.switchField) fieldSet.set(initialConfig.switchField, { key: initialConfig.switchField, icon: '#' });

  const availableFields: FlowField[] = fieldSet.size > 0
    ? Array.from(fieldSet.values())
    : [
        { key: 'order_status', icon: '#' },
        { key: 'payment_method', icon: '$' },
        { key: 'user_tier', icon: '@' },
        { key: 'region', icon: '🌐' },
      ];

  const handleSave = (config: SwitchNodeConfig) => {
    const existing = form.configProperties?.filter(c => c.key !== STORAGE_KEY) ?? [];
    onSave({
      ...form,
      label: config.name,
      configProperties: [
        ...existing,
        { id: STORAGE_KEY, displayName: 'Switch Config', key: STORAGE_KEY, value: JSON.stringify(config) },
      ],
    });
  };

  return (
    <SwitchNodeModal
      initialConfig={initialConfig}
      availableFields={availableFields}
      availableSteps={availableSteps}
      onSave={handleSave}
      onCancel={onClose}
    />
  );
};
