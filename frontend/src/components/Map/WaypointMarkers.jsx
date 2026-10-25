import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

/**
 * Creates custom Leaflet DivIcon for Starting Point matching the reference target design:
 * - Floating pill shape with soft rounded corners (border-radius: 14px) and pure white background (#FFFFFF)
 * - Soft ambient white glow: box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 22px rgba(255, 255, 255, 0.35)
 * - Horizontal flex row with vertical centering, gap: 10px, padding: 8px 14px
 * - Solid vibrant blue dot indicator on the left (w-3 h-3 bg-[#0084FF] inside soft circular badge)
 * - Typography: Top label "Starting Point" (#64748B, 10.5px, 500, Title Case), Bottom "Street Name" (#0F172A, 13px, 700)
 * - Anchor dot positioned cleanly on the road coordinate with vertical offset for the card
 */
function createOriginWaypointIcon(name = 'Starting Point') {
  const shortName = name.split(',')[0].trim();

  return L.divIcon({
    className: 'custom-waypoint-start',
    html: `
      <div style="position: relative; width: 260px; height: 72px; pointer-events: none; overflow: visible;">
        <!-- Glowing Road Anchor Dot (Placed exactly on GPS coordinate) -->
        <div style="position: absolute; bottom: 8px; left: 16px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(0, 132, 255, 0.3); box-shadow: 0 0 16px rgba(0, 132, 255, 0.65);"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #FFFFFF; border: 3px solid #0084FF; box-shadow: 0 0 10px #0084FF; z-index: 2;"></div>
        </div>

        <!-- Floating White Pill Card (Target Reference Design) -->
        <div style="
          position: absolute;
          top: 4px;
          left: 42px;
          background: #FFFFFF;
          border-radius: 14px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 22px rgba(255, 255, 255, 0.35);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          pointer-events: auto;
          white-space: nowrap;
          border: 1px solid rgba(226, 232, 240, 0.6);
        ">
          <!-- Vibrant Blue Dot Indicator -->
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #E8F3FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: #0084FF; box-shadow: 0 0 8px rgba(0, 132, 255, 0.55);"></div>
          </div>

          <!-- Typography Column -->
          <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.25;">
            <span style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10.5px; font-weight: 500; color: #64748B; letter-spacing: 0;">
              Starting Point
            </span>
            <span style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; font-weight: 700; color: #0F172A; max-width: 165px; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em;">
              ${shortName}
            </span>
          </div>
        </div>
      </div>
    `,
    iconSize: [260, 72],
    iconAnchor: [26, 54],
    popupAnchor: [40, -45]
  });
}

/**
 * Creates custom Leaflet DivIcon for Destination Point matching the reference target design:
 * - Floating pill shape with soft rounded corners (border-radius: 14px) and pure white background (#FFFFFF)
 * - Soft ambient white glow: box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 22px rgba(255, 255, 255, 0.35)
 * - Horizontal flex row with vertical centering, gap: 10px, padding: 8px 14px
 * - Clean blue pin indicator icon on the left
 * - Typography: Top label "Destination" (#64748B, 10.5px, 500, Title Case), Bottom "Street Name" (#0F172A, 13px, 700)
 * - Anchor ring positioned cleanly on the road coordinate with vertical offset for the card
 */
function createDestWaypointIcon(name = 'Destination') {
  const shortName = name.split(',')[0].trim();

  return L.divIcon({
    className: 'custom-waypoint-dest',
    html: `
      <div style="position: relative; width: 260px; height: 72px; pointer-events: none; overflow: visible;">
        <!-- Glowing Road Anchor Dot (Placed exactly on GPS coordinate) -->
        <div style="position: absolute; bottom: 8px; left: 16px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(0, 132, 255, 0.3); box-shadow: 0 0 16px rgba(0, 132, 255, 0.65);"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #0084FF; border: 3px solid #FFFFFF; box-shadow: 0 0 12px #0084FF; z-index: 2;"></div>
        </div>

        <!-- Floating White Pill Card (Target Reference Design) -->
        <div style="
          position: absolute;
          top: 4px;
          left: 42px;
          background: #FFFFFF;
          border-radius: 14px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 22px rgba(255, 255, 255, 0.35);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          pointer-events: auto;
          white-space: nowrap;
          border: 1px solid rgba(226, 232, 240, 0.6);
        ">
          <!-- Clean Blue Location Pin Indicator -->
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #E8F3FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#0084FF" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>

          <!-- Typography Column -->
          <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.25;">
            <span style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10.5px; font-weight: 500; color: #64748B; letter-spacing: 0;">
              Destination
            </span>
            <span style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; font-weight: 700; color: #0F172A; max-width: 165px; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em;">
              ${shortName}
            </span>
          </div>
        </div>
      </div>
    `,
    iconSize: [260, 72],
    iconAnchor: [26, 54],
    popupAnchor: [40, -45]
  });
}

export function WaypointMarkers({ origin, destination }) {
  return (
    <>
      {origin && origin.lat && origin.lon && (
        <Marker
          position={[origin.lat, origin.lon]}
          icon={createOriginWaypointIcon(origin.name || 'Starting Point')}
          zIndexOffset={500}
        />
      )}

      {destination && destination.lat && destination.lon && (
        <Marker
          position={[destination.lat, destination.lon]}
          icon={createDestWaypointIcon(destination.name || 'Destination')}
          zIndexOffset={500}
        />
      )}
    </>
  );
}
