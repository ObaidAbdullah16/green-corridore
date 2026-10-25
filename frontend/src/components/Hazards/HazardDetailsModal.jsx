import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Construction,
  Car,
  AlertTriangle,
  X,
  MapPin,
  Clock,
  ThumbsUp,
  CheckCircle,
  Lock,
  Loader2,
  ExternalLink,
  Navigation,
  Image as ImageIcon
} from 'lucide-react';
import { resolveHazard, confirmHazard } from '../../services/api';

const TYPE_CONFIG = {
  pothole: {
    label: 'Road Pothole',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300'
  },
  construction: {
    label: 'Road Construction',
    icon: <Construction className="w-5 h-5 text-yellow-400" />,
    color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/40 text-yellow-300'
  },
  roadblock: {
    label: 'Roadblock Barrier',
    icon: <AlertOctagon className="w-5 h-5 text-rose-500" />,
    color: 'from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-300'
  },
  accident: {
    label: 'Traffic Collision',
    icon: <Car className="w-5 h-5 text-purple-400" />,
    color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300'
  },
  other: {
    label: 'Road Hazard',
    icon: <ShieldAlert className="w-5 h-5 text-slate-300" />,
    color: 'from-slate-500/20 to-slate-600/20 border-slate-500/40 text-slate-300'
  }
};

const SEVERITY_BADGES = {
  critical: 'bg-rose-950 text-rose-300 border-rose-800',
  high: 'bg-orange-950 text-orange-300 border-orange-800',
  medium: 'bg-amber-950 text-amber-300 border-amber-800',
  low: 'bg-yellow-950 text-yellow-300 border-yellow-800'
};

