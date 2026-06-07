import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { workflowsRouter } from './routes/workflows.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/workflows', workflowsRouter);

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`[workflow-server] listening on http://localhost:${port}`);
});
