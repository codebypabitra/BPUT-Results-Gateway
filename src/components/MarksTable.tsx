import React, { useState, useMemo } from 'react';
import { BputMarksData, BputStudentDetails, classifyBacklogGrade } from '../types/bput';
import { generateStudentMarksheetPdf } from '../services/pdfGenerator';
import {
  Check,
  Download,
  Printer,
  Loader2,
  Share2,
  Award,
  BookOpen,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';

interface MarksTableProps {
  marksData: BputMarksData;
  examTitle: string;
  student?: BputStudentDetails | null;
  examSession?: string;
  semesterName?: string;
  onPrint?: () => void;
  onShare?: () => void;
}

// BPUT CBCS standard grade point map
const CBCS_GRADE_POINTS: Record<string, number> = {
  O: 10,
  E: 9,
  A: 8,
  B: 7,
  C: 6,
  D: 5,
  P: 4,
  F: 0,
  'F(EX)': 0,
  'F(INT)': 0,
  M: 0,
  S: 0,
};

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

  // What-If SGPA Simulator State
  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(false);
  const [simulatedGrades, setSimulatedGrades] = useState<Record<string, string>>({});

  if (!marksData || !marksData.grades || marksData.grades.length === 0) {
    return null;
  }

  const { grades, sgpadetails } = marksData;
  const originalSgpa = parseFloat(String(sgpadetails?.sgpa || 0)) || 0;
  const totalCredits = parseFloat(String(sgpadetails?.cretits || sgpadetails?.credits || 0)) || 0;

  // Calculate simulated SGPA when in simulation mode
  const { currentSgpa, currentBacklogsCount, sgpaDelta } = useMemo(() => {
    if (!isSimulatorActive) {
      let bCount = 0;
      grades.forEach((g) => {
        if (classifyBacklogGrade(g.grade, g.subjectTP).isBacklog) {
          bCount++;
        }
      });
      return {
        currentSgpa: originalSgpa,
        currentBacklogsCount: bCount,
        sgpaDelta: 0,
      };
    }

    let totalPoints = 0;
    let countedCredits = 0;
    let bCount = 0;

    grades.forEach((g) => {
      const paperCode = g.subjectCODE;
      const effectiveGrade = (simulatedGrades[paperCode] || g.grade || '').toUpperCase().trim();
      const credits = typeof g.subjectCredits === 'number' ? g.subjectCredits : parseFloat(String(g.subjectCredits || 0)) || 0;
      const point = CBCS_GRADE_POINTS[effectiveGrade] ?? (CBCS_GRADE_POINTS[effectiveGrade.slice(0, 1)] ?? 0);

      totalPoints += point * credits;
      countedCredits += credits;

      if (classifyBacklogGrade(effectiveGrade, g.subjectTP).isBacklog) {
        bCount++;
      }
    });

    const calculatedSgpa = countedCredits > 0 ? totalPoints / countedCredits : originalSgpa;
    const roundedSgpa = Math.round(calculatedSgpa * 100) / 100;
    const delta = Math.round((roundedSgpa - originalSgpa) * 100) / 100;

    return {
      currentSgpa: roundedSgpa,
      currentBacklogsCount: bCount,
      sgpaDelta: delta,
    };
  }, [isSimulatorActive, simulatedGrades, grades, originalSgpa]);

  const getDivision = (sgpa: number) => {
    if (sgpa >= 8.5) return 'First Class with Distinction';
    if (sgpa >= 7.0) return 'First Class Equivalent';
    if (sgpa >= 6.0) return 'Second Class Equivalent';
    if (sgpa >= 5.0) return 'Pass Class Equivalent';
    return 'Under Evaluation';
  };

  const handleGradeChange = (paperCode: string, newGrade: string) => {
    setSimulatedGrades((prev) => ({
      ...prev,
      [paperCode]: newGrade,
    }));
  };

  const resetSimulation = () => {
    setSimulatedGrades({});
  };

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
      const isBoth = classification.backlogType === 'BOTH';
      const isInt = classification.isInternal;

      let badgeClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      if (isBoth) badgeClasses = 'bg-purple-50 text-purple-700 border-purple-200';
      else if (isInt) badgeClasses = 'bg-amber-50 text-amber-800 border-amber-200';

      return (
        <span
          className={`inline-flex items-center justify-center px-2.5 h-7 rounded-lg font-mono font-bold text-xs sm:text-sm border shadow-xs ${badgeClasses}`}
          title={
            isBoth
              ? 'External & Internal Fail'
              : isInt
              ? 'Internal Assessment Fail'
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
    return (
      <span className="inline-flex items-center justify-center min-w-[34px] px-2.5 h-7 rounded-lg text-sm border bg-emerald-50 text-emerald-800 border-emerald-200 font-bold font-mono shadow-xs">
        {grade || '-'}
        {isRecheck && (
          <span className="text-rose-600 font-bold text-sm ml-0.5 leading-none" title="Grade updated via official rechecking">
            *
          </span>
        )}
      </span>
    );
  };

  // Backlogs from official data
  const officialBacklogList = grades.filter((g) => classifyBacklogGrade(g.grade, g.subjectTP).isBacklog);

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

      {/* Transcript Summary Metrics Cards */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4"
        data-purpose="transcript-summary-metrics"
      >
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              {isSimulatorActive ? 'Simulated SGPA' : 'Semester SGPA'}
            </span>
            <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
              ✦
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
              {currentSgpa.toFixed(2)}
            </p>
            {isSimulatorActive && sgpaDelta !== 0 && (
              <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${sgpaDelta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {sgpaDelta > 0 ? `+${sgpaDelta.toFixed(2)}` : sgpaDelta.toFixed(2)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Scale of 10.00</p>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              Total Credits
            </span>
            <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-[10px] font-bold">
              ✦
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{totalCredits}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Total Semester Weight</p>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              Result Status
            </span>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentBacklogsCount === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {currentBacklogsCount === 0 ? '✓' : '!'}
            </span>
          </div>
          <p className={`text-2xl sm:text-3xl font-extrabold font-mono ${currentBacklogsCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {currentBacklogsCount === 0 ? 'PASS' : 'BACKLOG'}
          </p>
          <p className="text-[10px] text-slate-500 font-medium truncate mt-1">
            {currentBacklogsCount === 0 ? getDivision(currentSgpa) : `${currentBacklogsCount} Backlog(s)`}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              Pending Backlogs
            </span>
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
              #
            </span>
          </div>
          <p className={`text-2xl sm:text-3xl font-extrabold font-mono ${currentBacklogsCount === 0 ? 'text-slate-800' : 'text-rose-600'}`}>
            {currentBacklogsCount}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            {currentBacklogsCount === 0 ? 'All subjects cleared' : 'Requires reappearance'}
          </p>
        </div>
      </div>

      {/* Interactive Academic Benchmark Spectrum Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs no-print">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              BPUT Performance Benchmark Scale
            </h4>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
            {currentSgpa.toFixed(2)} SGPA · {getDivision(currentSgpa)}
          </span>
        </div>

        {/* Progress Bar Spectrum */}
        <div className="relative pt-1 pb-2">
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-rose-400/70" style={{ width: '50%' }} title="Below 5.0: Incomplete" />
            <div className="h-full bg-amber-400/80" style={{ width: '10%' }} title="5.0 - 6.0: Pass Class" />
            <div className="h-full bg-blue-400/80" style={{ width: '10%' }} title="6.0 - 7.0: Second Class" />
            <div className="h-full bg-teal-500/80" style={{ width: '15%' }} title="7.0 - 8.5: First Class" />
            <div className="h-full bg-emerald-600" style={{ width: '15%' }} title="8.5 - 10.0: Distinction" />
          </div>

          {/* Marker pin */}
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300"
            style={{ left: `${Math.min(100, Math.max(0, currentSgpa * 10))}%` }}
          >
            <div className="w-3.5 h-3.5 bg-slate-900 border-2 border-white rounded-full shadow-md" />
            <span className="text-[10px] font-mono font-bold text-slate-900 mt-0.5">
              ▲ {currentSgpa.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Spectrum Tier Labels */}
        <div className="grid grid-cols-5 text-[10px] text-slate-500 font-medium text-center pt-3 border-t border-slate-100">
          <span>&lt; 5.0 (Fail)</span>
          <span>5.0 (Pass)</span>
          <span>6.0 (2nd Class)</span>
          <span>7.0 (1st Class)</span>
          <span className="font-bold text-emerald-700">8.5+ (Distinction)</span>
        </div>
      </div>

      {/* Detailed Subject Grades Table with What-If Simulator Header */}
      <section
        className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden"
        data-purpose="semester-grade-sheet"
      >
        <div className="bg-slate-50/70 border-b border-slate-100 px-5 sm:px-7 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shadow-xs">
              <BookOpen className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
                {examTitle || 'Semester Examination Result Summary'}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {grades.length} Examination Papers Listed · {totalCredits} Total Credits
              </p>
            </div>
          </div>

          {/* Interactive What-If Simulator Button */}
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => {
                setIsSimulatorActive(!isSimulatorActive);
                if (isSimulatorActive) {
                  resetSimulation();
                }
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isSimulatorActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200'
              }`}
              title="Toggle What-If grade simulation to estimate revised SGPA"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isSimulatorActive ? 'Exit Simulator' : 'What-If SGPA Simulator'}</span>
            </button>

            {isSimulatorActive && Object.keys(simulatedGrades).length > 0 && (
              <button
                type="button"
                onClick={resetSimulation}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title="Reset simulated grades to published values"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Simulator Active Notification Banner */}
        {isSimulatorActive && (
          <div className="bg-emerald-50/80 border-b border-emerald-100 px-5 sm:px-7 py-3 flex items-center justify-between gap-3 text-xs text-emerald-900 no-print animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>What-If Mode Active:</strong> Change any paper&apos;s grade in the table below to simulate your rechecking or backlog clearance SGPA in real-time.
              </span>
            </div>
            <span className="font-mono font-bold text-xs bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
              Live SGPA: {currentSgpa.toFixed(2)}
            </span>
          </div>
        )}

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
                <th className="py-3.5 px-4 w-36 text-center" scope="col">
                  {isSimulatorActive ? 'Simulated Grade' : 'Final Grade'}
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
                const activeGrade = isSimulatorActive && simulatedGrades[item.subjectCODE] !== undefined
                  ? simulatedGrades[item.subjectCODE]
                  : item.grade;

                return (
                  <tr
                    key={`${item.subjectCODE}-${idx}`}
                    className={`transition-colors hover:bg-slate-50/70 ${
                      isPractical ? 'bg-purple-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-semibold text-slate-400 border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 border-r border-slate-100">
                      <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                        {item.subjectCODE}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 border-r border-slate-100">
                      {item.subjectName}
                    </td>
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
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800 border-r border-slate-100">
                      {item.subjectCredits}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isSimulatorActive ? (
                        <select
                          value={activeGrade}
                          onChange={(e) => handleGradeChange(item.subjectCODE, e.target.value)}
                          className="h-8 px-2 bg-emerald-50 border border-emerald-300 font-mono font-bold text-xs rounded-lg text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                        >
                          <option value="O">O (10)</option>
                          <option value="E">E (9)</option>
                          <option value="A">A (8)</option>
                          <option value="B">B (7)</option>
                          <option value="C">C (6)</option>
                          <option value="D">D (5)</option>
                          <option value="P">P (4)</option>
                          <option value="F">F (0)</option>
                          <option value="F(EX)">F(EX) (0)</option>
                          <option value="F(INT)">F(INT) (0)</option>
                        </select>
                      ) : (
                        renderGradeBadge(item.grade, isRecheck, item.subjectTP)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/80 border-t border-slate-200/80 text-sm font-bold">
                <td
                  className="py-4 px-5 text-right uppercase tracking-wider text-slate-600 text-xs font-bold"
                  colSpan={4}
                >
                  <div className="flex items-center justify-end gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-800">
                      {isSimulatorActive ? 'Simulated Semester Performance Total:' : 'Official Cumulative Performance Total:'}
                    </span>
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
                      {currentSgpa.toFixed(2)}
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
            const activeGrade = isSimulatorActive && simulatedGrades[item.subjectCODE] !== undefined
              ? simulatedGrades[item.subjectCODE]
              : item.grade;

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
                    {isSimulatorActive ? (
                      <select
                        value={activeGrade}
                        onChange={(e) => handleGradeChange(item.subjectCODE, e.target.value)}
                        className="h-7 px-1.5 bg-emerald-50 border border-emerald-300 font-mono font-bold text-xs rounded-lg text-emerald-900"
                      >
                        <option value="O">O</option>
                        <option value="E">E</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="P">P</option>
                        <option value="F">F</option>
                      </select>
                    ) : (
                      renderGradeBadge(item.grade, isRecheck, item.subjectTP)
                    )}
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
                {isSimulatorActive ? 'Simulated SGPA' : 'Semester SGPA'}
              </span>
              <span className="font-mono font-extrabold text-emerald-600 text-2xl">
                {currentSgpa.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Backlog Subjects Details (if any exist) */}
      {officialBacklogList.length > 0 && (
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
                Pending Backlog Subjects ({officialBacklogList.length})
              </h4>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-white text-rose-700 rounded-full border border-rose-200 shadow-xs">
              Reappearance Required
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {officialBacklogList.map((b, idx) => {
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
                      Type: {String(b.subjectTP || '').toUpperCase() === 'P' ? 'Practical' : 'Theory'} · Credits: {b.subjectCredits}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-600 text-white shadow-xs">
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Bar (Print, PDF, Share) */}
      <div
        className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 no-print"
        data-purpose="result-print-actions"
      >
        <div className="flex items-center gap-3 text-center sm:text-left">
          {downloadStatus === 'downloaded' && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PDF Marksheet saved: {lastFilename}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
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

          <button
            type="button"
            disabled={downloadStatus === 'generating'}
            onClick={() => handleGeneratePdfAndPrint(false)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-md active:translate-y-px transition-all cursor-pointer disabled:opacity-75"
          >
            {downloadStatus === 'generating' ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-white" />
            )}
            <span>Download Vector PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
