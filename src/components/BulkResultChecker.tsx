import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Users,
  Search,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Award,
  Eye,
  FileText,
  StopCircle,
  Play,
  Pause,
  ArrowUpDown,
  Activity,
  RotateCcw,
  Share2,
  Check,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import { BPUT_SESSIONS, BulkStudentResult, classifyBacklogGrade } from '../types/bput';
import { getStudentSummary } from '../services/bputApi';
import { generateBulkClassReportPdf } from '../services/pdfGenerator';

interface BulkResultCheckerProps {
  session: string;
  setSession: (s: string) => void;
  onViewStudentMarks: (rollNo: string, semId: string, sessionName: string) => void;
  initialStart?: string;
  initialEnd?: string;
  initialRolls?: string;
  initialSession?: string;
  autoStart?: boolean;
  onShareBulk?: (shareUrl: string, title: string) => void;
}

interface AccessLog {
  id: string;
  timestamp: string;
  rollNo: string;
  status: 'PENDING' | 'SUCCESS' | 'BACKLOG' | 'NOT_FOUND' | 'ERROR';
  name?: string;
  sgpa?: number;
  message?: string;
}

export interface StudentPaper {
  code: string;
  name: string;
  grade: string;
  type: string;
  isBacklog: boolean;
  isExternal: boolean;
  isInternal: boolean;
  credits?: number | string;
  recheck?: number;
}

