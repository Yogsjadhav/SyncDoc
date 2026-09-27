import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from './app';
import { attachSocketIO } from './sockets/connectionHandler';

const PORT = parseInt(process.env.PORT || '3001', 10);
const MONGO_URI = process.env.MONGO_URI as string;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('[MongoDB] Connected');
  const server = http.createServer(app);
  attachSocketIO(server);
  server.listen(PORT, () => console.log(`[Server] http://localhost:${PORT}`));
}

main().catch(err => { console.error(err); process.exit(1); });
