import React, { useState, useEffect } from 'react';
import { SearchForm } from './components/SearchForm';
import { ResultListTable } from './components/ResultListTable';
import { StudentDetailsCard } from './components/StudentDetailsCard';
import { MarksTable } from './components/MarksTable';
import { BulkResultChecker } from './components/BulkResultChecker';
import { StudentMarksModal } from './components/StudentMarksModal';
import { OfficialDisclaimer } from './components/OfficialDisclaimer';
import { MarqueeBanner } from './components/MarqueeBanner';
import {
  getStudentResultsList,
  getStudentDetails,
  getStudentMarksAndGrades,
  getStudentAllSessions,
} from './services/bputApi';
import {
  BputResultListItem,
  BputStudentDetails,
  BputMarksData,
  classifyBacklogGrade,
} from './types/bput';
import { generateStudentMarksheetPdf } from './services/pdfGenerator';
import { Share2, Check, Copy, Sparkles, User, Users, AlertCircle, School, BookOpen } from 'lucide-react';
import { ResultModeTabs } from './components/ResultModeTabs';
import { CbcsGradingModal } from './components/CbcsGradingModal';
import { AcademicFeaturesGrid } from './components/AcademicFeaturesGrid';
import { StudentFaqAccordion } from './components/StudentFaqAccordion';