export function HazardDetailsModal({
  hazard,
  isOpen,
  onClose,
  userRole = 'citizen',
  theme = 'dark',
  onHazardResolved,
  onFocusOnMap
}) {
  const [isResolving, setIsResolving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmations, setConfirmations] = useState(hazard?.confirmations || 1);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!isOpen || !hazard) return null;

  const isDark = theme === 'dark';
  const id = hazard._id || hazard.id;
  const isAuthority = userRole === 'authority';
  const isResolved = hazard.status === 'resolved';
  const typeConfig = TYPE_CONFIG[hazard.type] || TYPE_CONFIG.other;
  const [lon, lat] = hazard.location?.coordinates || [0, 0];

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      await resolveHazard(id, 'Resolved and verified by municipal traffic officer');
      if (onHazardResolved) {
        onHazardResolved(id);
      }
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to resolve hazard.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleConfirm = async () => {
    if (hasConfirmed) return;
    setIsConfirming(true);
    try {
      const res = await confirmHazard(id);
      setConfirmations(res.confirmations || confirmations + 1);
      setHasConfirmed(true);
    } catch (err) {
      console.warn('Confirm failed:', err);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border ${
          isDark
            ? 'bg-[#181B22] border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Image Preview Banner */}
        <div className="relative w-full h-52 sm:h-60 bg-slate-950 flex-shrink-0 overflow-hidden">
          {hazard.imageUrl && !imgError ? (
            <img
              src={hazard.imageUrl}
              alt={hazard.description || hazard.type}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-center transition-transform hover:scale-105 duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-slate-500 space-y-2">
              <ImageIcon className="w-12 h-12 text-slate-600" />
              <span className="text-xs font-semibold">Live Road Hazard Photo</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/60 pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white backdrop-blur-md border border-slate-700/60 shadow-lg transition"
            title="Close details"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Severity & Status Badges floating top left */}
          <div className="absolute top-3 left-3 flex items-center space-x-2">
            <span
              className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-lg backdrop-blur-md ${
                SEVERITY_BADGES[hazard.severity] || SEVERITY_BADGES.medium
              }`}
            >
              {hazard.severity} Severity
            </span>

            {isResolved ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700 flex items-center space-x-1 backdrop-blur-md">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Resolved & Cleared</span>
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-950/90 text-rose-300 border border-rose-700 flex items-center space-x-1.5 backdrop-blur-md animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Active Hazard</span>
              </span>
            )}
          </div>

          {/* Title & Type Floating at Bottom of Header */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${typeConfig.color} border shadow-lg backdrop-blur-md`}>
                {typeConfig.icon}
              </div>
              <div>
                <h2 className="text-lg font-black text-white leading-tight drop-shadow">
                  {typeConfig.label}
                </h2>
                <p className="text-xs text-sky-300 font-semibold drop-shadow truncate">
                  {hazard.roadName || 'Monitored Road Segment'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
          {/* Location & Landmark Box */}
          <div
            className={`p-3.5 rounded-2xl border space-y-2 ${
              isDark ? 'bg-[#242831] border-slate-700/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Location & Landmark
                </span>
                <p className={`text-sm font-bold flex items-center space-x-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{hazard.roadName || 'Indore Road Network'}</span>
                </p>
                {hazard.landmark ? (
                  <p className="text-xs font-semibold text-sky-400 pl-5.5">
                    🏛️ Landmark: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{hazard.landmark}</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 pl-5.5">
                    🏛️ Landmark: Near central traffic corridor
                  </p>
                )}
              </div>

              {onFocusOnMap && (
                <button
                  onClick={() => {
                    onFocusOnMap([lat, lon]);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-400 text-xs font-semibold flex items-center space-x-1 transition active:scale-95"
                  title="Focus and view on Leaflet Map"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Focus Map</span>
                </button>
              )}
            </div>

            <div className={`pt-2 border-t flex items-center justify-between text-[11px] font-mono ${
              isDark ? 'border-slate-700/60 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}>
              <span>Geo Coordinates:</span>
              <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                {lat.toFixed(5)}° N, {lon.toFixed(5)}° E
              </span>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Incident Description
            </span>
            <p
              className={`text-xs leading-relaxed p-3 rounded-2xl border ${
                isDark
                  ? 'text-slate-200 bg-[#242831]/80 border-slate-700/80'
                  : 'text-slate-700 bg-slate-50 border-slate-200'
              }`}
            >
              {hazard.description || 'Reported road condition causing slowdown or detour on this roadway segment.'}
            </p>
          </div>

          {/* Audit Metadata & Community Verification */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div
              className={`p-3 rounded-2xl border space-y-1 ${
                isDark ? 'bg-[#242831]/80 border-slate-700/80' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Reported By</span>
              <p className={`font-semibold capitalize flex items-center space-x-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <span>{hazard.reportedByRole === 'authority' ? '🛡️ Municipal Officer' : '👤 Citizen (Crowdsourced)'}</span>
              </p>
              <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(hazard.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              </span>
            </div>

            <div
              className={`p-3 rounded-2xl border space-y-1 ${
                isDark ? 'bg-[#242831]/80 border-slate-700/80' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Verification Status</span>
              <p className="font-semibold text-emerald-400">
                ✓ {confirmations} citizen {confirmations === 1 ? 'report' : 'confirmations'}
              </p>
              {!isResolved && (
                <button
                  onClick={handleConfirm}
                  disabled={hasConfirmed || isConfirming}
                  className="text-[10px] font-bold text-sky-400 hover:text-sky-300 disabled:opacity-50 flex items-center space-x-1 transition"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>{hasConfirmed ? 'Confirmed by you' : 'Confirm this hazard'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Resolution Details (if resolved) */}
          {isResolved && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 space-y-1 text-xs">
              <div className="flex items-center space-x-1.5 text-emerald-300 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Hazard Clearance Audit</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                {hazard.resolvedReason || 'Road cleared, debris removed, and normal transit restored.'}
              </p>
              <p className="text-[10px] text-emerald-400/80 font-mono">
                Cleared by: {hazard.resolvedByRole || 'authority'} • {new Date(hazard.resolvedAt || hazard.updatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`p-4 border-t flex items-center justify-between space-x-3 flex-shrink-0 ${
            isDark ? 'border-slate-800 bg-[#181B22]' : 'border-slate-200 bg-white'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Close
          </button>

          {/* Role-Based Resolution button */}
          {!isResolved && (
            <>
              {isAuthority ? (
                <button
                  onClick={handleResolve}
                  disabled={isResolving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 active:scale-95 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Clearing Hazard...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Resolve & Clear Hazard (Authority)</span>
                    </>
                  )}
                </button>
              ) : (
                <div
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs flex items-center justify-center space-x-2 ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700/60 text-slate-400'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-[11px]">Authority Clearance Required to Resolve</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
