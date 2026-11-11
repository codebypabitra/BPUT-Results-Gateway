import {
  BputApiResponse,
  BputResultListItem,
  BputStudentDetails,
  BputMarksData,
} from '../types/bput';

/**
 * Robust fetch wrapper with automatic retry on transient gateway errors or network drops
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      // If server returned 502/503/504 gateway error, retry after backoff
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error(`Network request to ${url} failed`);
}

export async function checkServerHealth(): Promise<{ status: string; latencyMs: number; statusCode?: number }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch {
    return { status: 'offline', latencyMs: 0 };
  }
}

export async function getStudentResultsList(
  rollNo: string,
  session: string,
  dob?: string
): Promise<BputApiResponse<BputResultListItem[]>> {
  const res = await fetchWithRetry('/api/bput/student-results-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rollNo: rollNo.trim(),
      session: session.trim(),
      dob: dob || '2001-01-01',
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || errorJson.details || 'Failed to fetch result list from BPUT gateway');
  }

  return await res.json();
}

export async function getStudentDetails(
  rollNo: string
): Promise<BputApiResponse<BputStudentDetails | null>> {
  const res = await fetchWithRetry('/api/bput/student-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNo: rollNo.trim() }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || errorJson.details || 'Failed to fetch student details');
  }

  return await res.json();
}

export async function checkBatchResults(
  rollNumbers: string[],
  session: string
): Promise<{ success: boolean; total: number; session: string; results: any[] }> {
  const res = await fetchWithRetry('/api/bput/batch-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumbers, session }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to process bulk batch results');
  }

  return await res.json();
}

export async function getStudentSummary(
  rollNo: string,
  session: string
): Promise<{ success: boolean; data: any }> {
  const res = await fetchWithRetry('/api/bput/student-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNo: rollNo.trim(), session: session.trim() }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to fetch student result summary');
  }

  return await res.json();
}

export async function getStudentMarksAndGrades(
  rollNo: string,
  semId: string,
  session: string
): Promise<BputApiResponse<BputMarksData>> {
  const res = await fetchWithRetry('/api/bput/subjects-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rollNo: rollNo.trim(),
      semid: semId.trim(),
      session: session.trim(),
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || errorJson.details || 'Failed to fetch marks and grades');
  }

  return await res.json();
}

export async function getStudentAllSessions(
  rollNo: string,
  preferredSession?: string
): Promise<{
  success: boolean;
  rollNo: string;
  studentDetails?: BputStudentDetails;
  totalSessionsFound: number;
  allPublished: Array<{
    session: string;
    items: BputResultListItem[];
    marks?: BputMarksData;
  }>;
}> {
  const res = await fetchWithRetry('/api/bput/student-all-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rollNo: rollNo.trim(),
      session: preferredSession ? preferredSession.trim() : undefined,
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to scan all sessions for student');
  }

  return await res.json();
}
