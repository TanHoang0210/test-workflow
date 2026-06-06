import React from "react";
import type { NodeFormData } from "../../workflow/types";
import type { NodeConfigFormProps } from "./nodeFormTypes";
import { getOutgoingBranchTargets } from "../../workflow/graphUtils";
import { NodeFormShell } from "../NodeFormShell";
import { ExtendedConfigEditor } from "../ExtendedConfigEditor";

// ── Types ──────────────────────────────────────────────────────────────────

type RuleOperator =
  | "equals" | "not_equals"
  | "greater_than" | "less_than" | "greater_equal" | "less_equal"
  | "contains" | "not_contains" | "starts_with" | "ends_with"
  | "in_set" | "not_in_set"
  | "is_empty" | "is_not_empty"
  | "regex";

type LogicType = "AND" | "OR" | "CUSTOM";

type Rule = { id: string; variable: string; operator: RuleOperator; value: string };

type Branch = {
  id: string;
  targetId?: string;
  name: string;
  label: string;
  color: string;
  logicType: LogicType;
  customExpression: string;
  rules: Rule[];
  description: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const OPERATORS: { value: RuleOperator; label: string; noValue?: boolean }[] = [
  { value: "equals",       label: "Bằng (=)" },
  { value: "not_equals",   label: "Khác (≠)" },
  { value: "greater_than", label: "Lớn hơn (>)" },
  { value: "less_than",    label: "Nhỏ hơn (<)" },
  { value: "greater_equal",label: "Lớn hơn hoặc bằng (≥)" },
  { value: "less_equal",   label: "Nhỏ hơn hoặc bằng (≤)" },
  { value: "contains",     label: "Chứa" },
  { value: "not_contains", label: "Không chứa" },
  { value: "starts_with",  label: "Bắt đầu bằng" },
  { value: "ends_with",    label: "Kết thúc bằng" },
  { value: "in_set",       label: "Thuộc tập hợp" },
  { value: "not_in_set",   label: "Không thuộc tập hợp" },
  { value: "is_empty",     label: "Là rỗng", noValue: true },
  { value: "is_not_empty", label: "Không rỗng", noValue: true },
  { value: "regex",        label: "Regex" },
];

const BRANCH_COLORS = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#0891b2",
];

const CONFIG_KEY = "__conditionBranches";

// ── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function makeRule(): Rule {
  return { id: uid(), variable: "", operator: "equals", value: "" };
}

function makeBranch(targetId?: string, name = "Nhánh mới", colorIdx = 0): Branch {
  return {
    id: uid(),
    targetId,
    name,
    label: name.slice(0, 12),
    color: BRANCH_COLORS[colorIdx % BRANCH_COLORS.length],
    logicType: "AND",
    customExpression: "",
    rules: [makeRule()],
    description: "",
  };
}

function loadBranches(form: NodeFormData, targets: { targetId: string; targetLabel: string }[]): Branch[] {
  const saved = form.configProperties?.find((c) => c.key === CONFIG_KEY);
  if (saved?.value) {
    try {
      const parsed: Branch[] = JSON.parse(saved.value);
      // sync with current targets
      const existing = new Map(parsed.map((b) => [b.targetId, b]));
      return targets.map((t, i) =>
        existing.get(t.targetId) ?? makeBranch(t.targetId, t.targetLabel, i)
      );
    } catch { /* fall through */ }
  }
  return targets.map((t, i) => makeBranch(t.targetId, t.targetLabel, i));
}

// ── Rule Row ──────────────────────────────────────────────────────────────

