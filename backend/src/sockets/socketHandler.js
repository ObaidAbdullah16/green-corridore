import { roadNetworkService } from '../services/roadNetworkService.js';
import { distanceToLineString } from '../engine/GeoUtils.js';

// Map of socketId -> { socket, destination, origin, currentLocation, geometry, routeId, lastRecalculatedAt }
const activeNavigations = new Map();

let ioInstance = null;

export function setupSocketIO(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register active navigation session
    socket.on('start_navigation', (data) => {
      // data: { destination: [lat, lon], origin: [lat, lon], currentLocation: [lat, lon], geometry: [[lon, lat], ...] }
      if (!data || !data.destination || !data.geometry) return;

      activeNavigations.set(socket.id, {
        socketId: socket.id,
        origin: data.origin || data.currentLocation,
        destination: data.destination,
        currentLocation: data.currentLocation || data.origin,
        geometry: data.geometry,
        lastRecalculatedAt: Date.now()
      });

      console.log(`User ${socket.id} started active navigation.`);
    });

    // Update GPS location during active navigation
    socket.on('update_location', (data) => {
      // data: { currentLocation: [lat, lon] }
      const nav = activeNavigations.get(socket.id);
      if (nav && data?.currentLocation) {
        nav.currentLocation = data.currentLocation;
      }
    });

    // Stop active navigation
    socket.on('stop_navigation', () => {
      activeNavigations.delete(socket.id);
      console.log(`User ${socket.id} ended active navigation.`);
    });

    socket.on('disconnect', () => {
      activeNavigations.delete(socket.id);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Handle new or updated hazard notification across connected clients.
 * Filters and alerts active navigation sessions whose routes intersect with the hazard.
 */
export function notifyHazardAdded(hazard) {
  if (!ioInstance) return;

  const [hLon, hLat] = hazard.location.coordinates;

  // 1. Broadcast to all clients to update map markers
  ioInstance.emit('hazard_updated', {
    action: 'added',
    hazard
  });

  // 2. Targeted route impact detection for active navigations
  for (const [socketId, nav] of activeNavigations.entries()) {
    if (!nav.geometry || nav.geometry.length === 0) continue;

    const impact = distanceToLineString([hLon, hLat], nav.geometry, 60);

    if (impact.isNear) {
      console.log(`Active route for client ${socketId} is affected by new hazard ${hazard.type} (${impact.minDistance.toFixed(1)}m away).`);

      const socket = ioInstance.sockets.sockets.get(socketId);
      if (!socket) continue;

      // Recalculate route from current location
      const startPoint = nav.currentLocation || nav.origin;
      const newRoute = roadNetworkService.calculateRoute(startPoint, nav.destination);

      if (newRoute.success) {
        nav.geometry = newRoute.geometry.coordinates;
        nav.lastRecalculatedAt = Date.now();

        socket.emit('route_auto_rerouted', {
          reason: 'hazard_on_route',
          hazard,
          distanceFromRoute: impact.minDistance,
          newRoute,
          message: `New ${hazard.type} reported on your path. Route recalculated to avoid the hazard.`
        });
      } else {
        // No alternative detour found
        socket.emit('route_hazard_warning', {
          hazard,
          message: `Reported ${hazard.type} ahead on your route. Drive with caution as no alternative road is available.`
        });
      }
    }
  }
}

/**
 * Handle hazard resolution/expiration notification across connected clients.
 */
export function notifyHazardResolved(hazard) {
  if (!ioInstance) return;

  ioInstance.emit('hazard_updated', {
    action: 'resolved',
    hazard
  });

  // Notify any active navigation sessions that a nearby hazard was resolved
  const [hLon, hLat] = hazard.location.coordinates;
  for (const [socketId, nav] of activeNavigations.entries()) {
    const impact = distanceToLineString([hLon, hLat], nav.geometry, 100);
    if (impact.isNear) {
      const socket = ioInstance.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('hazard_cleared_on_route', {
          hazard,
          message: `Hazard ahead (${hazard.type}) has been reported cleared.`
        });
      }
    }
  }
}

export function getIO() {
  return ioInstance;
}
