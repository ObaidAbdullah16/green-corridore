import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  Construction,
  Car,
  AlertTriangle,
  X,
  MapPin,
  Clock,
  CheckCircle,
  Search,
  Navigation,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';
import { fetchHazards } from '../../services/api';

const TYPE_ICONS = {
  pothole: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  construction: <Construction className="w-4 h-4 text-yellow-400" />,
  roadblock: <AlertOctagon className="w-4 h-4 text-rose-500" />,
  accident: <Car className="w-4 h-4 text-purple-400" />,
  other: <ShieldAlert className="w-4 h-4 text-slate-300" />
};

export function HazardsListModal({
  isOpen,
  onClose,
  hazards = [],
  userRole = 'citizen',
  theme = 'dark',
  onSelectHazard,
  onFocusOnMap
}) {
  const [localHazards, setLocalHazards] = useState(hazards);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('active'); // 'active', 'all', 'resolved'
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  const isDark = theme === 'dark';

  // Always sync localHazards if hazards prop changes
  useEffect(() => {
    if (Array.isArray(hazards) && hazards.length > 0) {
      setLocalHazards(hazards);
    }
  }, [hazards]);

  // When modal opens, refresh latest hazards from backend to guarantee fresh data
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchHazards('all')
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setLocalHazards(data);
          }
        })
        .catch((err) => {
          console.warn('Failed to refresh hazards list in modal:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  // Filtered hazards list
  const activeHazardsList = useMemo(() => {
    return Array.isArray(localHazards) ? localHazards.filter(Boolean) : [];
  }, [localHazards]);

  const filteredHazards = useMemo(() => {
    return activeHazardsList.filter((h) => {
      if (!h) return false;

      // 1. Status Filter
      if (statusTab === 'active' && h.status !== 'active') return false;
      if (statusTab === 'resolved' && h.status !== 'resolved') return false;

      // 2. Type Filter
      const hType = (h.type || 'other').toLowerCase();
      if (selectedType !== 'all' && hType !== selectedType) return false;

      // 3. Severity Filter
      const hSev = (h.severity || 'medium').toLowerCase();
      if (selectedSeverity !== 'all' && hSev !== selectedSeverity) return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const road = (h.roadName || '').toLowerCase();
        const landmark = (h.landmark || '').toLowerCase();
        const desc = (h.description || '').toLowerCase();
        return road.includes(q) || landmark.includes(q) || desc.includes(q) || hType.includes(q);
      }

      return true;
    });
  }, [activeHazardsList, statusTab, selectedType, selectedSeverity, searchQuery]);

  if (!isOpen) return null;

  const activeCount = activeHazardsList.filter((h) => h.status === 'active').length;
  const resolvedCount = activeHazardsList.filter((h) => h.status === 'resolved').length;
  const criticalCount = activeHazardsList.filter(
    (h) => (h.severity === 'critical' || h.severity === 'high') && h.status === 'active'
  ).length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm pointer-events-auto transition-opacity"
    >
      {/* Modal Dialog Card (stops propagation so clicking inside doesn't close) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl h-[88vh] max-h-[820px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border transition-all ${
          isDark
            ? 'bg-[#181B22] border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header Section */}
        <div
          className={`p-4 sm:p-5 border-b flex-shrink-0 space-y-3 ${
            isDark ? 'border-slate-800 bg-[#181B22]/95' : 'border-slate-200 bg-white/95'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Indore Road Hazards Directory
                  </h2>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                    Live Feed
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Real-time crowdsourced & authority road safety data around IET DAVV (~10 km)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Close Hazards List"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div
              className={`p-2 sm:p-2.5 rounded-2xl border ${
                isDark ? 'bg-[#242831] border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400">Active Hazards</span>
              <p className="text-lg sm:text-xl font-black text-amber-500 mt-0.5">{activeCount}</p>
            </div>
            <div
              className={`p-2 sm:p-2.5 rounded-2xl border ${
                isDark ? 'bg-rose-950/40 border-rose-800/40' : 'bg-rose-50 border-rose-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-rose-500">Severe / Detours</span>
              <p className="text-lg sm:text-xl font-black text-rose-500 mt-0.5">{criticalCount}</p>
            </div>
            <div
              className={`p-2 sm:p-2.5 rounded-2xl border ${
                isDark ? 'bg-emerald-950/40 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-emerald-500">Resolved</span>
              <p className="text-lg sm:text-xl font-black text-emerald-500 mt-0.5">{resolvedCount}</p>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by road (e.g. Khandwa Road), landmark, or keyword..."
              className={`w-full rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none border transition ${
                isDark
                  ? 'bg-[#242831] border-slate-700/80 text-white placeholder-slate-400 focus:border-[#007AFF]'
                  : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#007AFF]'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs & Category Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Status Tabs */}
            <div
              className={`flex items-center space-x-1 p-1 rounded-xl border text-xs ${
                isDark ? 'bg-[#242831] border-slate-700/60' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => setStatusTab('active')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  statusTab === 'active'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusTab('all')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  statusTab === 'all'
                    ? 'bg-[#007AFF] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({activeHazardsList.length})
              </button>
              <button
                onClick={() => setStatusTab('resolved')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  statusTab === 'resolved'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Resolved ({resolvedCount})
              </button>
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto text-xs py-0.5">
              {['all', 'pothole', 'construction', 'roadblock', 'accident', 'other'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-bold transition whitespace-nowrap text-[11px] ${
                    selectedType === type
                      ? 'bg-[#007AFF] text-white shadow-sm'
                      : isDark
                      ? 'bg-[#242831] text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hazard Cards List (GPU hardware accelerated, kinetic scrolling) */}
        <div
          className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 min-h-0 transform-gpu overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            transform: 'translateZ(0)',
            willChange: 'scroll-position'
          }}
        >
          {isLoading && activeHazardsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
              <p className="text-xs font-semibold">Loading Indore hazards directory...</p>
            </div>
          ) : filteredHazards.length === 0 ? (
            <div className="text-center py-20 text-slate-500 space-y-2">
              <CheckCircle className="w-12 h-12 text-slate-600 mx-auto" />
              <p className={`font-bold text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                No hazards matching criteria
              </p>
              <p className="text-xs text-slate-400">Try modifying your search keywords or active filters.</p>
            </div>
          ) : (
            filteredHazards.map((hazard) => {
              const id = hazard._id || hazard.id;
              const [lon, lat] = hazard.location?.coordinates || [0, 0];
              const isResolved = hazard.status === 'resolved';
              const cleanType = (hazard.type || 'other').toLowerCase();
              const cleanSeverity = (hazard.severity || 'medium').toLowerCase();

              const formattedTime = hazard.createdAt
                ? new Date(hazard.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Recent';

              const thumbUrl = hazard.imageUrl
                ? hazard.imageUrl.replace(/\.png$/i, '_thumb.jpg')
                : null;

              return (
                <div
                  key={id}
                  className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row gap-3.5 group transform-gpu ${
                    isDark
                      ? 'bg-[#242831] border-slate-700/80 hover:border-slate-600'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                  style={{
                    contentVisibility: 'auto',
                    containIntrinsicSize: '130px'
                  }}
                >
                  {/* Photo Thumbnail */}
                  <div
                    onClick={() => onSelectHazard && onSelectHazard(hazard)}
                    className="relative w-full sm:w-36 h-28 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 cursor-pointer"
                  >
                    {hazard.imageUrl ? (
                      <img
                        src={thumbUrl || hazard.imageUrl}
                        alt={hazard.description || cleanType}
                        loading="lazy"
                        decoding="async"
                        width="144"
                        height="112"
                        className="w-full h-full object-cover transition-transform duration-200"
                        onError={(e) => {
                          if (thumbUrl && e.target.src.includes('_thumb.jpg')) {
                            e.target.src = hazard.imageUrl;
                          } else {
                            e.target.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                        <ImageIcon className="w-6 h-6 mb-1 text-slate-500" />
                        <span className="text-[10px]">No Photo</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/85 text-[10px] font-bold text-white capitalize flex items-center space-x-1 shadow-sm">
                      {TYPE_ICONS[cleanType] || TYPE_ICONS.other}
                      <span>{cleanType}</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 min-w-0 space-y-1.5 flex flex-col justify-between">
                    <div>
                      {/* Top Row: Road Name & Severity */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3
                            onClick={() => onSelectHazard && onSelectHazard(hazard)}
                            className={`font-black text-sm hover:text-[#007AFF] cursor-pointer transition flex items-center space-x-1.5 ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                            <span className="truncate">{hazard.roadName || 'Indore Road Corridor'}</span>
                          </h3>
                          {hazard.landmark && (
                            <p className="text-xs text-sky-400 font-semibold truncate pl-5">
                              🏛️ {hazard.landmark}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              cleanSeverity === 'critical' || cleanSeverity === 'high'
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}
                          >
                            {cleanSeverity}
                          </span>
                          {isResolved && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Resolved
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description snippet */}
                      <p className={`text-xs line-clamp-2 mt-1 leading-snug ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {hazard.description || 'Monitored road hazard affecting vehicle transit.'}
                      </p>
                    </div>

                    {/* Metadata & Actions row */}
                    <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formattedTime}</span>
                        </span>
                        {hazard.confirmations > 1 && (
                          <span className="text-emerald-400 font-semibold">
                            ✓ {hazard.confirmations} reports
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Focus Map button */}
                        <button
                          onClick={() => {
                            if (onFocusOnMap) onFocusOnMap([lat, lon]);
                            onClose();
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center space-x-1 border transition active:scale-95 ${
                            isDark
                              ? 'bg-slate-800 text-sky-400 border-slate-700 hover:bg-slate-700'
                              : 'bg-white text-blue-600 border-slate-300 hover:bg-slate-100'
                          }`}
                          title="View on Map"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Show on Map</span>
                        </button>

                        {/* View full details button */}
                        <button
                          onClick={() => onSelectHazard && onSelectHazard(hazard)}
                          className="px-3 py-1 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold shadow transition active:scale-95 flex items-center space-x-1"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
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
