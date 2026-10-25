import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { resolveHazard } from '../../services/api';
import { ShieldCheck, Lock, CheckCircle, Loader2, Info, MapPin } from 'lucide-react';

// Create custom colored SVG icons for each hazard type
const createHazardIcon = (type, severity) => {
  let color = '#F59E0B'; // default amber
  let iconSvg = '';

  switch (type) {
    case 'roadblock':
      color = '#EF4444'; // Red
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>`;
      break;
    case 'construction':
      color = '#EAB308'; // Yellow
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20"/><path d="m14 10 4 4"/><path d="m10 14 4-4"/><path d="m6 18 8-8"/><path d="m10 6 4 4"/></svg>`;
      break;
    case 'accident':
      color = '#A855F7'; // Purple
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11.1 2 11.4V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
      break;
    case 'pothole':
      color = '#F97316'; // Orange
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      break;
    default:
      color = '#64748B'; // Slate
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }

  const pulseEffect = severity === 'high' || severity === 'critical'
    ? `box-shadow: 0 0 0 6px ${color}33;`
    : '';

  return L.divIcon({
    className: 'custom-hazard-marker',
    html: `
      <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; ${pulseEffect}">
        ${iconSvg}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

export function HazardMarkers({ hazards = [], onHazardResolved, userRole = 'citizen', onSelectHazard }) {
  const [resolvingId, setResolvingId] = useState(null);

  const handleResolve = async (hazardId) => {
    setResolvingId(hazardId);
    try {
      await resolveHazard(hazardId, 'Resolved and road cleared by municipal traffic authority');
      if (onHazardResolved) {
        onHazardResolved(hazardId);
      }
    } catch (err) {
      console.error('Failed to resolve hazard:', err);
      alert(err.message || 'Failed to resolve hazard. Authority permissions required.');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <>
      {hazards.map((hazard) => {
        const id = hazard._id || hazard.id;
        const [lon, lat] = hazard.location.coordinates;
        const icon = createHazardIcon(hazard.type, hazard.severity);

        const formattedDate = new Date(hazard.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });

        const isAuthority = userRole === 'authority';

        return (
          <Marker
            key={id}
            position={[lat, lon]}
            icon={icon}
            eventHandlers={{
              click: () => {
                // Also trigger selection when marker is clicked if handler provided
                if (onSelectHazard) {
                  // Keep popup accessible but allow quick detail view
                }
              }
            }}
          >
            <Popup>
              <div className="p-1 space-y-2 text-slate-100 min-w-[240px] max-w-[280px]">
                {/* Photo Thumbnail in Popup if available */}
                {hazard.imageUrl && (
                  <div
                    onClick={() => onSelectHazard && onSelectHazard(hazard)}
                    className="relative w-full h-24 rounded-xl overflow-hidden bg-slate-900 cursor-pointer group"
                    title="Click to view full photo and details"
                  >
                    <img
                      src={hazard.imageUrl}
                      alt={hazard.description || hazard.type}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
                    <span className="absolute bottom-1.5 right-1.5 text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                      🔍 Tap to expand
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    {hazard.type}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                    hazard.severity === 'critical' || hazard.severity === 'high'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {hazard.severity}
                  </span>
                </div>

                {hazard.roadName && (
                  <p className="text-[11px] text-sky-400 font-bold truncate flex items-center space-x-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span>{hazard.roadName}</span>
                  </p>
                )}

                {hazard.landmark && (
                  <p className="text-[10px] text-slate-300 font-semibold truncate pl-4">
                    🏛️ {hazard.landmark}
                  </p>
                )}

                {hazard.description && (
                  <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                    {hazard.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Reported at {formattedDate}</span>
                  {hazard.confirmations > 1 && (
                    <span className="text-emerald-400 font-medium">
                      ✓ {hazard.confirmations} confirmed
                    </span>
                  )}
                </div>

                {/* View Complete Details Action Button */}
                {onSelectHazard && (
                  <button
                    onClick={() => onSelectHazard(hazard)}
                    className="w-full py-1.5 px-3 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-bold transition active:scale-95 flex items-center justify-center space-x-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>View Complete Details & Image</span>
                  </button>
                )}

                {/* Role-Based Resolution Action */}
                {isAuthority ? (
                  <button
                    onClick={() => handleResolve(id)}
                    disabled={resolvingId === id}
                    className="w-full mt-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    {resolvingId === id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Resolving...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-200" />
                        <span>Mark as Cleared (Authority)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="mt-1 py-1.5 px-2.5 rounded-xl bg-slate-800/90 border border-slate-700/70 text-[10px] text-slate-400 flex items-center space-x-1.5">
                    <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span className="leading-tight">
                      Authority clearance required to resolve
                    </span>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
