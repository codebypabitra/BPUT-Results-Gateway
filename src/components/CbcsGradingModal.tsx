import React, { useState } from 'react';
import { X, Award, Calculator, BookOpen, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface CbcsGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CbcsGradingModal: React.FC<CbcsGradingModalProps> = ({ isOpen, onClose }) => {
  // Quick interactive SGPA test calculator
  const [calcSubjects, setCalcSubjects] = useState<Array<{ name: string; credit: number; gradePoint: number }>>([
    { name: 'Subject 1', credit: 4, gradePoint: 9 }, // E
    { name: 'Subject 2', credit: 4, gradePoint: 8 }, // A
    { name: 'Subject 3', credit: 3, gradePoint: 8 }, // A
    { name: 'Subject 4', credit: 3, gradePoint: 7 }, // B
    { name: 'Subject 5 (Lab)', credit: 2, gradePoint: 10 }, // O
  ]);

  if (!isOpen) return null;

  const totalCredits = calcSubjects.reduce((acc, s) => acc + s.credit, 0);
  const totalPoints = calcSubjects.reduce((acc, s) => acc + s.credit * s.gradePoint, 0);
  const calculatedSgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  const CBCS_SCALE = [
    { grade: 'O', point: 10, marks: '90% – 100%', desc: 'Outstanding', isBacklog: false },
    { grade: 'E', point: 9, marks: '80% – 89%', desc: 'Excellent', isBacklog: false },
    { grade: 'A', point: 8, marks: '70% – 79%', desc: 'Very Good', isBacklog: false },
    { grade: 'B', point: 7, marks: '60% – 69%', desc: 'Good', isBacklog: false },
    { grade: 'C', point: 6, marks: '50% – 59%', desc: 'Fair', isBacklog: false },
    { grade: 'D', point: 5, marks: '37% – 49%', desc: 'Pass', isBacklog: false },
    { grade: 'F', point: 0, marks: 'Below 37%', desc: 'Failed / Backlog', isBacklog: true },
    { grade: 'M', point: 0, marks: '—', desc: 'Malpractice', isBacklog: true },
    { grade: 'S', point: 0, marks: '—', desc: 'Absent', isBacklog: true },
  ];

  const handleGradeChange = (index: number, point: number) => {
    setCalcSubjects((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], gradePoint: point };
      return updated;
    });
  };

  const handleCreditChange = (index: number, credit: number) => {
    setCalcSubjects((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], credit: Math.max(1, Math.min(6, credit)) };
      return updated;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-sm select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cbcs-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200/80 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-900 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shadow-xs shrink-0">
              <Award className="w-5 h-5 text-emerald-700 stroke-[2.2]" />
            </span>
            <div>
              <h3 id="modal-cbcs-title" className="font-heading font-extrabold text-lg sm:text-xl text-slate-900 leading-tight">
                BPUT CBCS 10-Point Absolute Scale
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Official Biju Patnaik University of Technology Choice Based Credit System Rules
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CBCS Grade Matrix Table */}
        <div className="space-y-3">
          <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            Grade Point Classification Matrix
          </h4>

          <div className="overflow-x-auto border border-slate-200/80 rounded-2xl bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 font-bold uppercase text-[11px] tracking-wider text-slate-700">
                  <th className="py-3 px-3.5 border-r border-slate-100">Grade</th>
                  <th className="py-3 px-3.5 border-r border-slate-100">Point</th>
                  <th className="py-3 px-3.5 border-r border-slate-100">Marks Range</th>
                  <th className="py-3 px-3.5 border-r border-slate-100">Qualitative Description</th>
                  <th className="py-3 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {CBCS_SCALE.map((item) => (
                  <tr
                    key={item.grade}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      item.isBacklog ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-mono font-bold text-sm border-r border-slate-100">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg border font-bold ${
                          item.isBacklog
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {item.grade}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold border-r border-slate-100">
                      {item.point}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600 border-r border-slate-100">
                      {item.marks}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800 border-r border-slate-100">
                      {item.desc}
                    </td>
                    <td className="py-2.5 px-3.5">
                      {item.isBacklog ? (
                        <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Backlog Subject
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Passed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Backlog & Asterisk (*) Legend Notice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <h5 className="font-heading font-bold text-xs uppercase text-rose-900">
                Backlog Subject Rule
              </h5>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed font-medium">
              A student securing an <strong>'F' Grade</strong> (or 'M' / 'S') fails the subject and must reappear in the subsequent Odd or Even semester back examination.
            </p>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <Info className="w-4 h-4 text-amber-700" />
              <h5 className="font-heading font-bold text-xs uppercase text-amber-900">
                Asterisk (*) Recheck Notation
              </h5>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              An asterisk (<strong>*</strong>) attached to a grade indicates that the subject score has been officially upgraded or verified following an administrative rechecking process.
            </p>
          </div>
        </div>

        {/* Interactive SGPA Simulator */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
            <h5 className="font-heading font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-emerald-600" />
              Interactive SGPA Calculator
            </h5>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Simulated SGPA:</span>
              <span className="font-mono font-extrabold text-base sm:text-lg bg-emerald-50 text-emerald-800 px-3 py-0.5 rounded-xl border border-emerald-200 shadow-xs">
                {calculatedSgpa}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {calcSubjects.map((sub, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200/60 text-xs shadow-xs"
              >
                <span className="font-bold text-slate-800 min-w-0 truncate">{sub.name}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-semibold">Credits:</span>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={sub.credit}
                      onChange={(e) => handleCreditChange(idx, Number(e.target.value))}
                      className="w-12 h-7 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-center text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-semibold">Grade:</span>
                    <select
                      value={sub.gradePoint}
                      onChange={(e) => handleGradeChange(idx, Number(e.target.value))}
                      className="h-7 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs px-2 cursor-pointer"
                    >
                      <option value={10}>O (10)</option>
                      <option value={9}>E (9)</option>
                      <option value={8}>A (8)</option>
                      <option value={7}>B (7)</option>
                      <option value={6}>C (6)</option>
                      <option value={5}>D (5)</option>
                      <option value={0}>F (0 Backlog)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200/60 font-mono">
            <strong>Formula:</strong> SGPA = Σ (Credit × Grade Point) / Σ (Total Credits) = {totalPoints} / {totalCredits} = {calculatedSgpa}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-sm cursor-pointer transition-all"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
