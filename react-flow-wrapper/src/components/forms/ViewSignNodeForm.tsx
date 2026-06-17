import React from "react";
import type { NodeFormData } from "../../workflow/types";
import type { NodeConfigFormProps } from "./nodeFormTypes";
import { NodeFormShell } from "../NodeFormShell";
import { ExtendedConfigEditor } from "../ExtendedConfigEditor";
import { uid } from "../../workflow/uid";
import { uploadSignatureSample } from "../../services/supabaseStorage";

// ── Data model ─────────────────────────────────────────────────────────────

type Method = "usb" | "cloud";
type Algorithm = "RSA-2048" | "RSA-4096" | "ECDSA";
type Standard = "CAdES" | "PAdES" | "XAdES";
type TwoFA = "OTP SMS" | "OTP App" | "Biometric";
type SignType = "signature" | "initials" | "both";
type InitialsScope = "all" | "even" | "odd" | "custom";

interface SignerConfig {
  id: string;
  name: string;
  email: string;
  role: string;
  // How
  method: Method;
  caProvider: string;
  algorithm: Algorithm;
  timestampServer: string;
  standards: Standard[];
  cloudProvider: string;
  twoFA: TwoFA;
  // What
  signType: SignType;
  initialsScope: InitialsScope;
  customPages: string;
  // Mẫu chữ ký — ảnh upload, lưu trong bucket "flow-test" của Supabase Storage
  signatureSampleUrl: string;
  signatureSamplePath: string;
}

function newSigner(): SignerConfig {
  return {
    id: uid("sgn"),
    name: "",
    email: "",
    role: "",
    method: "usb",
    caProvider: "VNPT",
    algorithm: "RSA-2048",
    timestampServer: "VNPT TSA",
    standards: ["PAdES"],
    cloudProvider: "VNPT SmartCA",
    twoFA: "OTP SMS",
    signType: "both",
    initialsScope: "all",
    customPages: "",
    signatureSampleUrl: "",
    signatureSamplePath: "",
  };
}

// ── Summary text ───────────────────────────────────────────────────────────

function buildSummary(s: SignerConfig): string {
  const how =
    s.method === "usb"
      ? `USB Token (${s.caProvider})`
      : `Ký số Cloud (${s.cloudProvider})`;

  const scopeLabel: Record<InitialsScope, string> = {
    all: "tất cả các trang",
    even: "trang chẵn",
    odd: "trang lẻ",
    custom: `trang ${s.customPages || "..."}`,
  };

  let what: string;
  if (s.signType === "signature") what = "Ký chính";
  else if (s.signType === "initials") what = `Ký nháy ${scopeLabel[s.initialsScope]}`;
  else what = `Ký nháy ${scopeLabel[s.initialsScope]} + Ký chính trang cuối`;

  return `Ký bằng ${how} · ${what}`;
}

// ── Signer Card ────────────────────────────────────────────────────────────

const STANDARDS: Standard[] = ["CAdES", "PAdES", "XAdES"];

