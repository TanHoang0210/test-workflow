import Groq from 'groq-sdk';
import type { WorkflowPersistPayloadV1 } from '../workflow/types';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  message: string;
  workflow?: WorkflowPersistPayloadV1;
}

const WORKFLOW_SYSTEM_PROMPT = `You are an AI assistant embedded in a visual workflow builder application.
You help users answer questions about workflows AND generate BPMN-style workflow diagrams from text or documents.

Available node types:
- "start-event": Start of the workflow (exactly one)
- "activity": A task/process step
- "condition": A decision gateway with true/false branches
- "end-event": End of the workflow (one or more)

RESPONSE FORMAT — always respond with valid JSON only (no markdown, no code blocks):

When generating a workflow:
{
  "type": "workflow",
  "message": "Brief friendly description of what was created",
  "workflow": {
    "version": "1.0",
    "nodes": [
      {
        "id": "1",
        "type": "start-event",
        "label": "Node Label",
        "position": { "x": 300, "y": 100 },
        "fields": [],
        "branchConditions": {},
        "routingCondition": ""
      }
    ],
    "edges": [
      { "id": "e1-2", "source": "1", "target": "2" }
    ]
  }
}

For condition nodes include branchConditions:
{ "true": "Branch label when true", "false": "Branch label when false" }

Layout rules:
- Start at x=300, y=100
- Increment y by 150px per level
- Parallel branches: offset x by ±250px
- Keep x=300 for the main path

When just chatting (no workflow to generate):
{
  "type": "chat",
  "message": "Your helpful answer here"
}

IMPORTANT: Only generate a workflow when the user explicitly asks to create/build/generate one, or when they upload a document to convert to a workflow. For general questions, use the "chat" type.`;

function extractJSON(text: string): unknown {
  const cleaned = text.trim();
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  return JSON.parse(codeBlock ? codeBlock[1] : cleaned);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY as string,
  dangerouslyAllowBrowser: true,
});

export const claudeAIService = {
  async chat(
    message: string,
    history: ConversationMessage[],
    file?: File,
  ): Promise<AIResponse> {
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: WORKFLOW_SYSTEM_PROMPT },
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    ];

    let userText = message || 'Please analyze this document and generate a workflow.';
    if (file) {
      if (file.type.startsWith('image/')) {
        // Groq vision: embed image as base64 content block
        const data = await fileToBase64(file);
        messages.push({
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${file.type};base64,${data}` } },
            { type: 'text', text: userText },
          ],
        });
      } else {
        // Text / PDF: decode and include as text
        const data = await fileToBase64(file);
        const decoded = atob(data);
        userText = `[Uploaded file: ${file.name}]\n\n${decoded}\n\n${userText}`;
        messages.push({ role: 'user', content: userText });
      }
    } else {
      messages.push({ role: 'user', content: userText });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 8000,
      temperature: 0.3,
    });

    const rawText = completion.choices[0]?.message?.content ?? '';

    let parsed: { type: string; message: string; workflow?: WorkflowPersistPayloadV1 };
    try {
      parsed = extractJSON(rawText) as typeof parsed;
    } catch {
      parsed = { type: 'chat', message: rawText };
    }

    return { message: parsed.message, workflow: parsed.workflow };
  },
};
