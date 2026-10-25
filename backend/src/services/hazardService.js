import { Hazard } from '../models/Hazard.js';
import { isDbConnected } from '../config/db.js';
import { roadNetworkService } from './roadNetworkService.js';
import { haversineDistance } from '../engine/GeoUtils.js';

// Expiration lifetimes in milliseconds
const EXPIRATION_TTL_MS = {
  pothole: 7 * 24 * 60 * 60 * 1000,       // 7 days
  construction: 14 * 24 * 60 * 60 * 1000, // 14 days
  roadblock: 24 * 60 * 60 * 1000,         // 24 hours
  accident: 3 * 60 * 60 * 1000,           // 3 hours
  other: 24 * 60 * 60 * 1000              // 24 hours
};

// Contextual accurate fallback high-resolution photos for each hazard type
export const DEFAULT_HAZARD_IMAGES = {
  pothole: '/hazard-images/Rainy%20Dashcam%20Road%20with%20Pothole%20(1).png',
  construction: '/hazard-images/Rainy%20Roadworks%20Under%20the%20Flyover.png',
  roadblock: '/hazard-images/Rainy%20Road%20Blocked%20by%20Fallen%20Tree.png',
  accident: '/hazard-images/Rainy%20Urban%20Collision%20on%20a%20Busy%20Road.png',
  other: '/hazard-images/Monsoon%20Flooded%20City%20Street.png'
};

// In-memory fallback storage when MongoDB is not connected
const memoryHazards = new Map();

class HazardService {
  constructor() {
    this.cleanupInterval = null;
  }

  /**
   * Start periodic expiration cleaner (runs every 60 seconds)
   */
  startExpirationCleaner(onExpiredCallback) {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(async () => {
      try {
        const expiredHazards = await this.expireStaleHazards();
        if (expiredHazards.length > 0 && typeof onExpiredCallback === 'function') {
          for (const h of expiredHazards) {
            onExpiredCallback(h);
          }
        }
      } catch (err) {
        console.error('Error in hazard expiration worker:', err.message);
      }
    }, 60000);
  }