const SignerCard: React.FC<{
  signer: SignerConfig;
  index: number;
  onChange: (updated: SignerConfig) => void;
  onRemove: () => void;
  canRemove: boolean;
}> = ({ signer, index, onChange, onRemove, canRemove }) => {
  const upd = (patch: Partial<SignerConfig>) => onChange({ ...signer, ...patch });

  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleSampleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadSignatureSample(file, signer.name || signer.id);
      upd({ signatureSampleUrl: uploaded.publicUrl, signatureSamplePath: uploaded.path });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const removeSample = () => upd({ signatureSampleUrl: "", signatureSamplePath: "" });

  const toggleStandard = (s: Standard) => {
    const next = signer.standards.includes(s)
      ? signer.standards.filter((x) => x !== s)
      : [...signer.standards, s];
    upd({ standards: next.length ? next : [s] });
  };

  return (
    <div className="vks-card">
      {/* Card header */}
      <div className="vks-card__head">
        <div className="vks-card__num">{index + 1}</div>
        <div className="vks-card__info">
          <input
            className="vks-input vks-input--name"
            value={signer.name}
            onChange={(e) => upd({ name: e.target.value })}
            placeholder="Tên người ký..."
          />
          <div className="vks-card__meta-row">
            <input
              className="vks-input vks-input--meta"
              value={signer.email}
              onChange={(e) => upd({ email: e.target.value })}
              placeholder="email@company.com"
            />
            <span className="vks-card__sep">•</span>
            <input
              className="vks-input vks-input--meta"
              value={signer.role}
              onChange={(e) => upd({ role: e.target.value })}
              placeholder="Chức vụ..."
            />
          </div>
        </div>
        {canRemove && (
          <button type="button" className="vks-card__remove" onClick={onRemove} title="Xóa người ký">
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="10" height="10">
              <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
            </svg>
          </button>
        )}
      </div>

      {/* Two-column body */}
      <div className="vks-card__body">
        {/* Left: How */}
        <div className="vks-col">
          <p className="vks-col__title">PHƯƠNG THỨC KÝ (HOW)</p>

          <div className="vks-methods">
            <label className={`vks-method${signer.method === "usb" ? " vks-method--active" : ""}`}>
              <input
                type="radio"
                name={`method-${signer.id}`}
                value="usb"
                checked={signer.method === "usb"}
                onChange={() => upd({ method: "usb" })}
              />
              <span className="vks-method__dot" />
              <span className="vks-method__label">USB Token</span>
              <span className="vks-method__icon">
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" width="16" height="16">
                  <rect x="5" y="2" width="8" height="12" rx="2" />
                  <line x1="9" y1="14" x2="9" y2="16" />
                  <circle cx="9" cy="7" r="1.5" />
                </svg>
              </span>
            </label>
            <label className={`vks-method${signer.method === "cloud" ? " vks-method--active" : ""}`}>
              <input
                type="radio"
                name={`method-${signer.id}`}
                value="cloud"
                checked={signer.method === "cloud"}
                onChange={() => upd({ method: "cloud" })}
              />
              <span className="vks-method__dot" />
              <span className="vks-method__label">Ký số Cloud</span>
              <span className="vks-method__icon">
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" width="16" height="16">
                  <path d="M4 12a3.5 3.5 0 0 1 0-7h.5A5 5 0 1 1 14 9.5" />
                  <path d="M9 13v4M7 15l2-2 2 2" />
                </svg>
              </span>
            </label>
          </div>

          {/* USB Token sub-config */}
          {signer.method === "usb" && (
            <div className="vks-sub">
              <div className="vks-row2">
                <div className="vks-field">
                  <label className="vks-label">CA PROVIDER</label>
                  <select className="vks-select" value={signer.caProvider}
                    onChange={(e) => upd({ caProvider: e.target.value })}>
                    <option>VNPT</option>
                    <option>FPT</option>
                    <option>Bkav</option>
                    <option>VNPT-I</option>
                  </select>
                </div>
                <div className="vks-field">
                  <label className="vks-label">ALGORITHM</label>
                  <select className="vks-select" value={signer.algorithm}
                    onChange={(e) => upd({ algorithm: e.target.value as Algorithm })}>
                    <option value="RSA-2048">RSA-2048</option>
                    <option value="RSA-4096">RSA-4096</option>
                    <option value="ECDSA">ECDSA</option>
                  </select>
                </div>
              </div>
              <div className="vks-row2">
                <div className="vks-field">
                  <label className="vks-label">TIMESTAMP</label>
                  <select className="vks-select" value={signer.timestampServer}
                    onChange={(e) => upd({ timestampServer: e.target.value })}>
                    <option value="VNPT TSA">VNPT TSA</option>
                    <option value="FPT TSA">FPT TSA</option>
                    <option value="none">Không dùng</option>
                  </select>
                </div>
                <div className="vks-field">
                  <label className="vks-label">STANDARD</label>
                  <div className="vks-chips">
                    {STANDARDS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`vks-chip${signer.standards.includes(s) ? " vks-chip--on" : ""}`}
                        onClick={() => toggleStandard(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cloud sub-config */}
          {signer.method === "cloud" && (
            <div className="vks-sub">
              <div className="vks-field">
                <label className="vks-label">CLOUD PROVIDER</label>
                <select className="vks-select" value={signer.cloudProvider}
                  onChange={(e) => upd({ cloudProvider: e.target.value })}>
                  <option value="VNPT SmartCA">VNPT SmartCA</option>
                  <option value="VNPT CA Cloud">VNPT CA Cloud</option>
                  <option value="FPT CA Cloud">FPT CA Cloud</option>
                  <option value="Bkav CA Cloud">Bkav CA Cloud</option>
                </select>
              </div>
              <div className="vks-field">
                <label className="vks-label">XÁC THỰC 2 BƯỚC (2FA)</label>
                <div className="vks-methods vks-methods--sm">
                  {(["OTP SMS", "OTP App", "Biometric"] as TwoFA[]).map((f) => (
                    <label
                      key={f}
                      className={`vks-method${signer.twoFA === f ? " vks-method--active" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`twofa-${signer.id}`}
                        value={f}
                        checked={signer.twoFA === f}
                        onChange={() => upd({ twoFA: f })}
                      />
                      <span className="vks-method__dot" />
                      <span className="vks-method__label">{f}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="vks-col-div" />

        {/* Right: What */}
        <div className="vks-col">
          <p className="vks-col__title">LOẠI CHỮ KÝ (WHAT)</p>

          <div className="vks-sign-types">
            {(
              [
                { v: "signature", label: "Ký chính (Signature)", desc: "Full signature, xác nhận toàn bộ tài liệu" },
                { v: "initials",  label: "Ký nháy (Initials)",   desc: "Initials ở góc từng trang, xác nhận đã đọc" },
                { v: "both",      label: "Cả hai",               desc: "Ký nháy từng trang + ký chính trang cuối" },
              ] as { v: SignType; label: string; desc: string }[]
            ).map(({ v, label, desc }) => (
              <label
                key={v}
                className={`vks-sign-type${signer.signType === v ? " vks-sign-type--active" : ""}`}
              >
                <div className="vks-sign-type__radio-wrap">
                  <input
                    type="radio"
                    name={`signtype-${signer.id}`}
                    value={v}
                    checked={signer.signType === v}
                    onChange={() => upd({ signType: v })}
                  />
                </div>
                <div className="vks-sign-type__content">
                  <span className="vks-sign-type__label">{label}</span>
                  <span className="vks-sign-type__desc">{desc}</span>
                </div>
              </label>
            ))}
          </div>

          {/* Initials scope */}
          {(signer.signType === "initials" || signer.signType === "both") && (
            <div className="vks-sub">
              <label className="vks-label">SCOPE (PHẠM VI KÝ NHÁY)</label>
              <div className="vks-scope-chips">
                {(
                  [
                    { v: "all",    l: "Tất cả trang" },
                    { v: "even",   l: "Trang chẵn" },
                    { v: "odd",    l: "Trang lẻ" },
                    { v: "custom", l: "Chỉ định trang" },
                  ] as { v: InitialsScope; l: string }[]
                ).map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    className={`vks-scope-chip${signer.initialsScope === v ? " vks-scope-chip--on" : ""}`}
                    onClick={() => upd({ initialsScope: v })}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {signer.initialsScope === "custom" && (
                <input
                  className="vks-input"
                  style={{ marginTop: 8 }}
                  value={signer.customPages}
                  onChange={(e) => upd({ customPages: e.target.value })}
                  placeholder="VD: 1,3,5-8,10"
                />
              )}
            </div>
          )}

          {/* Signature sample */}
          <div className="vks-sample">
            <label className="vks-label">
              MẪU CHỮ KÝ <span className="vks-label--opt">(OPTIONAL)</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              style={{ display: "none" }}
              onChange={handleSampleFileChange}
            />

            {signer.signatureSampleUrl ? (
              <div className="vks-sample__preview">
                <img className="vks-sample__img" src={signer.signatureSampleUrl} alt="Mẫu chữ ký" />
                <div className="vks-sample__preview-actions">
                  <button
                    type="button"
                    className="vks-sample__action"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Đang tải..." : "Thay ảnh khác"}
                  </button>
                  <button type="button" className="vks-sample__action vks-sample__action--del" onClick={removeSample}>
                    Xóa
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="vks-sample__box vks-sample__box--btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" width="28" height="28">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M8 15c2-1 4 1 6-1" strokeLinecap="round" />
                </svg>
                <span className="vks-sample__hint">
                  {uploading ? "Đang tải lên bucket “flow-test”..." : "Tải lên mẫu chữ ký (.png, .jpg)"}
                </span>
              </button>
            )}

            {uploadError && <p className="vks-sample__error">{uploadError}</p>}
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="vks-card__summary">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="7" />
          <line x1="8" y1="7" x2="8" y2="11" strokeLinecap="round" />
          <circle cx="8" cy="5" r="0.5" fill="currentColor" />
        </svg>
        <span className="vks-card__summary-text">
          <strong>Tóm tắt:</strong>&nbsp;{buildSummary(signer)}
        </span>
      </div>
    </div>
  );
};

// ── Main form ──────────────────────────────────────────────────────────────

export const ViewSignNodeForm: React.FC<NodeConfigFormProps> = ({ form, onSave, onClose }) => {
  const [label, setLabel] = React.useState(form.label);
  const [cfg, setCfgState] = React.useState(() =>
    (form.configProperties ?? []).map((c) => ({ ...c }))
  );

  const [signers, setSigners] = React.useState<SignerConfig[]>(() => {
    const raw = cfg.find((c) => c.key === "__viewSignConfig")?.value ?? "";
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        // Backward compat — config cũ chưa có trường mẫu chữ ký
        return parsed.map((s) => ({ signatureSampleUrl: "", signatureSamplePath: "", ...s }));
      }
    } catch { /* ignore */ }
    return [newSigner()];
  });

  const updateSigner = (i: number, updated: SignerConfig) =>
    setSigners((prev) => prev.map((s, j) => (j === i ? updated : s)));

  const removeSigner = (i: number) =>
    setSigners((prev) => prev.filter((_, j) => j !== i));

  const mainPanel = (
    <div className="vks-root">
      <div className="vks-header">
        <span className="vks-header__title">DANH SÁCH NGƯỜI KÝ (MULTI-SIGNERS)</span>
        <button type="button" className="vks-add-btn" onClick={() => setSigners((p) => [...p, newSigner()])}>
          + Thêm người ký
        </button>
      </div>
      <div className="vks-list">
        {signers.map((s, i) => (
          <SignerCard
            key={s.id}
            signer={s}
            index={i}
            onChange={(updated) => updateSigner(i, updated)}
            onRemove={() => removeSigner(i)}
            canRemove={signers.length > 1}
          />
        ))}
      </div>
    </div>
  );

  const handleSave = () => {
    const json = JSON.stringify(signers);
    const updatedCfg = (() => {
      const hit = cfg.find((c) => c.key === "__viewSignConfig");
      if (hit) return cfg.map((c) => (c.key === "__viewSignConfig" ? { ...c, value: json } : c));
      return [...cfg, { id: uid("cfg"), displayName: "View Sign Config", key: "__viewSignConfig", value: json }];
    })();

    const result: NodeFormData = {
      label,
      branchConditions: {},
      fields: [],
      configProperties: updatedCfg,
    };
    onSave(result);
  };

  const tabs = [
    {
      id: "config",
      label: "Cấu hình",
      panelClass: "fb-tab-panel--scroll",
      panel: mainPanel,
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
