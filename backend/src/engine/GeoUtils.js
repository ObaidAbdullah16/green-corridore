/**
 * Geospatial Utilities for Distance, Projection, Bearings, and Routing Calculations
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates Haversine distance between two coordinates in meters.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Computes the initial bearing (forward azimuth) from point 1 to point 2 in degrees (0..360).
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const lambda1 = (lon1 * Math.PI) / 180;
  const lambda2 = (lon2 * Math.PI) / 180;

  const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

/**
 * Determines turn instruction given entry bearing and exit bearing.
 */
export function getTurnInstruction(prevBearing, nextBearing, roadName) {
  let diff = (nextBearing - prevBearing + 360) % 360;
  if (diff > 180) diff -= 360; // diff in [-180, 180]

  const street = roadName ? ` onto ${roadName}` : '';

  if (Math.abs(diff) < 20) {
    return { type: 'continue', text: `Continue straight${street}`, angle: diff };
  } else if (diff >= 20 && diff < 60) {
    return { type: 'slight_right', text: `Keep right${street}`, angle: diff };
  } else if (diff >= 60 && diff < 120) {
    return { type: 'turn_right', text: `Turn right${street}`, angle: diff };
  } else if (diff >= 120 && diff < 160) {
    return { type: 'sharp_right', text: `Sharp right${street}`, angle: diff };
  } else if (diff >= 160 || diff <= -160) {
    return { type: 'uturn', text: `Make a U-turn${street}`, angle: diff };
  } else if (diff <= -120 && diff > -160) {
    return { type: 'sharp_left', text: `Sharp left${street}`, angle: diff };
  } else if (diff <= -60 && diff > -120) {
    return { type: 'turn_left', text: `Turn left${street}`, angle: diff };
  } else {
    return { type: 'slight_left', text: `Keep left${street}`, angle: diff };
  }
}

/**
 * Projects a point onto a 2D line segment [A, B] on the Earth's surface (equirectangular local projection).
 * @param {number} pLat
 * @param {number} pLon
 * @param {number} aLat
 * @param {number} aLon
 * @param {number} bLat
 * @param {number} bLon
 * @returns {{ distance: number, projection: [number, number], ratio: number }}
 */
export function projectPointOnSegment(pLat, pLon, aLat, aLon, bLat, bLon) {
  const avgLat = ((aLat + bLat) / 2) * (Math.PI / 180);
  const cosLat = Math.cos(avgLat);

  // Convert to local Cartesian meters relative to A
  const xB = (bLon - aLon) * (Math.PI / 180) * EARTH_RADIUS_METERS * cosLat;
  const yB = (bLat - aLat) * (Math.PI / 180) * EARTH_RADIUS_METERS;

  const xP = (pLon - aLon) * (Math.PI / 180) * EARTH_RADIUS_METERS * cosLat;
  const yP = (pLat - aLat) * (Math.PI / 180) * EARTH_RADIUS_METERS;

  const segLenSq = xB * xB + yB * yB;
  let ratio = 0;
  if (segLenSq > 1e-6) {
    ratio = (xP * xB + yP * yB) / segLenSq;
    ratio = Math.max(0, Math.min(1, ratio));
  }

  const projX = ratio * xB;
  const projY = ratio * yB;

  const dX = xP - projX;
  const dY = yP - projY;
  const distance = Math.sqrt(dX * dX + dY * dY);

  const projLon = aLon + (projX / (EARTH_RADIUS_METERS * cosLat)) * (180 / Math.PI);
  const projLat = aLat + (projY / EARTH_RADIUS_METERS) * (180 / Math.PI);

  return {
    distance,
    projection: [projLon, projLat], // GeoJSON order: [lon, lat]
    ratio
  };
}

/**
 * Check if a point is within threshold distance of a GeoJSON LineString coordinates array.
 * @param {[number, number]} point [lon, lat]
 * @param {Array<[number, number]>} coordinates [[lon, lat], ...]
 * @param {number} thresholdMeters
 * @returns {{ isNear: boolean, minDistance: number, nearestPoint: [number, number], segmentIndex: number }}
 */
export function distanceToLineString(point, coordinates, thresholdMeters = 50) {
  const [pLon, pLat] = point;
  let minDistance = Infinity;
  let nearestProj = [0, 0];
  let nearestSegmentIndex = -1;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [aLon, aLat] = coordinates[i];
    const [bLon, bLat] = coordinates[i + 1];

    const res = projectPointOnSegment(pLat, pLon, aLat, aLon, bLat, bLon);
    if (res.distance < minDistance) {
      minDistance = res.distance;
      nearestProj = res.projection;
      nearestSegmentIndex = i;
    }
  }

  return {
    isNear: minDistance <= thresholdMeters,
    minDistance,
    nearestPoint: nearestProj,
    segmentIndex: nearestSegmentIndex
  };
}
