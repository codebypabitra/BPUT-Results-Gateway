export interface BputSession {
  label: string;
  value: string;
}

export interface BputResultListItem {
  semester: string;
  course?: string;
  semId: string;
  branchName: string;
  rollNo: string;
  examSession: string;
}

export interface BputStudentDetails {
  rollNo: string;
  studentName: string;
  batch?: string;
  branchId?: string;
  studentPhoto?: string;
  branchName: string;
  courseName?: string;
  collegeCode?: string;
  collegeName: string;
  semId?: string | null;
  maxYear?: string | null;
  leet?: string | null;
}

export interface BputGradeSubject {
  semester: string;
  course?: string | null;
  semId?: string;
  branchName?: string | null;
  rollNo?: string;
  subjectCODE: string;
  subjectTP: string;
  subjectName: string;
  subjectCredits: number | string;
  grade: string;
  points?: number;
  creditPoints?: number;
  recheck?: number;
}

export interface BputSgpaDetails {
  cretits?: number | string;
  credits?: number | string;
  totalGradePoints?: number;
  sgpa: string | number;
}

export interface BputMarksData {
  grades: BputGradeSubject[];
  sgpadetails: BputSgpaDetails;
}

export type BacklogType = 'EXTERNAL' | 'INTERNAL' | 'BOTH' | 'OTHER';

export interface BacklogSubjectInfo {
  subjectCode: string;
  subjectName: string;
  grade: string; // e.g. "F(EX)", "F(INT)", "F(INT+EX)", "MP", "ABS"
  backlogType: BacklogType;
  subjectTP?: string;
  credits?: number | string;
  recheck?: number;
}

export interface AllPublishedSessionResult {
  session: string;
  items: BputResultListItem[];
  marks?: BputMarksData;
}

export interface BulkStudentResult {
  rollNo: string;
  studentName: string;
  collegeName: string;
  branchName: string;
  semester: string;
  semId: string;
  sgpa: number;
  credits: number;
  totalSubjects: number;
  passedSubjects: number;
  backlogsCount: number;
  externalBacklogsCount: number;
  internalBacklogsCount: number;
  otherBacklogsCount?: number;
  backlogSubjects: string[];
  backlogDetails?: BacklogSubjectInfo[];
  status: 'PASSED' | 'BACKLOG' | 'NOT_FOUND';
  grades?: any[];
}

/**
 * Accurately classifies a BPUT grade string and subject type into:
 * - External Backlog F(EX)
 * - Internal Backlog F(INT)
 * - Both F(INT+EX)
 * - Absent ABS (EX)
 * - Malpractice MP
 * - Other
 * Strictly prevents miscounting internal vs external components.
 */
export function classifyBacklogGrade(
  rawGrade: string,
  subjectTP?: string
): {
  isBacklog: boolean;
  backlogType: BacklogType;
  displayGrade: string;
  isExternal: boolean;
  isInternal: boolean;
} {
  const g = String(rawGrade || '').trim().toUpperCase();
  const tp = String(subjectTP || '').trim().toUpperCase();

  // Passing grades in CBCS
  if (['O', 'E', 'A', 'B', 'C', 'D'].includes(g)) {
    return {
      isBacklog: false,
      backlogType: 'OTHER',
      displayGrade: g,
      isExternal: false,
      isInternal: false,
    };
  }

  // Not passing or empty
  if (!g || g === '-' || g === 'NA') {
    return {
      isBacklog: false,
      backlogType: 'OTHER',
      displayGrade: '-',
      isExternal: false,
      isInternal: false,
    };
  }

  // Check for both internal & external fail
  if (
    (g.includes('INT') && (g.includes('EX') || g.includes('EXT'))) ||
    g === 'F(INT+EX)' ||
    g === 'F(INT&EX)' ||
    g === 'F(TOTAL)'
  ) {
    return {
      isBacklog: true,
      backlogType: 'BOTH',
      displayGrade: 'F(INT+EX)',
      isExternal: true,
      isInternal: true,
    };
  }

  // Explicit Internal fail
  if (
    g === 'F(INT)' ||
    g === 'F(INTERNAL)' ||
    g.includes('(INT)') ||
    (g.includes('INT') && !g.includes('EX')) ||
    (g === 'F' && tp === 'S')
  ) {
    return {
      isBacklog: true,
      backlogType: 'INTERNAL',
      displayGrade: 'F(INT)',
      isExternal: false,
      isInternal: true,
    };
  }

  // Explicit External fail
  if (
    g === 'F(EX)' ||
    g === 'F(EXT)' ||
    g === 'F(EXTERNAL)' ||
    g.includes('(EX)') ||
    g.includes('(EXT)') ||
    (g.includes('EX') && !g.includes('INT')) ||
    g === 'F'
  ) {
    return {
      isBacklog: true,
      backlogType: 'EXTERNAL',
      displayGrade: 'F(EX)',
      isExternal: true,
      isInternal: false,
    };
  }

  // Absent in External Exam
  if (g === 'S' || g === 'ABS' || g === 'ABSENT' || g.includes('ABS')) {
    return {
      isBacklog: true,
      backlogType: 'EXTERNAL',
      displayGrade: 'ABS (EX)',
      isExternal: true,
      isInternal: false,
    };
  }

  // Malpractice
  if (g === 'M' || g === 'MP' || g.includes('MALPRACTICE')) {
    return {
      isBacklog: true,
      backlogType: 'OTHER',
      displayGrade: 'MP',
      isExternal: false,
      isInternal: false,
    };
  }

  // Pending
  if (g === 'P' || g === 'PENDING') {
    return {
      isBacklog: true,
      backlogType: 'OTHER',
      displayGrade: 'Pending',
      isExternal: false,
      isInternal: false,
    };
  }

  // Any other fail
  return {
    isBacklog: true,
    backlogType: 'OTHER',
    displayGrade: g,
    isExternal: false,
    isInternal: false,
  };
}

export interface ApiResponseDebug {
  url: string;
  method?: string;
  status?: number;
  durationMs?: number;
  timestamp?: string;
  rawResponse?: string;
  note?: string;
  steps?: Array<{ step: string; url: string }>;
}

export interface BputApiResponse<T> {
  success: boolean;
  isLive?: boolean;
  isFallback?: boolean;
  data: T;
  message?: string;
  debug?: ApiResponseDebug;
  error?: string;
}

export const BPUT_SESSIONS: string[] = [
  "Supplementary 2025-26",
  "Even-(2025-26)",
  "Odd-(2025-26)",
  "Supplementary 2024-25",
  "Even-(2024-25)",
  "Odd-(2024-25)",
  "Supplementary 2023-24",
  "Even-(2023-24)",
  "Odd-(2023-24)",
  "Supplementary 2022-23",
  "Even-(2022-23)",
  "Odd-(2022-23)",
  "Supplementary 2021-22",
  "Re-ExamOdd (2021-22)",
  "Even-(2021-22)",
  "Odd-(2021-22)",
  "Supplementary 2020-21",
  "Even-(2020-21)",
  "Odd-(2020-21)",
  "Supplementary 2019-20",
  "Even-(2019-20)",
  "Odd-(2019-20)",
  "Special (2018-19)",
  "Even-(2018-19)",
  "Odd-(2018-19)",
  "Special-(2017-18)",
  "Even-(2017-18)",
  "Odd-(2017-18)",
  "Special-(2016-17)",
  "Even-(2016-17)",
  "Odd-(2016-17)",
  "Special-(2015-16)",
  "Even-(2015-16)",
  "Odd-(2015-16)"
];
