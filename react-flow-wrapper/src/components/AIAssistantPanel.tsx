import React from "react";

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string, files: File[]) => Promise<void>;
  isProcessing?: boolean;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  isProcessing = false
}) => {
  const [messages, setMessages] = React.useState<AIMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Hi! I'm your AI Assistant. Describe your workflow and I'll help you build it. You can also upload images or documents for me to analyze.",
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = React.useState("");
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && selectedFiles.length === 0) return;

    // Add user message
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Show loading
    setIsLoading(true);

    // Call parent handler
    await onSendMessage(inputValue, selectedFiles);

    // Clear files
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Demo: Add assistant response (will be replaced with actual API call)
    setTimeout(() => {
      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "✨ Đang tạo workflow... Vui lòng xem canvas để thấy nodes được vẽ từng cái!",
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="ai-panel">
      {/* Header */}
      <div className="ai-panel__header">
        <div className="ai-panel__title">
          <span className="ai-panel__icon">✨</span>
          <div className="ai-panel__title-text">
            <h3>AI Assistant</h3>
            <p>Documentation & Setup Support</p>
          </div>
        </div>
        <button className="ai-panel__close" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Messages Area */}
      <div className="ai-panel__messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-panel__message ai-panel__message--${msg.role}`}>
            <div className="ai-panel__message-avatar">
              {msg.role === "user" ? "👤" : "🤖"}
            </div>
            <div className="ai-panel__message-content">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="ai-panel__message ai-panel__message--assistant">
            <div className="ai-panel__message-avatar">🤖</div>
            <div className="ai-panel__message-content">
              <div className="ai-panel__loading">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Area */}
      {selectedFiles.length > 0 && (
        <div className="ai-panel__files">
          <div className="ai-panel__files-label">Attached Files:</div>
          <div className="ai-panel__files-list">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="ai-panel__file-item">
                <span className="ai-panel__file-icon">📄</span>
                <span className="ai-panel__file-name">{file.name}</span>
                <button
                  className="ai-panel__file-remove"
                  onClick={() => removeFile(index)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="ai-panel__footer">
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="ai-panel__file-input"
        />

        <div className="ai-panel__input-area">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask Copilot..."
            className="ai-panel__input"
            disabled={isLoading || isProcessing}
          />
          <button
            className="ai-panel__send-btn"
            onClick={handleSendMessage}
            disabled={isLoading || isProcessing || (!inputValue.trim() && selectedFiles.length === 0)}
          >
            {isProcessing ? "⏳" : "➤"}
          </button>
        </div>

        <div className="ai-panel__actions">
          <button
            className="ai-panel__action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload file"
          >
            📎 Upload
          </button>
        </div>
      </div>
    </div>
  );
};
