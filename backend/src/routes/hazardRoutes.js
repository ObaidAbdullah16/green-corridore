import express from 'express';
import { hazardService } from '../services/hazardService.js';
import { notifyHazardAdded, notifyHazardResolved } from '../sockets/socketHandler.js';
import { extractRole, requireRole, verifyAuthorityPasscode } from '../middleware/authMiddleware.js';

const router = express.Router();

// Extract role for all incoming hazard requests
router.use(extractRole);

/**
 * POST /api/hazards/authority/verify
 * Verifies authority passcode and unlocks authority role privileges.
 */
router.post('/authority/verify', (req, res) => {
  const { passcode } = req.body;

  if (verifyAuthorityPasscode(passcode)) {
    return res.json({
      success: true,
      role: 'authority',
      message: 'Authority access verified. You now have permission to resolve hazards.'
    });
  }

  return res.status(401).json({
    success: false,
    error: 'INVALID_CREDENTIALS',
    message: 'Incorrect authority passcode. Default demo passcode is "admin123" or "authority".'
  });
});

/**
 * GET /api/hazards
 * View road hazards.
 * Query parameters:
 *  - bbox: south,west,north,east
 *  - status: 'active' (default) | 'resolved' | 'all'
 * Accessible to both Citizen and Authority roles.
 */
router.get('/', async (req, res) => {
  try {
    let bbox = null;
    if (req.query.bbox) {
      const parts = req.query.bbox.split(',').map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        bbox = {
          south: parts[0],
          west: parts[1],
          north: parts[2],
          east: parts[3]
        };
      }
    }

    const statusFilter = req.query.status || 'active';
    const hazards = await hazardService.getHazards({ bbox, status: statusFilter });

    return res.json({
      success: true,
      count: hazards.length,
      userRole: req.userRole,
      statusFilter,
      hazards
    });
  } catch (err) {
    console.error('Error fetching hazards:', err);
    return res.status(500).json({
      success: false,
      error: 'HAZARDS_FETCH_FAILED',
      message: err.message
    });
  }
});

/**
 * GET /api/hazards/:id
 * Fetch complete details of a specific hazard.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const hazard = await hazardService.getHazardById(id);
    if (!hazard) {
      return res.status(404).json({
        success: false,
        error: 'HAZARD_NOT_FOUND',
        message: 'No hazard found with the provided ID.'
      });
    }

    return res.json({
      success: true,
      hazard
    });
  } catch (err) {
    console.error('Error fetching hazard details:', err);
    return res.status(500).json({
      success: false,
      error: 'HAZARD_FETCH_FAILED',
      message: err.message
    });
  }
});

/**
 * POST /api/hazards/:id/confirm
 * Citizen / user confirms an existing hazard to increase verification score.
 */
router.post('/:id/confirm', async (req, res) => {
  const { id } = req.params;

  try {
    const updatedHazard = await hazardService.confirmHazard(id);
    if (!updatedHazard) {
      return res.status(404).json({
        success: false,
        error: 'HAZARD_NOT_FOUND',
        message: 'Hazard not found.'
      });
    }

    return res.json({
      success: true,
      confirmations: updatedHazard.confirmations,
      message: 'Hazard confirmation recorded.'
    });
  } catch (err) {
    console.error('Error confirming hazard:', err);
    return res.status(500).json({
      success: false,
      error: 'HAZARD_CONFIRM_FAILED',
      message: err.message
    });
  }
});

/**
 * POST /api/hazards
 * Report a new hazard or confirm an existing one.
 * Accessible to both Citizen and Authority roles.
 * Body: { type, severity, description, coordinates: [lon, lat], landmark, imageUrl }
 */
router.post('/', requireRole(['citizen', 'authority']), async (req, res) => {
  const { type, severity, description, coordinates, landmark, imageUrl } = req.body;

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_COORDINATES',
      message: 'Coordinates must be an array of [longitude, latitude].'
    });
  }

  const [lon, lat] = coordinates;
  if (isNaN(lon) || isNaN(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
    return res.status(400).json({
      success: false,
      error: 'OUT_OF_RANGE_COORDINATES',
      message: 'Valid geographic coordinates are required.'
    });
  }

  const validTypes = ['pothole', 'construction', 'roadblock', 'accident', 'other'];
  if (!type || !validTypes.includes(type.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_HAZARD_TYPE',
      message: `Hazard type must be one of: ${validTypes.join(', ')}`
    });
  }

  try {
    const { hazard, isDuplicate } = await hazardService.reportHazard({
      type,
      severity,
      description,
      coordinates: [lon, lat],
      reportedByRole: req.userRole,
      landmark: landmark || '',
      imageUrl: imageUrl || ''
    });

    // Notify connected clients via Socket.IO
    notifyHazardAdded(hazard);

    return res.status(201).json({
      success: true,
      isDuplicate,
      hazard,
      reportedByRole: req.userRole,
      message: isDuplicate
        ? 'Report confirmed an existing hazard in this location.'
        : 'Hazard reported successfully and road network updated.'
    });
  } catch (err) {
    console.error('Error reporting hazard:', err);
    return res.status(500).json({
      success: false,
      error: 'HAZARD_REPORT_FAILED',
      message: err.message
    });
  }
});

/**
 * POST /api/hazards/:id/resolve
 * Resolve a hazard and clear routing penalties.
 * RESTRICTED: Authority role ONLY. Citizen role will receive 403 Forbidden.
 */
router.post('/:id/resolve', requireRole(['authority']), async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const resolvedHazard = await hazardService.resolveHazard(
      id,
      reason || 'Cleared and verified by municipal traffic authority',
      'authority'
    );

    if (!resolvedHazard) {
      return res.status(404).json({
        success: false,
        error: 'HAZARD_NOT_FOUND',
        message: 'No hazard found with the provided ID.'
      });
    }

    notifyHazardResolved(resolvedHazard);

    return res.json({
      success: true,
      hazard: resolvedHazard,
      resolvedByRole: 'authority',
      message: 'Hazard marked as resolved and removed from active routing penalties.'
    });
  } catch (err) {
    console.error('Error resolving hazard:', err);
    return res.status(500).json({
      success: false,
      error: 'HAZARD_RESOLVE_FAILED',
      message: err.message
    });
  }
});

/**
 * POST /api/hazards/reset-seed
 * Clears existing hazards and re-seeds with the 8 newly provided local Indore road hazard images.
 */
router.post('/reset-seed', async (req, res) => {
  try {
    const { SEED_HAZARDS } = await import('../data/seedHazards.js');
    await hazardService.clearAllHazards();
    const seeded = [];
    for (const h of SEED_HAZARDS) {
      const created = await hazardService.reportHazard(h);
      seeded.push(created);
      notifyHazardAdded(created);
    }
    return res.json({
      success: true,
      count: seeded.length,
      message: `Successfully cleared old data and seeded ${seeded.length} realistic road hazards.`,
      hazards: seeded
    });
  } catch (err) {
    console.error('Error resetting seed hazards:', err);
    return res.status(500).json({
      success: false,
      error: 'RESET_SEED_FAILED',
      message: err.message
    });
  }
});

export default router;
