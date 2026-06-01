import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const groqApiKey = defineSecret('GROQ_API_KEY');

let handlerPromise = null;

function getHandler() {
  if (!handlerPromise) {
    // server.mjs is copied here during build (scripts/build-all.mjs)
    handlerPromise = import('./server/server.mjs').then((m) => m.reqHandler);
  }
  return handlerPromise;
}

export const ssrApp = onRequest(
  { secrets: [groqApiKey], region: 'us-central1', memory: '512MiB', timeoutSeconds: 60 },
  async (req, res) => {
    const handler = await getHandler();
    return handler(req, res);
  },
);
