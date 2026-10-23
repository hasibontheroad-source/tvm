import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleApiRequest } from './src/server/apiRouter.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsing with generous limit for audio and image payloads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check endpoint for Cloud Run and load balancers
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

// Server-side Gemini API endpoints
app.all('/api/gemini/*', async (req, res) => {
  try {
    const handled = await handleApiRequest(req, res);
    if (!handled && !res.headersSent) {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (err) {
    console.error('API Router unhandled error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal Server Error' });
    }
  }
});

// Serve Vite build output
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MeshWave server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
