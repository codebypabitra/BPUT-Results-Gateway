import React, { useState } from 'react';
import { BputMarksData, BputStudentDetails, classifyBacklogGrade } from '../types/bput';
import { generateStudentMarksheetPdf } from '../services/pdfGenerator';
import { Check, Download, Printer, Loader2, Share2, Award, BookOpen, AlertTriangle, Sparkles } from 'lucide-react';

interface MarksTableProps {
  marksData: BputMarksData;
  examTitle: string;
  student?: BputStudentDetails | null;
  examSession?: string;
  semesterName?: string;
  onPrint?: () => void;
  onShare?: () => void;
}

export const MarksTable: React.FC<MarksTableProps> = ({
  marksData,
  examTitle,
  student,
  examSession,
  semesterName,
  onPrint,
  onShare,
}) => {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'generating' | 'downloaded'>('idle');
  const [lastFilename, setLastFilename] = useState<string>('');

  if (!marksData || !marksData.grades || marksData.grades.length === 0) {
    return null;
  }

  const { grades, sgpadetails } = marksData;
  const sgpaValue = parseFloat(String(sgpadetails?.sgpa || 0)) || 0;
  const totalCredits = parseFloat(String(sgpadetails?.cretits || sgpadetails?.credits || 0)) || 0;

  let externalBacklogsCount = 0;
  let internalBacklogsCount = 0;
  let otherBacklogsCount = 0;

  const backlogSubjectsList = grades.filter((g) => {
    const classification = classifyBacklogGrade(g.grade, g.subjectTP);
    if (classification.isBacklog) {
      if (classification.isExternal) externalBacklogsCount++;
      if (classification.isInternal) internalBacklogsCount++;
      if (!classification.isExternal && !classification.isInternal) otherBacklogsCount++;
      return true;
    }
    return false;
  });
  const backlogsCount = backlogSubjectsList.length;

  const getDivision = (sgpa: number) => {
    if (sgpa >= 8.5) return 'First Class with Distinction';
    if (sgpa >= 7.0) return 'First Class Equivalent';
    if (sgpa >= 6.0) return 'Second Class Equivalent';
    if (sgpa >= 5.0) return 'Pass Class Equivalent';
    return 'Under Evaluation';
  };

  /**
   * Generates and downloads the official PDF marksheet file,
   * then triggers window.print() if supported.
   */
  const handleGeneratePdfAndPrint = (triggerPrintDialog = true) => {
    try {
      setDownloadStatus('generating');

      const filename = generateStudentMarksheetPdf(
        student,
        marksData,
        examSession || '',
        semesterName
      );
      setLastFilename(filename);
      setDownloadStatus('downloaded');

      if (triggerPrintDialog) {
        if (onPrint) {
          onPrint();
        } else {
          try {
            window.print();
          } catch {}
        }
      }

      setTimeout(() => {
        setDownloadStatus('idle');
      }, 3500);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setDownloadStatus('idle');
      if (onPrint) onPrint();
    }
  };

  const renderGradeBadge = (gradeStr: string, isRecheck: boolean, subjectTP?: string) => {
    const classification = classifyBacklogGrade(gradeStr, subjectTP);

    if (classification.isBacklog) {
      const isExt = classification.isExternal;
      const isInt = classification.isInternal;
      const isBoth = classification.backlogType === 'BOTH';

      let badgeClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      if (isBoth) badgeClasses = 'bg-purple-50 text-purple-700 border-purple-200';
      else if (isInt) badgeClasses = 'bg-amber-50 text-amber-800 border-amber-200';
      else if (classification.displayGrade.includes('ABS')) badgeClasses = 'bg-slate-100 text-slate-700 border-slate-200';

      return (
        <span
          className={`inline-flex items-center justify-center px-2.5 h-7 rounded-lg font-mono font-bold text-xs sm:text-sm border shadow-xs ${badgeClasses}`}
          title={
            isBoth
              ? 'External & Internal Fail'
              : isInt
              ? 'Internal Assessment / Sessional Fail'
              : 'External University Examination Fail'
          }
        >
          {classification.displayGrade}
          {isRecheck && (
            <span className="text-rose-600 font-bold text-sm ml-0.5 leading-none" title="Grade updated via official rechecking">
              *
            </span>
          )}
        </span>
      );
    }

    const grade = (gradeStr || '').trim().toUpperCase();
    const badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold font-mono shadow-xs';

    return (
      <span
        className={`inline-flex items-center justify-center min-w-[34px] px-2.5 h-7 rounded-lg text-sm border ${badgeClass}`}
      >
        {grade || '-'}
        {isRecheck && (
          <span className="text-rose-600 font-bold text-sm ml-0.5 leading-none" title="Grade updated via official rechecking">
            *
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Official Academic Logo Header for Print */}
      <div className="hidden print-only mb-6 text-center">
        <img
          src="/bput_logo.png"
          alt="Biju Patnaik University of Technology Official Logo"
          className="w-16 h-16 mx-auto mb-2 object-contain"
        />
        <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide">
          Biju Patnaik University of Technology, Rourkela, Odisha
        </h1>
        <p className="text-xs font-semibold text-slate-700 mt-0.5">
          Provisional Statement of Grades
        </p>
      </div>

      {/* Transcript Summary Metrics Cards (JugaadBro Style) */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4"
        data-purpose="transcript-summary-metrics"
      >
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              Semester SGPA
            </span>
            <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
              ✦
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono mt-0.5">{sgpaValue.toFixed(2)}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Scale of 10.00</p>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              Total Credits
            </span>
            <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-[10px] font-bold">
              ✦
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-0.5">{totalCredits}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Earned: {totalCredits} Credits</p>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              Result Status
            </span>
            <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
          </div>
          <p className={`text-2xl sm:text-3xl font-extrabold font-mono mt-0.5 ${backlogsCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {backlogsCount === 0 ? 'PASS' : 'BACKLOG'}
          </p>
          <p className="text-[10px] text-slate-500 font-medium truncate mt-1">
            {backlogsCount === 0 ? getDivision(sgpaValue) : `${backlogsCount} Backlog(s)`}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              Pending Backlogs
            </span>
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
              #
            </span>
          </div>
          <p className={`text-2xl sm:text-3xl font-extrabold font-mono mt-0.5 ${backlogsCount === 0 ? 'text-slate-800' : 'text-rose-600'}`}>
            {backlogsCount}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            {backlogsCount === 0 ? 'All subjects cleared' : 'Requires reappearance'}
          </p>
        </div>
      </div>

      {/* Detailed Subject Grades Table */}
      <section
        className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden"
        data-purpose="semester-grade-sheet"
      >
        <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shadow-xs">
              <BookOpen className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
                {examTitle || 'Semester Examination Result Summary'}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Official Paper Breakdown &amp; Grade Points
              </p>
            </div>
          </div>
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold px-3 py-1 rounded-full">
            {grades.length} Papers Listed
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse" id="grades-table">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 text-xs uppercase font-bold tracking-wider border-b border-slate-200/80">
                <th className="py-3.5 px-4 w-14 text-center border-r border-slate-100" scope="col">
                  S.No
                </th>
                <th className="py-3.5 px-4 w-36 font-mono border-r border-slate-100" scope="col">
                  Subject Code
                </th>
                <th className="py-3.5 px-4 border-r border-slate-100" scope="col">
                  Subject Name
                </th>
                <th className="py-3.5 px-4 w-28 text-center border-r border-slate-100" scope="col">
                  Type
                </th>
                <th className="py-3.5 px-4 w-24 text-center border-r border-slate-100" scope="col">
                  Credits
                </th>
                <th className="py-3.5 px-4 w-32 text-center" scope="col">
                  Final Grade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {grades.map((item, idx) => {
                const isPractical =
                  String(item.subjectTP || '').trim().toUpperCase() === 'P' ||
                  String(item.subjectTP || '').trim().toUpperCase() === 'PR';
                const isSessional = String(item.subjectTP || '').trim().toUpperCase() === 'S';
                const isRecheck = item.recheck === 1;

                return (
                  <tr
                    key={`${item.subjectCODE}-${idx}`}
                    className={`transition-colors hover:bg-slate-50/70 ${
                      isPractical ? 'bg-purple-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-semibold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 border-r border-slate-100">
                      <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                        {item.subjectCODE}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 border-r border-slate-100">{item.subjectName}</td>
                    <td className="py-3 px-4 text-center border-r border-slate-100">
                      {isPractical ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Practical
                        </span>
                      ) : isSessional ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Sessional
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Theory
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800 border-r border-slate-100">{item.subjectCredits}</td>
                    <td className="py-3 px-4 text-center">
                      {renderGradeBadge(item.grade, isRecheck, item.subjectTP)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Transcript Summary Footer */}
            <tfoot>
              <tr className="bg-slate-50/80 border-t border-slate-200/80 text-sm font-bold">
                <td
                  className="py-4 px-5 text-right uppercase tracking-wider text-slate-600 text-xs font-bold"
                  colSpan={4}
                >
                  <div className="flex items-center justify-end gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-800">Cumulative Semester Performance Total:</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      Credits:
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {totalCredits}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-xs">
                    <span className="text-emerald-700 text-[10px] font-bold uppercase">
                      SGPA:
                    </span>
                    <span className="text-emerald-700 font-extrabold text-base font-mono">
                      {sgpadetails?.sgpa || '0.00'}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Subject Cards List (< sm) */}
        <div className="sm:hidden p-3.5 space-y-3">
          {grades.map((item, idx) => {
            const isPractical =
              String(item.subjectTP || '').trim().toUpperCase() === 'P' ||
              String(item.subjectTP || '').trim().toUpperCase() === 'PR';
            const isSessional = String(item.subjectTP || '').trim().toUpperCase() === 'S';
            const isRecheck = item.recheck === 1;

            return (
              <div
                key={`m-sub-${item.subjectCODE}-${idx}`}
                className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-200/80 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">#{idx + 1}</span>
                    <span className="font-mono font-bold text-xs bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {item.subjectCODE}
                    </span>
                    {isPractical ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        Practical
                      </span>
                    ) : isSessional ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Sessional
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Theory
                      </span>
                    )}
                  </div>
                  <div className="shrink-0">
                    {renderGradeBadge(item.grade, isRecheck, item.subjectTP)}
                  </div>
                </div>

                <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                  {item.subjectName}
                </h4>

                <div className="flex items-center justify-between pt-1.5 text-[11px] font-medium text-slate-500 border-t border-slate-200/60">
                  <span>Earned Credits: <strong className="font-mono text-slate-800 font-bold">{item.subjectCredits}</strong></span>
                  {isRecheck && (
                    <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                      <span>* Rechecked Grade</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Mobile Cumulative Summary Card */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-center justify-between mt-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Credits
              </span>
              <span className="font-mono font-bold text-slate-900 text-lg">
                {totalCredits}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Semester SGPA
              </span>
              <span className="font-mono font-extrabold text-emerald-600 text-2xl">
                {sgpadetails?.sgpa || '0.00'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Backlog Subjects Details */}
      {backlogsCount > 0 && (
        <div
          className="bg-rose-50/60 border border-rose-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3.5 no-print"
          data-purpose="backlog-subject-status"
        >
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-rose-200/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-4 h-4 stroke-[2]" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                Pending Backlog Subjects ({backlogsCount})
              </h4>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-white text-rose-700 rounded-full border border-rose-200 shadow-xs">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {backlogSubjectsList.map((b, idx) => {
              const gr = String(b.grade || '').toUpperCase().trim();
              const statusLabel =
                gr === 'M' ? 'MP (Malpractice)' : gr === 'S' ? 'Absent' : gr === 'P' ? 'Pending' : gr;
              return (
                <div
                  key={`${b.subjectCODE}-${idx}`}
                  className="bg-white p-3.5 rounded-2xl border border-rose-200/80 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        {b.subjectCODE}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate max-w-xs" title={b.subjectName}>
                        {b.subjectName}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 mt-1">
                      Type: {String(b.subjectTP || '').toUpperCase() === 'P' ? 'Practical' : 'Theory'} • Credits: {b.subjectCredits}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-600 text-white shadow-xs">
                      Status: {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Print Action Bar */}
      <div
        className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 no-print"
        data-purpose="result-print-actions"
      >
        <div className="flex items-center gap-3 text-center sm:text-left">
          {downloadStatus === 'downloaded' && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PDF Marksheet downloaded: {lastFilename}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
          {/* Share Result URL Button */}
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 shadow-xs hover:shadow-sm active:translate-y-px transition-all cursor-pointer"
              title="Share unique URL for this student result"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>Share Result Link</span>
            </button>
          )}

          {/* Main Print Result Button */}
          <button
            type="button"
            disabled={downloadStatus === 'generating'}
            onClick={() => handleGeneratePdfAndPrint(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-sm active:translate-y-px transition-all cursor-pointer disabled:opacity-75"
          >
            {downloadStatus === 'generating' ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Printer className="w-4 h-4 text-white" />
            )}
            <span>
              {downloadStatus === 'generating'
                ? 'Generating PDF...'
                : downloadStatus === 'downloaded'
                ? 'PDF Generated & Printed'
                : 'Print Result'}
            </span>
          </button>

          {/* Download Grade Card Button (JugaadBro Gradient Primary) */}
          <button
            type="button"
            disabled={downloadStatus === 'generating'}
            onClick={() => handleGeneratePdfAndPrint(false)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow-md active:translate-y-px transition-all cursor-pointer disabled:opacity-75"
          >
            {downloadStatus === 'generating' ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-white" />
            )}
            <span>Download Grade Card</span>
          </button>
        </div>
      </div>
    </div>
  );
};
