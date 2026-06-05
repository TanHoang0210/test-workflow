import Groq from 'groq-sdk';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { WorkflowPersistPayloadV1 } from '../workflow/types';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  message: string;
  workflow?: WorkflowPersistPayloadV1;
}

const CHAT_SYSTEM_PROMPT = `Bạn là AI assistant trong ứng dụng VNPT Workflow Builder.
Trả lời câu hỏi về workflow, quy trình nghiệp vụ bằng tiếng Việt.
Luôn trả về JSON: {"type":"chat","message":"câu trả lời"}`;

const WORKFLOW_SYSTEM_PROMPT = `You are an AI assistant embedded in a VNPT visual workflow builder.
You help users answer questions AND generate workflow diagrams from descriptions or documents.
Always respond with valid JSON only — no markdown, no code blocks, no extra text.

═══════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════

When generating a workflow:
{
  "type": "workflow",
  "message": "Mô tả ngắn gọn workflow vừa tạo (tiếng Việt)",
  "workflow": { ...WorkflowObject... }
}

When chatting (no workflow):
{
  "type": "chat",
  "message": "Câu trả lời hữu ích (tiếng Việt)"
}

Only generate workflow when user explicitly asks to create/build/generate one or uploads a document.

═══════════════════════════════════════════════
WORKFLOW OBJECT SCHEMA
═══════════════════════════════════════════════

{
  "version": "1.0",
  "nodes": [ ...Node[] ],
  "edges": [ ...Edge[] ]
}

NODE SCHEMA:
{
  "id": "string (sequential: 1, 2, 3...)",
  "type": "WorkflowNodeType",
  "label": "Tên hiển thị của node",
  "position": { "x": number, "y": number },
  "fields": [ ...FormField[] ],
  "branchConditions": { "targetNodeId": "condition text" },
  "routingCondition": "string",
  "configProperties": [ ...ConfigProperty[] ]
}

EDGE SCHEMA:
{
  "id": "e{source}-{target}",
  "source": "nodeId",
  "target": "nodeId"
}

═══════════════════════════════════════════════
FIELD TYPES (dùng trong fields[])
═══════════════════════════════════════════════

FormField schema:
{
  "id": "f{n}",
  "type": "text|textarea|date|select|radio|checklist",
  "label": "Tên trường",
  "options": []
}

For select / radio / checklist, include options:
{
  "id": "f1", "type": "select", "label": "Phương thức thanh toán",
  "options": [
    { "id": "o1", "label": "Tiền mặt" },
    { "id": "o2", "label": "Chuyển khoản" }
  ]
}

Field types:
- "text"      → nhập văn bản ngắn
- "textarea"  → nhập văn bản dài
- "date"      → chọn ngày tháng
- "select"    → dropdown chọn 1 (cần options)
- "radio"     → radio chọn 1 (cần options)
- "checklist" → checkbox chọn nhiều (cần options)

ConfigProperty schema:
{
  "id": "c{n}",
  "displayName": "Tên hiển thị",
  "key": "technical_key",
  "value": "giá trị mặc định"
}

═══════════════════════════════════════════════
NODE TYPES — 15 loại
═══════════════════════════════════════════════

1. "start-event" — Bắt đầu workflow (chỉ dùng 1 lần)
   fields: [], configProperties: [], branchConditions: {}

2. "end-event" — Kết thúc workflow
   fields: [], configProperties: [], branchConditions: {}

3. "form" — Thu thập dữ liệu từ người dùng
   fields: [các trường form cần thu thập]
   Ví dụ: họ tên (text), email (text), ngày (date), loại yêu cầu (select)
   configProperties: [{ "id":"c1","displayName":"Tiêu đề form","key":"formTitle","value":"..." }]

4. "notification" — Gửi thông báo
   fields: []
   configProperties:
   - { key:"recipient", displayName:"Người nhận", value:"email/role" }
   - { key:"subject", displayName:"Tiêu đề", value:"..." }
   - { key:"template", displayName:"Nội dung", value:"..." }
   - { key:"channel", displayName:"Kênh gửi", value:"email|sms|push" }

5. "condition" — Rẽ nhánh điều kiện
   fields: []
   routingCondition: "biểu thức điều kiện, ví dụ: payment_method == 'cash'"
   branchConditions: { "targetNodeId1": "Nhánh True: mô tả", "targetNodeId2": "Nhánh False: mô tả" }
   QUAN TRỌNG: key của branchConditions phải là ID của node đích (target node ID)

6. "redirect" — Chuyển hướng
   fields: []
   configProperties:
   - { key:"targetUrl", displayName:"URL đích", value:"..." }
   - { key:"targetWorkflow", displayName:"Workflow đích", value:"..." }

7. "alert-error" — Cảnh báo / xử lý lỗi
   fields: []
   configProperties:
   - { key:"errorCode", displayName:"Mã lỗi", value:"ERR_001" }
   - { key:"errorMessage", displayName:"Thông báo lỗi", value:"..." }
   - { key:"severity", displayName:"Mức độ", value:"warning|error|critical" }

8. "create-keyword" — Tạo / gán từ khóa
   fields: []
   configProperties:
   - { key:"keywordName", displayName:"Tên từ khóa", value:"..." }
   - { key:"keywordValue", displayName:"Giá trị", value:"..." }
   - { key:"scope", displayName:"Phạm vi", value:"global|local" }

9. "attach-file" — Đính kèm tệp
   fields: []
   configProperties:
   - { key:"fileTypes", displayName:"Loại file", value:"pdf,docx,jpg" }
   - { key:"maxSize", displayName:"Dung lượng tối đa (MB)", value:"10" }
   - { key:"required", displayName:"Bắt buộc", value:"true|false" }

10. "submit" — Xác nhận và gửi dữ liệu
    fields: []
    configProperties:
    - { key:"endpoint", displayName:"API endpoint", value:"/api/submit" }
    - { key:"method", displayName:"HTTP method", value:"POST" }
    - { key:"confirmMessage", displayName:"Thông báo xác nhận", value:"..." }

11. "view-sign" — Xem và ký tài liệu
    fields: []
    configProperties:
    - { key:"documentTemplate", displayName:"Template tài liệu", value:"..." }
    - { key:"signers", displayName:"Người ký", value:"role1,role2" }
    - { key:"signatureType", displayName:"Loại chữ ký", value:"digital|wet" }

12. "history-log" — Ghi lịch sử hành động
    fields: []
    configProperties:
    - { key:"logLevel", displayName:"Mức log", value:"info|debug|warn" }
    - { key:"logMessage", displayName:"Nội dung log", value:"..." }
    - { key:"includeUser", displayName:"Ghi tên người dùng", value:"true" }

13. "find-records" — Tìm kiếm / truy vấn dữ liệu
    fields: [các tiêu chí tìm kiếm dùng form fields]
    configProperties:
    - { key:"dataSource", displayName:"Nguồn dữ liệu", value:"..." }
    - { key:"resultLimit", displayName:"Giới hạn kết quả", value:"10" }

14. "switch" — Phân nhánh nhiều trường hợp (switch-case)
    fields: []
    routingCondition: "tên biến cần switch"
    branchConditions: { "targetId1": "case: giá trị 1", "targetId2": "case: giá trị 2", "targetId3": "default" }

15. "activity" — Bước xử lý / task thông thường
    fields: [nếu cần thu thập thêm thông tin]
    configProperties: [cấu hình kỹ thuật tùy theo nghiệp vụ]

═══════════════════════════════════════════════
LAYOUT RULES
═══════════════════════════════════════════════
- start-event: x=300, y=100
- Mỗi bước tiếp theo: tăng y thêm 160px
- Nhánh song song: offset x ±280px so với trục chính (x=300)
- Sau khi hợp nhất nhánh: quay về x=300
- condition và switch: đặt ở giữa trước khi rẽ nhánh

═══════════════════════════════════════════════
VÍ DỤ WORKFLOW ĐẦY ĐỦ
═══════════════════════════════════════════════

{
  "version": "1.0",
  "nodes": [
    {
      "id": "1", "type": "start-event", "label": "Bắt đầu",
      "position": {"x":300,"y":100},
      "fields": [], "branchConditions": {}, "routingCondition": "", "configProperties": []
    },
    {
      "id": "2", "type": "form", "label": "Nhập thông tin đơn hàng",
      "position": {"x":300,"y":260},
      "fields": [
        {"id":"f1","type":"text","label":"Tên khách hàng","options":[]},
        {"id":"f2","type":"select","label":"Phương thức thanh toán","options":[
          {"id":"o1","label":"Tiền mặt"},{"id":"o2","label":"Chuyển khoản"}
        ]},
        {"id":"f3","type":"date","label":"Ngày giao hàng","options":[]}
      ],
      "branchConditions": {}, "routingCondition": "",
      "configProperties": [{"id":"c1","displayName":"Tiêu đề form","key":"formTitle","value":"Đơn hàng mới"}]
    },
    {
      "id": "3", "type": "condition", "label": "Kiểm tra phương thức thanh toán",
      "position": {"x":300,"y":420},
      "fields": [], "routingCondition": "payment_method == 'cash'",
      "branchConditions": {"4": "Tiền mặt → thông báo", "5": "Chuyển khoản → cổng thanh toán"},
      "configProperties": []
    },
    {
      "id": "4", "type": "notification", "label": "Thông báo thanh toán tiền mặt",
      "position": {"x":20,"y":580},
      "fields": [],
      "branchConditions": {}, "routingCondition": "",
      "configProperties": [
        {"id":"c1","displayName":"Người nhận","key":"recipient","value":"customer"},
        {"id":"c2","displayName":"Nội dung","key":"template","value":"Vui lòng thanh toán tiền mặt khi nhận hàng"}
      ]
    },
    {
      "id": "5", "type": "redirect", "label": "Chuyển đến cổng thanh toán",
      "position": {"x":580,"y":580},
      "fields": [],
      "branchConditions": {}, "routingCondition": "",
      "configProperties": [
        {"id":"c1","displayName":"URL đích","key":"targetUrl","value":"/payment-gateway"},
        {"id":"c2","displayName":"Phương thức","key":"method","value":"POST"}
      ]
    },
    {
      "id": "6", "type": "end-event", "label": "Kết thúc",
      "position": {"x":300,"y":740},
      "fields": [], "branchConditions": {}, "routingCondition": "", "configProperties": []
    }
  ],
  "edges": [
    {"id":"e1-2","source":"1","target":"2"},
    {"id":"e2-3","source":"2","target":"3"},
    {"id":"e3-4","source":"3","target":"4"},
    {"id":"e3-5","source":"3","target":"5"},
    {"id":"e4-6","source":"4","target":"6"},
    {"id":"e5-6","source":"5","target":"6"}
  ]
}

Hãy tạo workflow chi tiết nhất có thể dựa trên mô tả của người dùng.`;

