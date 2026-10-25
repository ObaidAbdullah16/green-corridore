import React, { useState, useEffect, useRef } from 'react';
import {
  Car,
  Bike,
  Footprints,
  MapPin,
  ArrowUpDown,
  X,
  Loader2,
  Navigation,
  ListOrdered,
  Play,
  Pause,
  AlertTriangle,
  ShieldAlert,
  Search
} from 'lucide-react';
import { searchPlaces } from '../../services/api';

const QUICK_PRESETS = [
  { name: 'Bhanwarkua Sq', lat: 22.6935, lon: 75.8665 },
  { name: 'Crystal IT Park', lat: 22.6840, lon: 75.8742 },
  { name: 'Rajiv Gandhi Sq', lat: 22.6830, lon: 75.8575 },
  { name: 'Rajwada Palace', lat: 22.7180, lon: 75.8548 },
  { name: 'Vijay Nagar Sq', lat: 22.7533, lon: 75.8937 }
];

export function ModernNavDrawer({
  origin,
  destination,
  route,
  onSelectOrigin,
  onSelectDestination,
  onSwap,
  isLoadingRoute = false,
  isNavigating = false,
  onStartNavigation,
  onToggleDirections,
  showDirections = false,
  travelMode = 'car',
  onSelectTravelMode,
  progressPercent = 0,
  onSeekProgress,
  isSimulating = false,
  onToggleSimulation,
  theme = 'dark'
}) {
  const [originQuery, setOriginQuery] = useState(origin?.name || 'IET DAVV, Khandwa Road');
  const [destQuery, setDestQuery] = useState(destination?.name || '');
  const [activeInput, setActiveInput] = useState(null); // 'origin' | 'dest'
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const debounceTimerRef = useRef(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (origin?.name) setOriginQuery(origin.name);
  }, [origin]);

  useEffect(() => {
    if (destination?.name) setDestQuery(destination.name);
  }, [destination]);

  const handleQueryChange = (type, text) => {
    if (type === 'origin') setOriginQuery(text);
    else setDestQuery(text);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!text || text.trim().length === 0) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(text);
        setSuggestions(results);
      } catch (err) {
        console.warn('Autocomplete error:', err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  const handleSelectSuggestion = (place) => {
    if (activeInput === 'origin') {
      setOriginQuery(place.name);
      onSelectOrigin(place);
    } else {
      setDestQuery(place.name);
      onSelectDestination(place);
    }
    setActiveInput(null);
    setSuggestions([]);
  };

  const handleQuickPreset = (preset) => {
    setDestQuery(preset.name);
    onSelectDestination({
      id: `quick_${preset.name}`,
      name: preset.name,
      displayName: `${preset.name}, Indore`,
      lat: preset.lat,
      lon: preset.lon
    });
    setActiveInput(null);
  };

  // Adjust duration by selected travel mode (Car ~40km/h baseline, Bike ~25km/h, Walk ~5km/h)
  let modeDurationSecs = route?.duration || 0;
  if (route && route.duration) {
    if (travelMode === 'bike') modeDurationSecs = Math.round(route.duration * 1.35);
    else if (travelMode === 'walk') modeDurationSecs = Math.round(route.duration * 5.5);
  }

  const durationMins = Math.max(1, Math.round(modeDurationSecs / 60));
  const distanceKm = route ? (route.distance / 1000).toFixed(1) : '0';
  const hazardsCount = route?.hazards ? route.hazards.length : 0;

  // Compute ETA clock time
  const etaDate = new Date(Date.now() + modeDurationSecs * 1000);
  const etaFormatted = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="absolute top-20 sm:top-[82px] left-3 sm:left-4 z-20 w-[calc(100vw-24px)] sm:w-[380px] max-w-[420px] pointer-events-auto transition-all duration-300">
      <div
        className={`rounded-3xl p-4 sm:p-5 backdrop-blur-2xl transition-colors duration-300 shadow-2xl border ${
          isDark
            ? 'bg-[#181B22]/95 border-slate-800 text-white shadow-[0_25px_60px_rgba(0,0,0,0.7)]'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.12)]'
        }`}
      >
        {/* Subtle Drawer Handle Bar (Reference Design) */}
        <div
          className={`w-12 h-1 rounded-full mx-auto mb-4 ${
            isDark ? 'bg-slate-700/80' : 'bg-slate-300'
          }`}
        />

        {/* 1. Connected Inputs Section (Reference UI) */}
        <div className="relative space-y-2">
          {/* Origin Pill Input */}
          <div
            className={`flex items-center space-x-2.5 rounded-2xl px-3.5 py-2.5 border transition-all ${
              isDark
                ? 'bg-[#242831] border-slate-700/60 focus-within:border-[#007AFF]'
                : 'bg-slate-100 border-slate-200 focus-within:border-[#007AFF]'
            }`}
          >
            {/* Hollow Circle Dot Icon (Reference Design) */}
            <div className="w-4 h-4 rounded-full border-2 border-slate-400 flex items-center justify-center flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            </div>

            <input
              type="text"
              value={originQuery}
              onChange={(e) => handleQueryChange('origin', e.target.value)}
              onFocus={() => setActiveInput('origin')}
              placeholder="Starting Point..."
              className={`w-full bg-transparent text-xs font-semibold outline-none truncate ${
                isDark ? 'text-white placeholder-slate-400' : 'text-slate-900 placeholder-slate-400'
              }`}
            />

            {originQuery && (
              <button
                type="button"
                onClick={() => {
                  setOriginQuery('');
                  onSelectOrigin(null);
                }}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dotted Connector between Start & Destination (Reference Design) */}
          <div className="absolute left-[20px] top-[34px] flex flex-col items-center space-y-0.5 pointer-events-none z-10">
            <span className="w-1 h-1 rounded-full bg-slate-500 block" />
            <span className="w-1 h-1 rounded-full bg-slate-500 block" />
            <span className="w-1 h-1 rounded-full bg-slate-500 block" />
          </div>

          {/* Destination Pill Input */}
          <div
            className={`flex items-center space-x-2.5 rounded-2xl px-3.5 py-2.5 border transition-all ${
              isDark
                ? 'bg-[#242831] border-slate-700/60 focus-within:border-[#007AFF]'
                : 'bg-slate-100 border-slate-200 focus-within:border-[#007AFF]'
            }`}
          >
            {/* Location Pin Icon (Reference Design) */}
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />

            <input
              type="text"
              value={destQuery}
              onChange={(e) => handleQueryChange('dest', e.target.value)}
              onFocus={() => setActiveInput('dest')}
              placeholder="Where to? (e.g. Bhanwarkua Sq)"
              className={`w-full bg-transparent text-xs font-semibold outline-none truncate ${
                isDark ? 'text-white placeholder-slate-400' : 'text-slate-900 placeholder-slate-400'
              }`}
            />

            {isLoadingRoute ? (
              <Loader2 className="w-3.5 h-3.5 text-[#007AFF] animate-spin" />
            ) : destQuery ? (
              <button
                type="button"
                onClick={() => {
                  setDestQuery('');
                  onSelectDestination(null);
                }}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSwap}
                className="text-slate-400 hover:text-[#007AFF] p-0.5 transition"
                title="Swap Start & Destination"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Overlay */}
          {activeInput && suggestions.length > 0 && (
            <div
              className={`absolute top-full left-0 right-0 mt-1 rounded-2xl border shadow-2xl z-30 max-h-56 overflow-y-auto ${
                isDark ? 'bg-[#1C2029] border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectSuggestion(item)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center space-x-2.5 transition border-b ${
                    isDark
                      ? 'border-slate-800/80 hover:bg-[#282E3B] text-white'
                      : 'border-slate-100 hover:bg-slate-100 text-slate-900'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-[#007AFF] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.displayName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Indore Presets Pills */}
        {!destination && (
          <div className="pt-2 flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex-shrink-0">
              Quick:
            </span>
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => handleQuickPreset(p)}
                className={`px-2.5 py-1 rounded-xl whitespace-nowrap font-medium transition ${
                  isDark
                    ? 'bg-[#242831] text-slate-300 hover:text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* 2. Travel Mode Selector (Reference UI: Car, Bike, Walk) */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <button
            type="button"
            onClick={() => onSelectTravelMode('car')}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-2xl text-xs font-bold transition-all ${
              travelMode === 'car'
                ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/30'
                : isDark
                ? 'bg-[#242831] text-slate-300 hover:text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Car</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTravelMode('bike')}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-2xl text-xs font-bold transition-all ${
              travelMode === 'bike'
                ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/30'
                : isDark
                ? 'bg-[#242831] text-slate-300 hover:text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Bike</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTravelMode('walk')}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-2xl text-xs font-bold transition-all ${
              travelMode === 'walk'
                ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/30'
                : isDark
                ? 'bg-[#242831] text-slate-300 hover:text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Walk</span>
          </button>
        </div>

        {/* 3. Route Summary & Interactive Progress Bar (Reference UI) */}
        {route && route.success && (
          <div className="pt-2 space-y-3">
            {/* ETA & Status (Reference Design: "25 min (15 km)") */}
            <div>
              <div className="flex items-baseline space-x-2">
                <h3
                  className={`text-2xl font-black tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {durationMins} min
                </h3>
                <span className="text-sm font-bold text-slate-400">({distanceKm} km)</span>
              </div>

              <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center space-x-1">
                {hazardsCount > 0 ? (
                  <span className="text-amber-400 flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>A* optimized detour • {hazardsCount} hazard(s) bypassed</span>
                  </span>
                ) : (
                  <span>Fastest Route now due to clear traffic conditions</span>
                )}
              </p>
            </div>

            {/* Warning if any roadblock was impassable and bypassed */}
            {route.warning && (
              <div className="p-2 rounded-xl bg-amber-950/70 border border-amber-600/40 text-amber-200 text-xs flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                <span className="text-[11px]">{route.warning}</span>
              </div>
            )}

            {/* 4. Interactive Progress Bar with Floating Speech-Bubble (Reference Design) */}
            <div className="pt-1">
              <div className="relative w-full pb-1">
                {/* Floating Tooltip Bubble pinned above slider knob */}
                <div
                  className="absolute -top-7 transition-all duration-75 pointer-events-none"
                  style={{
                    left: `calc(${progressPercent}% - 18px)`
                  }}
                >
                  <div
                    className="relative bg-[#007AFF] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg shadow-blue-500/40"
                    style={{ fontFeatureSettings: "'cv02'", letterSpacing: '-0.02em' }}
                  >
                    {progressPercent}%
                    {/* Downward triangle pointer */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4px] border-t-[#007AFF]" />
                  </div>
                </div>

                {/* Range Input with Neon Purple Gradient Fill */}
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progressPercent}
                    onChange={(e) => onSeekProgress(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer outline-none transition-all"
                    style={{
                      background: isDark
                        ? `linear-gradient(to right, #8B5CF6 0%, #A855F7 ${progressPercent}%, #242831 ${progressPercent}%, #242831 100%)`
                        : `linear-gradient(to right, #8B5CF6 0%, #A855F7 ${progressPercent}%, #E2E8F0 ${progressPercent}%, #E2E8F0 100%)`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 5. Navigation Control Buttons */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={onStartNavigation}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#007AFF] to-[#0055D4] hover:from-[#006CE0] hover:to-[#0047B8] text-white font-black text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition flex items-center justify-center space-x-2"
              >
                <Navigation className="w-4 h-4 fill-white" />
                <span>Start Navigation</span>
              </button>

              {/* Simulation Drive button */}
              <button
                type="button"
                onClick={onToggleSimulation}
                className={`p-3 rounded-2xl border transition active:scale-95 flex items-center justify-center ${
                  isSimulating
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : isDark
                    ? 'bg-[#242831] border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                title={isSimulating ? 'Pause GPS Drive Simulation' : 'Start GPS Drive Simulation'}
              >
                {isSimulating ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>

              {/* Turn Directions toggle */}
              <button
                type="button"
                onClick={onToggleDirections}
                className={`p-3 rounded-2xl border transition active:scale-95 flex items-center justify-center ${
                  showDirections
                    ? 'bg-[#8B5CF6] border-purple-500 text-white'
                    : isDark
                    ? 'bg-[#242831] border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                title="Toggle Turn-by-Turn Directions"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
