import React from "react";
import type { NodeFormData } from "../../workflow/types";
import type { NodeConfigFormProps } from "./nodeFormTypes";
import { NodeFormShell } from "../NodeFormShell";
import { ExtendedConfigEditor } from "../ExtendedConfigEditor";
import { uid } from "../../workflow/uid";

// ── Types ──────────────────────────────────────────────────────────────────

type Channel = "in-app" | "email" | "sms";
type BodyFormat = "markdown" | "html" | "plain";

const CHANNELS: { id: Channel; label: string; desc: string; icon: string }[] = [
  { id: "in-app",  label: "In-app",  desc: "Thông báo ứng dụng",   icon: "isax-notification" },
  { id: "email",   label: "Email",   desc: "Gửi qua SMTP/Provider", icon: "isax-sms" },
  { id: "sms",     label: "SMS",     desc: "Tin nhắn văn bản",      icon: "isax-message-text" },
];

const TEMPLATES = [
  { id: "", label: "Mẫu mặc định" },
  { id: "approval", label: "Phê duyệt yêu cầu" },
  { id: "welcome", label: "Chào mừng người dùng" },
  { id: "otp", label: "Mã OTP xác thực" },
  { id: "reminder", label: "Nhắc nhở deadline" },
];

const TEMPLATE_CONTENT: Record<string, string> = {
  approval: `## Yêu cầu chờ phê duyệt\n\nXin chào {{user.name}},\n\nYêu cầu **{{flow.name}}** cần được phê duyệt.\n\nNhấn vào [đây]({{action.link}}) để xem và xử lý.`,
  welcome: `## Chào mừng {{user.name}}!\n\nTài khoản của bạn đã được kích hoạt thành công.\n\n{{action.link}}`,
  otp: `Mã OTP của bạn là: **{{otp_code}}**\n\nMã có hiệu lực trong 5 phút.`,
  reminder: `## Nhắc nhở: {{task_name}}\n\nDeadline: **{{deadline}}**\n\nVui lòng hoàn thành đúng hạn.`,
  "": `## Xin chào {{user.name}},\n\nYêu cầu **{{flow.name}}** của bạn đã được xử lý thành công.\n\n**Chi tiết:**\n- Trạng thái: {{status}}\n- Thời gian: {{processed_at}}\n\nNhấn vào [đây]({{action.link}}) để xem chi tiết.`,
};

const QUICK_VARS = ["{{user.name}}", "{{flow.name}}", "{{action.link}}"];

// ── Helpers ────────────────────────────────────────────────────────────────

function getCfg(items: { key: string; value: string }[], key: string, def = "") {
  return items.find((c) => c.key === key)?.value ?? def;
}

function setCfg(
  items: { id: string; displayName: string; key: string; value: string }[],
  key: string,
  displayName: string,
  value: string
) {
  const exists = items.find((c) => c.key === key);
  if (exists) return items.map((c) => c.key === key ? { ...c, value } : c);
  return [...items, { id: uid("cfg"), displayName, key, value }];
}

// ── Main Component ─────────────────────────────────────────────────────────

