import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import routeRoutes from './routes/routeRoutes.js';
import hazardRoutes from './routes/hazardRoutes.js';
import geocodeRoutes from './routes/geocodeRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { isDbConnected } from './config/db.js';
import { roadNetworkService } from './services/roadNetworkService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, '../../frontend/dist');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Allow up to 20MB for base64 photo uploads from mobile camera
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve hazard photos statically from data directory
app.use('/hazard-images', express.static(path.join(__dirname, 'data')));
app.use('/api/hazard-images', express.static(path.join(__dirname, 'data')));

// API Routes
app.use('/api/route', routeRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isDbConnected() ? 'connected' : 'memory-fallback',
    roadNetworkReady: roadNetworkService.isReady,
    coverageArea: 'Indore (~10km radius around IET DAVV)'
  });
});

// Serve frontend build if present
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  // SPA fallback for non-API client routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message
  });
});

export default app;
