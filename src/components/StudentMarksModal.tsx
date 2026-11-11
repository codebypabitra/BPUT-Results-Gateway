import React, { useEffect, useState } from 'react';
import { X, Printer, Loader2, Check } from 'lucide-react';
import { StudentDetailsCard } from './StudentDetailsCard';
import { MarksTable } from './MarksTable';
import { getStudentDetails, getStudentMarksAndGrades } from '../services/bputApi';
import { BputStudentDetails, BputMarksData } from '../types/bput';
import { generateStudentMarksheetPdf } from '../services/pdfGenerator';

interface StudentMarksModalProps {
  rollNo: string | null;
  semId: string | null;
  session: string;
  onClose: () => void;
}

export const StudentMarksModal: React.FC<StudentMarksModalProps> = ({
  rollNo,
  semId,
  session,
  onClose,
}) => {
  const [studentDetails, setStudentDetails] = useState<BputStudentDetails | null>(null);
  const [marksData, setMarksData] = useState<BputMarksData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfDownloaded, setPdfDownloaded] = useState<boolean>(false);

  useEffect(() => {
    if (!rollNo) return;
    loadData(rollNo, semId || '8', session);
  }, [rollNo, semId, session]);

  const loadData = async (roll: string, sem: string, sess: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [detRes, mrkRes] = await Promise.all([
        getStudentDetails(roll),
        getStudentMarksAndGrades(roll, sem, sess),
      ]);

      if (detRes.data) {
        setStudentDetails(detRes.data);
      }
      if (mrkRes.data) {
        setMarksData(mrkRes.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load student examination marks');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generates and downloads the official PDF marksheet file,
   * then triggers window.print().
   */
  const handlePrint = () => {
    if (!marksData) return;
    try {
      setIsGeneratingPdf(true);
      generateStudentMarksheetPdf(studentDetails, marksData, session, semId || 'Semester');
      setPdfDownloaded(true);

      try {
        window.print();
      } catch {}

      setTimeout(() => {
        setIsGeneratingPdf(false);
      }, 600);

      setTimeout(() => {
        setPdfDownloaded(false);
      }, 3500);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setIsGeneratingPdf(false);
      try {
        window.print();
      } catch {}
    }
  };

  if (!rollNo) return null;

  return (
    <div
      id="student-marks-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm select-none animate-in fade-in duration-200"
    >
      <div
        id="student-marks-modal-container"
        className="bg-[#FAFBFD] border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Modal Top Bar */}
        <div className="bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-700 shrink-0">
              <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Student Marksheet
                </h3>
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] sm:text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {rollNo}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
                Provisional Examination Statement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {marksData && (
              <button
                type="button"
                onClick={handlePrint}
                disabled={isGeneratingPdf}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-75"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : pdfDownloaded ? (
                  <Check className="w-4 h-4 text-white stroke-[2.5]" />
                ) : (
                  <Printer className="w-4 h-4 text-white" />
                )}
                <span className="hidden xs:inline sm:inline">
                  {isGeneratingPdf
                    ? 'Generating...'
                    : pdfDownloaded
                    ? 'Downloaded'
                    : 'Print Result'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Official Printable Header for Modal Printout */}
        <div className="hidden print-only text-center border-b-2 border-slate-800 pb-4 mb-4 p-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-slate-300 flex items-center justify-center text-blue-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5"
                />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
              Educational Grade Statement
            </span>
          </div>
          <h1 className="text-lg font-black uppercase tracking-wider text-black">
            BIJU PATNAIK UNIVERSITY OF TECHNOLOGY, ROURKELA, ODISHA
          </h1>
          <h2 className="text-xs font-bold uppercase text-slate-700 tracking-wide mt-0.5">
            PROVISIONAL STATEMENT OF GRADES • {session}
          </h2>
          <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono mt-2 border-t border-slate-300 pt-1">
            <span>Registration No: {rollNo}</span>
            <span>Portal: results.bput.ac.in</span>
            <span>
              Printed on:{' '}
              {new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#FAFBFD]">
          {isLoading && (
            <div className="p-12 text-center no-print">
              <div className="inline-block w-8 h-8 border-3 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-900">
                Loading student marks from BPUT server...
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">Connecting to results.bput.ac.in</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 text-rose-900 rounded-2xl text-xs border border-rose-200/80 shadow-xs">
              <h4 className="font-bold text-sm mb-0.5 text-rose-950">Notice</h4>
              <p className="font-medium text-rose-800">{error}</p>
            </div>
          )}

          {!isLoading && studentDetails && (
            <StudentDetailsCard
              student={studentDetails}
              semesterName={semId || 'Semester'}
              examSession={session}
            />
          )}

          {!isLoading && marksData && (
            <MarksTable
              marksData={marksData}
              examTitle={`Semester ${semId || ''}, ${session} Examination Result Summary`}
              student={studentDetails}
              examSession={session}
              semesterName={semId || undefined}
              onPrint={handlePrint}
            />
          )}
        </div>
      </div>
    </div>
  );
};
