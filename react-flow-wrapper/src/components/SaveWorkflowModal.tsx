import React from "react";

export interface SaveWorkflowMeta {
  code: string;
  name: string;
  description: string;
}

export interface SaveWorkflowModalProps {
  initial?: Partial<SaveWorkflowMeta>;
  onConfirm: (meta: SaveWorkflowMeta) => void;
  onCancel: () => void;
}

export function SaveWorkflowModal({ initial, onConfirm, onCancel }: SaveWorkflowModalProps) {
  const [code, setCode] = React.useState(initial?.code ?? "");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên quy trình");
      return;
    }
    onConfirm({ code: code.trim(), name: trimmedName, description: description.trim() });
  };

  return (
    <div className="flow-modal__backdrop" onClick={onCancel}>
      <div className="flow-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flow-modal__header">
          <h3 className="flow-modal__title">Lưu quy trình</h3>
          <button type="button" className="flow-modal__close" onClick={onCancel}>
            ✕
          </button>
        </div>
        <div className="flow-modal__body">
          <div className="flow-modal__field">
            <label className="flow-modal__label">Mã quy trình</label>
            <input
              className="flow-modal__input"
              type="text"
              placeholder="VD: WF-001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="flow-modal__field">
            <label className="flow-modal__label">
              Tên quy trình <span className="flow-modal__required">*</span>
            </label>
            <input
              className="flow-modal__input"
              type="text"
              placeholder="Nhập tên quy trình"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
            />
          </div>
          <div className="flow-modal__field">
            <label className="flow-modal__label">Mô tả</label>
            <textarea
              className="flow-modal__textarea"
              rows={3}
              placeholder="Mô tả ngắn về quy trình"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <div className="flow-modal__error">{error}</div>}
        </div>
        <div className="flow-modal__footer">
          <button type="button" className="flow-modal__btn flow-modal__btn--ghost" onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className="flow-modal__btn flow-modal__btn--primary" onClick={handleConfirm}>
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
