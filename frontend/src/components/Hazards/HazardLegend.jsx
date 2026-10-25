import React from 'react';
import { X, ShieldAlert, AlertTriangle, Construction, AlertOctagon, Car } from 'lucide-react';

export function HazardLegend({ isOpen, onClose }) {
  if (!isOpen) return null;

  const items = [
    {
      type: 'pothole',
      color: 'bg-amber-500',
      textColor: 'text-amber-400',
      label: 'Pothole',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      desc: 'Adds a small time penalty (15s–4m delay). Detour only taken if a quick alternate road exists.'
    },
    {
      type: 'construction',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-400',
      label: 'Road Construction',
      icon: <Construction className="w-4 h-4 text-yellow-400" />,
      desc: 'Adds significant travel time penalty. High-severity construction triggers proactive detours.'
    },
    {
      type: 'roadblock',
      color: 'bg-rose-500',
      textColor: 'text-rose-400',
      label: 'Roadblock / Closure',
      icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
      desc: 'Marked impassable. Custom A* strictly reroutes traffic around the blocked street.'
    },
    {
      type: 'accident',
      color: 'bg-purple-500',
      textColor: 'text-purple-400',
      label: 'Accident',
      icon: <Car className="w-4 h-4 text-purple-400" />,
      desc: 'Traffic congestion delay (1m–10m penalty). Higher severity redirects around the intersection.'
    },
    {
      type: 'other',
      color: 'bg-slate-400',
      textColor: 'text-slate-300',
      label: 'Other Hazard',
      icon: <ShieldAlert className="w-4 h-4 text-slate-300" />,
      desc: 'Waterlogging, debris, or temporary obstacles with moderate cost penalties.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-base">Hazard Routing Logic</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The navigation system uses a custom A* algorithm that balances travel distance with road safety:
          <span className="block font-mono text-[11px] text-sky-300 mt-1 bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
            edgeCost = travelTime + hazardPenalty
          </span>
        </p>

        <div className="space-y-3 pt-1">
          {items.map((item) => (
            <div key={item.type} className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-xs font-bold ${item.textColor}`}>{item.label}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
