import type { WorkflowPersistPayloadV1 } from '../workflow/types';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  message: string;
  workflow?: WorkflowPersistPayloadV1;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove "data:<type>;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const claudeAIService = {
  async chat(
    message: string,
    history: ConversationMessage[],
    file?: File,
  ): Promise<AIResponse> {
    const body: Record<string, unknown> = { message, history };

    if (file) {
      const data = await fileToBase64(file);
      body['file'] = { name: file.name, type: file.type, data };
    }

    const response = await fetch('/api/claude/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? `Request failed (HTTP ${response.status})`);
    }

    const result = await response.json() as {
      type: string;
      message: string;
      workflow?: WorkflowPersistPayloadV1;
    };

    return {
      message: result.message ?? 'No response received.',
      workflow: result.workflow,
    };
  },
};
