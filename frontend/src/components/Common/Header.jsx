import React from 'react';
import { Compass, ShieldAlert, ListFilter, Moon, Sun } from 'lucide-react';

export function Header({
  activeHazardsCount = 0,
  isSocketConnected = false,
  isNavigating = false,
  userRole = 'citizen',
  theme = 'dark',
  onToggleTheme,
  onSwitchRole,
  onOpenAuthorityPanel,
  onOpenHazardsList,
  onOpenReportModal
}) {
  const isAuthority = userRole === 'authority';
  const isDark = theme === 'dark';

  return (
    <header
      className={`absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 rounded-2xl border pointer-events-auto transition-all duration-300 ${
        isDark
          ? 'bg-[#1E2028]/85 border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.45)] text-white'
          : 'bg-white/90 border-slate-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.08)] text-slate-900'
      }`}
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
    >
      {/* Brand logo & coverage area */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#0084FF] to-blue-600 flex items-center justify-center shadow-md shadow-[#0084FF]/30 flex-shrink-0">
          <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          {/* Active Accent Dot */}
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#1E2028]" />
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-1.5">
              <span className={isDark ? 'text-white' : 'text-slate-900'}>GreenCorridor</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#0084FF] inline-block shadow-[0_0_8px_rgba(0,132,255,0.8)]" />
            </h1>
            <span
              className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full border hidden sm:inline-flex items-center ${
                isDark
                  ? 'bg-white/[0.04] text-[#94A3B8] border-white/[0.08]'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              Indore (IET DAVV)
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#94A3B8] font-normal hidden md:block leading-tight">
            Intelligent Hazard-Aware Navigation with Custom A*
          </p>
        </div>
      </div>

      {/* Action Controls & Segments */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className={`p-2 rounded-full border transition-all duration-200 active:scale-95 flex items-center justify-center ${
            isDark
              ? 'bg-[#111318] border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/20 hover:bg-white/[0.04]'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
          )}
        </button>

        {/* Pill-shaped Segmented Role Capsule (Citizen / Authority) */}
        <div
          className={`p-1 rounded-full flex items-center border transition-all duration-200 ${
            isDark
              ? 'bg-[#111318] border-white/[0.08]'
              : 'bg-slate-100 border-slate-200'
          }`}
        >
          {/* Citizen Tab */}
          <button
            onClick={() => {
              if (isAuthority) onSwitchRole('citizen');
            }}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center space-x-1 transition-all duration-200 ${
              !isAuthority
                ? 'bg-[#0084FF] text-white shadow-[0_0_14px_rgba(0,132,255,0.4)]'
                : isDark
                ? 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Switch to Citizen Mode"
          >
            <span>Citizen</span>
          </button>

          {/* Authority Tab */}
          <button
            onClick={() => {
              if (!isAuthority) {
                onSwitchRole('authority');
              } else {
                onOpenAuthorityPanel();
              }
            }}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 ${
              isAuthority
                ? 'bg-[#0084FF] text-white shadow-[0_0_14px_rgba(0,132,255,0.4)]'
                : isDark
                ? 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title={isAuthority ? 'Open Authority Console' : 'Switch to Authority Mode'}
          >
            <span>Authority</span>
            {isAuthority && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            )}
          </button>
        </div>

        {/* View Hazards Directory Button */}
        <button
          onClick={onOpenHazardsList}
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 active:scale-95 ${
            isDark
              ? 'bg-[#111318] border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/20 hover:bg-white/[0.04]'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="View full directory of road hazards in Indore"
        >
          <ListFilter className="w-3.5 h-3.5 text-[#0084FF]" />
          <span className="hidden sm:inline">Hazards</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isDark
                ? 'bg-[#0084FF]/20 text-[#0084FF] border border-[#0084FF]/30'
                : 'bg-blue-100 text-[#0084FF]'
            }`}
          >
            {activeHazardsCount}
          </span>
        </button>

        {/* Real-time Socket status badge */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
            isDark
              ? 'bg-[#111318] border-white/[0.08]'
              : 'bg-slate-100 border-slate-200'
          }`}
          title={isSocketConnected ? 'Real-time WebSocket connected' : 'Connecting to real-time server...'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isSocketConnected
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse'
                : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
            }`}
          />
          <span
            className={`hidden md:inline font-semibold ${
              isSocketConnected
                ? isDark
                  ? 'text-emerald-400'
                  : 'text-emerald-600'
                : 'text-rose-400'
            }`}
          >
            {isSocketConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Primary Action Button: Report Hazard */}
        {!isNavigating && (
          <button
            onClick={onOpenReportModal}
            className="flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold tracking-wide shadow-[0_2px_12px_rgba(245,158,11,0.25)] hover:shadow-[0_0_18px_rgba(245,158,11,0.45)] active:scale-95 transition-all duration-200"
            title="Report a new road hazard"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        )}
      </div>
    </header>
  );
}
