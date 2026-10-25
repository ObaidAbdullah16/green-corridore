import { Navigation, Clock, ShieldAlert, ListOrdered, AlertTriangle } from 'lucide-react';

export function RouteCard({
  route,
  onStartNavigation,
  onToggleDirections,
  showDirections
}) {
  if (!route || !route.success) return null;

  const distanceKm = (route.distance / 1000).toFixed(1);
  const durationMins = Math.max(1, Math.round(route.duration / 60));

  // Compute ETA time
  const etaDate = new Date(Date.now() + route.duration * 1000);
  const etaFormatted = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const hazardsCount = route.hazards ? route.hazards.length : 0;

  return (
    <div className="absolute bottom-6 left-4 right-4 sm:left-6 sm:w-96 z-20 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
        {/* Warning if route passes through unavoidable roadblock */}
        {route.warning && (
          <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">{route.warning}</p>
          </div>
        )}

        {/* Route Metrics */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-white tracking-tight">{durationMins}</span>
              <span className="text-sm font-semibold text-emerald-400">min</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1.5">
              <span>{distanceKm} km</span>
              <span>•</span>
              <span>ETA {etaFormatted}</span>
            </p>
          </div>

          <div className="flex flex-col items-end">
            {hazardsCount > 0 ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 text-[11px] font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>{hazardsCount} hazard{hazardsCount > 1 ? 's' : ''} on route</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[11px] font-semibold">
                <span>Safe path (0 hazards)</span>
              </span>
            )}
            <span className="text-[10px] text-slate-400 mt-1">A* optimized</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={onStartNavigation}
            className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition"
          >
            <Navigation className="w-4 h-4 fill-white" />
            <span>Start Navigation</span>
          </button>

          <button
            onClick={onToggleDirections}
            className={`px-3 py-3 rounded-xl border flex items-center justify-center transition active:scale-95 ${
              showDirections
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-slate-800/90 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Toggle Turn-by-Turn Directions"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
