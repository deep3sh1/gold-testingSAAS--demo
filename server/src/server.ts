import http from 'http';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { initSocketServer } from './realtime/socket.js';
import { config } from './config/index.js';
import { seedDatabase } from './seed.js';

async function startServer() {
  try {
    await connectDatabase();
    await seedDatabase();

    const app = createApp();
    const httpServer = http.createServer(app);

    initSocketServer(httpServer);

    httpServer.listen(config.port, () => {
      console.log(`\n🚀 GOLDSCOPE ASSAY SaaS API Server running on port ${config.port}`);
      console.log(`📡 WebSocket Realtime Engine initialized`);
      console.log(`🔗 Health: http://localhost:${config.port}/api/health\n`);
    });
  } catch (error) {
    console.error('Failed to start GOLDSCOPE API Server:', error);
    process.exit(1);
  }
}

startServer();
