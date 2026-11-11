import React from 'react';
import {
  Layers,
  Download,
  AlertCircle,
  Share2,
  Zap,
  Users,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface AcademicFeaturesGridProps {
  onOpenGradingModal?: () => void;
  onOpenShare?: () => void;
  onFocusSearch?: () => void;
}

export const AcademicFeaturesGrid: React.FC<AcademicFeaturesGridProps> = ({
  onOpenGradingModal,
  onOpenShare,
  onFocusSearch,
}) => {
  const FEATURES = [
    {
      title: 'Multi-Session Auto Scan',
      icon: Layers,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200/70',
      desc: 'No need to repeatedly pick semester dropdowns. The portal automatically scans all published Odd/Even sessions for your registration number in one query.',
    },
    {
      title: 'Vector PDF Marksheet',
      icon: Download,
      color: 'text-teal-700 bg-teal-50 border-teal-200/70',
      desc: 'Export clean, professional provisional marks cards with complete subject names, credit breakdowns, SGPA, and print-ready vector typography.',
    },
    {
      title: 'Red Backlog & Asterisk Alert',
      icon: AlertCircle,
      color: 'text-rose-700 bg-rose-50 border-rose-200/70',
      desc: 'Failed/backlog subjects with grade F are immediately highlighted in bold red font, and officially rechecked subjects carry clear asterisk (*) notations.',
    },
    {
      title: '1-Click Result URL Sharing',
      icon: Share2,
      color: 'text-blue-700 bg-blue-50 border-blue-200/70',
      desc: 'Send unique direct links to college WhatsApp study groups. Friends can open the link to instantly view provisional grades without typing roll numbers.',
      action: onOpenShare ? { label: 'Share Link', fn: onOpenShare } : undefined,
    },
    {
      title: 'Real-Time Gateway Proxy',
      icon: Zap,
      color: 'text-amber-700 bg-amber-50 border-amber-200/70',
      desc: 'Direct multi-threaded connection to results.bput.ac.in proxy engines with built-in retry mechanisms and seamless failover to minimize downtime.',
    },
    {
      title: 'Bulk Class & Range Analysis',
      icon: Users,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200/70',
      desc: 'Evaluate sequential roll numbers (e.g. 001 to 060) or comma lists with automated pass/fail distribution, branch SGPA ranking, and CSV export.',
    },
  ];

  return (
    <section className="space-y-8 no-print my-10" aria-label="Portal Capabilities">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto flex flex-col items-center">
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-emerald-200/70 mb-3 shadow-xs select-none">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Academic Tools &amp; Features
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 select-none">
          Everything You Need For BPUT Results
        </h2>
        <p className="text-slate-600 mt-2 text-xs sm:text-sm font-medium leading-relaxed">
          Engineered for BPUT engineering students across Bhubaneswar, Rourkela, and Odisha to check semester marks fast, reliably, and without downtime.
        </p>
      </div>

      {/* Grid of 6 Modern Cards (JugaadBro Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {FEATURES.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="relative bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${feat.color}`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    0{idx + 1}
                  </span>
                </div>

                <h3 className="font-bold text-base sm:text-lg text-slate-900 mb-2 leading-snug">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {feat.desc}
                </p>
              </div>

              {feat.action && (
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={feat.action.fn}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                  >
                    <span>{feat.action.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* JugaadBro Signature Hero Call-to-Action Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 p-7 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="space-y-1.5 text-center md:text-left relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 bg-white/15 px-3 py-1 rounded-full inline-block mb-1">
            Zero Server Stress • Instant Marksheet
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to check your grades?
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-xl font-medium">
            Join thousands of BPUT students who rely on this portal for instantaneous grade access and vector PDF marksheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 relative z-10 shrink-0">
          {onFocusSearch && (
            <button
              type="button"
              onClick={onFocusSearch}
              className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Check Your Result</span>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </button>
          )}
          {onOpenGradingModal && (
            <button
              type="button"
              onClick={onOpenGradingModal}
              className="px-5 py-3.5 bg-white/15 hover:bg-white/25 text-white font-semibold text-sm rounded-full border border-white/25 transition-all cursor-pointer"
            >
              <span>Explore CBCS Scale</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
