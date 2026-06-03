import React from "react";
import type { NodeFormData } from "../../workflow/types";
import type { NodeConfigFormProps } from "./nodeFormTypes";
import { getOutgoingBranchTargets } from "../../workflow/graphUtils";
import { NodeFormShell } from "../NodeFormShell";
import { FormBuilder } from "../FormBuilder";
import { NodeConfigPropertiesEditor } from "../NodeConfigPropertiesEditor";

export const ConditionNodeForm: React.FC<NodeConfigFormProps> = ({
  form,
  nodeId,
  graphEdges,
  graphNodes,
  onSave,
  onClose,
}) => {
  const conditionBranchTargets = React.useMemo(
    () => getOutgoingBranchTargets(nodeId, graphEdges, graphNodes),
    [nodeId, graphEdges, graphNodes]
  );

  const conditionIncomingCount = React.useMemo(
    () => graphEdges.filter((e) => e.target === nodeId).length,
    [nodeId, graphEdges]
  );

  const [localForm, setLocalForm] = React.useState<NodeFormData>(() => ({
    label: form.label,
    routingCondition: form.routingCondition ?? "",
    branchConditions: { ...(form.branchConditions ?? {}) },
    fields: form.fields.map((f) => ({ ...f, options: f.options.map((o) => ({ ...o })) })),
    configProperties: (form.configProperties ?? []).map((c) => ({ ...c })),
  }));

  React.useEffect(() => {
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
  }, [conditionBranchTargets]);

  const conditionsPanel = (
    <div className="fb-routing">
      <p className="fb-routing__label">Điều kiện theo từng nhánh</p>
      {conditionBranchTargets.length === 0 ? (
        <>
          <p className="fb-routing__empty">Chưa có flow để thêm điều kiện.</p>
          {conditionIncomingCount > 0 && (
            <p className="fb-routing__hint fb-routing__hint--incoming">
              Bạn đang có {conditionIncomingCount} cạnh <strong>vào</strong> node này; ô điều kiện chỉ
              tính theo cạnh <strong>đi ra</strong>. Hãy nối từ thoi sang node tiếp theo.
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
                    branchConditions: { ...p.branchConditions, [t.targetId]: e.target.value },
                  }))
                }
                placeholder="Điều kiện khi đi nhánh này..."
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const tabs = [
    {
      id: "conditions",
      label: "Điều kiện nhánh",
      panel: conditionsPanel,
    },
    {
      id: "form",
      label: "Form",
      panelClass: "fb-tab-panel--form",
      panel: (
        <FormBuilder
          fields={localForm.fields}
          onChangeFields={(fields) => setLocalForm((p) => ({ ...p, fields }))}
        />
      ),
    },
    {
      id: "config",
      label: "Cấu hình mở rộng",
      panel: (
        <NodeConfigPropertiesEditor
          items={localForm.configProperties}
          onChange={(configProperties) => setLocalForm((p) => ({ ...p, configProperties }))}
        />
      ),
    },
  ];

  return (
    <NodeFormShell
      label={localForm.label}
      onLabelChange={(label) => setLocalForm((p) => ({ ...p, label }))}
      tabs={tabs}
      defaultTab="conditions"
      onSave={() => onSave({ ...localForm, routingCondition: undefined })}
      onClose={onClose}
    />
  );
};