export const BulkResultChecker: React.FC<BulkResultCheckerProps> = ({
  session,
  setSession,
  onViewStudentMarks,
  initialStart = '',
  initialEnd = '',
  initialRolls = '',
  initialSession = '',
  autoStart = false,
  onShareBulk,
}) => {
  const [inputTab, setInputTab] = useState<'range' | 'csv' | 'paste'>('range');
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [extractedRolls, setExtractedRolls] = useState<string[]>([]);

  // Range inputs default (clean without hardcoded values)
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');

  // Paste input
  const [pastedText, setPastedText] = useState<string>('');

  // Processing & Individual Tracking States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeRoll, setActiveRoll] = useState<string | null>(null);
  const [progressCount, setProgressCount] = useState<number>(0);
  const [totalToProcess, setTotalToProcess] = useState<number>(0);

  // Live Results List
  const [results, setResults] = useState<BulkStudentResult[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showLiveConsole, setShowLiveConsole] = useState<boolean>(true);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASSED' | 'BACKLOG' | 'NOT_FOUND'>('ALL');
  const [sortBy, setSortBy] = useState<'SGPA_DESC' | 'SGPA_ASC' | 'ROLL_ASC' | 'NAME_ASC'>('SGPA_DESC');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [bulkPdfDownloaded, setBulkPdfDownloaded] = useState<boolean>(false);
  const [showAllSubjectNames, setShowAllSubjectNames] = useState<boolean>(false);
  const [expandedCardRolls, setExpandedCardRolls] = useState<Record<string, boolean>>({});

  const toggleCardRoll = (roll: string) => {
    setExpandedCardRolls((prev) => ({
      ...prev,
      [roll]: !prev[roll],
    }));
  };

  // Abort & Pause control refs
  const isStoppedRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);

  // URL Parameter Hydration & Auto-Start
  useEffect(() => {
    if (initialSession && initialSession !== 'default_option') {
      setSession(initialSession);
    }
    if (initialStart && initialEnd) {
      setRangeStart(initialStart);
      setRangeEnd(initialEnd);
      setInputTab('range');
      if (autoStart) {
        const startNum = parseInt(initialStart.trim(), 10);
        const endNum = parseInt(initialEnd.trim(), 10);
        if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum && endNum - startNum + 1 <= 150) {
          const autoRolls: string[] = [];
          for (let i = startNum; i <= endNum; i++) {
            autoRolls.push(String(i));
          }
          setTimeout(() => {
            handleStartBulkCheck(autoRolls);
          }, 250);
        }
      }
    } else if (initialRolls) {
      const rollsArr = initialRolls
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length === 10);
      if (rollsArr.length > 0) {
        setInputTab('paste');
        setPastedText(rollsArr.join('\n'));
        if (autoStart) {
          setTimeout(() => {
            handleStartBulkCheck(rollsArr);
          }, 250);
        }
      }
    }
  }, []);

  const handleShareBulkLink = async () => {
    const params = new URLSearchParams();
    params.set('mode', 'bulk');
    let shareLabel = 'BPUT Class Results';

    if (inputTab === 'range' && rangeStart && rangeEnd) {
      params.set('start', rangeStart.trim());
      params.set('end', rangeEnd.trim());
      shareLabel = `BPUT Class Results (${rangeStart} - ${rangeEnd})`;
    } else if (extractedRolls.length > 0) {
      params.set('rolls', extractedRolls.slice(0, 30).join(','));
      shareLabel = `BPUT Class Results (${extractedRolls.length} students)`;
    } else if (pastedText.trim()) {
      const matches = pastedText.match(/\b\d{10}\b/g) || [];
      if (matches.length > 0) {
        params.set('rolls', matches.slice(0, 30).join(','));
        shareLabel = `BPUT Class Results (${matches.length} students)`;
      }
    }

    if (session && session !== 'default_option') {
      params.set('session', session);
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    if (onShareBulk) {
      onShareBulk(shareUrl, shareLabel);
    } else {
      if (navigator.share && window.isSecureContext) {
        try {
          await navigator.share({
            title: shareLabel,
            text: `Check provisional BPUT class results: ${shareUrl}`,
            url: shareUrl,
          });
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShareLink(true);
        setTimeout(() => setCopiedShareLink(false), 2500);
      } catch {}
    }
  };

  // Handle CSV / TXT upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseRollNumbersFromText(text);
    };
    reader.readAsText(file);
  };

  const parseRollNumbersFromText = (text: string) => {
    const matches = text.match(/\b\d{10}\b/g) || [];
    const uniqueRolls = Array.from(new Set(matches));
    setExtractedRolls(uniqueRolls);
    if (uniqueRolls.length === 0) {
      setStatusMessage('No valid 10-digit registration numbers found in the file.');
    } else {
      setStatusMessage(`Found ${uniqueRolls.length} registration numbers ready for checking.`);
    }
  };

  // Generate range roll numbers
  const generateRangeRolls = () => {
    const startNum = parseInt(rangeStart.trim(), 10);
    const endNum = parseInt(rangeEnd.trim(), 10);

    if (isNaN(startNum) || isNaN(endNum) || rangeStart.length !== 10 || rangeEnd.length !== 10) {
      setStatusMessage('Please enter valid 10-digit starting and ending registration numbers.');
      return [];
    }

    if (endNum < startNum) {
      setStatusMessage('End registration number must be greater than or equal to start number.');
      return [];
    }

    const count = endNum - startNum + 1;
    if (count > 150) {
      setStatusMessage(`Range of ${count} students is too large. Please limit to at most 150 students per run.`);
      return [];
    }

    const rolls: string[] = [];
    for (let i = startNum; i <= endNum; i++) {
      rolls.push(String(i));
    }
    return rolls;
  };

  // Main Individual Tracking Process
  const handleStartBulkCheck = async (overrideRolls?: string[]) => {
    let targetRolls: string[] = [];

    if (overrideRolls && overrideRolls.length > 0) {
      targetRolls = overrideRolls;
    } else if (inputTab === 'csv') {
      targetRolls = extractedRolls;
    } else if (inputTab === 'range') {
      targetRolls = generateRangeRolls();
    } else if (inputTab === 'paste') {
      const matches = pastedText.match(/\b\d{10}\b/g) || [];
      targetRolls = Array.from(new Set(matches));
    }

    if (targetRolls.length === 0) {
      setStatusMessage('Please provide at least one valid 10-digit registration number.');
      return;
    }

    if (session === 'default_option' || !session) {
      setStatusMessage('Please select an examination session.');
      return;
    }

    // Sync URL in browser address bar
    const urlParams = new URLSearchParams();
    urlParams.set('mode', 'bulk');
    if (inputTab === 'range' && rangeStart && rangeEnd) {
      urlParams.set('start', rangeStart.trim());
      urlParams.set('end', rangeEnd.trim());
    } else if (targetRolls.length > 0) {
      urlParams.set('rolls', targetRolls.slice(0, 30).join(','));
    }
    if (session && session !== 'default_option') {
      urlParams.set('session', session);
    }
    window.history.replaceState(null, '', `?${urlParams.toString()}`);

    setIsProcessing(true);
    setIsPaused(false);
    isStoppedRef.current = false;
    isPausedRef.current = false;

    setProgressCount(0);
    setTotalToProcess(targetRolls.length);
    setResults([]);
    setLogs([]);
    setStatusMessage(null);

    const CONCURRENCY = 8;
    let nextIndex = 0;
    let processedTotal = 0;

    const worker = async () => {
      while (nextIndex < targetRolls.length && !isStoppedRef.current) {
        while (isPausedRef.current && !isStoppedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
        if (isStoppedRef.current) break;

        const idx = nextIndex++;
        if (idx >= targetRolls.length) break;

        const roll = targetRolls[idx];
        setActiveRoll(roll);

        const timeStr = new Date().toLocaleTimeString('en-GB');
        const pendingLogId = `log-${roll}-${Date.now()}`;
        setLogs((prev) => [
          {
            id: pendingLogId,
            timestamp: timeStr,
            rollNo: roll,
            status: 'PENDING',
            message: 'Accessing BPUT server...'
          },
          ...prev.slice(0, 35)
        ]);

        let data: BulkStudentResult | null = null;
        let lastError: any = null;

        // Perform up to 3 resilient attempts with progressive backoff to prevent transient socket drops
        for (let attempt = 0; attempt < 3; attempt++) {
          if (isStoppedRef.current) break;
          try {
            const res = await getStudentSummary(roll, session);
            if (res?.data) {
              const studentRec = res.data;
              data = studentRec;
              if (studentRec.status !== 'NOT_FOUND') {
                break; // Found successful record, proceed immediately
              }
              // If status is NOT_FOUND on first attempt, give BPUT a 300ms breather and recheck
              if (attempt === 0) {
                await new Promise((r) => setTimeout(r, 300));
              } else {
                break; // Confirmed not published
              }
            }
          } catch (err: any) {
            lastError = err;
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
            }
          }
        }

        if (data) {
          setResults((prev) => [...prev, data!]);
          processedTotal++;
          setProgressCount(processedTotal);

          const extCount = data.externalBacklogsCount || 0;
          const intCount = data.internalBacklogsCount || 0;
          const backlogTypeDetails =
            extCount > 0 && intCount > 0
              ? ` [${extCount} F(EX), ${intCount} F(INT)]`
              : extCount > 0
              ? ` [${extCount} F(EX)]`
              : intCount > 0
              ? ` [${intCount} F(INT)]`
              : '';

          setLogs((prev) =>
            prev.map((l) =>
              l.id === pendingLogId
                ? {
                    ...l,
                    status:
                      data!.status === 'PASSED'
                        ? 'SUCCESS'
                        : data!.status === 'BACKLOG'
                        ? 'BACKLOG'
                        : 'NOT_FOUND',
                    name: data!.studentName !== 'Record Not Found' ? data!.studentName : undefined,
                    sgpa: data!.sgpa,
                    message:
                      data!.status === 'PASSED'
                        ? `Passed • SGPA: ${data!.sgpa.toFixed(2)}`
                        : data!.status === 'BACKLOG'
                        ? `${data!.backlogsCount} Backlog${data!.backlogsCount > 1 ? 's' : ''}${backlogTypeDetails} • SGPA: ${data!.sgpa.toFixed(2)}`
                        : 'Result record not published for this session'
                  }
                : l
            )
          );
        } else {
          const failedRecord: BulkStudentResult = {
            rollNo: roll,
            studentName: 'Gateway Error',
            collegeName: 'N/A',
            branchName: 'N/A',
            semester: 'N/A',
            semId: '',
            sgpa: 0,
            credits: 0,
            totalSubjects: 0,
            passedSubjects: 0,
            backlogsCount: 0,
            externalBacklogsCount: 0,
            internalBacklogsCount: 0,
            otherBacklogsCount: 0,
            backlogSubjects: [],
            status: 'NOT_FOUND',
            grades: []
          };
          setResults((prev) => [...prev, failedRecord]);
          processedTotal++;
          setProgressCount(processedTotal);

          setLogs((prev) =>
            prev.map((l) =>
              l.id === pendingLogId
                ? {
                    ...l,
                    status: 'ERROR',
                    message: lastError?.message || 'Server connection error'
                  }
                : l
            )
          );
        }
      }
    };

    const workerThreads = Array.from(
      { length: Math.min(CONCURRENCY, targetRolls.length) },
      () => worker()
    );

    await Promise.all(workerThreads);

    setActiveRoll(null);
    setIsProcessing(false);
    setIsPaused(false);
    if (!isStoppedRef.current) {
      setStatusMessage(`Complete! Successfully processed all ${targetRolls.length} students with high-speed parallel tracking.`);
    }
  };

  const handleStop = () => {
    isStoppedRef.current = true;
    setIsProcessing(false);
    setIsPaused(false);
    setActiveRoll(null);
  };

  const handleTogglePause = () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    isPausedRef.current = nextPaused;
  };

  // Re-check only unresolved students (where BPUT returned not published or timed out)
  const handleRetryUnresolved = async () => {
    const unresolvedRolls = results
      .filter((r) => r.status === 'NOT_FOUND')
      .map((r) => r.rollNo);

    if (unresolvedRolls.length === 0) return;

    setStatusMessage(`Re-checking ${unresolvedRolls.length} unresolved students directly...`);
    setIsProcessing(true);

    for (const roll of unresolvedRolls) {
      try {
        const res = await getStudentSummary(roll, session);
        if (res.data) {
          setResults((prev) =>
            prev.map((item) => (item.rollNo === roll ? res.data : item))
          );
        }
      } catch {}
    }

    setIsProcessing(false);
    setStatusMessage(`Completed re-check for unresolved students.`);
  };

  // Extract all evaluated papers with subject codes and obtained grades
  const getAllStudentPapers = (st: BulkStudentResult): StudentPaper[] => {
    if (st.grades && Array.isArray(st.grades) && st.grades.length > 0) {
      return st.grades.map((g: any) => {
        const tp = String(g.subjectTP || '').trim().toUpperCase();
        const classification = classifyBacklogGrade(g.grade, tp);
        return {
          code: String(g.subjectCODE || '').trim(),
          name: String(g.subjectName || '').trim(),
          grade: classification.displayGrade || String(g.grade || '').trim(),
          type: tp,
          isBacklog: classification.isBacklog,
          isExternal: classification.isExternal,
          isInternal: classification.isInternal,
          credits: g.subjectCredits,
          recheck: g.recheck === 1 ? 1 : 0,
        };
      });
    }

    if (st.backlogDetails && st.backlogDetails.length > 0) {
      return st.backlogDetails.map((b) => {
        const classification = classifyBacklogGrade(b.grade, b.subjectTP);
        return {
          code: b.subjectCode,
          name: b.subjectName,
          grade: b.grade || classification.displayGrade,
          type: b.subjectTP || '',
          isBacklog: true,
          isExternal: classification.isExternal,
          isInternal: classification.isInternal,
          credits: b.credits,
          recheck: b.recheck === 1 ? 1 : 0,
        };
      });
    }

    if (st.backlogSubjects && st.backlogSubjects.length > 0) {
      return st.backlogSubjects.map((str) => {
        const matchWithDash = str.match(/^([A-Za-z0-9]+)\s*-\s*(.*?)\s*\((.*?)\)$/);
        if (matchWithDash) {
          const rawStatus = matchWithDash[3].trim();
          const classification = classifyBacklogGrade(rawStatus);
          return {
            code: matchWithDash[1].trim(),
            name: matchWithDash[2].trim(),
            grade: classification.displayGrade,
            type: classification.backlogType,
            isBacklog: classification.isBacklog,
            isExternal: classification.isExternal,
            isInternal: classification.isInternal,
            recheck: 0,
          };
        }
        return {
          code: str,
          name: '',
          grade: 'BACKLOG',
          type: '',
          isBacklog: true,
          isExternal: true,
          isInternal: false,
          recheck: 0,
        };
      });
    }

    return [];
  };

  // Generate & Download Class PDF Report
  const handleGenerateBulkPdf = () => {
    if (sortedFilteredResults.length === 0) return;
    try {
      setIsExportingPdf(true);
      generateBulkClassReportPdf(
        sortedFilteredResults,
        session,
        averageSgpa,
        passedRecords.length,
        backlogRecords.length,
        totalClassExtBacklogs,
        totalClassIntBacklogs
      );
      setBulkPdfDownloaded(true);
      setTimeout(() => {
        setIsExportingPdf(false);
      }, 700);
      setTimeout(() => {
        setBulkPdfDownloaded(false);
      }, 3500);
    } catch (err) {
      console.error('Failed to generate bulk PDF:', err);
      setIsExportingPdf(false);
    }
  };

  const handlePrintBulk = () => {
    handleGenerateBulkPdf();
    try {
      window.print();
    } catch {}
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const sampleContent = "registration_number\n2001289001\n2001289002\n2001289003\n2001289004\n2001289005\n";
    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bput_sample_students.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Results to CSV with complete paper-by-paper grades
  const handleExportResultsCsv = () => {
    if (results.length === 0) return;

    let csv =
      "Rank,Registration_No,Student_Name,College,Branch,Semester,SGPA,Total_Credits,Status,Total_Subjects,Passed_Subjects,Total_Backlogs,External_Backlogs_F_EX,Internal_Backlogs_F_INT,All_Papers_With_Grades,Backlog_Details\n";

    sortedFilteredResults.forEach((st, idx) => {
      const cleanName = `"${(st.studentName || '').replace(/"/g, '""')}"`;
      const cleanCollege = `"${(st.collegeName || '').replace(/"/g, '""')}"`;
      const cleanBranch = `"${(st.branchName || '').replace(/"/g, '""')}"`;
      const papers = getAllStudentPapers(st);
      const allPapersStr = `"${papers.map((p) => `${p.code}: ${p.grade}`).join('; ')}"`;
      const backlogs = papers.filter((p) => p.isBacklog);
      const backlogNotes = `"${backlogs.map((b) => `${b.code}: ${b.name || 'Subject'} [${b.grade}]`).join('; ')}"`;

      csv += `${idx + 1},${st.rollNo},${cleanName},${cleanCollege},${cleanBranch},${st.semester},${
        st.sgpa
      },${st.credits},${st.status},${st.totalSubjects},${st.passedSubjects},${st.backlogsCount},${
        st.externalBacklogsCount || 0
      },${st.internalBacklogsCount || 0},${allPapersStr},${backlogNotes}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BPUT_Class_Results_${session.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary Metrics
  const validRecords = results.filter((r) => r.status !== 'NOT_FOUND');
  const passedRecords = results.filter((r) => r.status === 'PASSED');
  const backlogRecords = results.filter((r) => r.status === 'BACKLOG');

  const totalClassExtBacklogs = results.reduce(
    (acc, r) => acc + (r.externalBacklogsCount || 0),
    0
  );
  const totalClassIntBacklogs = results.reduce(
    (acc, r) => acc + (r.internalBacklogsCount || 0),
    0
  );

  const averageSgpa =
    validRecords.length > 0
      ? (validRecords.reduce((acc, curr) => acc + (curr.sgpa || 0), 0) / validRecords.length).toFixed(2)
      : '0.00';

  const topperStudent = [...validRecords].sort((a, b) => (b.sgpa || 0) - (a.sgpa || 0))[0];

  // Filtering & Sorting
  const sortedFilteredResults = results
    .filter((st) => {
      if (filterStatus === 'PASSED' && st.status !== 'PASSED') return false;
      if (filterStatus === 'BACKLOG' && st.status !== 'BACKLOG') return false;
      if (filterStatus === 'NOT_FOUND' && st.status !== 'NOT_FOUND') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRoll = st.rollNo.toLowerCase().includes(q);
        const matchesName = st.studentName.toLowerCase().includes(q);
        const matchesBranch = st.branchName.toLowerCase().includes(q);
        return matchesRoll || matchesName || matchesBranch;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'SGPA_DESC') return (b.sgpa || 0) - (a.sgpa || 0);
      if (sortBy === 'SGPA_ASC') return (a.sgpa || 0) - (b.sgpa || 0);
      if (sortBy === 'ROLL_ASC') return a.rollNo.localeCompare(b.rollNo);
      if (sortBy === 'NAME_ASC') return a.studentName.localeCompare(b.studentName);
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Configuration & Input Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600 stroke-[2.2]" />
              <span>Bulk Student / Class / College Result Checker</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Accesses each student individually from BPUT gateway with automated recheck indicators &amp; subject names
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadSampleCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/80 font-semibold transition-colors cursor-pointer self-start sm:self-auto"
            title="Download CSV Template"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sample CSV File</span>
          </button>
        </div>

        {/* Session Selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Examination Session <span className="text-rose-500">*</span>
          </label>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            disabled={isProcessing}
            className="w-full sm:w-80 h-11 px-3.5 text-sm font-semibold bg-white border border-slate-200/80 rounded-xl shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden transition-all text-slate-800 cursor-pointer"
          >
            <option value="default_option">-- Select Examination Session --</option>
            {BPUT_SESSIONS.map((sess) => (
              <option key={sess} value={sess}>
                {sess}
              </option>
            ))}
          </select>
        </div>

        {/* Input Mode Tabs - Segmented Control */}
        <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1 mb-4 text-xs font-semibold overflow-x-auto scrollbar-none touch-scroll border border-slate-200/60">
          <button
            type="button"
            onClick={() => setInputTab('range')}
            className={`px-4 py-2 min-h-[38px] shrink-0 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              inputTab === 'range'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Registration No Range</span>
          </button>

          <button
            type="button"
            onClick={() => setInputTab('csv')}
            className={`px-4 py-2 min-h-[38px] shrink-0 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              inputTab === 'csv'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV File</span>
          </button>

          <button
            type="button"
            onClick={() => setInputTab('paste')}
            className={`px-4 py-2 min-h-[38px] shrink-0 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              inputTab === 'paste'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Registration Numbers</span>
          </button>
        </div>

        {/* Tab 1: Range Generator (Recommended for classes) */}
        {inputTab === 'range' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Registration No.
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10-digit start reg no."
                  className="w-full h-11 px-3.5 text-sm font-mono font-semibold bg-white border border-slate-200/80 rounded-xl shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Registration No.
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10-digit end reg no."
                  className="w-full h-11 px-3.5 text-sm font-mono font-semibold bg-white border border-slate-200/80 rounded-xl shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Each registration number from start to end will be queried individually in real-time.
            </p>
          </div>
        )}

        {/* Tab 2: CSV Upload */}
        {inputTab === 'csv' && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-emerald-50/30 shadow-xs"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900">
                Click to browse or drop CSV/TXT file with student registration numbers
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Supports column headers, comma-separated, or one registration number per line
              </p>
            </div>

            {csvFileName && (
              <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs shadow-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">{csvFileName}</span>
                </div>
                <span className="font-mono font-semibold text-emerald-800">
                  {extractedRolls.length} Registration Numbers Detected
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Paste */}
        {inputTab === 'paste' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Paste registration numbers (separated by commas, spaces, or lines):
            </label>
            <textarea
              rows={4}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="e.g. 2001289001, 2001289002, 2001289003..."
              className="w-full p-3 text-xs font-mono font-semibold bg-white border border-slate-200/80 rounded-xl shadow-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className="mt-4 p-3 bg-emerald-50 text-emerald-900 border border-emerald-200/80 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-emerald-700 hover:bg-emerald-100 text-xs px-2 py-0.5 rounded cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Actions & Live Progress Controls */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {!isProcessing ? (
              <button
                type="button"
                onClick={() => handleStartBulkCheck()}
                className="w-full sm:w-auto h-11 min-h-[44px] px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white text-white" />
                <span>Start Checking Results</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="flex-1 sm:flex-none h-11 min-h-[44px] px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleStop}
                  className="flex-1 sm:flex-none h-11 min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              </div>
            )}

            {/* Share Batch Link Button */}
            <button
              type="button"
              onClick={handleShareBulkLink}
              className="w-full sm:w-auto h-11 min-h-[44px] px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80 text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              title="Share unique link to this class query"
            >
              {copiedShareLink ? (
                <>
                  <Check className="w-4 h-4 stroke-[2.5] text-emerald-600" />
                  <span className="font-bold text-emerald-700">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 stroke-[2] text-slate-600" />
                  <span>Share Batch Link</span>
                </>
              )}
            </button>

            {results.length > 0 && !isProcessing && (
              <button
                type="button"
                onClick={() => {
                  setResults([]);
                  setLogs([]);
                  setProgressCount(0);
                }}
                className="w-full sm:w-auto h-11 min-h-[44px] px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Clear Table</span>
              </button>
            )}
          </div>

          {/* Active Tracker Pill */}
          {isProcessing && activeRoll && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-900 shadow-xs animate-pulse">
              <Activity className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>
                Accessing Reg No: <strong className="font-bold">{activeRoll}</strong> ({progressCount + 1}/{totalToProcess})
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isProcessing && totalToProcess > 0 && (
          <div className="mt-4 pt-2">
            <div className="flex justify-between text-xs font-mono font-semibold text-slate-700 mb-1.5">
              <span>Overall Progress:</span>
              <span>
                {progressCount} of {totalToProcess} processed ({Math.round((progressCount / totalToProcess) * 100)}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((progressCount / totalToProcess) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Live Student Data Access Stream Drawer */}
      {logs.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs no-print">
          <div className="px-3 sm:px-5 py-2 sm:py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600 shrink-0">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                  <span className="sm:hidden">Live Stream</span>
                  <span className="hidden sm:inline">Live Student Data Access Stream</span>
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Active
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono font-medium hidden xs:inline">
                {logs.length} entries
              </span>
              <button
                type="button"
                onClick={() => setShowLiveConsole(!showLiveConsole)}
                className="text-[10px] sm:text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                {showLiveConsole ? 'Hide Stream' : 'Show Stream'}
              </button>
            </div>
          </div>

          {showLiveConsole && (
            <div className="max-h-52 sm:max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
              {logs.map((log) => {
                const isPending = log.status === 'PENDING';
                const isSuccess = log.status === 'SUCCESS';
                const isBacklog = log.status === 'BACKLOG';
                const isNotFound = log.status === 'NOT_FOUND';

                return (
                  <div
                    key={log.id}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-[10px] sm:text-xs hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 font-medium">[{log.timestamp}]</span>
                      <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] border border-slate-200">
                        {log.rollNo}
                      </span>
                      {log.name && (
                        <span className="font-medium text-slate-800 truncate max-w-[120px] xs:max-w-xs text-[10px] sm:text-xs">
                          {log.name}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                          <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600 animate-spin" />
                          <span>Querying...</span>
                        </span>
                      ) : isSuccess ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 stroke-[2.5]" />
                          <span>All Clear • SGPA {log.sgpa?.toFixed(2)}</span>
                        </span>
                      ) : isBacklog ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-600 stroke-[2.5]" />
                          <span>{log.message}</span>
                        </span>
                      ) : isNotFound ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Not Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                          {log.message}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Real-time Results Dashboard & Table */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 print:grid-cols-5 print:gap-2 print:mb-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                Total Loaded
              </span>
              <span className="text-2xl font-bold text-slate-900 font-mono">
                {results.length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium block mt-0.5">Students accessed</span>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
              <span className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider block">
                All Clear (Passed)
              </span>
              <span className="text-2xl font-bold text-emerald-900 font-mono">
                {passedRecords.length}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                {validRecords.length > 0
                  ? `${Math.round((passedRecords.length / validRecords.length) * 100)}% Pass Rate`
                  : '0%'}
              </span>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-rose-800 font-semibold uppercase tracking-wider block">
                  With Backlogs
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-rose-300 bg-rose-100 text-rose-800">
                  Strict
                </span>
              </div>
              <span className="text-2xl font-bold text-rose-900 font-mono">
                {backlogRecords.length}
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono flex-wrap">
                <span className="text-rose-900 font-semibold bg-white/90 px-1.5 py-0.5 rounded border border-rose-200 shadow-xs">
                  {totalClassExtBacklogs} F(EX)
                </span>
                <span className="text-amber-900 font-semibold bg-white/90 px-1.5 py-0.5 rounded border border-amber-200 shadow-xs">
                  {totalClassIntBacklogs} F(INT)
                </span>
              </div>
            </div>

            <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-200/80 shadow-xs">
              <span className="text-[10px] text-teal-800 font-semibold uppercase tracking-wider block">
                Class Mean SGPA
              </span>
              <span className="text-2xl font-bold text-teal-900 font-mono">
                {averageSgpa}
              </span>
              <span className="text-[11px] text-teal-700 font-semibold block mt-0.5">Average score</span>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] text-amber-900 font-semibold uppercase tracking-wider block flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600 stroke-[2.2]" />
                Class Topper
              </span>
              <span className="text-2xl font-bold text-amber-950 font-mono">
                {topperStudent ? topperStudent.sgpa.toFixed(2) : '0.00'}
              </span>
              <span className="text-[10px] text-amber-800 font-semibold truncate block mt-0.5" title={topperStudent?.studentName}>
                {topperStudent ? topperStudent.studentName : 'No records'}
              </span>
            </div>
          </div>

          {/* Table Container with Increased Width for All Papers */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Table Control Bar */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
              {/* Search & Status Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-60">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, roll no, branch..."
                    className="w-full h-10 pl-8 pr-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200/80 rounded-xl font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden transition-all shadow-xs"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                </div>

                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs">
                  <button
                    onClick={() => setFilterStatus('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                      filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({results.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('PASSED')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                      filterStatus === 'PASSED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pass ({passedRecords.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('BACKLOG')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                      filterStatus === 'BACKLOG' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Backlog ({backlogRecords.length})
                  </button>
                </div>
              </div>

              {/* Sorting and Exports */}
              <div className="flex items-center flex-wrap gap-2">
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="h-10 px-3 text-xs font-semibold bg-white border border-slate-200/80 rounded-xl text-slate-800 shadow-xs cursor-pointer focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="SGPA_DESC">Sort: SGPA (Highest First)</option>
                  <option value="SGPA_ASC">Sort: SGPA (Lowest First)</option>
                  <option value="ROLL_ASC">Sort: Registration No.</option>
                  <option value="NAME_ASC">Sort: Student Name</option>
                </select>

                {results.some((r) => r.status === 'NOT_FOUND') && !isProcessing && (
                  <button
                    type="button"
                    onClick={handleRetryUnresolved}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Retry only unresolved student records (resolves intermittent network drops)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry ({results.filter((r) => r.status === 'NOT_FOUND').length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleShareBulkLink}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Share unique link to this class result table"
                >
                  {copiedShareLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-600" />
                      <span className="font-bold text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 stroke-[2] text-slate-600" />
                      <span>Share Batch Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleExportResultsCsv}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Export results table with all paper grades to CSV"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2] text-emerald-700" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateBulkPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-75"
                  title="Generate official vector PDF class report with all paper grades"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isExportingPdf ? 'Generating PDF...' : bulkPdfDownloaded ? 'PDF Saved' : 'Download PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintBulk}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Print Class Summary and download PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Result</span>
                </button>
              </div>
            </div>

            {/* Quick Grade Scale Legend (Desktop/Tablet) */}
            <div className="hidden md:flex items-center justify-between px-4 py-2 bg-slate-50/70 border-b border-slate-100 text-xs text-slate-600 no-print">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Grading Scale:</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                  Cleared: O (10), E (9), A (8), B (7), C (6), D (5)
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold">
                  Backlog: F (Exam), M (Malpractice), S (Absent)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  * = Rechecked
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 font-mono">
                {sortedFilteredResults.length} / {results.length} Students
              </span>
            </div>

            {/* Desktop/Tablet Table (hidden md:block print:block) */}
            <div className="hidden md:block overflow-x-auto w-full print:block">
              <table className="w-full text-left text-xs text-slate-800 border-collapse min-w-[1150px] print:min-w-full">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center border-r border-slate-200/60">Rank</th>
                    <th className="py-3 px-3 w-28 border-r border-slate-200/60">Reg No.</th>
                    <th className="py-3 px-4 w-44 border-r border-slate-200/60">Student Name</th>
                    <th className="py-3 px-4 w-48 border-r border-slate-200/60">Branch &amp; College</th>
                    <th className="py-3 px-3 w-20 text-center border-r border-slate-200/60">SGPA</th>
                    <th className="py-3 px-3 w-16 text-center border-r border-slate-200/60">Credits</th>
                    <th className="py-3 px-4 min-w-[500px] lg:min-w-[620px] border-r border-slate-200/60">
                      Subjects (Code &amp; Name) &amp; Obtained Grades
                    </th>
                    <th className="py-3 px-3 w-20 text-center no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedFilteredResults.map((st, idx) => {
                    const isTopper = idx === 0 && st.sgpa > 0 && sortBy === 'SGPA_DESC';
                    const hasBacklog = st.status === 'BACKLOG';
                    const allPapers = getAllStudentPapers(st);

                    return (
                      <tr
                        key={`${st.rollNo}-${idx}`}
                        className={`transition-colors ${
                          isTopper
                            ? 'bg-amber-50/60 font-medium'
                            : hasBacklog
                            ? 'bg-rose-50/40'
                            : idx % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/50'
                        } hover:bg-slate-50`}
                      >
                        <td className="py-3 px-3 text-center border-r border-slate-100 font-mono font-semibold text-slate-500 align-top">
                          {isTopper ? '🏆 1' : idx + 1}
                        </td>
                        <td className="py-3 px-3 border-r border-slate-100 font-mono font-semibold text-slate-800 align-top">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {st.rollNo}
                          </span>
                        </td>
                        <td className="py-3 px-4 border-r border-slate-100 font-semibold text-slate-900 align-top">
                          {st.studentName}
                        </td>
                        <td className="py-3 px-4 border-r border-slate-100 text-slate-600 align-top break-words whitespace-normal print:whitespace-normal">
                          <span className="block font-semibold text-slate-900 break-words print:whitespace-normal">{st.branchName}</span>
                          <span className="block text-[11px] text-slate-500 break-words print:whitespace-normal mt-1 leading-snug font-medium">
                            {st.collegeName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-100 font-mono font-bold text-sm align-top">
                          {st.sgpa > 0 ? (
                            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200">
                              {st.sgpa.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400">0.00</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-100 font-mono font-semibold text-slate-700 align-top">
                          {st.credits}
                        </td>

                        {/* WIDE Subjects & Obtained Grades Column */}
                        <td className="py-3 px-4 border-r border-slate-100 min-w-[500px] lg:min-w-[620px] align-top break-words print:whitespace-normal">
                          {st.status !== 'NOT_FOUND' ? (
                            <div className="space-y-2">
                              {/* Overall Status Pill */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                {st.status === 'PASSED' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
                                    <span>All Clear ({allPapers.length} Papers Cleared)</span>
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 stroke-[2.5] shrink-0" />
                                      {st.backlogsCount} Backlog{st.backlogsCount > 1 ? 's' : ''}
                                    </span>
                                    {(st.externalBacklogsCount || 0) > 0 && (
                                      <span
                                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-300"
                                        title="External Exam Failures"
                                      >
                                        {st.externalBacklogsCount} F(EX)
                                      </span>
                                    )}
                                    {(st.internalBacklogsCount || 0) > 0 && (
                                      <span
                                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                        title="Internal Assessment Failures"
                                      >
                                        {st.internalBacklogsCount} F(INT)
                                      </span>
                                    )}
                                  </div>
                                )}
                                <span className="text-[10px] font-semibold text-slate-500 font-mono">
                                  Passed: {st.passedSubjects}/{st.totalSubjects} • Credits: {st.credits}
                                </span>
                              </div>

                              {/* All Evaluated Papers with Subject Code, Subject Name & Obtained Grade */}
                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-1.5 pt-0.5">
                                {allPapers.map((paper, pIdx) => {
                                  const isFail = paper.isBacklog;
                                  let cardBorder = 'bg-white border-slate-200/80 hover:border-slate-300';
                                  let gradeBadge = 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold';

                                  if (isFail) {
                                    cardBorder = 'bg-rose-50/50 border-rose-200';
                                    gradeBadge = 'bg-rose-600 text-white font-bold';
                                  }

                                  return (
                                    <div
                                      key={pIdx}
                                      className={`p-2 rounded-xl border text-xs leading-snug flex items-center justify-between gap-2.5 transition-all shadow-2xs ${cardBorder}`}
                                    >
                                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px] shrink-0">
                                          {paper.code}
                                        </span>
                                        <span className="font-semibold text-slate-800 text-xs break-words print:whitespace-normal">
                                          {paper.name || 'Subject'}
                                        </span>
                                      </div>
                                      <div className="shrink-0 flex items-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs ${gradeBadge}`}>
                                          {paper.grade}
                                          {paper.recheck === 1 && (
                                            <span className="text-red-500 font-bold text-sm ml-0.5 leading-none" title="Grade updated via official rechecking">*</span>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium text-[11px]">Record Not Published</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center no-print align-top">
                          {st.status !== 'NOT_FOUND' && (
                            <button
                              type="button"
                              onClick={() => onViewStudentMarks(st.rollNo, st.semId, session)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                              title="View detailed marksheet"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Marks</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Student Results Card View (md:hidden no-print) */}
            <div className="md:hidden p-3.5 space-y-3 no-print bg-[#FAFBFD]">
              {/* Mobile Micro Legend & View Mode Toggle */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs flex flex-col gap-2">
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Grading Legend:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !showAllSubjectNames;
                      setShowAllSubjectNames(next);
                      const bulkRolls: Record<string, boolean> = {};
                      sortedFilteredResults.forEach((r) => {
                        bulkRolls[r.rollNo] = next;
                      });
                      setExpandedCardRolls(bulkRolls);
                    }}
                    className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    {showAllSubjectNames ? 'Compact Badges All' : 'Show All Names'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                    Pass: O, E, A, B, C, D
                  </span>
                  <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-bold">
                    Backlog: F, M, S
                  </span>
                  <span className="text-slate-400 font-sans">
                    (* = Rechecked)
                  </span>
                </div>
              </div>

              {sortedFilteredResults.map((st, idx) => {
                const isTopper = idx === 0 && st.sgpa > 0 && sortBy === 'SGPA_DESC';
                const hasBacklog = st.status === 'BACKLOG';
                const allPapers = getAllStudentPapers(st);
                const isCardExpanded =
                  expandedCardRolls[st.rollNo] !== undefined
                    ? expandedCardRolls[st.rollNo]
                    : showAllSubjectNames;

                return (
                  <div
                    key={`m-bulk-${st.rollNo}-${idx}`}
                    className={`p-4 rounded-2xl border transition-all shadow-xs ${
                      isTopper
                        ? 'bg-amber-50/70 border-amber-200'
                        : hasBacklog
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: Rank, Reg No, SGPA */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg border ${
                            isTopper
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          #{isTopper ? '1 TOPPER' : idx + 1}
                        </span>
                        <span className="font-mono font-semibold text-xs bg-white text-slate-800 border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
                          {st.rollNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {st.sgpa > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            SGPA: {st.sgpa.toFixed(2)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono text-slate-400 bg-slate-50 border border-slate-200">
                            SGPA: 0.00
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Student Name */}
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {st.studentName}
                    </h4>

                    {/* Branch & College */}
                    <div className="mt-1 text-xs text-slate-600 leading-tight">
                      <span className="font-semibold text-slate-800">{st.branchName}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{st.collegeName}</p>
                    </div>

                    {/* Status Badge & Counts */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                      {st.status === 'PASSED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
                          <span>All Clear ({allPapers.length} Cleared)</span>
                        </span>
                      ) : st.status === 'BACKLOG' ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 stroke-[2.5] shrink-0" />
                            {st.backlogsCount} Backlog{st.backlogsCount > 1 ? 's' : ''}
                          </span>
                          {(st.externalBacklogsCount || 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-300">
                              {st.externalBacklogsCount} F(EX)
                            </span>
                          )}
                          {(st.internalBacklogsCount || 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              {st.internalBacklogsCount} F(INT)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium text-xs">Record Not Published</span>
                      )}

                      <span className="text-[11px] font-mono font-medium text-slate-600">
                        Credits: {st.credits}
                      </span>
                    </div>

                    {/* Evaluated Papers List - Space-saving Badge UI */}
                    {allPapers.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center gap-1">
                            <span>Subject Grades</span>
                            <span className="text-slate-400 font-mono">({allPapers.length})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCardRoll(st.rollNo)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                            title={isCardExpanded ? 'Switch to compact badges' : 'View full subject titles'}
                          >
                            <span>{isCardExpanded ? 'Compact' : 'Names'}</span>
                            <ChevronDown
                              className={`w-3 h-3 transition-transform duration-200 ${
                                isCardExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>

                        {isCardExpanded ? (
                          /* Expanded view showing full subject names */
                          <div className="space-y-1.5 pt-0.5">
                            {allPapers.map((paper, pIdx) => {
                              const isFail = paper.isBacklog;
                              return (
                                <div
                                  key={`m-p-exp-${pIdx}`}
                                  className={`p-1.5 px-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                                    isFail
                                      ? 'bg-rose-50/70 border-rose-200'
                                      : 'bg-slate-50/70 border-slate-200/80'
                                  }`}
                                >
                                  <div className="min-w-0 flex items-center gap-1.5">
                                    <span className="font-mono font-semibold text-[10px] bg-white text-slate-700 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                                      {paper.code}
                                    </span>
                                    <span className="font-medium text-slate-800 text-[11px] truncate">
                                      {paper.name || 'Subject'}
                                    </span>
                                  </div>
                                  <span
                                    className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold ${
                                      isFail
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {paper.grade}
                                    {paper.recheck === 1 && (
                                      <span className="text-red-500 font-bold ml-0.5" title="Grade updated via official rechecking">
                                        *
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Default Space-Saving Badge Pill Clusters */
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {allPapers.map((paper, pIdx) => {
                              const isFail = paper.isBacklog;
                              return (
                                <div
                                  key={`m-p-badge-${pIdx}`}
                                  title={
                                    paper.name
                                      ? `${paper.code}: ${paper.name} (Grade: ${paper.grade})`
                                      : `${paper.code} (${paper.grade})`
                                  }
                                  className={`inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg border text-[11px] font-mono transition-colors shadow-2xs ${
                                    isFail
                                      ? 'bg-rose-50 border-rose-300 text-rose-950 font-semibold ring-1 ring-rose-200'
                                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <span className="font-semibold text-slate-900">{paper.code}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      isFail
                                        ? 'bg-rose-600 text-white shadow-2xs'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {paper.grade}
                                    {paper.recheck === 1 && (
                                      <span
                                        className="text-red-500 font-bold ml-0.2"
                                        title="Grade updated via official rechecking"
                                      >
                                        *
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mobile Action Button */}
                    {st.status !== 'NOT_FOUND' && (
                      <button
                        type="button"
                        onClick={() => onViewStudentMarks(st.rollNo, st.semId, session)}
                        className="mt-3 w-full h-11 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Marksheet</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Official Printable Report Footer */}
            <div className="hidden print-only p-4 border-t-2 border-slate-800 text-xs text-slate-800 print-page-break">
              <div className="flex justify-between items-end">
                <div>
                  <p className="font-bold uppercase tracking-wider text-black">
                    Class / College Academic Evaluation Summary
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Total Evaluated: {results.length} | Cleared: {passedRecords.length} | Backlogs: {backlogRecords.length} | Mean SGPA: {averageSgpa}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1">
                    Computer Generated Record • University Results Gateway
                  </p>
                </div>
                <div className="text-right">
                  <div className="h-10"></div>
                  <p className="font-bold uppercase tracking-wider text-slate-900 border-t border-slate-800 pt-1">
                    Head of Department / Examination Cell
                  </p>
                  <p className="text-[10px] text-slate-600">Verification &amp; Record Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
