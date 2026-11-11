import React from 'react';
import { AlertTriangle, ShieldCheck, GraduationCap, ExternalLink, Sparkles } from 'lucide-react';

export const OfficialDisclaimer: React.FC = () => {
  return (
    <footer className="mt-14 space-y-6 no-print font-sans" data-purpose="disclaimer-statement">
      {/* Header block */}
      <div className="text-center max-w-2xl mx-auto flex flex-col items-center">
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-emerald-200/70 mb-3 shadow-xs select-none">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          Transparency &amp; Academic Notice
        </span>
        <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 select-none">
          Disclaimer Statement
        </h2>
        <p className="text-slate-500 mt-1.5 text-xs sm:text-sm font-medium leading-relaxed">
          Information regarding BPUT provisional results, grade cards, and institutional evaluation
        </p>
      </div>

      <div className="space-y-5 max-w-5xl mx-auto">
        {/* Core Disclaimer */}
        <div className="bg-amber-50/70 border border-amber-200/80 p-6 sm:p-7 rounded-3xl shadow-xs">
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
            <div className="p-3 bg-amber-100 text-amber-800 border border-amber-200 rounded-2xl shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6 shrink-0" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                Notice of Independence
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                This portal is an independent academic utility designed for BPUT (Biju Patnaik University of Technology, Odisha) engineering candidates and is <strong>not affiliated with, endorsed by, or officially connected</strong> to Biju Patnaik University of Technology (BPUT) or any of its constituent or affiliated colleges. All examination data is retrieved via public educational gateway endpoints for personal reference.
              </p>
            </div>
          </div>
        </div>

        {/* Detail Cards with icon on the left side */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
          <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs hover:shadow-md transition-all">
            <div className="flex flex-row items-center gap-3 mb-2.5 w-full">
              <span className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-slate-900 min-w-0 flex-1 leading-snug">
                Provisional Data Synchronization
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Statements of marks and grade points displayed here are strictly provisional. The university retains sole statutory authority to alter, rectify clerical omissions, or adjust grades. For official transcript authentication, students must contact their respective institution examination cells.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs hover:shadow-md transition-all">
            <div className="flex flex-row items-center gap-3 mb-2.5 w-full">
              <span className="p-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl shrink-0">
                <GraduationCap className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-slate-900 min-w-0 flex-1 leading-snug">
                Academic Evaluation Utility Only
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              This system does not modify database records or grant degrees. Only the physically embossed, controller-signed mark sheets delivered by affiliated institutes carry full statutory legal and educational validity.
            </p>
          </div>
        </div>

        {/* Official links pill container */}
        <div className="text-center bg-slate-50 border border-slate-200/80 p-4 rounded-2xl text-xs text-slate-600 font-medium shadow-xs select-none flex flex-wrap items-center justify-center gap-3">
          <span className="font-bold text-slate-700">Official University Gateways:</span>
          <a
            href="https://results.bput.ac.in"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
          >
            <span>results.bput.ac.in</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>•</span>
          <a
            href="https://bput.ac.in"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
          >
            <span>bput.ac.in</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </footer>
  );
};
