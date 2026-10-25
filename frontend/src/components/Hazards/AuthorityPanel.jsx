import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  X,
  AlertTriangle,
  Construction,
  AlertOctagon,
  Car,
  Loader2,
  MapPin,
  Filter
} from 'lucide-react';
import { resolveHazard } from '../../services/api';

const TYPE_ICONS = {
  pothole: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  construction: <Construction className="w-4 h-4 text-yellow-400" />,
  roadblock: <AlertOctagon className="w-4 h-4 text-rose-500" />,
  accident: <Car className="w-4 h-4 text-purple-400" />,
  other: <ShieldAlert className="w-4 h-4 text-slate-300" />
};

export function AuthorityPanel({ isOpen, onClose, hazards = [], onHazardResolved }) {
  const [resolvingId, setResolvingId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [resolutionReason, setResolutionReason] = useState('');

  if (!isOpen) return null;

  const filteredHazards = hazards.filter((h) => {
    if (filterType === 'all') return true;
    return h.type === filterType;
  });

  const criticalCount = hazards.filter((h) => h.severity === 'critical' || h.severity === 'high').length;

  const handleResolve = async (hazardId) => {
    setResolvingId(hazardId);
    try {
      const reason = resolutionReason.trim() || 'Verified and cleared by municipal traffic officer';
      await resolveHazard(hazardId, reason);
      if (onHazardResolved) {
        onHazardResolved(hazardId);
      }
    } catch (err) {
      console.error('Failed to resolve hazard:', err);
      alert(err.message || 'Failed to resolve hazard.');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-base leading-tight">
                  Authority Command Console
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Verified Officer
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Indore Municipal Corporation & Traffic Police Department
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Statistics Cards */}
        <div className="grid grid-cols-3 gap-3 flex-shrink-0">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[11px] font-bold uppercase text-slate-400">Active Hazards</span>
            <p className="text-2xl font-black text-white mt-0.5">{hazards.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/40">
            <span className="text-[11px] font-bold uppercase text-rose-300">Severe / Critical</span>
            <p className="text-2xl font-black text-rose-400 mt-0.5">{criticalCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40">
            <span className="text-[11px] font-bold uppercase text-emerald-300">Authority Power</span>
            <p className="text-xs font-bold text-emerald-400 mt-1">1-Click Clearance</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 flex-shrink-0 text-xs">
          <span className="text-slate-400 text-xs flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>
          {['all', 'roadblock', 'pothole', 'construction', 'accident', 'other'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-xl capitalize font-medium text-xs transition ${
                filterType === type
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Hazards List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredHazards.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <CheckCircle className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
              <p className="font-semibold text-slate-400">No active hazards matching filter</p>
              <p className="text-xs mt-0.5">All monitored roads are currently reported clear.</p>
            </div>
          ) : (
            filteredHazards.map((hazard) => {
              const id = hazard._id || hazard.id;
              const [lon, lat] = hazard.location?.coordinates || [0, 0];
              const isResolving = resolvingId === id;

              return (
                <div
                  key={id}
                  className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      {TYPE_ICONS[hazard.type] || TYPE_ICONS.other}
                      <span className="font-bold text-sm text-white capitalize">
                        {hazard.type}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          hazard.severity === 'critical' || hazard.severity === 'high'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {hazard.severity}
                      </span>
                      {hazard.confirmations > 1 && (
                        <span className="text-[10px] font-semibold text-emerald-400">
                          ✓ {hazard.confirmations} reports
                        </span>
                      )}
                    </div>

                    {hazard.roadName && (
                      <p className="text-xs text-sky-400 font-semibold truncate flex items-center space-x-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span>{hazard.roadName}</span>
                      </p>
                    )}

                    {hazard.description && (
                      <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                        {hazard.description}
                      </p>
                    )}

                    <p className="text-[10px] text-slate-500 font-mono">
                      Coordinates: {lat.toFixed(5)}, {lon.toFixed(5)} • Reported at {new Date(hazard.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Resolution Button */}
                  <div className="flex-shrink-0 sm:self-center">
                    <button
                      onClick={() => handleResolve(id)}
                      disabled={isResolving}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      {isResolving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Clearing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-200" />
                          <span>Resolve Hazard</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