const RuleRow: React.FC<{
  rule: Rule;
  onChange: (patch: Partial<Rule>) => void;
  onDelete: () => void;
  canDelete: boolean;
}> = ({ rule, onChange, onDelete, canDelete }) => {
  const op = OPERATORS.find((o) => o.value === rule.operator);
  return (
    <div className="cn-rule">
      <input
        className="cn-rule__var"
        value={rule.variable}
        onChange={(e) => onChange({ variable: e.target.value })}
        placeholder="{{biến}} hoặc field"
      />
      <select
        className="cn-rule__op"
        value={rule.operator}
        onChange={(e) => onChange({ operator: e.target.value as RuleOperator })}
      >
        {OPERATORS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {!op?.noValue && (
        <input
          className="cn-rule__val"
          value={rule.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="Giá trị hoặc {{var}}"
        />
      )}
      {canDelete && (
        <button type="button" className="cn-rule__del" onClick={onDelete} title="Xóa quy tắc">✕</button>
      )}
    </div>
  );
};

// ── Branch Card ────────────────────────────────────────────────────────────

const BranchCard: React.FC<{
  branch: Branch;
  index: number;
  total: number;
  onChange: (patch: Partial<Branch>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}> = ({ branch, index, total, onChange, onDelete, onMove }) => {
  const updateRule = (ruleId: string, patch: Partial<Rule>) =>
    onChange({ rules: branch.rules.map((r) => r.id === ruleId ? { ...r, ...patch } : r) });
  const deleteRule = (ruleId: string) =>
    onChange({ rules: branch.rules.filter((r) => r.id !== ruleId) });
  const addRule = () =>
    onChange({ rules: [...branch.rules, makeRule()] });

  return (
    <div className="cn-branch" style={{ borderLeft: `3px solid ${branch.color}` }}>
      {/* Branch header */}
      <div className="cn-branch__head">
        <input
          type="color"
          className="cn-branch__color"
          value={branch.color}
          onChange={(e) => onChange({ color: e.target.value })}
          title="Màu nhánh"
          style={{ accentColor: branch.color }}
        />
        <input
          className="cn-branch__name"
          value={branch.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Tên nhánh..."
        />
        <input
          className="cn-branch__label"
          value={branch.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="nhãn"
        />
        <div className="cn-branch__actions">
          <button type="button" className="cn-branch__move" onClick={() => onMove(-1)} disabled={index === 0} title="Lên">↑</button>
          <button type="button" className="cn-branch__move" onClick={() => onMove(1)} disabled={index === total - 1} title="Xuống">↓</button>
          <button type="button" className="cn-branch__del" onClick={onDelete} title="Xóa nhánh">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="11" height="11">
              <polyline points="2,3 10,3" /><path d="M4,3V2h4v1" /><path d="M3,3l.7,7h4.6L9,3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="cn-branch__body">
        {/* Logic type */}
        <div className="cn-branch__logic">
          <span className="cn-branch__logic-label">QUY TẮC LOGIC</span>
          <div className="cn-branch__logic-group">
            {(["AND", "OR", "CUSTOM"] as LogicType[]).map((lt) => (
              <button
                key={lt}
                type="button"
                className={`cn-branch__logic-btn${branch.logicType === lt ? " cn-branch__logic-btn--active" : ""}`}
                onClick={() => onChange({ logicType: lt })}
              >
                {lt}
              </button>
            ))}
          </div>
        </div>

        {/* Rules */}
        {branch.logicType !== "CUSTOM" ? (
          <div className="cn-branch__rules">
            {branch.rules.map((rule, ri) => (
              <React.Fragment key={rule.id}>
                {ri > 0 && (
                  <div className="cn-rule-connector">{branch.logicType}</div>
                )}
                <RuleRow
                  rule={rule}
                  onChange={(patch) => updateRule(rule.id, patch)}
                  onDelete={() => deleteRule(rule.id)}
                  canDelete={branch.rules.length > 1}
                />
              </React.Fragment>
            ))}
            <button type="button" className="cn-branch__add-rule" onClick={addRule}>
              + Thêm điều kiện
            </button>
          </div>
        ) : (
          <textarea
            className="cn-branch__custom-expr"
            value={branch.customExpression}
            onChange={(e) => onChange({ customExpression: e.target.value })}
            rows={3}
            placeholder='Biểu thức tùy chỉnh, ví dụ: {{age}} > 18 && {{status}} == "active"'
          />
        )}

        {/* Description */}
        <div className="cn-branch__desc-wrap">
          <label className="cn-branch__desc-label">MÔ TẢ NGHIỆP VỤ</label>
          <textarea
            className="cn-branch__desc"
            rows={2}
            value={branch.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Giải thích điều kiện để người đọc hiểu nghiệp vụ..."
          />
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

export const ConditionNodeForm: React.FC<NodeConfigFormProps> = ({
  form, nodeId, graphEdges, graphNodes, onSave, onClose,
}) => {
  const conditionBranchTargets = React.useMemo(
    () => getOutgoingBranchTargets(nodeId, graphEdges, graphNodes),
    [nodeId, graphEdges, graphNodes]
  );

  const [label, setLabel] = React.useState(form.label);
  const [branches, setBranches] = React.useState<Branch[]>(() =>
    loadBranches(form, conditionBranchTargets)
  );
  const [elseDesc, setElseDesc] = React.useState(
    () => form.configProperties?.find((c) => c.key === "__elseDesc")?.value ?? ""
  );
  const [configProps, setConfigProps] = React.useState(() =>
    (form.configProperties ?? []).filter((c) => c.key !== CONFIG_KEY && c.key !== "__elseDesc")
  );

  // timeout / logging / outputVar from config
  const getConf = (key: string, def = "") =>
    configProps.find((c) => c.key === key)?.value ?? def;
  const setConf = (key: string, displayName: string, value: string) =>
    setConfigProps((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) return prev.map((c) => c.key === key ? { ...c, value } : c);
      return [...prev, { id: uid(), displayName, key, value }];
    });

  React.useEffect(() => {
    setBranches(loadBranches(
      { ...form, configProperties: form.configProperties },
      conditionBranchTargets
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditionBranchTargets]);

  const updateBranch = (id: string, patch: Partial<Branch>) =>
    setBranches((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));

  const deleteBranch = (id: string) =>
    setBranches((prev) => prev.filter((b) => b.id !== id));

  const moveBranch = (id: string, dir: -1 | 1) =>
    setBranches((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });

  const addBranch = () =>
    setBranches((prev) => [...prev, makeBranch(undefined, `Nhánh ${prev.length + 1}`, prev.length)]);

  const handleSave = () => {
    const branchConditions: Record<string, string> = {};
    branches.forEach((b) => {
      if (b.targetId) branchConditions[b.targetId] = b.name;
    });

    const allConfigProps = [
      ...configProps,
      { id: uid(), displayName: "Condition Branches", key: CONFIG_KEY, value: JSON.stringify(branches) },
      { id: uid(), displayName: "Else Description", key: "__elseDesc", value: elseDesc },
    ];

    const result: NodeFormData = {
      label,
      branchConditions,
      routingCondition: getConf("routingCondition"),
      fields: [],
      configProperties: allConfigProps,
    };
    onSave(result);
  };

  // ── Conditions tab ────────────────────────────────────────────────────────

  const conditionsPanel = (
    <div className="cn-panel">
      {conditionBranchTargets.length === 0 && (
        <div className="cn-empty">
          <p>Chưa nối edge từ node này. Hãy kéo từ node ra để tạo nhánh.</p>
        </div>
      )}

      <div className="cn-branches">
        {branches.map((branch, i) => (
          <BranchCard
            key={branch.id}
            branch={branch}
            index={i}
            total={branches.length}
            onChange={(patch) => updateBranch(branch.id, patch)}
            onDelete={() => deleteBranch(branch.id)}
            onMove={(dir) => moveBranch(branch.id, dir)}
          />
        ))}
      </div>

      <button type="button" className="cn-add-branch" onClick={addBranch}>
        + Thêm nhánh
      </button>

      {/* Else */}
      <div className="cn-else">
        <div className="cn-else__head">
          <span className="cn-else__dot" />
          <span className="cn-else__title">Mặc định (Else)</span>
          <span className="cn-else__hint">Luôn chạy nếu không khớp nhánh nào</span>
        </div>
        <textarea
          className="cn-else__desc"
          rows={2}
          value={elseDesc}
          onChange={(e) => setElseDesc(e.target.value)}
          placeholder="Mô tả hành động mặc định..."
        />
      </div>
    </div>
  );

  // ── Extended config tab ───────────────────────────────────────────────────

  const extendedPanel = (
    <div className="cn-ext">
      <div className="cn-ext__section">
        <label className="cn-ext__label">Biến output</label>
        <input
          className="cn-ext__input"
          value={getConf("outputVariable", "{{selected_branch}}")}
          onChange={(e) => setConf("outputVariable", "Biến output", e.target.value)}
          placeholder="{{selected_branch}}"
        />
        <p className="cn-ext__hint">Các bước sau dùng biến này để biết nhánh nào được chọn.</p>
      </div>

      <div className="cn-ext__section">
        <label className="cn-ext__label">Timeout (giây)</label>
        <input
          className="cn-ext__input cn-ext__input--short"
          type="number"
          min={0}
          value={getConf("timeout", "")}
          onChange={(e) => setConf("timeout", "Timeout", e.target.value)}
          placeholder="Không giới hạn"
        />
      </div>

      <div className="cn-ext__section">
        <label className="cn-ext__label">Biểu thức routing</label>
        <input
          className="cn-ext__input"
          value={getConf("routingCondition")}
          onChange={(e) => setConf("routingCondition", "Routing Condition", e.target.value)}
          placeholder='Ví dụ: {{payment_method}} == "cash"'
        />
      </div>

      <div className="cn-ext__section">
        <label className="cn-ext__label cn-ext__label--inline">
          <input
            type="checkbox"
            checked={getConf("enableLogging", "false") === "true"}
            onChange={(e) => setConf("enableLogging", "Enable Logging", String(e.target.checked))}
          />
          Ghi log khi thực thi điều kiện
        </label>
      </div>

      <div className="cn-ext__divider" />
      <ExtendedConfigEditor
        items={configProps}
        onChange={setConfigProps}
      />
    </div>
  );

  const tabs = [
    { id: "conditions", label: "Điều kiện nhánh", panel: conditionsPanel },
    { id: "config", label: "Cấu hình mở rộng", panel: extendedPanel },
  ];

  return (
    <NodeFormShell
      label={label}
      onLabelChange={setLabel}
      tabs={tabs}
      defaultTab="conditions"
      onSave={handleSave}
      onClose={onClose}
    />
  );
};
