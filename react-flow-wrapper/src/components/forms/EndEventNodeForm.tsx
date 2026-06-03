import React from "react";
import type { NodeFormData } from "../../workflow/types";
import type { NodeConfigFormProps } from "./nodeFormTypes";
import { NodeFormShell } from "../NodeFormShell";
import { NodeConfigPropertiesEditor } from "../NodeConfigPropertiesEditor";

export const EndEventNodeForm: React.FC<NodeConfigFormProps> = ({ form, onSave, onClose }) => {
  const [localForm, setLocalForm] = React.useState<NodeFormData>(() => ({
    label: form.label,
    routingCondition: form.routingCondition ?? "",
    branchConditions: { ...(form.branchConditions ?? {}) },
    fields: form.fields.map((f) => ({ ...f, options: f.options.map((o) => ({ ...o })) })),
    configProperties: (form.configProperties ?? []).map((c) => ({ ...c })),
  }));

  const tabs = [
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
      defaultTab="config"
      onSave={() => onSave(localForm)}
      onClose={onClose}
    />
  );
};
