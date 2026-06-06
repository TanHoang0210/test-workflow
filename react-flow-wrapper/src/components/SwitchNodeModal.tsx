import React from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface FlowField { key: string; label?: string; icon?: string }
export interface FlowStep  { id: string; label: string }

export type SwitchCaseColor = 'purple' | 'green' | 'red' | 'amber' | 'blue' | 'teal';

export interface SwitchCase {
  id: string;
  label: string;
  values: string[];
  targetStepId: string;
  color: SwitchCaseColor;
}

export interface SwitchNodeConfig {
  nodeId: string;
  name: string;
  switchField: string;
  matchMode: 'equals' | 'contains' | 'regex';
  cases: SwitchCase[];
  defaultAction: 'stop' | 'go_back' | 'notify_error' | { type: 'go_to_step'; stepId: string };
}

export interface SwitchNodeModalProps {
  initialConfig?: SwitchNodeConfig;
  availableFields: FlowField[];
  availableSteps: FlowStep[];
  onSave: (config: SwitchNodeConfig) => void;
  onCancel: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const COLORS: SwitchCaseColor[] = ['purple', 'green', 'red', 'amber', 'blue', 'teal'];

const CHIP_STYLES: Record<SwitchCaseColor, { bg: string; text: string; border: string }> = {
  purple: { bg: '#EEEDFE', text: '#3C3489', border: '#AFA9EC' },
  green:  { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459' },
  red:    { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595' },
  amber:  { bg: '#FAEEDA', text: '#633806', border: '#EF9F27' },
  blue:   { bg: '#E6F1FB', text: '#0C447C', border: '#85B7EB' },
  teal:   { bg: '#E1F5EE', text: '#085041', border: '#5DCAA5' },
};

const BADGE_BG: Record<SwitchCaseColor, string> = {
  purple: '#7c3aed', green: '#16a34a', red: '#dc2626',
  amber: '#d97706', blue: '#2563eb', teal: '#0891b2',
};

// ── Default config ─────────────────────────────────────────────────────────

function makeDefault(): SwitchNodeConfig {
  return {
    nodeId: crypto.randomUUID(),
    name: 'Switch node',
    switchField: '',
    matchMode: 'equals',
    cases: [],
    defaultAction: 'stop',
  };
}

// ── Field icon map ─────────────────────────────────────────────────────────

function FieldIcon({ icon }: { icon?: string }) {
  const sym = icon ?? '#';
  return (
    <span className="text-[11px] font-mono text-gray-400 w-4 text-center shrink-0">{sym}</span>
  );
}

// ── Chip component ─────────────────────────────────────────────────────────

function Chip({
  value, color, duplicate, onRemove,
}: { value: string; color: SwitchCaseColor; duplicate: boolean; onRemove: () => void }) {
  const s = CHIP_STYLES[color];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: s.bg, color: s.text,
        borderColor: duplicate ? '#ef4444' : s.border,
        outline: duplicate ? '1.5px solid #ef4444' : undefined,
      }}
      title={duplicate ? 'Đã dùng ở case khác' : undefined}
    >
      {value}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:opacity-70 leading-none"
        title="Xóa giá trị"
      >×</button>
    </span>
  );
}

// ── CaseCard ───────────────────────────────────────────────────────────────

