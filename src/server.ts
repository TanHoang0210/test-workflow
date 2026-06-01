import 'dotenv/config';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import Groq from 'groq-sdk';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();
const groq = new Groq({ apiKey: process.env['GROQ_API_KEY'] });

// ─── System prompt ────────────────────────────────────────────────────────────
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

// ─── Parse JSON (handles markdown code block wrappers) ────────────────────────
function extractJSON(text: string): unknown {
  const cleaned = text.trim();
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const jsonStr = codeBlock ? codeBlock[1] : cleaned;
  return JSON.parse(jsonStr);
}

// ─── Chat endpoint ────────────────────────────────────────────────────────────
app.use('/api', express.json({ limit: '25mb' }));

app.post('/api/claude/chat', async (req, res) => {
  try {
    const { message, history = [], file } = req.body as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      file?: { name: string; type: string; data: string };
    };

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: WORKFLOW_SYSTEM_PROMPT },
      ...history.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
    ];

    // Build user message (Groq free tier: text only — images not supported)
    let userText = message || 'Please analyze this document and generate a workflow.';
    if (file) {
      if (!file.type.startsWith('image/')) {
        const decoded = Buffer.from(file.data, 'base64').toString('utf-8');
        userText = `[Uploaded file: ${file.name}]\n\n${decoded}\n\n${userText}`;
      } else {
        userText = `[User uploaded image: ${file.name}]\n\n${userText}`;
      }
    }

    messages.push({ role: 'user', content: userText });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 8000,
      temperature: 0.3,
    });

    const rawText = completion.choices[0]?.message?.content ?? '';

    let parsed: { type: string; message: string; workflow?: unknown };
    try {
      parsed = extractJSON(rawText) as typeof parsed;
    } catch {
      parsed = { type: 'chat', message: rawText };
    }

    res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Groq API]', message);
    res.status(500).json({ error: message });
  }
});

// ─── Static files ─────────────────────────────────────────────────────────────
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// ─── Angular SSR handler ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
