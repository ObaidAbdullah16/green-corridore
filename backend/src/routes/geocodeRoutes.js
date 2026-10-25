import express from 'express';
import { geocodingService } from '../services/geocodingService.js';

const router = express.Router();

/**
 * GET /api/geocode/search?q=query
 */
router.get('/search', async (req, res) => {
  const query = req.query.q;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.json({
      success: true,
      results: []
    });
  }

  try {
    const results = await geocodingService.search(query);
    return res.json({
      success: true,
      count: results.length,
      results
    });
  } catch (err) {
    console.error('Geocoding search error:', err);
    return res.status(500).json({
      success: false,
      error: 'GEOCODING_ERROR',
      message: err.message
    });
  }
});

export default router;
