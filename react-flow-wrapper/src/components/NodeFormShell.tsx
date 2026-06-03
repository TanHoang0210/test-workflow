import React from "react";

export type TabDef = {
  id: string;
  label: string;
  panel: React.ReactNode;
  panelClass?: string;
};

export type NodeFormShellProps = {
  label: string;
  onLabelChange: (v: string) => void;
  tabs: TabDef[];
  defaultTab: string;
  onSave: () => void;
  onClose: () => void;
};

export const NodeFormShell: React.FC<NodeFormShellProps> = ({
  label,
  onLabelChange,
  tabs,
  defaultTab,
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  return (
    <div className="fb-backdrop" onClick={onClose}>
      <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fb-header">
          <div className="fb-header__name-area">
            <label className="fb-header__name-label" htmlFor="fb-node-label">
              Tên form
            </label>
            <input
              id="fb-node-label"
              className="fb-header__name-input"
              value={label}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="Tiêu đề form / tên bước..."
              autoFocus
            />
          </div>
          <button type="button" className="fb-header__close" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        <div className="fb-modal__scroll fb-modal__scroll--tabs">
          <div className="fb-tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`fb-tab${activeTab === tab.id ? " fb-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {tabs.map((tab) =>
            activeTab === tab.id ? (
              <div
                key={tab.id}
                className={`fb-tab-panel ${tab.panelClass ?? "fb-tab-panel--scroll"}`}
                role="tabpanel"
              >
                {tab.panel}
              </div>
            ) : null
          )}
        </div>

        <div className="fb-footer">
          <button type="button" className="fb-btn fb-btn--ghost" onClick={onClose}>
            HỦY BỎ
          </button>
          <button type="button" className="fb-btn fb-btn--primary" onClick={onSave}>
            LƯU
          </button>
        </div>
      </div>
    </div>
  );
};