export const NotificationNodeForm: React.FC<NodeConfigFormProps> = ({
  form, onSave, onClose,
}) => {
  const [label, setLabel] = React.useState(form.label);
  const [cfg, setCfgState] = React.useState(() =>
    (form.configProperties ?? []).map((c) => ({ ...c }))
  );

  const set = (key: string, displayName: string, value: string) =>
    setCfgState((prev) => setCfg(prev, key, displayName, value));

  const channel = getCfg(cfg, "channel", "email") as Channel;
  const recipients: string[] = (() => {
    try { return JSON.parse(getCfg(cfg, "recipients", "[]")); } catch { return []; }
  })();

  const setRecipients = (arr: string[]) =>
    set("recipients", "Người nhận", JSON.stringify(arr));

  const addRecipient = () => setRecipients([...recipients, ""]);
  const updateRecipient = (i: number, v: string) =>
    setRecipients(recipients.map((r, j) => j === i ? v : r));
  const removeRecipient = (i: number) =>
    setRecipients(recipients.filter((_, j) => j !== i));

  // Sub-tab for main panel
  type SubTab = "content" | "template" | "preview";
  const [subTab, setSubTab] = React.useState<SubTab>("content");

  // Body editor
  const bodyFormat = getCfg(cfg, "bodyFormat", "markdown") as BodyFormat;
  const body = getCfg(cfg, "body", TEMPLATE_CONTENT[""]);
  const subject = getCfg(cfg, "subject", "Thông báo quan trọng từ {{flow.name}}");
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  const insertVar = (v: string) => {
    const ta = bodyRef.current;
    if (!ta) { set("body", "Nội dung", body + v); return; }
    const start = ta.selectionStart, end = ta.selectionEnd;
    const next = body.slice(0, start) + v + body.slice(end);
    set("body", "Nội dung", next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + v.length, start + v.length);
    }, 0);
  };

  // Content sub-tab
  const contentPanel = (
    <div className="ntf-content">
      {channel !== "in-app" && (
        <div className="ntf-field">
          <label className="ntf-label">Tiêu đề / Subject</label>
          <input className="ntf-input" value={subject}
            onChange={(e) => set("subject", "Subject", e.target.value)}
            placeholder="Thông báo quan trọng từ {{flow.name}}" />
        </div>
      )}
      {channel === "in-app" && (
        <div className="ntf-field">
          <label className="ntf-label">Tiêu đề thông báo</label>
          <input className="ntf-input" value={subject}
            onChange={(e) => set("subject", "Subject", e.target.value)}
            placeholder="Tiêu đề hiển thị trên notification" />
        </div>
      )}
      {channel === "in-app" && (
        <div className="ntf-field">
          <label className="ntf-label">Nội dung ngắn</label>
          <textarea className="ntf-input ntf-input--ta" rows={3}
            value={body}
            onChange={(e) => set("body", "Nội dung", e.target.value)}
            placeholder="Nội dung thông báo in-app (tối đa ~100 ký tự)..." />
        </div>
      )}
      <div className="ntf-row-2">
        <div className="ntf-field">
          <label className="ntf-label">Độ ưu tiên</label>
          <select className="ntf-input" value={getCfg(cfg, "priority", "normal")}
            onChange={(e) => set("priority", "Priority", e.target.value)}>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="ntf-field">
          <label className="ntf-label">Delay gửi</label>
          <input className="ntf-input" value={getCfg(cfg, "delay", "")}
            onChange={(e) => set("delay", "Delay", e.target.value)}
            placeholder="5m / 1h / 0" />
        </div>
      </div>
      <div className="ntf-row-2">
        <div className="ntf-field">
          <label className="ntf-label">Retry (lần)</label>
          <input type="number" className="ntf-input" min={0} max={5}
            value={getCfg(cfg, "retryCount", "3")}
            onChange={(e) => set("retryCount", "Retry", e.target.value)} />
        </div>
        <div className="ntf-field">
          <label className="ntf-label">
            <input type="checkbox"
              checked={getCfg(cfg, "enableTracking", "false") === "true"}
              onChange={(e) => set("enableTracking", "Tracking", String(e.target.checked))}
            />
            {" "}Bật tracking
          </label>
        </div>
      </div>
    </div>
  );

  // Template sub-tab (email only)
  const templatePanel = (
    <div className="ntf-template">
      <div className="ntf-template__top">
        <div className="ntf-format-group">
          {(["markdown", "html", "plain"] as BodyFormat[]).map((f) => (
            <button key={f} type="button"
              className={`ntf-format-btn${bodyFormat === f ? " ntf-format-btn--active" : ""}`}
              onClick={() => set("bodyFormat", "Format", f)}>
              {f === "markdown" ? "Markdown" : f === "html" ? "HTML" : "Plain Text"}
            </button>
          ))}
        </div>
        <select className="ntf-template-select"
          value={getCfg(cfg, "selectedTemplate", "")}
          onChange={(e) => {
            set("selectedTemplate", "Template", e.target.value);
            set("body", "Nội dung", TEMPLATE_CONTENT[e.target.value] ?? "");
          }}>
          {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      <div className="ntf-toolbar">
        <button type="button" className="ntf-toolbar__btn" onClick={() => insertVar("**text**")} title="Bold"><strong>B</strong></button>
        <button type="button" className="ntf-toolbar__btn ntf-toolbar__btn--italic" onClick={() => insertVar("*text*")} title="Italic">I</button>
        <button type="button" className="ntf-toolbar__btn" onClick={() => insertVar("[text](url)")} title="Link">🔗</button>
        <div className="ntf-toolbar__sep" />
        <span className="ntf-toolbar__vars-label">Biến:</span>
        {QUICK_VARS.map((v) => (
          <button key={v} type="button" className="ntf-toolbar__var" onClick={() => insertVar(v)}>{v}</button>
        ))}
        <button type="button" className="ntf-toolbar__var ntf-toolbar__var--more"
          onClick={() => insertVar("{{biến}}")}>+ Biến khác</button>
      </div>

      <div className="ntf-field ntf-field--subject">
        <label className="ntf-label-sm">TIÊU ĐỀ / SUBJECT</label>
        <input className="ntf-input" value={subject}
          onChange={(e) => set("subject", "Subject", e.target.value)} />
      </div>

      <div className="ntf-field">
        <label className="ntf-label-sm">NỘI DUNG</label>
        <textarea
          ref={bodyRef}
          className="ntf-input ntf-input--body"
          value={body}
          onChange={(e) => set("body", "Nội dung", e.target.value)}
          rows={10}
          spellCheck={false}
        />
        <p className="ntf-hint">Các biến trong {"{{}}"} sẽ được thay thế bằng giá trị thực tế khi gửi.</p>
      </div>
    </div>
  );

  // Preview sub-tab
  const previewBody = body
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#7c3aed">$1</a>')
    .replace(/^##\s+(.+)$/gm, "<h3 style='margin:0 0 8px'>$1</h3>")
    .replace(/\n/g, "<br/>");

  const previewPanel = channel === "in-app" ? (
    <div className="ntf-preview">
      <p className="ntf-preview__hint">In-app notification preview</p>
      <div className="ntf-preview__inapp">
        <div className="ntf-preview__inapp-icon">🔔</div>
        <div className="ntf-preview__inapp-body">
          <p className="ntf-preview__inapp-title">{subject || "(Tiêu đề)"}</p>
          <p className="ntf-preview__inapp-text">{body || "(Nội dung)"}</p>
        </div>
        <span className="ntf-preview__inapp-time">vừa xong</span>
      </div>
    </div>
  ) : (
    <div className="ntf-preview">
      <p className="ntf-preview__hint">Email preview (dữ liệu mẫu)</p>
      <div className="ntf-preview__email">
        <div className="ntf-preview__email-meta">
          <div className="ntf-preview__email-row"><span>From:</span> noreply@vnpt.vn</div>
          <div className="ntf-preview__email-row"><span>To:</span> {recipients[0] || "{{user.email}}"}</div>
          <div className="ntf-preview__email-row"><span>Subject:</span> {subject.replace(/{{flow\.name}}/g, "Đơn hàng #123")}</div>
        </div>
        <div className="ntf-preview__email-body"
          dangerouslySetInnerHTML={{ __html: previewBody }} />
      </div>
    </div>
  );

  const subTabs: { id: SubTab; label: string; show: boolean }[] = [
    { id: "content",  label: "Nội dung",  show: true },
    { id: "template", label: "Template",  show: channel === "email" },
    { id: "preview",  label: "Preview",   show: true },
  ].filter((t) => t.show) as { id: SubTab; label: string; show: boolean }[];

  // If current subTab is hidden, reset
  React.useEffect(() => {
    if (!subTabs.find((t) => t.id === subTab)) setSubTab("content");
  }, [channel]);

  const mainPanel = (
    <div className="ntf-root">
      {/* Left panel */}
      <div className="ntf-left">
        <p className="ntf-left__section">KÊNH GỬI</p>
        {CHANNELS.map((ch) => (
          <div key={ch.id}
            className={`ntf-channel${channel === ch.id ? " ntf-channel--active" : ""}`}
            onClick={() => set("channel", "Channel", ch.id)}>
            <div className="ntf-channel__icon"><i className={ch.icon} /></div>
            <div className="ntf-channel__info">
              <span className="ntf-channel__label">{ch.label}</span>
              <span className="ntf-channel__desc">{ch.desc}</span>
            </div>
            {channel === ch.id && <span className="ntf-channel__dot" />}
          </div>
        ))}

        <p className="ntf-left__section" style={{ marginTop: 16 }}>NGƯỜI NHẬN</p>
        {recipients.map((r, i) => (
          <div key={i} className="ntf-recipient">
            <input className="ntf-recipient__input" value={r}
              onChange={(e) => updateRecipient(i, e.target.value)}
              placeholder="{{user.email}} hoặc email@..." />
            <button type="button" className="ntf-recipient__del"
              onClick={() => removeRecipient(i)}>✕</button>
          </div>
        ))}
        <button type="button" className="ntf-add-recipient" onClick={addRecipient}>
          + Thêm người nhận
        </button>
      </div>

      {/* Right panel */}
      <div className="ntf-right">
        <div className="ntf-subtabs">
          {subTabs.map((t) => (
            <button key={t.id} type="button"
              className={`ntf-subtab${subTab === t.id ? " ntf-subtab--active" : ""}`}
              onClick={() => setSubTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="ntf-subpanel">
          {subTab === "content" && contentPanel}
          {subTab === "template" && templatePanel}
          {subTab === "preview" && previewPanel}
        </div>
      </div>
    </div>
  );

  const handleSave = () => {
    const result: NodeFormData = {
      label,
      branchConditions: {},
      fields: [],
      configProperties: cfg,
    };
    onSave(result);
  };

  const tabs = [
    {
      id: "config",
      label: "Cấu hình",
      panelClass: "fb-tab-panel--form",
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
