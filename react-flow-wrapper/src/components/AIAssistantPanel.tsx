import React from 'react';
import { claudeAIService, type ConversationMessage } from '../services/claudeAIService';
import type { WorkflowPersistPayloadV1 } from '../workflow/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** true while the message is a streaming placeholder */
  loading?: boolean;
  /** files the user attached (display only) */
  files?: string[];
}

export interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowGenerated: (workflow: WorkflowPersistPayloadV1) => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
  onWorkflowGenerated,
}) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '👋 Xin chào! Tôi là AI Assistant. Tôi có thể giúp bạn:\n\n• **Trả lời câu hỏi** về workflow\n• **Tạo workflow** từ mô tả bằng văn bản\n• **Đọc tài liệu** (PDF, TXT, ảnh) và tự động vẽ flow\n\nHãy mô tả quy trình cần xây dựng hoặc upload tài liệu!',
    },
  ]);

  // Conversation history sent to Claude (no loading placeholders)
  const historyRef = React.useRef<ConversationMessage[]>([]);

  const [inputValue, setInputValue] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (msg: Omit<ChatMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setMessages((prev) => [...prev, { id, ...msg }]);
    return id;
  };

  const updateMessage = (id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    const file = selectedFiles[0];

    if (!text && !file) return;
    if (isLoading) return;

    // Show user message
    const userFileNames = selectedFiles.map((f) => f.name);
    const userContent = text || `[Uploaded: ${userFileNames.join(', ')}]`;
    addMessage({ role: 'user', content: userContent, files: userFileNames.length ? userFileNames : undefined });

    // Track in history (text only for the API)
    const historyEntry: ConversationMessage = { role: 'user', content: userContent };
    historyRef.current = [...historyRef.current, historyEntry];

    setInputValue('');
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Show loading placeholder
    setIsLoading(true);
    const placeholderId = addMessage({ role: 'assistant', content: '', loading: true });

    try {
      const response = await claudeAIService.chat(text, historyRef.current.slice(0, -1), file);

      // Replace placeholder with real response
      updateMessage(placeholderId, { content: response.message, loading: false });

      // Track assistant reply in history
      historyRef.current = [
        ...historyRef.current,
        { role: 'assistant', content: response.message },
      ];

      // Apply generated workflow
      if (response.workflow) {
        onWorkflowGenerated(response.workflow);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
      updateMessage(placeholderId, {
        content: `❌ ${errorMsg}`,
        loading: false,
      });
      // Remove failed user message from history
      historyRef.current = historyRef.current.slice(0, -1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    historyRef.current = [];
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: '🔄 Cuộc trò chuyện đã được xóa. Hãy bắt đầu lại!',
      },
    ]);
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
            <p>Powered by Claude</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="ai-panel__close"
            onClick={clearHistory}
            title="Xóa lịch sử trò chuyện"
            style={{ fontSize: 14, padding: '4px 8px' }}
          >
            🗑
          </button>
          <button className="ai-panel__close" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ai-panel__messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-panel__message ai-panel__message--${msg.role}`}>
            <div className="ai-panel__message-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
            <div className="ai-panel__message-content">
              {msg.loading ? (
                <div className="ai-panel__loading">
                  <span /><span /><span />
                </div>
              ) : (
                <>
                  {msg.files && msg.files.length > 0 && (
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
                      📎 {msg.files.join(', ')}
                    </div>
                  )}
                  {msg.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < msg.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Attached files preview */}
      {selectedFiles.length > 0 && (
        <div className="ai-panel__files">
          <div className="ai-panel__files-label">Tệp đính kèm:</div>
          <div className="ai-panel__files-list">
            {selectedFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="ai-panel__file-item">
                <span className="ai-panel__file-icon">📄</span>
                <span className="ai-panel__file-name">{file.name}</span>
                <button className="ai-panel__file-remove" onClick={() => removeFile(idx)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="ai-panel__footer">
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*,.pdf,.txt,.md,.csv,.doc,.docx"
          onChange={handleFileSelect}
          className="ai-panel__file-input"
        />

        <div className="ai-panel__input-area">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Đang xử lý...' : 'Mô tả workflow hoặc đặt câu hỏi...'}
            className="ai-panel__input"
            disabled={isLoading}
          />
          <button
            className="ai-panel__send-btn"
            onClick={handleSend}
            disabled={isLoading || (!inputValue.trim() && selectedFiles.length === 0)}
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>

        <div className="ai-panel__actions">
          <button
            className="ai-panel__action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload tài liệu (PDF, ảnh, txt...)"
            disabled={isLoading}
          >
            📎 Upload
          </button>
        </div>
      </div>
    </div>
  );
};
