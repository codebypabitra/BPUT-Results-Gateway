import React from 'react';
import { BputResultListItem } from '../types/bput';
import { Sparkles, Eye, CheckCircle2 } from 'lucide-react';

interface ResultListTableProps {
  resultsList: BputResultListItem[];
  onSelectSem: (rollNo: string, semId: string, session: string) => void;
  selectedSemId?: string;
  isFetchingDetails?: boolean;
}

export const ResultListTable: React.FC<ResultListTableProps> = ({
  resultsList,
  onSelectSem,
  selectedSemId,
  isFetchingDetails = false,
}) => {
  if (!resultsList || resultsList.length === 0) return null;

  return (
    <section
      className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs no-print"
      data-purpose="published-results-table"
    >
      <div className="bg-slate-50/80 border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-900">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          Published Semester Results
        </h3>
        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          {resultsList.length} Result{resultsList.length > 1 ? 's' : ''} Found
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200/80">
              <th className="py-3 px-4 w-16 text-center" scope="col">
                S.No
              </th>
              <th className="py-3 px-4" scope="col">
                Course / Branch Name
              </th>
              <th className="py-3 px-4" scope="col">
                Academic Session
              </th>
              <th className="py-3 px-4 text-center" scope="col">
                Status
              </th>
              <th className="py-3 px-4 text-right" scope="col">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resultsList.map((item, idx) => {
              const isSelected = selectedSemId === item.semId;
              return (
                <tr
                  key={`${item.rollNo}-${item.semId}-${idx}`}
                  className={`transition-colors ${
                    isSelected ? 'bg-emerald-50/50 font-semibold' : 'hover:bg-slate-50/60 bg-white'
                  }`}
                >
                  <td className="py-3.5 px-4 text-center font-bold text-slate-500 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {item.semester ? `${item.semester} Semester` : `Semester ${item.semId}`} –{' '}
                    {item.branchName || item.course || 'Degree Course'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{item.examSession}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Published
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectSem(item.rollNo, item.semId, item.examSession)}
                      disabled={isFetchingDetails}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      <Eye className="w-4 h-4 stroke-[2]" />
                      <span>{isSelected ? 'Viewing' : 'View Details'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (< sm) */}
      <div className="sm:hidden p-3.5 space-y-3">
        {resultsList.map((item, idx) => {
          const isSelected = selectedSemId === item.semId;
          return (
            <div
              key={`m-${item.rollNo}-${item.semId}-${idx}`}
              className={`p-4 rounded-2xl border transition-all shadow-xs ${
                isSelected
                  ? 'bg-emerald-50/50 border-emerald-300'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 px-2 py-0.5 rounded-lg">
                  #{idx + 1}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Published
                </span>
              </div>

              <h4 className="font-bold text-slate-900 text-sm leading-snug">
                {item.semester ? `${item.semester} Semester` : `Semester ${item.semId}`}
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {item.branchName || item.course || 'Degree Course'}
              </p>

              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600 font-medium">
                <span>Session: {item.examSession}</span>
              </div>

              <button
                type="button"
                onClick={() => onSelectSem(item.rollNo, item.semId, item.examSession)}
                disabled={isFetchingDetails}
                className={`mt-3 w-full h-11 min-h-[44px] rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>{isSelected ? 'Viewing Marksheet' : 'View Semester Details'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
