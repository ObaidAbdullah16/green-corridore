import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { RoutePolyline } from './RoutePolyline';
import { HazardMarkers } from './HazardMarkers';
import { NavigationMarker } from './NavigationMarker';
import { WaypointMarkers } from './WaypointMarkers';
import { PoiMarkers } from './PoiMarkers';

// Real ground-truth IET DAVV Indore Coordinates
const DEFAULT_CENTER = [22.6812, 75.8796];
const DEFAULT_ZOOM = 14;

// Auto-follow / bounds helper
function MapController({ route, origin, destination, userLocation, isNavigating, focusLocation }) {
  const map = useMap();

  // Jump to focused location (e.g. when hazard is selected from list)
  useEffect(() => {
    if (focusLocation) {
      map.setView(focusLocation, 17, { animate: true });
    }
  }, [focusLocation, map]);

  // Fit bounds when new route or destination is loaded
  useEffect(() => {
    if (isNavigating) return;

    if (route?.geometry?.coordinates && route.geometry.coordinates.length > 1) {
      const bounds = L.latLngBounds(
        route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
      );
      if (origin?.lat && origin?.lon) bounds.extend([origin.lat, origin.lon]);
      if (destination?.lat && destination?.lon) bounds.extend([destination.lat, destination.lon]);
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
    } else if (destination?.lat && destination?.lon && origin?.lat && origin?.lon) {
      const bounds = L.latLngBounds([
        [origin.lat, origin.lon],
        [destination.lat, destination.lon]
      ]);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
    } else if (destination?.lat && destination?.lon) {
      map.setView([destination.lat, destination.lon], 15, { animate: true });
    }
  }, [route, origin, destination, isNavigating, map]);

  // Follow user position in navigation mode
  useEffect(() => {
    if (isNavigating && userLocation) {
      map.setView(userLocation, 16, { animate: true });
    }
  }, [isNavigating, userLocation, map]);

  return null;
}

// Map Click Listener
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    }
  });
  return null;
}

export function MapView({
  origin,
  destination,
  route,
  hazards,
  userLocation,
  heading,
  isNavigating,
  onMapClick,
  onHazardResolved,
  onSelectHazard,
  focusLocation,
  userRole = 'citizen',
  theme = 'dark',
  progressPercent = 0,
  travelMode = 'car'
}) {
  // 'dark' | 'streets' | 'satellite'
  const [mapType, setMapType] = useState(theme === 'dark' ? 'dark' : 'streets');

  // Sync with theme toggle when user switches modes
  useEffect(() => {
    if (mapType !== 'satellite') {
      setMapType(theme === 'dark' ? 'dark' : 'streets');
    }
  }, [theme]);

  return (
    <div className={`relative w-full h-full z-10 ${theme === 'dark' ? 'bg-[#0B0E14]' : 'bg-[#F8FAFC]'}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* Layer 1: Clean Dark Canvas (No Watermarks, No API Key Required) */}
        {mapType === 'dark' && (
          <>
            <TileLayer
              key="esri-dark-base"
              attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, METI'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            <TileLayer
              key="esri-dark-ref"
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
              opacity={0.85}
            />
          </>
        )}

        {/* Layer 2: OpenStreetMap Standard Street Tiles (Full Color, No Watermarks) */}
        {mapType === 'streets' && (
          <TileLayer
            key="osm-streets"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        {/* Layer 3: Esri High-Resolution Satellite with Boundaries & Labels */}
        {mapType === 'satellite' && (
          <>
            <TileLayer
              key="satellite-layer"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            <TileLayer
              key="satellite-labels"
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
              opacity={0.85}
            />
          </>
        )}

        <MapController
          route={route}
          origin={origin}
          destination={destination}
          userLocation={userLocation}
          isNavigating={isNavigating}
          focusLocation={focusLocation}
        />

        <MapClickHandler onMapClick={onMapClick} />

        {/* Decorative City POIs (Restaurants, Hotels, Hospitals, Cafes) */}
        <PoiMarkers />

        {/* Hazard Markers with RBAC and detail modal trigger */}
        <HazardMarkers
          hazards={hazards}
          onHazardResolved={onHazardResolved}
          onSelectHazard={onSelectHazard}
          userRole={userRole}
        />

        {/* Electric Blue + Neon Purple Route Polyline */}
        <RoutePolyline
          route={route}
          origin={origin}
          destination={destination}
          theme={theme}
        />

        {/* Reference UI Start & Destination Floating Cards */}
        <WaypointMarkers origin={origin} destination={destination} />

        {/* Top-Down Vehicle Tracker (Car / Bike / Pedestrian) with Heading & Tooltip */}
        <NavigationMarker
          position={userLocation}
          heading={heading}
          progress={progressPercent}
          mode={travelMode}
        />
      </MapContainer>

      {/* 1-Click Basemap Switcher (Dark vs Streets vs Satellite) */}
      <div className="absolute bottom-6 right-4 z-20 pointer-events-auto">
        <div className={`flex items-center backdrop-blur-md p-1 rounded-2xl shadow-2xl border ${
          theme === 'dark' ? 'bg-[#181B22]/90 border-slate-700/80' : 'bg-white/90 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setMapType('dark')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              mapType === 'dark'
                ? 'bg-[#007AFF] text-white shadow-md shadow-blue-500/30'
                : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>🌙 Dark</span>
          </button>

          <button
            type="button"
            onClick={() => setMapType('streets')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              mapType === 'streets'
                ? 'bg-[#007AFF] text-white shadow-md shadow-blue-500/30'
                : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>🗺️ Streets</span>
          </button>

          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
              mapType === 'satellite'
                ? 'bg-gradient-to-r from-indigo-600 to-[#007AFF] text-white shadow-md shadow-indigo-600/30'
                : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>🛰️ Satellite</span>
          </button>
        </div>
      </div>
    </div>
  );
}
