import React, { useMemo } from 'react';
import { Polyline } from 'react-leaflet';

/**
 * High-contrast glowing route polyline matching the reference design.
 * Features an electric blue core with neon purple glow casing.
 */
export function RoutePolyline({ route, origin, destination, theme = 'dark' }) {
  if (!route || !route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length < 2) {
    return null;
  }

  // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
  const positions = useMemo(() => {
    return route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  }, [route.geometry.coordinates]);

  // Access connector from exact Origin pin to Road Network
  const originConnector = useMemo(() => {
    if (!origin || !route.metadata?.snappedStart) return null;
    const [snapLon, snapLat] = route.metadata.snappedStart;
    const dLat = Math.abs(origin.lat - snapLat);
    const dLon = Math.abs(origin.lon - snapLon);
    if (dLat > 0.00005 || dLon > 0.00005) {
      return [
        [origin.lat, origin.lon],
        [snapLat, snapLon]
      ];
    }
    return null;
  }, [origin, route.metadata]);

  // Exit connector from Road Network to exact Destination pin
  const destConnector = useMemo(() => {
    if (!destination || !route.metadata?.snappedEnd) return null;
    const [snapLon, snapLat] = route.metadata.snappedEnd;
    const dLat = Math.abs(destination.lat - snapLat);
    const dLon = Math.abs(destination.lon - snapLon);
    if (dLat > 0.00005 || dLon > 0.00005) {
      return [
        [snapLat, snapLon],
        [destination.lat, destination.lon]
      ];
    }
    return null;
  }, [destination, route.metadata]);

  const isDark = theme === 'dark';

  return (
    <>
      {/* Access connector from exact Origin pin to Road Network */}
      {originConnector && (
        <Polyline
          positions={originConnector}
          pathOptions={{
            color: '#10B981',
            weight: 3.5,
            dashArray: '6, 6',
            opacity: 0.95
          }}
        />
      )}

      {/* 1. Deep Neon Glow Base Casing */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: isDark ? '#7C3AED' : '#8B5CF6',
          weight: 12,
          opacity: isDark ? 0.45 : 0.25,
          lineCap: 'round',
          lineJoin: 'round'
        }}
      />

      {/* 2. Vibrant Royal/Electric Blue Middle Layer */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: isDark ? '#0066FF' : '#2563EB',
          weight: 7,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round'
        }}
      />

      {/* 3. Sharp Bright Electric Blue Center Core */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: isDark ? '#38BDF8' : '#3B82F6',
          weight: 4.5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        }}
      />

      {/* Exit connector from Road Network to exact Destination pin */}
      {destConnector && (
        <Polyline
          positions={destConnector}
          pathOptions={{
            color: '#8B5CF6',
            weight: 3.5,
            dashArray: '6, 6',
            opacity: 0.95
          }}
        />
      )}
    </>
  );
}
