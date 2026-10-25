import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

/**
 * Renders the user's active navigation marker according to travel mode:
 * - 'car': Top-down sleek white sedan with headlights & taillights
 * - 'bike': Top-down sports motorcycle & rider with helmet & handlebars
 * - 'walk': Top-down pedestrian walking figure with directional heading
 * All modes rotate dynamically with 'heading' and feature the floating progress speech-bubble.
 */
export function NavigationMarker({ position, heading = 0, progress = 0, mode = 'car' }) {
  if (!position) return null;

  const displayProgress = Math.max(0, Math.min(100, Math.round(progress)));

  // 1. Vehicle / Avatar SVG based on active travelMode
  let avatarSvg = '';
  let avatarWidth = 32;
  let avatarHeight = 52;
  let anchorY = 45;

  if (mode === 'bike') {
    avatarWidth = 26;
    avatarHeight = 48;
    anchorY = 42;
    avatarSvg = `
      <svg viewBox="0 0 50 90" width="26" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Ambient drop shadow -->
        <ellipse cx="25" cy="45" rx="14" ry="38" fill="rgba(0,0,0,0.35)" />

        <!-- Front Tire -->
        <rect x="22" y="4" width="6" height="20" rx="3" fill="#1E293B" />
        <rect x="23" y="6" width="4" height="16" rx="2" fill="#475569" />

        <!-- Front Fork & Handlebars -->
        <path d="M10 24 L40 24" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round" />
        <!-- Hand Grips -->
        <rect x="8" y="21" width="4" height="6" rx="1.5" fill="#007AFF" />
        <rect x="38" y="21" width="4" height="6" rx="1.5" fill="#007AFF" />

        <!-- Side Mirrors -->
        <circle cx="8" cy="18" r="2.5" fill="#E2E8F0" />
        <circle cx="42" cy="18" r="2.5" fill="#E2E8F0" />

        <!-- Main Bike Chassis (Sporty Blue Frame) -->
        <path d="M20 24 L30 24 L32 60 L18 60 Z" fill="#007AFF" />
        <!-- Fuel Tank Highlight -->
        <rect x="21" y="26" width="8" height="14" rx="3" fill="#38BDF8" />

        <!-- Motorcycle Rider Helmet -->
        <circle cx="25" cy="42" rx="9" ry="9" fill="#F8FAFC" stroke="#0F172A" stroke-width="1.5" />
        <!-- Helmet Dark Tinted Visor -->
        <path d="M19 39 C22 36, 28 36, 31 39 L31 43 C28 41, 22 41, 19 43 Z" fill="#0F172A" />

        <!-- Rider Shoulders / Jacket -->
        <path d="M13 48 C16 43, 34 43, 37 48 L35 56 L15 56 Z" fill="#1E293B" />

        <!-- Rear Seat & Tail Frame -->
        <rect x="21" y="56" width="8" height="14" rx="2" fill="#0F172A" />

        <!-- Rear Tire -->
        <rect x="22" y="64" width="6" height="22" rx="3" fill="#1E293B" />
        <!-- Red Taillight -->
        <ellipse cx="25" cy="74" rx="3" ry="1.5" fill="#EF4444" />
      </svg>
    `;
  } else if (mode === 'walk') {
    avatarWidth = 28;
    avatarHeight = 40;
    anchorY = 36;
    avatarSvg = `
      <svg viewBox="0 0 50 70" width="28" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Ambient drop shadow -->
        <ellipse cx="25" cy="35" rx="16" ry="24" fill="rgba(0,0,0,0.3)" />

        <!-- Directional Walking Arrow Pulse -->
        <path d="M25 4 L31 16 L25 13 L19 16 Z" fill="#10B981" />

        <!-- Pedestrian Torso / Jacket (Emerald green) -->
        <ellipse cx="25" cy="38" rx="14" ry="10" fill="#10B981" />
        <!-- Backpack -->
        <rect x="18" y="32" width="14" height="11" rx="3" fill="#0F172A" />

        <!-- Arms positioned for forward stride -->
        <ellipse cx="11" cy="34" rx="3" ry="6" fill="#10B981" />
        <ellipse cx="39" cy="42" rx="3" ry="6" fill="#10B981" />

        <!-- Pedestrian Head with dark cap -->
        <circle cx="25" cy="27" r="7.5" fill="#F8FAFC" stroke="#0F172A" stroke-width="1.5" />
        <!-- Cap visor pointing forward -->
        <path d="M20 22 C23 19, 27 19, 30 22 Z" fill="#0F172A" />
      </svg>
    `;
  } else {
    // Default: 'car'
    avatarWidth = 32;
    avatarHeight = 52;
    anchorY = 45;
    avatarSvg = `
      <svg viewBox="0 0 60 100" width="32" height="52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Ground ambient shadow -->
        <ellipse cx="30" cy="50" rx="24" ry="44" fill="rgba(0,0,0,0.3)" />

        <!-- Main White Car Body -->
        <rect x="8" y="10" width="44" height="80" rx="16" fill="#F8FAFC" />
        <rect x="10" y="12" width="40" height="76" rx="14" fill="url(#carBodyGrad)" />

        <!-- Front Bumper & Headlights -->
        <path d="M14 12 C18 9, 42 9, 46 12" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round" />
        <ellipse cx="14" cy="14" rx="4" ry="2.5" fill="#FEF08A" />
        <ellipse cx="46" cy="14" rx="4" ry="2.5" fill="#FEF08A" />

        <!-- Rear Bumper & Red Taillights -->
        <ellipse cx="15" cy="87" rx="4" ry="2" fill="#EF4444" />
        <ellipse cx="45" cy="87" rx="4" ry="2" fill="#EF4444" />

        <!-- Dark Tinted Windows & Roof Structure -->
        <path d="M16 32 L44 32 L40 44 L20 44 Z" fill="#1E293B" rx="2" />
        <path d="M20 68 L40 68 L43 76 L17 76 Z" fill="#1E293B" rx="2" />
        <rect x="14" y="44" width="4" height="24" rx="1.5" fill="#1E293B" />
        <rect x="42" y="44" width="4" height="24" rx="1.5" fill="#1E293B" />

        <!-- White Roof Center Section -->
        <rect x="18" y="44" width="24" height="24" rx="4" fill="#E2E8F0" />
        <rect x="22" y="48" width="16" height="10" rx="2" fill="#94A3B8" opacity="0.6" />

        <!-- Side Mirrors -->
        <rect x="4" y="32" width="5" height="4" rx="2" fill="#E2E8F0" />
        <rect x="51" y="32" width="5" height="4" rx="2" fill="#E2E8F0" />

        <defs>
          <linearGradient id="carBodyGrad" x1="10" y1="12" x2="50" y2="88" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFFFFF" />
            <stop offset="0.5" stop-color="#F1F5F9" />
            <stop offset="1" stop-color="#E2E8F0" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }

  const customIcon = L.divIcon({
    className: `custom-avatar-marker marker-mode-${mode}`,
    html: `
      <div style="position: relative; width: 64px; height: 74px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <!-- Floating Speech Bubble Tooltip (Reference Design) -->
        <div style="
          position: absolute;
          top: -2px;
          background: #007AFF;
          color: #ffffff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
          font-feature-settings: 'cv02';
          font-size: 11px;
          font-weight: 800;
          letter-spacing: -0.02em;
          padding: 2px 7px;
          border-radius: 7px;
          box-shadow: 0 4px 12px rgba(0, 122, 255, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          z-index: 20;
          pointer-events: none;
        ">
          ${displayProgress}%
          <!-- Downward Pointer Arrow -->
          <div style="
            position: absolute;
            bottom: -4px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 5px solid #007AFF;
          "></div>
        </div>

        <!-- Rotatable Avatar (Car / Bike / Pedestrian) -->
        <div style="
          position: relative;
          width: ${avatarWidth}px;
          height: ${avatarHeight}px;
          margin-top: 18px;
          transform: rotate(${heading}deg);
          transform-origin: center center;
          transition: transform 0.25s linear;
          filter: drop-shadow(0 6px 10px rgba(0,0,0,0.45));
        ">
          ${avatarSvg}
        </div>
      </div>
    `,
    iconSize: [64, 74],
    iconAnchor: [32, anchorY]
  });

  return <Marker position={position} icon={customIcon} zIndexOffset={1000} />;
}
