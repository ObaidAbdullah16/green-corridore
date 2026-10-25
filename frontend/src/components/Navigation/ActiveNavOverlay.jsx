import React from 'react';
import {
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  CornerUpRight,
  CornerUpLeft,
  Undo2,
  Flag,
  Compass,
  X,
  ShieldAlert,
  Play,
  FastForward,
  Pause,
  RotateCcw
} from 'lucide-react';

export function ActiveNavOverlay({
  currentStep,
  route,
  speed = 0,
  isSimulating = false,
  isRerouting = false,
  onStartSimulation,
  onStopSimulation,
  onQuickReport,
  onExitNavigation,
  theme = 'dark'
}) {
  const isDark = theme === 'dark';
  const getTurnIcon = (type) => {
    switch (type) {
      case 'turn_right':
      case 'sharp_right':
        return <CornerUpRight className="w-8 h-8 text-white" />;
      case 'slight_right':
        return <ArrowRight className="w-8 h-8 text-white" />;
      case 'turn_left':
      case 'sharp_left':
        return <CornerUpLeft className="w-8 h-8 text-white" />;
      case 'slight_left':
        return <ArrowLeft className="w-8 h-8 text-white" />;
      case 'uturn':
        return <Undo2 className="w-8 h-8 text-white" />;
      case 'arrive':
        return <Flag className="w-8 h-8 text-emerald-300" />;
      default:
        return <ArrowUp className="w-8 h-8 text-white" />;
    }
  };

  const distanceKm = route ? (route.distance / 1000).toFixed(1) : '0';
  const durationMins = route ? Math.max(1, Math.round(route.duration / 60)) : 0;
  const etaDate = new Date(Date.now() + (route?.duration || 0) * 1000);
  const etaFormatted = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-4">
      {/* Top Maneuver Banner (Google Maps style) */}
      <div className="w-full max-w-md mx-auto pointer-events-auto">
        <div
          className={`backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border flex items-center space-x-4 animate-in slide-in-from-top-4 duration-300 transition-colors ${
            isRerouting
              ? 'bg-amber-600/95 border-amber-400 shadow-amber-600/30'
              : 'bg-emerald-700/95 border-emerald-500/40'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors ${
              isRerouting
                ? 'bg-amber-700/80 border-amber-500'
                : 'bg-emerald-800/80 border-emerald-600'
            }`}
          >
            {getTurnIcon(currentStep?.type)}
          </div>
          <div className="flex-1 min-w-0">
            <span
              className={`text-xs uppercase tracking-wider font-bold block ${
                isRerouting ? 'text-amber-200 animate-pulse' : 'text-emerald-200'
              }`}
            >
              {isRerouting
                ? '⚠️ Rerouting (Detour Applied)'
                : currentStep?.distance
                ? `In ${currentStep.distance} m`
                : 'Next Maneuver'}
            </span>
            <h2 className="text-lg font-extrabold leading-tight truncate">
              {isRerouting ? 'Following updated safe path' : currentStep?.text || 'Proceed along the highlighted route'}
            </h2>
          </div>
        </div>
      </div>

      {/* Quick Hazard Report Button (Floating Right) */}
      <div className="flex justify-end pr-2 pointer-events-auto">
        <button
          onClick={onQuickReport}
          className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold text-xs shadow-2xl border border-rose-500/50 active:scale-95 transition"
        >
          <ShieldAlert className="w-5 h-5 text-amber-200 animate-bounce" />
          <span>Quick Report Hazard</span>
        </button>
      </div>

      {/* Bottom Navigation Dashboard */}
      <div className="w-full max-w-md mx-auto pointer-events-auto">
        <div
          className={`backdrop-blur-xl rounded-3xl p-4 shadow-2xl space-y-3 border ${
            isDark
              ? 'bg-[#181B22]/95 border-slate-800 text-white'
              : 'bg-white/95 border-slate-200 text-slate-900'
          }`}
        >
          {/* Metrics Row */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline space-x-1.5">
                <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {durationMins}
                </span>
                <span className="text-xs font-bold text-[#007AFF]">min</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {distanceKm} km • ETA {etaFormatted}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Speed display */}
              <div
                className={`text-center px-3 py-1.5 rounded-2xl border transition ${
                  isRerouting
                    ? 'bg-amber-950/80 border-amber-500 animate-pulse'
                    : isDark
                    ? 'bg-[#242831] border-slate-700'
                    : 'bg-slate-100 border-slate-200'
                }`}
              >
                <span
                  className={`text-lg font-black ${
                    isRerouting ? 'text-amber-400' : isDark ? 'text-[#007AFF]' : 'text-blue-600'
                  }`}
                >
                  {speed}
                </span>
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                  {isRerouting ? 'PAUSED' : 'km/h'}
                </span>
              </div>

              {/* Exit button */}
              <button
                onClick={onExitNavigation}
                className="w-10 h-10 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/20 active:scale-90 transition"
                title="Exit Navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* GPS Simulation Toolbar */}
          <div
            className={`pt-2 border-t flex items-center justify-between text-xs ${
              isDark ? 'border-slate-800/80' : 'border-slate-200'
            }`}
          >
            <span className="text-[11px] text-slate-400 font-medium">
              GPS Drive Simulator:
            </span>
            <div className="flex items-center space-x-1.5">
              {!isSimulating ? (
                <button
                  onClick={onStartSimulation}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white font-bold text-xs shadow active:scale-95 transition"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Start Drive</span>
                </button>
              ) : (
                <button
                  onClick={onStopSimulation}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow active:scale-95 transition"
                >
                  <Pause className="w-3 h-3 fill-white" />
                  <span>Pause</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
