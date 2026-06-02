---
name: project-deploy
description: Deploy workflow — single command deploys everything to Firebase Hosting
metadata:
  type: project
---

Deploy toàn bộ project (widget + Angular + Firebase) bằng một lệnh:

```
npm run deploy
```

Quy trình tự động:
1. Build React widget (`react-flow-wrapper`) → copy sang `public/`
2. Build Angular SSR
3. `firebase deploy --only hosting`

**Why:** Firebase Hosting chỉ serve static files (Spark plan, free). AI gọi Groq API thẳng từ browser (`dangerouslyAllowBrowser: true`). Không cần server/Cloud Functions.

**How to apply:** Khi user hỏi "deploy thế nào" hoặc "lệnh deploy" → trả lời `npm run deploy`.

Script build: `scripts/build-all.mjs`