  /**
   * Get hazards with optional bounding box and status filter ('active', 'resolved', 'all').
   */
  async getHazards({ bbox = null, status = 'active' } = {}) {
    const now = new Date();

    if (isDbConnected()) {
      const query = {};

      if (status === 'active') {
        query.status = 'active';
        query.expiresAt = { $gt: now };
      } else if (status === 'resolved') {
        query.status = 'resolved';
      }

      if (bbox) {
        // bbox: { south, west, north, east }
        query.location = {
          $geoWithin: {
            $box: [
              [bbox.west, bbox.south],
              [bbox.east, bbox.north]
            ]
          }
        };
      }

      return await Hazard.find(query).sort({ createdAt: -1 });
    }

    // Memory fallback
    const list = [];
    for (const h of memoryHazards.values()) {
      let matchesStatus = true;
      if (status === 'active') {
        matchesStatus = h.status === 'active' && new Date(h.expiresAt) > now;
      } else if (status === 'resolved') {
        matchesStatus = h.status === 'resolved';
      }

      if (matchesStatus) {
        if (bbox) {
          const [lon, lat] = h.location.coordinates;
          if (lon >= bbox.west && lon <= bbox.east && lat >= bbox.south && lat <= bbox.north) {
            list.push(h);
          }
        } else {
          list.push(h);
        }
      }
    }

    // Sort by createdAt desc
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Backwards-compatible alias for getHazards({ bbox, status: 'active' }).
   */
  async getActiveHazards(bbox = null) {
    return await this.getHazards({ bbox, status: 'active' });
  }

  /**
   * Get single hazard by ID.
   */
  async getHazardById(hazardId) {
    if (!hazardId) return null;

    if (isDbConnected()) {
      return await Hazard.findById(hazardId);
    }
    return memoryHazards.get(hazardId.toString()) || null;
  }

  /**
   * Report a new hazard or increment confirmation if close duplicate.
   */
  async reportHazard({
    type,
    severity = 'medium',
    description = '',
    coordinates,
    reportedByRole = 'citizen',
    imageUrl = '',
    landmark = '',
    confirmations = 1
  }) {
    const [lon, lat] = coordinates;
    const cleanType = (type || 'other').toLowerCase();
    const cleanSeverity = (severity || 'medium').toLowerCase();
    const role = (reportedByRole === 'authority') ? 'authority' : 'citizen';
    const now = new Date();
    const ttl = EXPIRATION_TTL_MS[cleanType] || EXPIRATION_TTL_MS.other;
    const expiresAt = new Date(now.getTime() + ttl);

    // Contextual fallback image if not provided
    const finalImageUrl = imageUrl && imageUrl.trim().length > 5
      ? imageUrl.trim()
      : (DEFAULT_HAZARD_IMAGES[cleanType] || DEFAULT_HAZARD_IMAGES.other);

    // Snap to nearest road segment to get road metadata
    let roadName = '';
    let edgeId = '';
    const snap = roadNetworkService.getGraph().spatialIndex.findNearestEdge(lat, lon, 60);
    if (snap) {
      roadName = snap.edge.name || '';
      edgeId = snap.edge.id || '';
    }

    // Check for duplicate nearby report (< 25m) of the same type within active hazards
    const activeList = await this.getActiveHazards();
    for (const existing of activeList) {
      if (existing.type === cleanType) {
        const [eLon, eLat] = existing.location.coordinates;
        const dist = haversineDistance(lat, lon, eLat, eLon);
        if (dist <= 25) {
          // Increment confirmation count and refresh expiration
          existing.confirmations = (existing.confirmations || 1) + 1;
          existing.expiresAt = new Date(Math.max(new Date(existing.expiresAt).getTime(), expiresAt.getTime()));

          // Update image or landmark if existing lacked them
          if (!existing.imageUrl && finalImageUrl) existing.imageUrl = finalImageUrl;
          if (!existing.landmark && landmark) existing.landmark = landmark;

          if (isDbConnected() && existing.save) {
            await existing.save();
          } else {
            memoryHazards.set(existing._id.toString(), existing);
          }

          return { hazard: existing, isDuplicate: true };
        }
      }
    }

    const hazardData = {
      type: cleanType,
      severity: cleanSeverity,
      description: description.slice(0, 500),
      imageUrl: finalImageUrl,
      landmark: landmark.slice(0, 150),
      location: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      status: 'active',
      roadName,
      edgeId,
      confirmations: Math.max(1, confirmations || 1),
      resolutionReports: 0,
      reportedByRole: role,
      resolvedByRole: null,
      resolvedReason: null,
      expiresAt,
      createdAt: now,
      updatedAt: now
    };

    let savedHazard;
    if (isDbConnected()) {
      savedHazard = await Hazard.create(hazardData);
    } else {
      const mockId = 'hz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      savedHazard = { _id: mockId, id: mockId, ...hazardData };
      memoryHazards.set(mockId, savedHazard);
    }

    // Apply penalty to the in-memory road graph
    roadNetworkService.applyHazard(savedHazard);

    return { hazard: savedHazard, isDuplicate: false };
  }

  /**
   * Citizen or user confirms an existing hazard.
   */
  async confirmHazard(hazardId) {
    let hazard = await this.getHazardById(hazardId);
    if (!hazard) return null;

    hazard.confirmations = (hazard.confirmations || 1) + 1;
    if (isDbConnected() && hazard.save) {
      await hazard.save();
    } else {
      memoryHazards.set(hazardId.toString(), hazard);
    }
    return hazard;
  }

  /**
   * Mark hazard as resolved. Only permitted for authority users.
   */
  async resolveHazard(hazardId, reason = 'Resolved by municipal authority', resolvedByRole = 'authority') {
    const now = new Date();
    let hazard = null;

    if (isDbConnected()) {
      hazard = await Hazard.findById(hazardId);
      if (hazard) {
        hazard.status = 'resolved';
        hazard.resolvedAt = now;
        hazard.resolvedByRole = resolvedByRole;
        hazard.resolvedReason = reason;
        await hazard.save();
      }
    } else {
      hazard = memoryHazards.get(hazardId.toString());
      if (hazard) {
        hazard.status = 'resolved';
        hazard.resolvedAt = now;
        hazard.resolvedByRole = resolvedByRole;
        hazard.resolvedReason = reason;
        hazard.updatedAt = now;
      }
    }

    if (hazard) {
      // Remove from graph
      roadNetworkService.removeHazard(hazard._id || hazard.id);
    }

    return hazard;
  }

  /**
   * Expire past-due hazards and remove their graph penalties.
   */
  async expireStaleHazards() {
    const now = new Date();
    const expiredList = [];

    if (isDbConnected()) {
      const stales = await Hazard.find({
        status: 'active',
        expiresAt: { $lte: now }
      });

      for (const h of stales) {
        h.status = 'expired';
        await h.save();
        roadNetworkService.removeHazard(h._id);
        expiredList.push(h);
      }
    } else {
      for (const [id, h] of memoryHazards.entries()) {
        if (h.status === 'active' && new Date(h.expiresAt) <= now) {
          h.status = 'expired';
          h.updatedAt = now;
          roadNetworkService.removeHazard(id);
          expiredList.push(h);
        }
      }
    }

    if (expiredList.length > 0) {
      console.log(`Cleaned up ${expiredList.length} expired road hazards.`);
    }

    return expiredList;
  }

  /**
   * Clears all hazards from both MongoDB and memory repository and resets graph penalties
   */
  async clearAllHazards() {
    if (isDbConnected()) {
      await Hazard.deleteMany({});
    }
    memoryHazards.clear();
    roadNetworkService.syncHazards([]);
    console.log('All previous hazards cleared.');
  }
}

export const hazardService = new HazardService();
