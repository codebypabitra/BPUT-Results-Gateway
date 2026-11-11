import React, { useState } from 'react';
import { BputStudentDetails } from '../types/bput';
import { Share2, Check, Copy, UserCheck, ShieldCheck, MessageCircle } from 'lucide-react';

interface StudentDetailsCardProps {
  student: BputStudentDetails;
  semesterName?: string;
  examSession?: string;
  onShare?: () => void;
}

export const StudentDetailsCard: React.FC<StudentDetailsCardProps> = ({
  student,
  semesterName,
  examSession,
  onShare,
}) => {
  const [copied, setCopied] = useState(false);

  const copyRegNo = () => {
    navigator.clipboard.writeText(student.rollNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const currentUrl = window.location.href;
    const shareText = `🎓 *BPUT Provisional Result Record*\n*Student:* ${student.studentName}\n*Reg No:* ${student.rollNo}\n*Institute:* ${student.collegeName}\n*Branch:* ${student.branchName}\n${semesterName ? `*Semester:* ${semesterName}\n` : ''}${examSession ? `*Session:* ${examSession}\n` : ''}🔗 *Check Marksheet Online:*\n${currentUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <section
      className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden"
      data-purpose="student-bio-card"
      id="grade-details"
    >
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 sm:px-7 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shadow-xs">
            <UserCheck className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
              Student Academic Profile
            </h3>
            <p className="text-[11px] font-medium text-slate-500">Official University Provisional Record</p>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          {/* WhatsApp Direct Share Button */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border border-[#25D366]/30 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Share verified result directly to WhatsApp study groups"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-[#25D366] text-[#25D366]" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Share unique link to this student result"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Share Link</span>
            </button>
          )}

          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs select-none">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Record
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="space-y-4 w-full">
          {/* Registration No */}
          <div className="grid grid-cols-1 sm:grid-cols-12 border-b border-slate-100 pb-3.5 items-center gap-2">
            <span className="sm:col-span-3 text-xs font-bold uppercase text-slate-500 tracking-wider">
              Registration No.
            </span>
            <div className="sm:col-span-9 flex items-center gap-2.5">
              <span className="font-mono font-bold text-lg text-emerald-700 tracking-wider bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200/70 shadow-xs">
                {student.rollNo}
              </span>
              <button
                type="button"
                onClick={copyRegNo}
                className="text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-lg p-1.5 shadow-xs no-print transition-all cursor-pointer"
                title="Copy Registration Number"
              >
                {copied ? (
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </span>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Student Name */}
          <div className="grid grid-cols-1 sm:grid-cols-12 border-b border-slate-100 pb-3.5 gap-2 items-center">
            <span className="sm:col-span-3 text-xs font-bold uppercase text-slate-500 tracking-wider">
              Student Name
            </span>
            <span className="sm:col-span-9 font-extrabold text-base sm:text-lg text-slate-900 tracking-wide uppercase">
              {student.studentName}
            </span>
          </div>

          {/* College / Institute */}
          <div className="grid grid-cols-1 sm:grid-cols-12 border-b border-slate-100 pb-3.5 gap-2 items-center">
            <span className="sm:col-span-3 text-xs font-bold uppercase text-slate-500 tracking-wider">
              College / Institute
            </span>
            <span className="sm:col-span-9 font-semibold text-sm sm:text-base text-slate-800">
              {student.collegeName}
            </span>
          </div>

          {/* Branch / Degree */}
          <div className="grid grid-cols-1 sm:grid-cols-12 border-b border-slate-100 pb-3.5 gap-2 items-center">
            <span className="sm:col-span-3 text-xs font-bold uppercase text-slate-500 tracking-wider">
              Branch / Degree
            </span>
            <span className="sm:col-span-9 font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{student.branchName}</span>
            </span>
          </div>

          {/* Session / Semester Info */}
          {(semesterName || examSession) && (
            <div className="grid grid-cols-1 sm:grid-cols-12 pt-1 gap-2 items-center">
              <span className="sm:col-span-3 text-xs font-bold uppercase text-slate-500 tracking-wider">
                Exam Evaluation
              </span>
              <div className="sm:col-span-9 flex flex-wrap items-center gap-2 text-xs">
                {semesterName && (
                  <span className="font-semibold bg-slate-100 text-slate-800 px-3 py-1 rounded-full border border-slate-200">
                    {semesterName}
                  </span>
                )}
                {examSession && (
                  <span className="font-semibold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                    Session: {examSession}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
