import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, ArrowUpDown, X, Loader2, Sparkles } from 'lucide-react';
import { searchPlaces } from '../../services/api';

const QUICK_DESTINATIONS = [
  { name: 'Bhanwarkua Sq', lat: 22.6935, lon: 75.8665 },
  { name: 'Crystal IT Park', lat: 22.6840, lon: 75.8742 },
  { name: 'Rajiv Gandhi Sq', lat: 22.6830, lon: 75.8575 },
  { name: 'Navlakha Sq', lat: 22.6987, lon: 75.8780 },
  { name: 'Rajwada Palace', lat: 22.7180, lon: 75.8548 },
  { name: 'Vijay Nagar Sq', lat: 22.7533, lon: 75.8937 }
];

export function SearchBar({
  origin,
  destination,
  onSelectOrigin,
  onSelectDestination,
  onUseCurrentLocation,
  onSwap,
  isLoadingRoute = false
}) {
  const [originQuery, setOriginQuery] = useState(origin?.name || 'IET DAVV, Khandwa Road');
  const [destQuery, setDestQuery] = useState(destination?.name || '');
  const [activeInput, setActiveInput] = useState(null); // 'origin' or 'dest'
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const debounceTimerRef = useRef(null);

  // Sync state if props change externally
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

  const handleQuickDestination = (preset) => {
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

  return (
    <div className="absolute top-16 left-4 right-4 sm:left-6 sm:w-96 z-20 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 shadow-2xl">
        <div className="relative space-y-2">
          {/* Origin Input */}
          <div className="flex items-center space-x-2 bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700/60 focus-within:border-sky-500 transition">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <input
              type="text"
              value={originQuery}
              placeholder="Choose starting point..."
              onFocus={() => setActiveInput('origin')}
              onChange={(e) => handleQueryChange('origin', e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-400 flex-1 outline-none truncate"
            />
            {originQuery && (
              <button
                onClick={() => {
                  setOriginQuery('');
                  onSelectOrigin(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onUseCurrentLocation}
              title="Use current GPS location"
              className="p-1 rounded-md text-sky-400 hover:bg-slate-700 transition"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Swap Button */}
          <button
            onClick={onSwap}
            title="Swap locations"
            className="absolute right-3 top-[34px] z-10 w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center justify-center text-slate-300 shadow transition active:scale-90"
          >
            <ArrowUpDown className="w-3 h-3" />
          </button>

          {/* Destination Input */}
          <div className="flex items-center space-x-2 bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700/60 focus-within:border-sky-500 transition">
            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <input
              type="text"
              value={destQuery}
              placeholder="Search destination in Indore..."
              onFocus={() => setActiveInput('dest')}
              onChange={(e) => handleQueryChange('dest', e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-400 flex-1 outline-none truncate"
            />
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            ) : destQuery ? (
              <button
                onClick={() => {
                  setDestQuery('');
                  onSelectDestination(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="w-3.5 h-3.5 text-slate-500" />
            )}
          </div>
        </div>

        {/* Quick Presets Chips */}
        {!activeInput && !destination && (
          <div className="mt-2.5 pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-1 text-[11px] text-slate-400 mb-1.5 font-medium">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Popular destinations near IET DAVV:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DESTINATIONS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleQuickDestination(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 border border-slate-700/50 hover:border-sky-500/50 transition active:scale-95"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Autocomplete Suggestions Dropdown */}
        {activeInput && suggestions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800 max-h-56 overflow-y-auto divide-y divide-slate-800/60">
            {suggestions.map((item) => (
              <div
                key={item.id}
                onMouseDown={() => handleSelectSuggestion(item)}
                className="py-2 px-1.5 flex items-start space-x-2.5 hover:bg-slate-800/80 rounded-lg cursor-pointer transition"
              >
                <MapPin className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{item.displayName}</p>
                </div>
                {item.category && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex-shrink-0">
                    {item.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
