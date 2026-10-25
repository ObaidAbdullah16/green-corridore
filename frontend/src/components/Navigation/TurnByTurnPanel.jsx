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
  X
} from 'lucide-react';

export function TurnByTurnPanel({ instructions = [], onClose }) {
  if (!instructions || instructions.length === 0) return null;

  const getManeuverIcon = (type) => {
    switch (type) {
      case 'depart':
        return <Compass className="w-4 h-4 text-sky-400" />;
      case 'arrive':
        return <Flag className="w-4 h-4 text-emerald-400" />;
      case 'turn_right':
      case 'sharp_right':
        return <CornerUpRight className="w-4 h-4 text-amber-400" />;
      case 'slight_right':
        return <ArrowRight className="w-4 h-4 text-amber-400" />;
      case 'turn_left':
      case 'sharp_left':
        return <CornerUpLeft className="w-4 h-4 text-amber-400" />;
      case 'slight_left':
        return <ArrowLeft className="w-4 h-4 text-amber-400" />;
      case 'uturn':
        return <Undo2 className="w-4 h-4 text-rose-400" />;
      default:
        return <ArrowUp className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  return (
    <div className="absolute top-20 sm:top-[82px] right-3 sm:right-4 w-[92%] sm:w-80 max-h-[75vh] z-20 pointer-events-auto flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-850">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Route Directions</h3>
          <p className="text-[11px] text-slate-400">{instructions.length} steps</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
        {instructions.map((step, idx) => (
          <div key={idx} className="py-2.5 px-2 flex items-start space-x-3 hover:bg-slate-800/40 rounded-xl transition">
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center flex-shrink-0 mt-0.5">
              {getManeuverIcon(step.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-100 leading-snug">{step.text}</p>
              {step.distance > 0 && (
                <p className="text-[11px] text-slate-400 mt-0.5">{formatDistance(step.distance)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
