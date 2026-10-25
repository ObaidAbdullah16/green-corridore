import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { roadNetworkService } from './services/roadNetworkService.js';
import { hazardService } from './services/hazardService.js';
import { setupSocketIO, notifyHazardResolved } from './sockets/socketHandler.js';
import { SEED_HAZARDS } from './data/seedHazards.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  console.log('--- Initializing Intelligent Hazard-Aware Navigation System ---');

  // 1. Connect Database
  await connectDB();

  // 2. Initialize Road Network Graph
  try {
    await roadNetworkService.initialize();
  } catch (err) {
    console.error('Fatal: Failed to load road network:', err.message);
    process.exit(1);
  }

  // 3. Sync existing active hazards to graph (or auto-seed defaults if empty)
  try {
    let activeHazards = await hazardService.getActiveHazards();
    const hasLegacySeed = activeHazards.some(h => h.imageUrl && (h.imageUrl.includes('wikimedia') || h.imageUrl.includes('unsplash')));
    if (activeHazards.length === 0 || hasLegacySeed) {
      if (hasLegacySeed) {
        console.log('Replacing legacy hazard seed data with 8 newly provided local road hazard images...');
        await hazardService.clearAllHazards();
      } else {
        console.log('Auto-seeding 8 realistic Indore road hazards with new local images & landmarks...');
      }
      for (const h of SEED_HAZARDS) {
        await hazardService.reportHazard(h);
      }
      activeHazards = await hazardService.getActiveHazards();
    }
    roadNetworkService.syncHazards(activeHazards);
    console.log(`Synchronized ${activeHazards.length} active hazards into road network.`);
  } catch (err) {
    console.warn('Hazard sync warning:', err.message);
  }

  // 4. Create HTTP server and mount Socket.IO
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  setupSocketIO(io);

  // 5. Start background hazard expiration worker
  hazardService.startExpirationCleaner((expiredHazard) => {
    notifyHazardResolved(expiredHazard);
  });

  // 6. Start server
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Navigation Web App is LIVE at http://localhost:${PORT}`);
    console.log(`📍 Centered at IET DAVV, Indore (Coverage ~10km radius)`);
    console.log(`🌐 Real-time Socket.IO connected and ready`);
    console.log(`======================================================\n`);
  });

  return server;
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
