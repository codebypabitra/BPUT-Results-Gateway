import React, { useEffect, useState } from 'react';
import { checkServerHealth } from '../services/bputApi';

export const Header: React.FC = () => {
  const [health, setHealth] = useState<{ status: string; latencyMs: number }>({
    status: 'checking',
    latencyMs: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const res = await checkServerHealth();
        if (isMounted) {
          setHealth({ status: res.status, latencyMs: res.latencyMs });
        }
      } catch {
        if (isMounted) {
          setHealth({ status: 'offline', latencyMs: 0 });
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 60000); // Check every minute
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const isOnline = health.status === 'online' || health.status === 'degraded' || health.status === 'checking';

  return (
    <header className="w-full bg-white border-b border-slate-200/90 shadow-xs no-print sticky top-0 z-40">
      <div className="w-full px-[5%] py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Left Section */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-1 shadow-xs shrink-0">
              <img
                src="/bput_logo.png"
                alt="BPUT Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-sm sm:text-base md:text-lg font-extrabold text-slate-900 tracking-tight truncate">
                  BPUT Results Portal
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  Official Gateway Sync
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
                Biju Patnaik University of Technology • Grade Statements &amp; Class Evaluator
              </p>
            </div>
          </div>

          {/* Status Badge Right */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium shadow-xs ${
                isOnline
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
              title={
                health.latencyMs > 0
                  ? `BPUT Live Server Latency: ${health.latencyMs}ms`
                  : 'Connecting to results.bput.ac.in'
              }
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  health.status === 'online'
                    ? 'bg-emerald-500 animate-pulse'
                    : health.status === 'degraded'
                    ? 'bg-amber-500'
                    : health.status === 'checking'
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span className="font-semibold text-slate-800">
                {health.status === 'online'
                  ? 'Live'
                  : health.status === 'degraded'
                  ? 'Degraded'
                  : health.status === 'checking'
                  ? 'Connecting'
                  : 'Offline'}
              </span>
              {health.latencyMs > 0 && (
                <span className="hidden md:inline font-mono text-[11px] text-slate-400">
                  {health.latencyMs}ms
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
