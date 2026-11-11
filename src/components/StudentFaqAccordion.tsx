import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Sparkles } from 'lucide-react';

export const StudentFaqAccordion: React.FC = () => {
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({ 0: true });

  const toggleFaq = (index: number) => {
    setOpenFaqs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const FAQ_ITEMS = [
    {
      q: 'How does the automatic multi-session scan work?',
      a: 'Instead of requiring you to manually switch semester and session dropdowns, the portal queries all published academic sessions (e.g. Even 2025-26, Odd 2025-26, and past years) simultaneously. It compiles all your published semester records in seconds so you can switch between semesters with one tap.',
    },
    {
      q: 'Why are some subjects displayed in red font with an \'F\' grade?',
      a: 'Under BPUT Choice Based Credit System (CBCS) regulations, an \'F\' grade indicates that you have not secured the minimum passing criteria for that subject. To help students immediately distinguish clear subjects from backlogs, all subjects with an \'F\' grade are highlighted in bold red font, while cleared subjects are shown in green.',
    },
    {
      q: 'What does the red asterisk (*) attached to a grade mean?',
      a: 'The asterisk symbol (*) indicates that the grade was updated or confirmed through official BPUT rechecking or re-evaluation proceedings. It reflects the latest revised provisional score retrieved from the official gateway.',
    },
    {
      q: 'How do I download or print the official vector PDF marksheet?',
      a: 'Whenever your semester result is displayed, click the "Download Grade Card" button. The portal will generate a crisp vector PDF document complete with full subject names, credit point breakdowns, and SGPA summary ready for saving or offline printing.',
    },
    {
      q: 'How does unique URL sharing work for individual and bulk class results?',
      a: 'Every result query has a dedicated URL! For individual students, the URL includes the 10-digit registration number (e.g. ?regd=2001289001). For bulk results, the URL retains the start and end range. When anyone opens that link, the portal instantly queries and renders the result without them needing to re-enter anything.',
    },
    {
      q: 'Is this an official BPUT university website?',
      a: 'No. This is an open-source, student-driven academic utility inspired by the community. It does not replace the official university records. Official statutory transcripts and degree certificates are issued exclusively by BPUT through affiliated college examination offices. You can visit results.bput.ac.in for the official university gateway.',
    },
  ];

  return (
    <section className="w-full space-y-6 no-print my-8" aria-label="Frequently Asked Questions">
      {/* FAQ Header */}
      <div className="text-center max-w-2xl mx-auto flex flex-col items-center">
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-emerald-200/70 mb-3 shadow-xs select-none">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Got Questions?
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 select-none">
          Frequently Asked Questions
        </h2>
        <p className="text-slate-600 mt-2 text-xs sm:text-sm font-medium leading-relaxed">
          Quick clarity on BPUT semester grading, backlog identification, and marksheet features.
        </p>
      </div>

      {/* JugaadBro Accordion List */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-8 shadow-xs divide-y divide-slate-100">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = Boolean(openFaqs[index]);
          return (
            <div
              key={index}
              className="py-1 first:pt-0 last:pb-0 transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleFaq(index)}
                className="w-full py-4 text-left flex items-start sm:items-center justify-between gap-4 cursor-pointer group outline-none select-none"
                aria-expanded={isOpen}
              >
                <span className="font-heading font-semibold text-base sm:text-lg text-slate-800 group-hover:text-emerald-600 transition-colors">
                  {item.q}
                </span>
                <div
                  className={`shrink-0 pt-0.5 sm:pt-0 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-emerald-600' : ''
                  }`}
                >
                  <ChevronDown className="w-5 h-5" />
                </div>
              </button>

              {isOpen && (
                <div className="pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium animate-in fade-in duration-150">
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