function CaseCard({
  sc, allValues, availableSteps, onChange, onDelete,
}: {
  sc: SwitchCase;
  allValues: Set<string>;
  availableSteps: FlowStep[];
  onChange: (patch: Partial<SwitchCase>) => void;
  onDelete: () => void;
}) {
  const [addInput, setAddInput] = React.useState('');
  const hasNoValues = sc.values.length === 0;
  const hasNoTarget = !sc.targetStepId;
  const hasNoLabel  = !sc.label.trim();

  const addValue = () => {
    const v = addInput.trim();
    if (!v || sc.values.includes(v)) return;
    onChange({ values: [...sc.values, v] });
    setAddInput('');
  };

  const targetLabel = availableSteps.find(s => s.id === sc.targetStepId)?.label;

  return (
    <div
      className="border rounded-lg mb-2 overflow-hidden bg-white"
      style={{ borderColor: hasNoValues ? '#f59e0b' : '#e5e7eb' }}
      title={hasNoValues ? 'Case chưa có giá trị' : undefined}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
        {/* Color badge */}
        <span
          className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
          style={{ backgroundColor: BADGE_BG[sc.color] }}
        >→</span>

        {/* Label input */}
        <input
          type="text"
          value={sc.label}
          onChange={e => onChange({ label: e.target.value })}
          className={`flex-1 min-w-0 text-sm font-medium bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 ${hasNoLabel ? 'ring-1 ring-amber-400' : ''}`}
          placeholder="Tên case…"
        />

        {/* Target badge */}
        {targetLabel && (
          <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded shrink-0">
            → {targetLabel}
          </span>
        )}

        {/* ROUTE badge */}
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ backgroundColor: `${BADGE_BG[sc.color]}22`, color: BADGE_BG[sc.color] }}
        >ROUTE →</span>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
          title="Xóa case"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Card body */}
      <div className="px-3 py-2.5 space-y-2">
        {/* Chips + add input */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {sc.values.map((v, i) => {
            const dupCount = [...allValues].filter(x => x === v).length;
            const isDup = dupCount > 1;
            return (
              <Chip
                key={i}
                value={v}
                color={sc.color}
                duplicate={isDup}
                onRemove={() => onChange({ values: sc.values.filter((_, j) => j !== i) })}
              />
            );
          })}

          {/* Add value inline */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={addInput}
              onChange={e => setAddInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addValue(); }}}
              placeholder="+ Thêm giá trị"
              className="text-xs text-gray-400 placeholder-gray-300 bg-transparent border-0 outline-none w-28 focus:text-gray-700"
            />
            {addInput.trim() && (
              <button
                type="button"
                onClick={addValue}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >Thêm</button>
            )}
          </div>
        </div>

        {/* Step selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 shrink-0">Chuyển tới</span>
          <select
            value={sc.targetStepId}
            onChange={e => onChange({ targetStepId: e.target.value })}
            className={`flex-1 text-xs border rounded px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-blue-300 ${hasNoTarget ? 'border-amber-400' : 'border-gray-200'}`}
          >
            <option value="">— Chọn bước —</option>
            {availableSteps.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export const SwitchNodeModal: React.FC<SwitchNodeModalProps> = ({
  initialConfig,
  availableFields,
  availableSteps,
  onSave,
  onCancel,
}) => {
  const [cfg, setCfg] = React.useState<SwitchNodeConfig>(
    () => initialConfig ?? makeDefault()
  );

  const patch = (p: Partial<SwitchNodeConfig>) => setCfg(c => ({ ...c, ...p }));

  // Flatten all values for duplicate detection
  const allValuesMultiset = cfg.cases.flatMap(c => c.values);

  // Derived validation
  const noField    = !cfg.switchField;
  const errorCount = [
    noField,
    cfg.cases.some(c => c.values.length === 0),
    cfg.cases.some(c => !c.targetStepId),
    cfg.cases.some(c => !c.label.trim()),
    // duplicate values across cases
    allValuesMultiset.length !== new Set(allValuesMultiset).size,
  ].filter(Boolean).length;

  const canSave = !noField && errorCount === 0;

  const addCase = () => {
    const color = COLORS[cfg.cases.length % COLORS.length];
    patch({
      cases: [...cfg.cases, {
        id: crypto.randomUUID(),
        label: 'Case mới',
        values: [],
        targetStepId: '',
        color,
      }],
    });
  };

  const updateCase = (id: string, p: Partial<SwitchCase>) =>
    patch({ cases: cfg.cases.map(c => c.id === id ? { ...c, ...p } : c) });

  const deleteCase = (id: string) =>
    patch({ cases: cfg.cases.filter(c => c.id !== id) });

  // Summary
  const summaryErrors = errorCount > 0
    ? <span className="text-red-500 ml-1">· {errorCount} lỗi</span>
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden"
        style={{ width: 860, height: 560 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 border-b border-gray-100 shrink-0" style={{ height: 48 }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-gray-400 shrink-0">Tên node</span>
            <input
              type="text"
              value={cfg.name}
              onChange={e => patch({ name: e.target.value })}
              className="text-sm font-semibold text-gray-800 bg-transparent border-0 outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 min-w-0"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold tracking-widest px-3 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700">
              ⇄ SWITCH
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">

          {/* Left panel */}
          <div className="flex flex-col border-r border-gray-100 bg-gray-50 shrink-0 overflow-y-auto" style={{ width: 200 }}>

            {/* Field rẽ nhánh */}
            <div className="px-3 pt-3 pb-2">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Field rẽ nhánh</p>
              {cfg.switchField ? (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-blue-50 border border-blue-200">
                  <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className="text-xs font-mono font-semibold text-blue-800 truncate">{cfg.switchField}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center px-2 py-2 rounded-md border border-dashed border-blue-200 text-[11px] text-blue-300">
                  Chọn field bên dưới
                </div>
              )}
              {noField && (
                <p className="text-[10px] text-amber-500 mt-1">Cần chọn field để phân nhánh</p>
              )}
            </div>

            <div className="border-t border-gray-200 mx-3" />

            {/* Chọn field khác */}
            <div className="px-3 pt-2 pb-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Chọn field khác</p>
              <div className="space-y-0.5">
                {availableFields.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => patch({ switchField: f.key })}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                      cfg.switchField === f.key
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <FieldIcon icon={f.icon} />
                    <span className="font-mono truncate">{f.key}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 mx-3 mt-1" />

            {/* Kiểu so sánh */}
            <div className="px-3 pt-2 pb-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Kiểu so sánh</p>
              {(['equals', 'contains', 'regex'] as const).map((mode, i) => {
                const label = ['Bằng', 'Chứa', 'Regex'][i];
                const active = cfg.matchMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => patch({ matchMode: mode })}
                    className={`w-full flex items-center justify-between px-3 py-1.5 mb-0.5 rounded text-xs font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                    {active && (
                      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 min-w-0 overflow-y-auto p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Danh sách case</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  {cfg.cases.length} case
                </span>
              </div>
            </div>

            {/* Case cards */}
            {cfg.cases.map(sc => (
              <CaseCard
                key={sc.id}
                sc={sc}
                allValues={new Set(allValuesMultiset)}
                availableSteps={availableSteps}
                onChange={p => updateCase(sc.id, p)}
                onDelete={() => deleteCase(sc.id)}
              />
            ))}

            {/* Default case row */}
            <div className="flex items-center justify-between px-3 py-2 border border-dashed border-gray-200 rounded-lg mb-2 bg-gray-50">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
                <span className="text-xs text-gray-400 italic">Default — không khớp case nào</span>
              </div>
              <select
                value={typeof cfg.defaultAction === 'string' ? cfg.defaultAction : 'go_to_step'}
                onChange={e => {
                  const v = e.target.value;
                  patch({ defaultAction: v === 'go_to_step' ? { type: 'go_to_step', stepId: '' } : v as 'stop' | 'go_back' | 'notify_error' });
                }}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-red-500 font-medium outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value="stop">Dừng quy trình</option>
                <option value="go_back">Quay lại bước trước</option>
                <option value="notify_error">Thông báo lỗi</option>
                <option value="go_to_step">Chuyển tới bước…</option>
              </select>
            </div>

            {/* Add case button */}
            <button
              type="button"
              onClick={addCase}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Thêm case
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-5 border-t border-gray-100 bg-white shrink-0"
          style={{ height: 44 }}
        >
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="font-mono font-medium text-gray-600">{cfg.switchField || '—'}</span>
            <span>· {cfg.cases.length} case · 1 default</span>
            {summaryErrors}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={() => canSave && onSave(cfg)}
              disabled={!canSave}
              className={`px-5 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                canSave
                  ? 'bg-blue-700 text-white hover:bg-blue-800'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              Lưu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