export default function App() {
  const [activeMode, setActiveMode] = useState<'single' | 'bulk'>('single');
  const [isGradingModalOpen, setIsGradingModalOpen] = useState<boolean>(false);
  const [session, setSession] = useState<string>('Even-(2025-26)');
  const [rollNo, setRollNo] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingSem, setIsFetchingSem] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resultsList, setResultsList] = useState<BputResultListItem[]>([]);
  const [selectedSemId, setSelectedSemId] = useState<string>('');
  const [selectedSessionName, setSelectedSessionName] = useState<string>('');
  const [selectedSemName, setSelectedSemName] = useState<string>('');

  const [allSessionsList, setAllSessionsList] = useState<Array<{
    session: string;
    items: BputResultListItem[];
    marks?: BputMarksData;
  }>>([]);

  const [studentDetails, setStudentDetails] = useState<BputStudentDetails | null>(null);
  const [marksData, setMarksData] = useState<BputMarksData | null>(null);

  // Bulk parameters received from URL query
  const [bulkParams, setBulkParams] = useState<{
    start: string;
    end: string;
    rolls: string;
    session: string;
    autoStart: boolean;
  }>({
    start: '',
    end: '',
    rolls: '',
    session: '',
    autoStart: false,
  });

  // Global floating toast notification
  const [toast, setToast] = useState<{ title: string; description?: string } | null>(null);

  const showToast = (title: string, description?: string) => {
    setToast({ title, description });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // Modal for viewing student marks from bulk list
  const [modalStudent, setModalStudent] = useState<{
    rollNo: string;
    semId: string;
    session: string;
  } | null>(null);

  // Synchronize browser address bar with current student & session without reload
  const updateSingleUrl = (targetRoll: string, targetSession?: string) => {
    if (!targetRoll || targetRoll.length !== 10) return;
    const p = new URLSearchParams();
    p.set('regd', targetRoll);
    if (targetSession && targetSession !== 'default_option') {
      p.set('session', targetSession);
    }
    const newPath = `${window.location.pathname}?${p.toString()}`;
    window.history.replaceState(null, '', newPath);
  };

  const handleShareSingleResult = async () => {
    const clean = rollNo.trim().replace(/\D/g, '');
    if (!clean) {
      showToast('Enter Registration Number', 'Please enter a valid 10-digit registration number first.');
      return;
    }
    const p = new URLSearchParams();
    p.set('regd', clean);
    const sess = selectedSessionName || session;
    if (sess && sess !== 'default_option') {
      p.set('session', sess);
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?${p.toString()}`;
    const studentTitle = studentDetails?.studentName
      ? `BPUT Result: ${studentDetails.studentName} (${clean})`
      : `BPUT Result: ${clean}`;

    if (navigator.share && window.isSecureContext) {
      try {
        await navigator.share({
          title: studentTitle,
          text: `Check provisional BPUT examination result for ${clean}: ${shareUrl}`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Unique Result Link Copied!', 'Anyone opening this link will directly view this student result.');
    } catch {
      showToast('Result URL Ready', shareUrl);
    }
  };

  const handleCustomShare = async (shareUrl: string, title: string) => {
    if (navigator.share && window.isSecureContext) {
      try {
        await navigator.share({
          title,
          text: `Check BPUT examination results: ${shareUrl}`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Unique Batch Link Copied!', 'Anyone opening this link will directly evaluate this batch.');
    } catch {
      showToast('Batch URL Ready', shareUrl);
    }
  };

  const handleTopShareClick = () => {
    if (activeMode === 'single' && rollNo && rollNo.length === 10) {
      handleShareSingleResult();
    } else {
      const shareUrl = window.location.href;
      handleCustomShare(shareUrl, 'BPUT Examination Results Portal');
    }
  };

  const handleReset = () => {
    setSession('Even-(2025-26)');
    setRollNo('');
    setResultsList([]);
    setAllSessionsList([]);
    setSelectedSemId('');
    setSelectedSessionName('');
    setSelectedSemName('');
    setStudentDetails(null);
    setMarksData(null);
    setErrorMessage(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  // URL Parameter Hydration on App Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const regd = params.get('regd') || params.get('roll');
    const mode = params.get('mode');
    const sess = params.get('session');
    const start = params.get('start');
    const end = params.get('end');
    const rolls = params.get('rolls');

    if (mode === 'bulk' || start || end || rolls) {
      setActiveMode('bulk');
      if (sess && sess !== 'default_option') {
        setSession(sess);
      }
      setBulkParams({
        start: start || '',
        end: end || '',
        rolls: rolls || '',
        session: sess || '',
        autoStart: Boolean((start && end) || rolls),
      });
    } else if (regd) {
      const clean = regd.trim().replace(/\D/g, '').slice(0, 10);
      if (clean.length === 10) {
        setActiveMode('single');
        setRollNo(clean);
        const searchSession = sess && sess !== 'default_option' ? sess : 'Even-(2025-26)';
        setSession(searchSession);
        // Automatically fetch and display result immediately!
        executeSearch(clean, searchSession);
      }
    }
  }, []);

  // Default Search: Automatically queries all published academic sessions for this student
  const handleSearch = async (e?: React.FormEvent, customRoll?: string) => {
    if (e) e.preventDefault();
    executeSearch(customRoll);
  };

  const executeSearch = async (targetRoll?: string, targetSession?: string) => {
    setErrorMessage(null);

    const clean = (targetRoll !== undefined ? targetRoll : rollNo).trim().replace(/\D/g, '');
    if (!clean || clean.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Registration Number.');
      return;
    }

    if (targetRoll) setRollNo(clean);
    const activeQuerySession = targetSession !== undefined ? targetSession : session;
    if (targetSession) setSession(activeQuerySession);

    // Keep address bar URL synchronized
    updateSingleUrl(clean, activeQuerySession);

    setIsLoading(true);
    setResultsList([]);
    setStudentDetails(null);
    setMarksData(null);
    setAllSessionsList([]);

    try {
      // Query all published academic sessions for this registration number simultaneously
      // Passing preferredSession ensures the currently selected session is prioritized and checked first
      const preferred = session && session !== 'default_option' ? session : undefined;
      let res;
      try {
        res = await getStudentAllSessions(clean, preferred);
      } catch (scanErr) {
        console.warn('Multi-session scan encountered error, falling back to direct session query:', scanErr);
        res = null;
      }

      if (res && res.studentDetails) {
        setStudentDetails(res.studentDetails);
      }

      if (res && res.allPublished && res.allPublished.length > 0) {
        setAllSessionsList(res.allPublished);

        // Build unified list of all published semesters across sessions
        const combinedResults: BputResultListItem[] = [];
        res.allPublished.forEach((publishedSession) => {
          publishedSession.items.forEach((item) => {
            combinedResults.push({
              ...item,
              examSession: publishedSession.session,
            });
          });
        });
        setResultsList(combinedResults);

        // Priority session selection: if user specifically selected a session, use it; else latest
        let targetSessionItem: { session: string; item: BputResultListItem; marks?: BputMarksData } | null = null;

        if (session && session !== 'default_option') {
          const matchSession = res.allPublished.find((s) => s.session === session);
          if (matchSession && matchSession.items.length > 0) {
            targetSessionItem = {
              session: matchSession.session,
              item: matchSession.items[0],
              marks: matchSession.marks,
            };
          }
        }

        if (!targetSessionItem) {
          const latest = res.allPublished[0];
          targetSessionItem = {
            session: latest.session,
            item: latest.items[0],
            marks: latest.marks,
          };
          if (latest.session) setSession(latest.session);
        }

        setSelectedSemId(targetSessionItem.item.semId);
        setSelectedSessionName(targetSessionItem.session);
        setSelectedSemName(targetSessionItem.item.semester || `Sem ${targetSessionItem.item.semId}`);

        if (targetSessionItem.marks) {
          setMarksData(targetSessionItem.marks);
        } else {
          await loadSemesterDetails(
            clean,
            targetSessionItem.item.semId,
            targetSessionItem.session,
            targetSessionItem.item.semester
          );
        }
      } else {
        // Resilient Direct Query Fallback: If all-session scan failed or returned empty,
        // directly query the selected session (or default active session)
        const fallbackSession = session && session !== 'default_option' ? session : 'Even-(2025-26)';
        
        // Concurrently attempt student details and result list
        const [response, detailsRes] = await Promise.allSettled([
          getStudentResultsList(clean, fallbackSession),
          getStudentDetails(clean)
        ]);

        if (detailsRes.status === 'fulfilled' && detailsRes.value?.data) {
          setStudentDetails(detailsRes.value.data);
        }

        if (response.status === 'fulfilled' && response.value.data && response.value.data.length > 0) {
          const list = response.value.data;
          setResultsList(list);
          const first = list[0];
          await loadSemesterDetails(
            first.rollNo || clean,
            first.semId,
            first.examSession || fallbackSession,
            first.semester
          );
        } else {
          // If still no record on that session, try one more common active session before giving up
          const backupSession = fallbackSession === 'Even-(2025-26)' ? 'Odd-(2025-26)' : 'Even-(2025-26)';
          try {
            const backupResp = await getStudentResultsList(clean, backupSession);
            if (backupResp.data && backupResp.data.length > 0) {
              setResultsList(backupResp.data);
              setSession(backupSession);
              const first = backupResp.data[0];
              await loadSemesterDetails(
                first.rollNo || clean,
                first.semId,
                backupSession,
                first.semester
              );
              return;
            }
          } catch {}

          setErrorMessage(
            `No published examination records found for Registration No. ${clean}. Please verify the registration number or select a different academic session.`
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to retrieve examination results from BPUT gateway.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSemesterDetails = async (
    targetRoll: string,
    semId: string,
    examSessionName: string,
    semName?: string
  ) => {
    setSelectedSemId(semId);
    setSelectedSessionName(examSessionName);
    setSelectedSemName(semName || semId);
    setIsFetchingSem(true);
    setErrorMessage(null);

    try {
      const [detailsRes, marksRes] = await Promise.all([
        getStudentDetails(targetRoll),
        getStudentMarksAndGrades(targetRoll, semId, examSessionName),
      ]);

      if (detailsRes.data) {
        setStudentDetails(detailsRes.data);
      }

      if (marksRes.data) {
        setMarksData(marksRes.data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error fetching semester marks and student details.');
    } finally {
      setIsFetchingSem(false);
    }
  };

  const handlePrint = () => {
    if (marksData) {
      generateStudentMarksheetPdf(
        studentDetails,
        marksData,
        selectedSessionName || session,
        selectedSemName || selectedSemId
      );
    }
    try {
      window.print();
    } catch {}
  };

  const examTitle = selectedSemName
    ? `${selectedSemName} Semester, ${selectedSessionName} Examination Result Summary`
    : 'Semester Examination Result Summary';

  return (
    <div className="min-h-full flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900 bg-[#FAFBFD] ambient-glow">
      {/* Top Scrolling Marquee Announcement Banner */}
      <MarqueeBanner
        onShareClick={handleTopShareClick}
        onOpenGradingModal={() => setIsGradingModalOpen(true)}
      />

      {/* Official Print Header */}
      <div className="hidden print-only text-center border-b-2 border-slate-800 pb-4 mb-4">
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
          PROVISIONAL STATEMENT OF GRADES • {selectedSessionName || session}
        </h2>
        <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono mt-2 border-t border-slate-300 pt-1">
          <span>Official Portal: results.bput.ac.in</span>
          <span>
            Printed on:{' '}
            {new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span>Status: Provisional Record</span>
        </div>
      </div>

      {/* Main Content Container */}
      <main
        className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-10 space-y-6"
        data-purpose="main-result-container"
      >
        {/* Title Header Banner with Official University Logo & JugaadBro Aesthetic */}
        <div className="pb-3 flex flex-col items-center justify-center text-center gap-3 no-print pt-2">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            BPUT Student Examination Gateway
          </span>

          <div className="p-1 my-1">
            <img
              src="/bput_logo.png"
              alt="BPUT Official University Logo"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-md"
            />
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-slate-900 tracking-tight text-center select-none leading-tight">
            Check BPUT Examination <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Results &amp; Marksheets</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xl text-center leading-relaxed">
            High-speed provisional examination records, multi-session auto-scan, verified CBCS grades, and vector PDF marksheet download.
          </p>
        </div>

        {/* Upgraded Result Mode Tab Switcher */}
        <ResultModeTabs
          activeMode={activeMode}
          onModeChange={(mode) => {
            setActiveMode(mode);
            if (mode === 'single') {
              if (rollNo && rollNo.length === 10) {
                updateSingleUrl(rollNo, selectedSessionName || session);
              } else {
                window.history.replaceState(null, '', window.location.pathname);
              }
            } else {
              const p = new URLSearchParams();
              p.set('mode', 'bulk');
              if (session && session !== 'default_option') {
                p.set('session', session);
              }
              window.history.replaceState(null, '', `?${p.toString()}`);
            }
          }}
        />

        {/* Error / Alert banner */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200/80 text-rose-900 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs no-print">
            <div className="w-5 h-5 text-rose-600 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 text-xs">
              <h4 className="font-bold text-sm text-rose-950 mb-0.5">Result Query Notice</h4>
              <p className="leading-relaxed text-rose-800 font-medium">{errorMessage}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setErrorMessage(null);
                  if (activeMode === 'single' && rollNo) {
                    handleSearch();
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold px-3 py-1 cursor-pointer transition-colors shadow-xs"
              >
                Retry
              </button>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold px-2.5 py-1 cursor-pointer transition-colors"
              >
                ✕ Close
              </button>
            </div>
          </div>
        )}

        {/* View Mode 1: Single Student Result */}
        {activeMode === 'single' && (
          <>
            <SearchForm
              session={session}
              setSession={setSession}
              rollNo={rollNo}
              setRollNo={setRollNo}
              onSearch={handleSearch}
              onReset={handleReset}
              isLoading={isLoading}
              onOpenGradingModal={() => setIsGradingModalOpen(true)}
            />

            {/* Multi-Session Found Summary Banner */}
            {allSessionsList.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>All Published Academic Sessions ({allSessionsList.length} Sessions Found)</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Select any academic session below to view that semester&apos;s provisional marksheet and statement of grades
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold bg-slate-50 text-slate-700 border border-slate-200/80 px-3 py-1 rounded-xl self-start sm:self-auto">
                    Reg No: {rollNo}
                  </span>
                </div>

                {/* Session selector tabs */}
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {allSessionsList.map((pub, sIdx) => {
                    const isSelected = selectedSessionName === pub.session;
                    const semName = pub.items[0]?.semester || `Sem ${pub.items[0]?.semId}`;
                    const rawSgpa = pub.marks?.sgpadetails?.sgpa;
                    const sgpa = rawSgpa !== undefined && rawSgpa !== null && rawSgpa !== ''
                      ? (typeof rawSgpa === 'number' ? rawSgpa.toFixed(2) : String(rawSgpa))
                      : null;
                    const failCount = pub.marks?.grades?.filter((g) => {
                      const c = classifyBacklogGrade(g.grade, g.subjectTP);
                      return c.isBacklog;
                    }).length || 0;

                    return (
                      <button
                        key={`${pub.session}-${sIdx}`}
                        type="button"
                        onClick={async () => {
                          setSelectedSessionName(pub.session);
                          updateSingleUrl(rollNo, pub.session);
                          if (pub.items[0]) {
                            const firstItem = pub.items[0];
                            setSelectedSemId(firstItem.semId);
                            setSelectedSemName(firstItem.semester || `Sem ${firstItem.semId}`);
                            if (pub.marks) {
                              setMarksData(pub.marks);
                            } else {
                              await loadSemesterDetails(
                                rollNo,
                                firstItem.semId,
                                pub.session,
                                firstItem.semester
                              );
                            }
                          }
                        }}
                        className={`shrink-0 px-4 py-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/80'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between gap-2.5">
                          <span>{pub.session}</span>
                          {sgpa && (
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold border ${
                                isSelected
                                  ? 'bg-emerald-700/60 text-white border-emerald-400/40'
                                  : 'bg-white text-slate-700 border-slate-200'
                              }`}
                            >
                              SGPA: {sgpa}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                          <span className={isSelected ? 'text-emerald-100' : 'text-slate-500'}>
                            {semName}
                          </span>
                          {failCount > 0 ? (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-rose-500/20 text-rose-200 border border-rose-300/40'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {failCount} Backlog
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/40'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              All Clear
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Loading Spinner for Semester Switch */}
            {isFetchingSem && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-xs no-print">
                <div className="inline-block w-8 h-8 border-3 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-900">
                  Retrieving semester marks &amp; grades from BPUT servers...
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1">Connecting to results.bput.ac.in</p>
              </div>
            )}

            {/* Published Results List (only shown if not in allSessionsList mode or to see details) */}
            {resultsList.length > 0 && allSessionsList.length === 0 && (
              <ResultListTable
                resultsList={resultsList}
                onSelectSem={(roll, semId, sess) => {
                  const item = resultsList.find((r) => r.semId === semId);
                  loadSemesterDetails(roll, semId, sess, item?.semester);
                }}
                selectedSemId={selectedSemId}
                isFetchingDetails={isFetchingSem}
              />
            )}

            {/* Student Details Card */}
            {studentDetails && (
              <StudentDetailsCard
                student={studentDetails}
                semesterName={selectedSemName}
                examSession={selectedSessionName}
                onShare={handleShareSingleResult}
              />
            )}

            {/* Marks & Grades Table with Summary Metrics & Action Bar */}
            {marksData && (
              <MarksTable
                marksData={marksData}
                examTitle={examTitle}
                student={studentDetails}
                examSession={selectedSessionName || session}
                semesterName={selectedSemName || selectedSemId}
                onPrint={handlePrint}
                onShare={handleShareSingleResult}
              />
            )}
          </>
        )}

        {/* View Mode 2: Bulk Class / College Results */}
        {activeMode === 'bulk' && (
          <BulkResultChecker
            session={session}
            setSession={setSession}
            initialStart={bulkParams.start}
            initialEnd={bulkParams.end}
            initialRolls={bulkParams.rolls}
            initialSession={bulkParams.session}
            autoStart={bulkParams.autoStart}
            onShareBulk={handleCustomShare}
            onViewStudentMarks={(roll, semId, sess) => {
              setModalStudent({ rollNo: roll, semId, session: sess });
            }}
          />
        )}

        {/* Academic Features Grid */}
        <AcademicFeaturesGrid
          onOpenGradingModal={() => setIsGradingModalOpen(true)}
          onOpenShare={handleTopShareClick}
        />

        {/* Student FAQ Accordion */}
        <StudentFaqAccordion />

        {/* Legal Disclaimer Box */}
        <OfficialDisclaimer />
      </main>

      {/* CBCS Grading Scheme Modal & SGPA Simulator */}
      <CbcsGradingModal
        isOpen={isGradingModalOpen}
        onClose={() => setIsGradingModalOpen(false)}
      />

      {/* Student Marks Modal for Bulk Table */}
      {modalStudent && (
        <StudentMarksModal
          rollNo={modalStudent.rollNo}
          semId={modalStudent.semId}
          session={modalStudent.session}
          onClose={() => setModalStudent(null)}
        />
      )}

      {/* Global Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800 max-w-sm sm:max-w-md animate-in fade-in slide-in-from-bottom-2 duration-200 no-print"
          role="status"
          aria-live="polite"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div className="flex-1 text-xs min-w-0">
            <p className="font-bold text-white text-xs">{toast.title}</p>
            {toast.description && (
              <p className="text-slate-300 font-medium text-[11px] mt-0.5 leading-snug line-clamp-2">
                {toast.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-bold px-2 py-1 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
