import React, { useState, useEffect } from 'react';
import { BPUT_SESSIONS } from '../types/bput';
import { Search, RotateCcw, Calendar, Hash, Sparkles, Loader2, X, History, BookOpen } from 'lucide-react';

interface SearchFormProps {
  session: string;
  setSession: (s: string) => void;
  rollNo: string;
  setRollNo: (r: string) => void;
  onSearch: (e?: React.FormEvent, customRoll?: string) => void;
  onReset: () => void;
  isLoading: boolean;
  disabled?: boolean;
  onOpenGradingModal?: () => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  session,
  setSession,
  rollNo,
  setRollNo,
  onSearch,
  onReset,
  isLoading,
  disabled = false,
  onOpenGradingModal,
}) => {
  const [recentRolls, setRecentRolls] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bput_recent_rolls');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentRolls(parsed.slice(0, 5));
        }
      }
    } catch {}
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = rollNo.trim().replace(/\D/g, '');
    if (clean.length === 10) {
      saveRecentRoll(clean);
    }
    onSearch();
  };

  const saveRecentRoll = (cleanRoll: string) => {
    try {
      const updated = [cleanRoll, ...recentRolls.filter((r) => r !== cleanRoll)].slice(0, 5);
      setRecentRolls(updated);
      localStorage.setItem('bput_recent_rolls', JSON.stringify(updated));
    } catch {}
  };

  const handleRecentClick = (r: string) => {
    setRollNo(r);
    saveRecentRoll(r);
    onSearch(undefined, r);
  };

  const handleClearHistory = () => {
    setRecentRolls([]);
    try {
      localStorage.removeItem('bput_recent_rolls');
    } catch {}
  };

  return (
    <section
      className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs hover:shadow-md transition-all no-print relative"
      data-purpose="result-search-box"
    >
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shadow-xs shrink-0">
            <Search className="w-4 h-4 stroke-[2.2]" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
              <span>Student Examination Search</span>
              <span className="hidden sm:inline-flex bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border border-emerald-200/70">
                Multi-Session Auto-Scan
              </span>
            </h2>
          </div>
        </div>

        {onOpenGradingModal && (
          <button
            type="button"
            onClick={onOpenGradingModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            title="Open BPUT CBCS Grading Scheme Reference"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Grading Rules</span>
          </button>
        )}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Session Field */}
          <div className="md:col-span-6 lg:col-span-5">
            <label
              className="block text-[11px] font-bold uppercase text-slate-700 tracking-wider mb-1.5 flex items-center gap-1.5 select-none"
              htmlFor="session-select"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Academic Session <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <select
                id="session-select"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                disabled={disabled || isLoading}
                className="w-full h-12 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-3.5 text-xs sm:text-sm font-semibold text-slate-900 shadow-xs transition-all outline-none cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="default_option">-- Select Academic Session --</option>
                {BPUT_SESSIONS.map((sess) => (
                  <option key={sess} value={sess}>
                    {sess}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Registration Number Field */}
          <div className="md:col-span-6 lg:col-span-4">
            <label
              className="block text-[11px] font-bold uppercase text-slate-700 tracking-wider mb-1.5 flex items-center gap-1.5 select-none"
              htmlFor="reg-number"
            >
              <Hash className="w-3.5 h-3.5 text-emerald-600" />
              Registration No. <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                id="reg-number"
                placeholder="e.g. 2001289001"
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
                disabled={disabled || isLoading}
                className="w-full h-12 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-3.5 pr-9 text-xs sm:text-sm font-mono font-bold tracking-wider text-slate-900 shadow-xs transition-all outline-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 disabled:bg-slate-100"
              />
              {rollNo && (
                <button
                  type="button"
                  onClick={() => setRollNo('')}
                  aria-label="Clear registration number"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-12 lg:col-span-3 flex items-center gap-2.5">
            <button
              type="submit"
              disabled={isLoading || rollNo.trim().length === 0}
              className="flex-1 h-12 min-h-[48px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow-md active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin stroke-[2.5]" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 stroke-[2.2]" />
                  <span>Check Result</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onReset}
              disabled={isLoading}
              title="Reset search and filters"
              aria-label="Reset search"
              className="h-12 w-12 min-h-[48px] bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-xl shadow-xs transition-all flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Recent Searches Row */}
        {recentRolls.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
              <History className="w-3 h-3 text-slate-400" />
              Recent:
            </span>
            {recentRolls.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRecentClick(r)}
                className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  rollNo === r
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title={`Click to search registration ${r}`}
              >
                {r}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 underline cursor-pointer ml-1"
              title="Clear recent searches"
            >
              Clear
            </button>
          </div>
        )}
      </form>
    </section>
  );
};
