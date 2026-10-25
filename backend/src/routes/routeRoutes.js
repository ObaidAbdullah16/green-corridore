import express from 'express';
import { roadNetworkService } from '../services/roadNetworkService.js';

const router = express.Router();

/**
 * POST /api/route
 * Body: { origin: [lat, lon], destination: [lat, lon], options: {} }
 */
router.post('/', (req, res) => {
  const { origin, destination, options = {} } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_COORDINATES',
      message: 'Both origin and destination coordinates are required as [lat, lon].'
    });
  }

  try {
    const result = roadNetworkService.calculateRoute(origin, destination, options);

    if (!result.success) {
      const statusCode = result.error.includes('OUT_OF_BOUNDS') ? 400 : 404;
      return res.status(statusCode).json(result);
    }

    return res.json(result);
  } catch (err) {
    console.error('Error during route calculation:', err);
    return res.status(500).json({
      success: false,
      error: 'ROUTING_ENGINE_ERROR',
      message: err.message
    });
  }
});

export default router;
