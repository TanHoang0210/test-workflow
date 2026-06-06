import React from "react";
import type { NodeFormData } from "../../workflow/types";
import type { NodeConfigFormProps } from "./nodeFormTypes";
import { NodeFormShell } from "../NodeFormShell";
import { ExtendedConfigEditor } from "../ExtendedConfigEditor";
import { uid } from "../../workflow/uid";

// ── MIME map ──────────────────────────────────────────────────────────────

const FILE_PRESETS: { id: string; label: string; icon: string; mimes: string[] }[] = [
  {
    id: "pdf",
    label: "PDF",
    icon: "isax-document-text",
    mimes: ["application/pdf"],
  },
  {
    id: "image",
    label: "Image",
    icon: "isax-gallery",
    mimes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  },
  {
    id: "word",
    label: "Word",
    icon: "isax-document",
    mimes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  {
    id: "excel",
    label: "Excel",
    icon: "isax-grid-6",
    mimes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
  {
    id: "video",
    label: "Video",
    icon: "isax-video-square",
    mimes: ["video/mp4", "video/avi", "video/quicktime", "video/x-matroska"],
  },
  {
    id: "archive",
    label: "Archive",
    icon: "isax-folder-2",
    mimes: [
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
      "application/gzip",
    ],
  },
  {
    id: "audio",
    label: "Audio",
    icon: "isax-music",
    mimes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac"],
  },
];

function buildAllowedTypes(selectedPresets: string[], customExts: string): string[] {
  const mimes: string[] = [];
  for (const id of selectedPresets) {
    const preset = FILE_PRESETS.find((p) => p.id === id);
    if (preset) mimes.push(...preset.mimes);
  }
  // Custom extensions → kept as-is (host app handles mapping)
  if (customExts.trim()) {
    const exts = customExts
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    mimes.push(...exts);
  }
  return [...new Set(mimes)];
}

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

// ── Toggle switch ──────────────────────────────────────────────────────────

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}> = ({ checked, onChange, id }) => (
  <label className="atf-toggle" htmlFor={id}>
    <input
      id={id}
      type="checkbox"
      className="atf-toggle__input"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="atf-toggle__track">
      <span className="atf-toggle__thumb" />
    </span>
  </label>
);

// ── Main Component ─────────────────────────────────────────────────────────

export const AttachFileNodeForm: React.FC<NodeConfigFormProps> = ({
  form,
  onSave,
  onClose,
}) => {
  const [label, setLabel] = React.useState(form.label);
  const [cfg, setCfgState] = React.useState(() =>
    (form.configProperties ?? []).map((c) => ({ ...c }))
  );

  const set = (key: string, displayName: string, value: string) =>
    setCfgState((prev) => setCfg(prev, key, displayName, value));

  // ── Derived state ──────────────────────────────────────────────────────

  const selectedPresets: string[] = (() => {
    try { return JSON.parse(getCfg(cfg, "selectedPresets", "[]")); } catch { return []; }
  })();

  const togglePreset = (id: string) => {
    const next = selectedPresets.includes(id)
      ? selectedPresets.filter((p) => p !== id)
      : [...selectedPresets, id];
    set("selectedPresets", "Selected Presets", JSON.stringify(next));
  };

  const showCustom = selectedPresets.includes("custom");
  const customExts = getCfg(cfg, "customExtensions", "");
  const [customInput, setCustomInput] = React.useState("");

  const addCustomExt = () => {
    if (!customInput.trim()) return;
    const ext = customInput.trim().startsWith(".") ? customInput.trim() : `.${customInput.trim()}`;
    const current = customExts ? customExts.split(",").map((e) => e.trim()) : [];
    if (!current.includes(ext)) {
      set("customExtensions", "Custom Extensions", [...current, ext].join(","));
    }
    setCustomInput("");
  };

  const removeCustomExt = (ext: string) => {
    const current = customExts.split(",").map((e) => e.trim()).filter((e) => e !== ext);
    set("customExtensions", "Custom Extensions", current.join(","));
  };

  const sizeValue = getCfg(cfg, "sizeValue", "25");
  const sizeUnit = getCfg(cfg, "sizeUnit", "MB") as "MB" | "GB";
  const maxSizeMB = sizeUnit === "GB" ? Number(sizeValue) * 1024 : Number(sizeValue);

  const multiple  = getCfg(cfg, "multiple",    "true") === "true";
  const required  = getCfg(cfg, "required",    "false") === "true";
  const allowDel  = getCfg(cfg, "allowDelete", "true") === "true";

  const outputVar = getCfg(cfg, "outputVar", "uploaded_file");

  // ── Config panel ────────────────────────────────────────────────────────

  const configPanel = (
    <div className="atf-root">

      {/* File type section */}
      <div className="atf-section">
        <div className="atf-section__head">
          <p className="atf-section__title">LOẠI FILE CHO PHÉP</p>
          <span className="atf-section__hint">Để trống để chấp nhận tất cả</span>
        </div>
        <div className="atf-presets">
          {FILE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`atf-preset${selectedPresets.includes(p.id) ? " atf-preset--active" : ""}`}
              onClick={() => togglePreset(p.id)}
            >
              <i className={p.icon} />
              <span>{p.label}</span>
            </button>
          ))}
          <button
            type="button"
            className={`atf-preset atf-preset--custom${selectedPresets.includes("custom") ? " atf-preset--active" : ""}`}
            onClick={() => togglePreset("custom")}
          >
            <span>+</span>
            <span>Tùy chỉnh</span>
          </button>
        </div>

        {showCustom && (
          <div className="atf-custom-ext">
            {customExts && (
              <div className="atf-ext-tags">
                {customExts.split(",").filter(Boolean).map((ext) => (
                  <span key={ext} className="atf-ext-tag">
                    {ext}
                    <button type="button" onClick={() => removeCustomExt(ext)}>✕</button>
                  </span>
                ))}
              </div>
            )}
            <div className="atf-ext-input-row">
              <input
                className="atf-input"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Nhập phần mở rộng (ví dụ: .csv, .xml, .psd)"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addCustomExt(); }
                }}
              />
              <button type="button" className="atf-ext-add" onClick={addCustomExt}>Thêm</button>
            </div>
          </div>
        )}
      </div>

      {/* Size section */}
      <div className="atf-section">
        <p className="atf-section__title">GIỚI HẠN DUNG LƯỢNG</p>
        <div className="atf-field">
          <label className="atf-label">Dung lượng tối đa mỗi tệp</label>
          <div className="atf-size-row">
            <input
              type="number"
              className="atf-input atf-input--size"
              min={1}
              value={sizeValue}
              onChange={(e) => set("sizeValue", "Size Value", e.target.value)}
            />
            <select
              className="atf-select atf-select--unit"
              value={sizeUnit}
              onChange={(e) => set("sizeUnit", "Size Unit", e.target.value)}
            >
              <option value="MB">MB</option>
              <option value="GB">GB</option>
            </select>
          </div>
          <p className="atf-hint">
            Truyền vào UploadMeta.maxSizeMB = <strong>{maxSizeMB} MB</strong>.
            Host app tự enforce phía upload handler.
          </p>
        </div>
      </div>

      {/* Behavior section */}
      <div className="atf-section">
        <p className="atf-section__title">HÀNH VI UPLOAD</p>
        <div className="atf-behaviors">
          <div className="atf-behavior">
            <div className="atf-behavior__text">
              <span className="atf-behavior__label">Cho phép tải lên nhiều tệp</span>
              <span className="atf-behavior__desc">Người dùng có thể đính kèm cùng lúc nhiều tài liệu</span>
            </div>
            <Toggle
              id="atf-multiple"
              checked={multiple}
              onChange={(v) => set("multiple", "Multiple Files", String(v))}
            />
          </div>
          <div className="atf-behavior">
            <div className="atf-behavior__text">
              <span className="atf-behavior__label">Bắt buộc đính kèm</span>
              <span className="atf-behavior__desc">Ngăn chặn tiếp tục flow nếu chưa có tệp đính kèm</span>
            </div>
            <Toggle
              id="atf-required"
              checked={required}
              onChange={(v) => set("required", "Required", String(v))}
            />
          </div>
          <div className="atf-behavior">
            <div className="atf-behavior__text">
              <span className="atf-behavior__label">Cho phép xóa tệp sau khi chọn</span>
              <span className="atf-behavior__desc">Hiển thị nút 'X' để người dùng gỡ tệp nhầm</span>
            </div>
            <Toggle
              id="atf-allowdel"
              checked={allowDel}
              onChange={(v) => set("allowDelete", "Allow Delete", String(v))}
            />
          </div>
        </div>
      </div>

      {/* Output variables section */}
      <div className="atf-section">
        <p className="atf-section__title">BIẾN ĐẦU RA (OUTPUT)</p>
        <div className="atf-field">
          <label className="atf-label">Tên biến cơ sở</label>
          <div className="atf-var-input-wrap">
            <span className="atf-var-prefix">⊡</span>
            <input
              className="atf-input atf-input--var"
              value={outputVar}
              onChange={(e) =>
                set("outputVar", "Output Variable", e.target.value.replace(/\s/g, "_").replace(/[^a-z0-9_]/gi, ""))
              }
              placeholder="uploaded_file"
            />
          </div>
        </div>
        <div className="atf-vars-preview">
          {[
            { v: `{{${outputVar}_url}}`,  desc: "URL công khai tệp" },
            { v: `{{${outputVar}_name}}`, desc: "Tên tệp gốc" },
            { v: `{{${outputVar}_id}}`,   desc: "ID nội bộ" },
            ...(multiple ? [{ v: `{{${outputVar}_urls}}`, desc: "Mảng URL (multiple)" }] : []),
          ].map(({ v, desc }) => (
            <div key={v} className="atf-var-row">
              <code className="atf-var-code">{v}</code>
              <span className="atf-var-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );

  // ── Save ────────────────────────────────────────────────────────────────

  const handleSave = () => {
    // Resolve allowedTypes from presets + custom extensions
    const allowedTypes = buildAllowedTypes(selectedPresets.filter((p) => p !== "custom"), customExts);
    let finalCfg = setCfg(cfg, "allowedTypes", "Allowed Types",
      allowedTypes.length ? JSON.stringify(allowedTypes) : "");
    finalCfg = setCfg(finalCfg, "maxSizeMB", "Max Size MB", String(maxSizeMB));

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
