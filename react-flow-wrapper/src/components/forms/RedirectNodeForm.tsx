import React from "react";
import type { NodeFormData } from "../../workflow/types";
import type { NodeConfigFormProps } from "./nodeFormTypes";
import { NodeFormShell } from "../NodeFormShell";
import { ExtendedConfigEditor } from "../ExtendedConfigEditor";
import { uid } from "../../workflow/uid";

// ── Helpers ────────────────────────────────────────────────────────────────

function getCfg(cfg: { key: string; value: string }[], key: string, def = "") {
  return cfg.find((c) => c.key === key)?.value ?? def;
}

function setCfg(
  cfg: { id: string; displayName: string; key: string; value: string }[],
  key: string,
  displayName: string,
  value: string
) {
  const hit = cfg.find((c) => c.key === key);
  if (hit) return cfg.map((c) => (c.key === key ? { ...c, value } : c));
  return [...cfg, { id: uid("cfg"), displayName, key, value }];
}

// ── Param row type (workflow mode) ────────────────────────────────────────

type ParamSource = "flow_var" | "fixed" | "expression";

interface ParamRow {
  id: string;
  key: string;
  source: ParamSource;
  value: string;
}

const SOURCE_LABELS: Record<ParamSource, string> = {
  flow_var: "Biến flow",
  fixed: "Giá trị cố định",
  expression: "Expression",
};

const SOURCE_HINTS: Record<ParamSource, string> = {
  flow_var: "Tên biến (vd: user_id)",
  fixed: "Giá trị tĩnh",
  expression: "{{biến}} + 1",
};

function parseParams(raw: string): ParamRow[] {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.map((p) => ({ id: uid("prm"), ...p }));
  } catch {}
  return [];
}

// ── Main Component ─────────────────────────────────────────────────────────

