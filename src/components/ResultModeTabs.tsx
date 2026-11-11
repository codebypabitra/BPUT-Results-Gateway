import React from 'react';
import { User, Users, CheckCircle2 } from 'lucide-react';

interface ResultModeTabsProps {
  activeMode: 'single' | 'bulk';
  onModeChange: (mode: 'single' | 'bulk') => void;
}

export const ResultModeTabs: React.FC<ResultModeTabsProps> = ({
  activeMode,
  onModeChange,
}) => {
  return (
    <div
      className="w-full pb-2 no-print"
      data-purpose="result-mode-tabs"
      role="tablist"
      aria-label="Result Evaluation Mode"
    >
      {/* JugaadBro Modern Segmented 2-Column Single Row Controller */}
      <div className="p-1.5 bg-slate-100/80 backdrop-blur-xs rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-1.5 shadow-xs">
        {/* Tab 1: Individual Result */}
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'single'}
          aria-controls="single-mode-panel"
          onClick={() => onModeChange('single')}
          className={`relative py-3 px-3 sm:px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px] select-none ${
            activeMode === 'single'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70 font-bold -translate-y-px'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
          }`}
        >
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              activeMode === 'single'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200/70 text-slate-600'
            }`}
          >
            <User className="w-4 h-4 stroke-[2.2]" />
          </span>

          <span className="font-heading font-bold text-xs sm:text-sm tracking-tight whitespace-nowrap">
            Individual Result
          </span>

          {activeMode === 'single' && (
            <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 ml-0.5"></span>
          )}
        </button>

        {/* Tab 2: Bulk Result */}
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'bulk'}
          aria-controls="bulk-mode-panel"
          onClick={() => onModeChange('bulk')}
          className={`relative py-3 px-3 sm:px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px] select-none ${
            activeMode === 'bulk'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70 font-bold -translate-y-px'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
          }`}
        >
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              activeMode === 'bulk'
                ? 'bg-teal-100 text-teal-800'
                : 'bg-slate-200/70 text-slate-600'
            }`}
          >
            <Users className="w-4 h-4 stroke-[2.2]" />
          </span>

          <span className="font-heading font-bold text-xs sm:text-sm tracking-tight whitespace-nowrap">
            Bulk Result
          </span>

          {activeMode === 'bulk' && (
            <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 ml-0.5"></span>
          )}
        </button>
      </div>
    </div>
  );
};
