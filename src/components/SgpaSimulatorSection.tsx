import React, { useState } from 'react';
import {
  Calculator,
  RotateCcw,
  Award,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export interface SimulatorSubject {
  id: string;
  name: string;
  type: 'theory' | 'practical';
  credits: number;
  grade: string;
  gradePoint: number;
}

const CBCS_GRADES = [
  { grade: 'O', point: 10, label: 'O (10)', range: '90–100%', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
  { grade: 'E', point: 9, label: 'E (9)', range: '80–89%', color: 'text-teal-700 bg-teal-50 border-teal-300' },
  { grade: 'A', point: 8, label: 'A (8)', range: '70–79%', color: 'text-blue-700 bg-blue-50 border-blue-300' },
  { grade: 'B', point: 7, label: 'B (7)', range: '60–69%', color: 'text-indigo-700 bg-indigo-50 border-indigo-300' },
  { grade: 'C', point: 6, label: 'C (6)', range: '50–59%', color: 'text-amber-700 bg-amber-50 border-amber-300' },
  { grade: 'D', point: 5, label: 'D (5)', range: '37–49%', color: 'text-orange-700 bg-orange-50 border-orange-300' },
  { grade: 'F', point: 0, label: 'F (0)', range: 'Below 37%', color: 'text-rose-700 bg-rose-50 border-rose-300' },
];

const INITIAL_SUBJECTS: SimulatorSubject[] = [
  // 6 Theory Subjects (3 credits each by default - BPUT Standard)
  { id: 't1', name: 'Theory Subject 1', type: 'theory', credits: 3, grade: 'E', gradePoint: 9 },
  { id: 't2', name: 'Theory Subject 2', type: 'theory', credits: 3, grade: 'A', gradePoint: 8 },
  { id: 't3', name: 'Theory Subject 3', type: 'theory', credits: 3, grade: 'A', gradePoint: 8 },
  { id: 't4', name: 'Theory Subject 4', type: 'theory', credits: 3, grade: 'B', gradePoint: 7 },
  { id: 't5', name: 'Theory Subject 5', type: 'theory', credits: 3, grade: 'E', gradePoint: 9 },
  { id: 't6', name: 'Theory Subject 6', type: 'theory', credits: 3, grade: 'A', gradePoint: 8 },
  // 4 Lab / Practical Subjects (2 credits each by default - BPUT Standard)
  { id: 'p1', name: 'Practical Subject 1', type: 'practical', credits: 2, grade: 'O', gradePoint: 10 },
  { id: 'p2', name: 'Practical Subject 2', type: 'practical', credits: 2, grade: 'O', gradePoint: 10 },
  { id: 'p3', name: 'Practical Subject 3', type: 'practical', credits: 2, grade: 'E', gradePoint: 9 },
  { id: 'p4', name: 'Practical Subject 4', type: 'practical', credits: 2, grade: 'O', gradePoint: 10 },
];

interface SgpaSimulatorSectionProps {
  onOpenGradingModal?: () => void;
  onFocusSearch?: () => void;
}

export const SgpaSimulatorSection: React.FC<SgpaSimulatorSectionProps> = ({
  onOpenGradingModal,
  onFocusSearch,
}) => {
  const [subjects, setSubjects] = useState<SimulatorSubject[]>(INITIAL_SUBJECTS);

  // Update grade of a specific subject
  const handleGradeChange = (id: string, gradeStr: string) => {
    const selected = CBCS_GRADES.find((g) => g.grade === gradeStr) || CBCS_GRADES[0];
    setSubjects((prev) =>
      prev.map((sub) =>
        sub.id === id ? { ...sub, grade: selected.grade, gradePoint: selected.point } : sub
      )
    );
  };

  // Optional credits modification
  const handleCreditsChange = (id: string, newCredits: number) => {
    const safeCredits = Math.max(1, Math.min(6, newCredits));
    setSubjects((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, credits: safeCredits } : sub))
    );
  };

  // Quick preset helpers
  const applyPreset = (gradeStr: string) => {
    const found = CBCS_GRADES.find((g) => g.grade === gradeStr);
    if (!found) return;
    setSubjects((prev) =>
      prev.map((sub) => ({ ...sub, grade: found.grade, gradePoint: found.point }))
    );
  };

  const handleReset = () => {
    setSubjects(INITIAL_SUBJECTS);
  };

  // Full calculation metrics
  const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);
  const totalPoints = subjects.reduce((sum, s) => sum + s.credits * s.gradePoint, 0);
  const calculatedSgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  const numericSgpa = parseFloat(calculatedSgpa);

  const backlogs = subjects.filter((s) => s.gradePoint === 0 || s.grade === 'F');
  const passedCount = subjects.length - backlogs.length;

  const getDivision = (sgpa: number, hasBacklogs: boolean) => {
    if (hasBacklogs) return 'Backlog Pending (Re-appear required)';
    if (sgpa >= 8.5) return 'First Class with Distinction (Excellent)';
    if (sgpa >= 7.0) return 'First Class Equivalent';
    if (sgpa >= 6.0) return 'Second Class Equivalent';
    if (sgpa >= 5.0) return 'Pass Class';
    return 'Under Evaluation';
  };

  const equivalentPercentage = Math.max(0, (numericSgpa - 0.5) * 10).toFixed(1);

  const theorySubjects = subjects.filter((s) => s.type === 'theory');
  const practicalSubjects = subjects.filter((s) => s.type === 'practical');

  return (
    <section
      className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6 no-print overflow-hidden relative"
      aria-label="Interactive BPUT SGPA Grade Calculator"
      id="ready-to-check-grades"
    >
      {/* Header Container */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-xs">
              <Calculator className="w-4 h-4 stroke-[2.2]" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
              BPUT Semester SGPA Simulator
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Ready to check your grades?
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl leading-relaxed">
            Select your expected grade points for <strong>6 Theory Subjects</strong> and <strong>4 Practical / Lab Subjects</strong> to compute your full semester SGPA, credit points, and equivalent percentage in real time.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Reset to default initial grades"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset</span>
          </button>
          {onOpenGradingModal && (
            <button
              type="button"
              onClick={onOpenGradingModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>CBCS Rules</span>
            </button>
          )}
          {onFocusSearch && (
            <button
              type="button"
              onClick={onFocusSearch}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>Search Roll No</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Real-time SGPA Result Scoreboard */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 items-center">
          {/* Main SGPA Stat */}
          <div className="col-span-2 md:col-span-1 border-b md:border-b-0 md:border-r border-white/20 pb-3 md:pb-0 md:pr-4">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Projected SGPA
            </span>
            <div className="text-3xl sm:text-4xl font-heading font-black tracking-tight mt-1 text-white">
              {calculatedSgpa}
              <span className="text-base sm:text-lg font-normal text-emerald-200"> / 10.0</span>
            </div>
            <div className="text-[11px] font-semibold text-emerald-100 mt-1">
              Equivalent: ~{equivalentPercentage}%
            </div>
          </div>

          {/* Total Credits */}
          <div className="border-r border-white/20 pr-3 sm:pr-4">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-200">
              Total Credits
            </span>
            <div className="text-2xl sm:text-3xl font-heading font-extrabold mt-1">
              {totalCredits}
            </div>
            <p className="text-[11px] text-emerald-100 mt-0.5">
              6 Theory + 4 Practical
            </p>
          </div>

          {/* Total Grade Points Earned */}
          <div className="border-r border-white/20 pr-3 sm:pr-4">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-200">
              Total Credit Points
            </span>
            <div className="text-2xl sm:text-3xl font-heading font-extrabold mt-1">
              {totalPoints.toFixed(1)}
            </div>
            <p className="text-[11px] text-emerald-100 mt-0.5">
              Σ (Credit × Grade Point)
            </p>
          </div>

          {/* Academic Standing */}
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Academic Status
            </span>
            <div className="text-sm sm:text-base font-bold mt-1 leading-snug line-clamp-2">
              {getDivision(numericSgpa, backlogs.length > 0)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-100 mt-1">
              {backlogs.length === 0 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>All 10 Subjects Cleared</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="text-amber-200 font-bold">{backlogs.length} Backlog Paper{backlogs.length > 1 ? 's' : ''}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Batch Presets Bar */}
        <div className="relative z-10 mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-emerald-200 text-[11px] font-semibold">
            Quick Simulation Presets:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset('O')}
              className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
            >
              All O (10.00 SGPA)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('E')}
              className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
            >
              All E (9.00 SGPA)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('A')}
              className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
            >
              All A (8.00 SGPA)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('B')}
              className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
            >
              All B (7.00 SGPA)
            </button>
          </div>
        </div>
      </div>

      {/* Main Subjects Table & Grade Selectors (6 Theory & 4 Practical) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Left Column: 6 Theory Subjects */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                6
              </span>
              <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Theory Subjects (1 to 6)
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {theorySubjects.reduce((acc, s) => acc + s.credits, 0)} Total Credits
            </span>
          </div>

          <div className="space-y-2.5">
            {theorySubjects.map((sub, idx) => {
              const currentGrade = CBCS_GRADES.find((g) => g.grade === sub.grade) || CBCS_GRADES[0];
              const pointsEarned = sub.credits * sub.gradePoint;
              const isBacklog = sub.gradePoint === 0;

              return (
                <div
                  key={sub.id}
                  className={`bg-white border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 transition-all ${
                    isBacklog ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200/80 hover:border-emerald-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-[170px]">
                    <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      T{idx + 1}
                    </span>
                    <div>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                        {sub.name}
                      </h5>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span>Credits:</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={sub.credits}
                          onChange={(e) => handleCreditsChange(sub.id, parseInt(e.target.value) || 1)}
                          className="w-10 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:border-emerald-500 outline-hidden"
                          title="Click to adjust subject credits"
                        />
                        <span className="text-slate-400">×</span>
                        <span className="font-mono font-bold text-slate-700">{sub.gradePoint} pts</span>
                        <span className="text-slate-400">=</span>
                        <span className="font-mono font-bold text-emerald-700">{pointsEarned} pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Grade Dropdown Selector */}
                  <div className="flex items-center gap-2">
                    <select
                      value={sub.grade}
                      onChange={(e) => handleGradeChange(sub.id, e.target.value)}
                      className={`text-xs font-bold font-mono px-3 py-1.5 rounded-lg border cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-hidden transition-colors ${currentGrade.color}`}
                    >
                      {CBCS_GRADES.map((g) => (
                        <option key={g.grade} value={g.grade}>
                          Grade {g.grade} ({g.point} pts) - {g.range}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: 4 Practical / Lab Subjects */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Practical / Lab Subjects (1 to 4)
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {practicalSubjects.reduce((acc, s) => acc + s.credits, 0)} Total Credits
            </span>
          </div>

          <div className="space-y-2.5">
            {practicalSubjects.map((sub, idx) => {
              const currentGrade = CBCS_GRADES.find((g) => g.grade === sub.grade) || CBCS_GRADES[0];
              const pointsEarned = sub.credits * sub.gradePoint;
              const isBacklog = sub.gradePoint === 0;

              return (
                <div
                  key={sub.id}
                  className={`bg-white border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 transition-all ${
                    isBacklog ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200/80 hover:border-teal-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-[170px]">
                    <span className="w-6 h-6 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      P{idx + 1}
                    </span>
                    <div>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                        {sub.name}
                      </h5>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span>Credits:</span>
                        <input
                          type="number"
                          min={1}
                          max={4}
                          value={sub.credits}
                          onChange={(e) => handleCreditsChange(sub.id, parseInt(e.target.value) || 1)}
                          className="w-10 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:border-teal-500 outline-hidden"
                          title="Click to adjust lab credits"
                        />
                        <span className="text-slate-400">×</span>
                        <span className="font-mono font-bold text-slate-700">{sub.gradePoint} pts</span>
                        <span className="text-slate-400">=</span>
                        <span className="font-mono font-bold text-teal-700">{pointsEarned} pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Grade Dropdown Selector */}
                  <div className="flex items-center gap-2">
                    <select
                      value={sub.grade}
                      onChange={(e) => handleGradeChange(sub.id, e.target.value)}
                      className={`text-xs font-bold font-mono px-3 py-1.5 rounded-lg border cursor-pointer focus:ring-2 focus:ring-teal-500 outline-hidden transition-colors ${currentGrade.color}`}
                    >
                      {CBCS_GRADES.map((g) => (
                        <option key={g.grade} value={g.grade}>
                          Grade {g.grade} ({g.point} pts) - {g.range}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Information Notice for Practical subjects */}
          <div className="p-3 bg-teal-50/70 border border-teal-200/70 rounded-xl text-teal-900 text-xs flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
            <p className="leading-relaxed">
              <strong>Tip:</strong> BPUT engineering laboratory sessions usually hold 2 credits (or 1.5 credits). Securing grade <strong>O (10)</strong> or <strong>E (9)</strong> in practical sessions elevates overall SGPA.
            </p>
          </div>
        </div>
      </div>

      {/* Statutory Formula & Full Calculation Breakdown Box */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block text-xs sm:text-sm">
              Official BPUT SGPA Formula Breakdown
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              SGPA = Total Grade Points ({totalPoints.toFixed(1)}) ÷ Total Credits ({totalCredits}) = <strong className="text-emerald-700 text-xs">{calculatedSgpa}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">
          <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
            Theory Papers: <strong>6</strong>
          </span>
          <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
            Practical Labs: <strong>4</strong>
          </span>
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold shadow-2xs">
            Cleared: <strong>{passedCount} / {subjects.length}</strong>
          </span>
        </div>
      </div>
    </section>
  );
};