export const RedirectNodeForm: React.FC<NodeConfigFormProps> = ({
  form,
  nodeId,
  graphNodes,
  onSave,
  onClose,
}) => {
  const [label, setLabel] = React.useState(form.label);
  const [cfg, setCfgState] = React.useState(() =>
    (form.configProperties ?? []).map((c) => ({ ...c }))
  );

  const set = (key: string, displayName: string, value: string) =>
    setCfgState((prev) => setCfg(prev, key, displayName, value));

  const mode = getCfg(cfg, "mode", "node") as "node" | "workflow";

  // ── Params state (workflow mode) ────────────────────────────────────────
  const [params, setParams] = React.useState<ParamRow[]>(() =>
    parseParams(getCfg(cfg, "params", "[]"))
  );

  const addParam = () =>
    setParams((p) => [...p, { id: uid("prm"), key: "", source: "fixed", value: "" }]);

  const updateParam = (id: string, patch: Partial<ParamRow>) =>
    setParams((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeParam = (id: string) =>
    setParams((p) => p.filter((r) => r.id !== id));

  // Available target nodes (exclude self and start-event / end-event)
  const targetNodes = graphNodes.filter(
    (n) => n.id !== nodeId && n.type !== "start-event" && n.type !== "end-event"
  );

  // ── Config panel ────────────────────────────────────────────────────────

  const configPanel = (
    <div className="rdr-root">
      {/* Mode */}
      <div className="rdr-section">
        <p className="rdr-section__title">Chế độ chuyển hướng</p>
        <div className="rdr-mode-row">
          {(["node", "workflow"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`rdr-mode-btn${mode === m ? " rdr-mode-btn--active" : ""}`}
              onClick={() => set("mode", "Mode", m)}
            >
              {m === "node" ? "↩ Node trong luồng" : "↪ Workflow khác"}
            </button>
          ))}
        </div>
      </div>

      {/* ── NODE mode ──────────────────────────────────────────────────── */}
      {mode === "node" && (
        <>
          <div className="rdr-section">
            <p className="rdr-section__title">Node đích</p>
            <p className="rdr-hint">Chọn node sẽ nhảy tới trong cùng workflow này.</p>
            <select
              className="rdr-select"
              value={getCfg(cfg, "targetNodeId", "")}
              onChange={(e) => set("targetNodeId", "Target Node ID", e.target.value)}
            >
              <option value="">— Chọn node —</option>
              {targetNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.data?.formData?.label || n.type} ({n.id.slice(-6)})
                </option>
              ))}
            </select>
          </div>

          <div className="rdr-section">
            <p className="rdr-section__title">Giới hạn vòng lặp</p>
            <div className="rdr-row-2">
              <div className="rdr-field">
                <label className="rdr-label">Số lần redirect tối đa</label>
                <input
                  type="number"
                  className="rdr-input"
                  min={1}
                  max={20}
                  value={getCfg(cfg, "maxRedirectCount", "3")}
                  onChange={(e) => set("maxRedirectCount", "Max Redirect Count", e.target.value)}
                />
                <p className="rdr-hint">Nếu vượt quá → chuyển sang Alert_Error node.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── WORKFLOW mode ──────────────────────────────────────────────── */}
      {mode === "workflow" && (
        <>
          <div className="rdr-section">
            <p className="rdr-section__title">Workflow đích</p>
            <div className="rdr-field">
              <label className="rdr-label">Target Workflow ID</label>
              <input
                className="rdr-input"
                placeholder="wf-approval-v2"
                value={getCfg(cfg, "targetWorkflowId", "")}
                onChange={(e) => set("targetWorkflowId", "Target Workflow ID", e.target.value)}
              />
            </div>
          </div>

          <div className="rdr-section">
            <p className="rdr-section__title">Tùy chọn</p>
            <label className="rdr-checkbox">
              <input
                type="checkbox"
                checked={getCfg(cfg, "inheritContext", "false") === "true"}
                onChange={(e) => set("inheritContext", "Inherit Context", String(e.target.checked))}
              />
              <span>Kế thừa toàn bộ biến từ luồng hiện tại</span>
            </label>
            <label className="rdr-checkbox">
              <input
                type="checkbox"
                checked={getCfg(cfg, "waitForCompletion", "false") === "true"}
                onChange={(e) =>
                  set("waitForCompletion", "Wait For Completion", String(e.target.checked))
                }
              />
              <span>Chờ workflow con hoàn thành (waiting_child)</span>
            </label>
          </div>

          <div className="rdr-section">
            <p className="rdr-section__title">Tham số truyền vào</p>
            <p className="rdr-hint">
              Các tham số này được truyền vào workflow đích, ghi đè lên context kế thừa (nếu có).
            </p>

            {params.length === 0 ? (
              <p className="rdr-empty">Chưa có tham số nào.</p>
            ) : (
              <div className="rdr-params">
                <div className="rdr-params__head">
                  <span className="rdr-params__col rdr-params__col--key">Key</span>
                  <span className="rdr-params__col rdr-params__col--src">Nguồn</span>
                  <span className="rdr-params__col rdr-params__col--val">Giá trị</span>
                  <span className="rdr-params__col rdr-params__col--del" />
                </div>
                {params.map((p) => (
                  <div key={p.id} className="rdr-params__row">
                    <div className="rdr-params__col rdr-params__col--key">
                      <input
                        className="rdr-input rdr-input--mono"
                        value={p.key}
                        placeholder="param_key"
                        onChange={(e) =>
                          updateParam(p.id, { key: e.target.value.replace(/\s/g, "_") })
                        }
                      />
                    </div>
                    <div className="rdr-params__col rdr-params__col--src">
                      <select
                        className="rdr-select"
                        value={p.source}
                        onChange={(e) =>
                          updateParam(p.id, { source: e.target.value as ParamSource })
                        }
                      >
                        {(Object.keys(SOURCE_LABELS) as ParamSource[]).map((s) => (
                          <option key={s} value={s}>
                            {SOURCE_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="rdr-params__col rdr-params__col--val">
                      <input
                        className="rdr-input"
                        value={p.value}
                        placeholder={SOURCE_HINTS[p.source]}
                        onChange={(e) => updateParam(p.id, { value: e.target.value })}
                      />
                    </div>
                    <div className="rdr-params__col rdr-params__col--del">
                      <button
                        type="button"
                        className="rdr-del"
                        onClick={() => removeParam(p.id)}
                        title="Xóa"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button type="button" className="rdr-add-param" onClick={addParam}>
              + Thêm tham số
            </button>
          </div>
        </>
      )}
    </div>
  );

  // ── Save ────────────────────────────────────────────────────────────────

  const handleSave = () => {
    // Serialize params list into cfg before saving
    const finalCfg = setCfg(
      cfg,
      "params",
      "Params",
      JSON.stringify(params.filter((p) => p.key).map(({ key, source, value }) => ({ key, source, value })))
    );
    const result: NodeFormData = {
      label,
      branchConditions: {},
      fields: [],
      configProperties: finalCfg,
    };
    onSave(result);
  };

  const tabs = [
    {
      id: "config",
      label: "Cấu hình",
      panelClass: "fb-tab-panel--scroll",
      panel: configPanel,
    },
    {
      id: "extended",
      label: "Cấu hình mở rộng",
      panel: <ExtendedConfigEditor items={cfg} onChange={setCfgState} />,
    },
  ];

  return (
    <NodeFormShell
      label={label}
      onLabelChange={setLabel}
      tabs={tabs}
      defaultTab="config"
      onSave={handleSave}
      onClose={onClose}
    />
  );
};
