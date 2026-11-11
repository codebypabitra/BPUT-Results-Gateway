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

export const MarqueeBanner: React.FC<MarqueeBannerProps> = () => {
  const marqueeItems = [
    {
      id: 'gateway',
      icon: <Bell className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
      text: 'Multi-Session Real-Time Provisional Grade Retrieval Active',
    },
    {
      id: 'share',
      icon: <Share2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
      text: 'Unique URL sharing available for individual students and bulk class results',
    },
    {
      id: 'scan',
      icon: <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
      text: 'Automatically evaluates all published academic sessions in a single query',
    },
    {
      id: 'recheck',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
      text: 'Red asterisk (*) denotes grades updated after official recheck publications',
    },
    {
      id: 'cbcs',
      icon: <BookOpen className="w-3.5 h-3.5 text-teal-600 shrink-0" />,
      text: 'Absolute 10-point scale: O (10), E (9), A (8), B (7), C (6), D (5), F (0 Backlog)',
    },
    {
      id: 'gateway-fast',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
      text: 'Direct high-speed gateway sync with automated retry and vector PDF marksheet download',
    },
  ];

  const renderTickerContent = (keyPrefix: string) => (
    <div key={keyPrefix} className="flex items-center space-x-6 pr-6 shrink-0">
      {marqueeItems.map((item, idx) => (
        <div
          key={`${keyPrefix}-${idx}`}
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-normal whitespace-nowrap text-slate-700"
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="text-slate-700 font-medium">{item.text}</span>
          <span className="text-slate-300 select-none ml-2">•</span>
        </div>
      ))}
    </div>
  );

  return (
    <aside
      className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 text-slate-900 overflow-hidden select-none no-print sticky top-0 z-40 transition-colors"
      aria-label="Academic Announcements and Live Gateway Status"
      data-purpose="marquee-announcement-banner"
    >
      <div className="flex items-center h-10 sm:h-11 w-full px-[5%]">
        {/* Left Ticker Label */}
        <div className="flex items-center gap-2 shrink-0 pr-2.5 z-20">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            <span className="hidden sm:inline">Live Updates</span>
            <span className="sm:hidden">Updates</span>
          </span>
        </div>

        {/* Marquee Ticker Track - Edge to Edge without side restrictions */}
        <div
          className="relative flex-1 overflow-hidden h-full flex items-center"
          title="Live academic updates ticker"
        >
          {/* Scrolling Content */}
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
