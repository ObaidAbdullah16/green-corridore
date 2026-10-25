import { useState, useEffect, useRef, useCallback } from 'react';

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function areCoordinateArraysDifferent(coordsA, coordsB) {
  if (!coordsA || !coordsB) return true;
  if (coordsA === coordsB) return false;
  if (coordsA.length !== coordsB.length) return true;
  for (let i = 0; i < coordsA.length; i++) {
    if (coordsA[i][0] !== coordsB[i][0] || coordsA[i][1] !== coordsB[i][1]) {
      return true;
    }
  }
  return false;
}

export function useGeolocation({ onLocationUpdate, routeCoordinates = null, onOffRoute = null }) {
  const [location, setLocation] = useState(null); // [lat, lon]
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0); // km/h
  const [accuracy, setAccuracy] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt'); // 'prompt', 'granted', 'denied'
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [simulationSpeedMultiplier, setSimulationSpeedMultiplier] = useState(1);
  const [progressPercent, setProgressPercent] = useState(0);

  const watchIdRef = useRef(null);
  const simIntervalRef = useRef(null);
  const resumeTimeoutRef = useRef(null);
  const activeCoordsRef = useRef([]);
  const simIndexRef = useRef(0);
  const locationRef = useRef(null);
  const offRouteCountRef = useRef(0);
  const isSimulatingRef = useRef(false);

  const onLocationUpdateRef = useRef(onLocationUpdate);
  const onOffRouteRef = useRef(onOffRoute);
  const speedMultiplierRef = useRef(simulationSpeedMultiplier);

  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  useEffect(() => {
    onOffRouteRef.current = onOffRoute;
  }, [onOffRoute]);

  useEffect(() => {
    speedMultiplierRef.current = simulationSpeedMultiplier;
  }, [simulationSpeedMultiplier]);

  // Check off-route deviation (only active during real GPS tracking, disabled during simulation)
  const checkDeviation = useCallback((currentLat, currentLon) => {
    if (isSimulatingRef.current) return;
    if (!routeCoordinates || routeCoordinates.length < 2 || !onOffRouteRef.current) return;

    let minDistance = Infinity;
    for (let i = 0; i < routeCoordinates.length; i++) {
      const [lon, lat] = routeCoordinates[i];
      const d = calculateDistanceMeters(currentLat, currentLon, lat, lon);
      if (d < minDistance) minDistance = d;
    }

    if (minDistance > 45) {
      offRouteCountRef.current += 1;
      // Require 2 consecutive off-route observations to avoid GPS noise
      if (offRouteCountRef.current >= 2) {
        console.warn(`Off route detected (${minDistance.toFixed(1)}m from route). Requesting reroute.`);
        if (onOffRouteRef.current) onOffRouteRef.current([currentLat, currentLon]);
        offRouteCountRef.current = 0;
      }
    } else {
      offRouteCountRef.current = 0;
    }
  }, [routeCoordinates]);

  // Start real browser geolocation watching
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setPermissionState('denied');
      return;
    }

    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPermissionState('granted');
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const coords = [lat, lon];
        locationRef.current = coords;
        setLocation(coords);
        setHeading(pos.coords.heading || 0);
        setSpeed(pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0);
        setAccuracy(pos.coords.accuracy);

        if (onLocationUpdateRef.current) onLocationUpdateRef.current(coords);
        checkDeviation(lat, lon);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setPermissionState('denied');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000
      }
    );
  }, [checkDeviation]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current !== null) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (resumeTimeoutRef.current !== null) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    setIsSimulating(false);
    isSimulatingRef.current = false;
    setIsRerouting(false);
    setSpeed(0);
  }, []);

  // Single step in simulation
  const executeStep = useCallback(() => {
    const coords = activeCoordsRef.current;
    if (!coords || coords.length === 0) return;

    const idx = simIndexRef.current;
    if (idx >= coords.length) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      setIsSimulating(false);
      isSimulatingRef.current = false;
      setIsRerouting(false);
      setSpeed(0);
      console.log('GPS simulation completed - Destination reached.');
      return;
    }

    const [lon, lat] = coords[idx];
    const nextCoord = coords[idx + 1] || coords[idx];

    // Calculate heading towards next coordinate
    const dLon = ((nextCoord[0] - lon) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((nextCoord[1] * Math.PI) / 180);
    const x =
      Math.cos((lat * Math.PI) / 180) * Math.sin((nextCoord[1] * Math.PI) / 180) -
      Math.sin((lat * Math.PI) / 180) * Math.cos((nextCoord[1] * Math.PI) / 180) * Math.cos(dLon);
    const calcHeading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

    const currentPoint = [lat, lon];
    locationRef.current = currentPoint;
    setLocation(currentPoint);
    setHeading(calcHeading);
    setSpeed(40); // 40 km/h drive speed

    const pct = Math.min(100, Math.round((idx / Math.max(1, coords.length - 1)) * 100));
    setProgressPercent(pct);

    if (onLocationUpdateRef.current) onLocationUpdateRef.current(currentPoint);
    checkDeviation(lat, lon);

    simIndexRef.current += 1;
  }, [checkDeviation]);

  // Start drive simulation
  const startSimulation = useCallback((coordsArray = null) => {
    const coords = coordsArray || routeCoordinates;
    if (!coords || coords.length < 2) return;

    stopWatching();
    setIsSimulating(true);
    isSimulatingRef.current = true;
    setIsRerouting(false);
    activeCoordsRef.current = coords;
    simIndexRef.current = 0;

    const intervalMs = Math.max(300, 1000 / speedMultiplierRef.current);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    simIntervalRef.current = setInterval(executeStep, intervalMs);
  }, [routeCoordinates, stopWatching, executeStep]);

  // Dynamically switch track to new route when a detour is calculated while simulating
  const updateSimulationRoute = useCallback((newCoords) => {
    if (!newCoords || newCoords.length < 2) return;
    if (!isSimulatingRef.current) return;

    // Check if newCoords is already the active route being driven
    if (activeCoordsRef.current && !areCoordinateArraysDifferent(activeCoordsRef.current, newCoords)) {
      console.log('updateSimulationRoute: Already driving on this route.');
      return;
    }

    console.log('Hazard on route! Halting vehicle momentarily for ~1.2s to switch to updated detour trajectory...');

    // 1. Pause driving immediately
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }

    setIsRerouting(true);
    setSpeed(0); // 0 km/h during detour pause

    // 2. Find closest point on the new detour to vehicle's current location
    const currLoc = locationRef.current;
    let bestIndex = 0;

    if (currLoc) {
      let minD = Infinity;
      for (let i = 0; i < newCoords.length; i++) {
        const [lon, lat] = newCoords[i];
        const d = calculateDistanceMeters(currLoc[0], currLoc[1], lat, lon);
        if (d < minD) {
          minD = d;
          bestIndex = i;
        }
      }
      // If car is already right at bestIndex (< 5m), advance index to avoid staying stationary on resume
      if (minD < 5 && bestIndex < newCoords.length - 1) {
        bestIndex += 1;
      }
    }

    // Set new trajectory
    activeCoordsRef.current = newCoords;
    simIndexRef.current = bestIndex;

    // 3. Reorient vehicle heading towards the new detour street immediately
    const nextIdx = Math.min(bestIndex + 1, newCoords.length - 1);
    const [lon1, lat1] = newCoords[bestIndex];
    const [lon2, lat2] = newCoords[nextIdx];
    if (nextIdx !== bestIndex) {
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
      const x =
        Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
        Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
      const newHeading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
      setHeading(newHeading);
    }

    // 4. Wait ~1.2s pause (for user to see vehicle stop and detour apply) then resume driving along new detour
    const intervalMs = Math.max(300, 1000 / speedMultiplierRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      if (!isSimulatingRef.current) return;
      console.log(`Resuming drive on new detour from waypoint ${bestIndex}/${newCoords.length}.`);
      setIsRerouting(false);
      simIntervalRef.current = setInterval(executeStep, intervalMs);
    }, 1200);
  }, [executeStep]);

  // Watch for route updates while simulating
  useEffect(() => {
    if (!isSimulating || !routeCoordinates || routeCoordinates.length < 2) return;

    const curr = activeCoordsRef.current;
    if (curr && curr.length > 0) {
      if (areCoordinateArraysDifferent(curr, routeCoordinates)) {
        updateSimulationRoute(routeCoordinates);
      }
    }
  }, [routeCoordinates, isSimulating, updateSimulationRoute]);

  const setManualPosition = useCallback((coords) => {
    locationRef.current = coords;
    setLocation(coords);
    if (onLocationUpdateRef.current) onLocationUpdateRef.current(coords);
    checkDeviation(coords[0], coords[1]);
  }, [checkDeviation]);

  // Scrub simulation to a specific percentage (e.g., from interactive slider)
  const seekSimulation = useCallback((percent) => {
    const coords = activeCoordsRef.current.length > 0 ? activeCoordsRef.current : routeCoordinates;
    if (!coords || coords.length < 2) return;

    activeCoordsRef.current = coords;
    const clampedPct = Math.max(0, Math.min(100, Math.round(percent)));
    const targetIdx = Math.min(coords.length - 1, Math.round((clampedPct / 100) * (coords.length - 1)));
    simIndexRef.current = targetIdx;
    setProgressPercent(clampedPct);

    const [lon, lat] = coords[targetIdx];
    const nextCoord = coords[Math.min(targetIdx + 1, coords.length - 1)] || coords[targetIdx];
    const dLon = ((nextCoord[0] - lon) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((nextCoord[1] * Math.PI) / 180);
    const x =
      Math.cos((lat * Math.PI) / 180) * Math.sin((nextCoord[1] * Math.PI) / 180) -
      Math.sin((lat * Math.PI) / 180) * Math.cos((nextCoord[1] * Math.PI) / 180) * Math.cos(dLon);
    const calcHeading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

    const currentPoint = [lat, lon];
    locationRef.current = currentPoint;
    setLocation(currentPoint);
    setHeading(calcHeading);
    if (onLocationUpdateRef.current) onLocationUpdateRef.current(currentPoint);
  }, [routeCoordinates]);

  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    location,
    heading,
    speed,
    accuracy,
    permissionState,
    isSimulating,
    isRerouting,
    progressPercent,
    seekSimulation,
    startWatching,
    stopWatching,
    startSimulation,
    updateSimulationRoute,
    setManualPosition,
    setSimulationSpeedMultiplier
  };
}
