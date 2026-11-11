import React from 'react';
import {
  Share2,
  Bell,
  AlertCircle,
  Layers,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

interface MarqueeBannerProps {
  onShareClick?: () => void;
  onOpenGradingModal?: () => void;
}

export const MarqueeBanner: React.FC<MarqueeBannerProps> = ({
  onShareClick,
  onOpenGradingModal
}) => {
  const marqueeItems = [
    {
      id: 'gateway',
      category: 'LIVE GATEWAY',
      categoryColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: <Bell className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
      text: 'Multi-Session Real-Time Provisional Grade Retrieval Active.',
      highlight: true,
      actionText: undefined,
    },
    {
      id: 'share',
      category: '1-CLICK SHARE',
      categoryColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Share2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
      text: 'Share unique URL for any individual student or entire class range.',
      highlight: false,
      actionText: 'Copy Link',
      onClick: onShareClick,
    },
    {
      id: 'scan',
      category: 'AUTO-SCAN',
      categoryColor: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
      text: 'Automatically evaluates all published academic sessions in one query.',
      highlight: false,
      actionText: undefined,
    },
    {
      id: 'recheck',
      category: 'RECHECK (*)',
      categoryColor: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
      text: 'Red asterisk (*) denotes grades updated after official recheck publications.',
      highlight: true,
      actionText: undefined,
    },
    {
      id: 'cbcs',
      category: 'CBCS SCALE',
      categoryColor: 'bg-teal-50 text-teal-800 border-teal-200',
      icon: <BookOpen className="w-3.5 h-3.5 text-teal-600 shrink-0" />,
      text: 'Absolute 10-point scale: O(10), E(9), A(8), B(7), C(6), D(5), F(0 Backlog).',
      highlight: false,
      actionText: 'View Scale',
      onClick: onOpenGradingModal,
    },
    {
      id: 'gateway-fast',
      category: 'FAST PROXY',
      categoryColor: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
      text: 'Direct high-speed connection with automated retry & failover cache.',
      highlight: false,
      actionText: undefined,
    },
  ];

  const renderTickerContent = (keyPrefix: string) => (
    <div key={keyPrefix} className="flex items-center space-x-6 pr-6 shrink-0">
      {marqueeItems.map((item, idx) => (
        <div
          key={`${keyPrefix}-${idx}`}
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-normal whitespace-nowrap text-slate-700"
        >
          {/* Category Tag */}
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${item.categoryColor}`}
          >
            {item.category}
          </span>

          <span className="shrink-0">{item.icon}</span>

          {item.highlight ? (
            <span className="bg-white/80 text-slate-900 px-2 py-0.5 rounded-md border border-slate-200/80 font-bold shadow-xs">
              {item.text}
            </span>
          ) : (
            <span className="text-slate-700 font-medium">
              {item.text}
            </span>
          )}

          {item.actionText && item.onClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                item.onClick?.();
              }}
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 transition-colors cursor-pointer"
            >
              {item.actionText} →
            </button>
          )}

          <span className="text-slate-300 select-none ml-2">/</span>
        </div>
      ))}
    </div>
  );

  return (
    <aside
      className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 text-slate-900 overflow-hidden select-none no-print sticky top-0 z-40 transition-colors"
      aria-label="Academic Announcements and Live Gateway Status"
      data-purpose="marquee-announcement-banner"
    >
      <div className="flex items-center h-10 sm:h-11 max-w-7xl mx-auto px-2 sm:px-4">
        {/* Left Ticker Badge (JugaadBro Emerald Pill) */}
        <div className="flex items-center gap-2 shrink-0 pr-3 z-20">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            <span className="hidden sm:inline">Live Updates</span>
            <span className="sm:hidden">Updates</span>
          </span>
        </div>

        {/* Marquee Ticker Track */}
        <div
          className="relative flex-1 overflow-hidden h-full flex items-center"
          title="Hover to pause ticker"
        >
          {/* Subtle gradient edges for fading text smoothly */}
          <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-10 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

          {/* Scrolling Content - duplicated for seamless infinite loop */}
          <div
            className="animate-marquee py-1 cursor-default"
            style={{
              animationDuration: '75s',
            }}
          >
            {renderTickerContent('track-1')}
            {renderTickerContent('track-2')}
          </div>
        </div>
      </div>
    </aside>
  );
};