function extractJSON(text: string): unknown {
  const cleaned = text.trim();

  // 1. Code block ```json ... ``` or ``` ... ```
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]); } catch { /* fall through */ }
  }

  // 2. Direct parse (model followed instructions perfectly)
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // 3. Find first { ... } block anywhere in the text (handles leading/trailing prose)
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fall through */ }
  }

  throw new Error('No valid JSON found in AI response');
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await fileToArrayBuffer(file);
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      text += textContent.items.map((item: any) => item.str).join(' ');
      text += '\n';
    }

    return text;
  } catch (err) {
    console.error('PDF parsing failed:', err);
    throw new Error('Failed to parse PDF file');
  }
}

async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await fileToArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (err) {
    console.error('DOCX parsing failed:', err);
    throw new Error('Failed to parse DOCX file');
  }
}

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY as string,
  dangerouslyAllowBrowser: true,
});

const WORKFLOW_INTENT_KEYWORDS = [
  'tạo', 'vẽ', 'xây dựng', 'thiết kế', 'generate', 'create', 'build', 'draw',
  'workflow', 'flow', 'sơ đồ', 'quy trình', 'luồng',
];

function isWorkflowRequest(message: string, hasFile: boolean): boolean {
  if (hasFile) return true;
  const lower = message.toLowerCase();
  return WORKFLOW_INTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

export const claudeAIService = {
  async chat(
    message: string,
    history: ConversationMessage[],
    file?: File,
  ): Promise<AIResponse> {
    const useWorkflowPrompt = isWorkflowRequest(message, !!file);

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: useWorkflowPrompt ? WORKFLOW_SYSTEM_PROMPT : CHAT_SYSTEM_PROMPT },
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    ];

    let userText = message || 'Hãy phân tích tài liệu này và tạo workflow tương ứng.';

    if (file) {
      if (file.type.startsWith('image/')) {
        // Image: use Groq Vision
        const data = await fileToBase64(file);
        messages.push({
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${file.type};base64,${data}` } },
            { type: 'text', text: userText },
          ],
        });
      } else if (file.type === 'application/pdf') {
        // PDF: extract text properly
        const extractedText = await extractTextFromPDF(file);
        userText = `[PDF Document: ${file.name}]\n\n${extractedText}\n\n${userText}`;
        messages.push({ role: 'user', content: userText });
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // DOCX: extract text properly
        const extractedText = await extractTextFromDOCX(file);
        userText = `[Word Document: ${file.name}]\n\n${extractedText}\n\n${userText}`;
        messages.push({ role: 'user', content: userText });
      } else {
        // Text files (txt, md, csv, etc)
        const data = await fileToBase64(file);
        const decoded = atob(data);
        userText = `[Text File: ${file.name}]\n\n${decoded}\n\n${userText}`;
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
      if (parsed.workflow) {
        console.log('[AI] Workflow nhận được, đang vẽ...', parsed.workflow);
      }
    } catch (e) {
      console.warn('[AI] Không parse được JSON, trả về text thuần:', e);
      console.debug('[AI] Raw response:', rawText);
      parsed = { type: 'chat', message: rawText };
    }

    return { message: parsed.message, workflow: parsed.workflow };
  },
};
