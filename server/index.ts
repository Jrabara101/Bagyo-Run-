import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { openDb } from './db.js';
import { buildApp } from './app.js';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
fs.mkdirSync(dataDir, { recursive: true });
const db = openDb(path.join(dataDir, 'runner.sqlite'));
const app = await buildApp(db, { logger: true });

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT) || 3002;

async function listen(port: number): Promise<number> {
  try {
    await app.listen({ port, host: '0.0.0.0' });
    return port;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE' && port < PORT + 10) {
      console.warn(`Port ${port} is in use, trying ${port + 1}...`);
      return listen(port + 1);
    }
    throw err;
  }
}

async function shutdown() {
  try {
    await app.close();
    db.close();
    process.exit(0);
  } catch {
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err?.code ?? '')) return;
  console.error('Server uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => console.error('Server unhandled rejection:', reason));

try {
  const port = await listen(PORT);
  console.log(`Takbo! Bagyo Run server on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
