import {
  BputApiResponse,
  BputResultListItem,
  BputStudentDetails,
  BputMarksData,
} from '../types/bput';

/**
 * Robust fetch wrapper with automatic retry on transient gateway errors (502, 503, 504) or network drops
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      // If server returned 502/503/504 gateway error, retry after backoff
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error(`Network request to ${url} failed`);
}

/**
 * Safe JSON parser that catches HTML error pages from Vercel / Cloudflare and yields friendly messages
 */
async function parseApiResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    if (res.status === 504) {
      throw new Error('BPUT Gateway Timeout: The official examination server took too long to respond. Please retry your query in a few seconds.');
    }
    if (res.status === 502 || res.status === 503) {
      if (json && (json.error || json.message)) {
        throw new Error(json.error || json.message);
      }
      throw new Error('BPUT Gateway Temporary Notice: The official university server is experiencing high traffic or security verification. Please retry in a few moments.');
    }
    if (json && (json.error || json.message)) {
      throw new Error(json.error || json.message);
    }
    throw new Error(defaultErrorMsg);
  }

  if (!json) {
    throw new Error('Invalid response received from BPUT Gateway.');
  }

  return json as T;
}

export async function checkServerHealth(): Promise<{ status: string; latencyMs: number; statusCode?: number; environment?: string }> {
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

  return await parseApiResponse<BputApiResponse<BputResultListItem[]>>(
    res,
    'Failed to fetch result list from BPUT gateway'
  );
}

export async function getStudentDetails(
  rollNo: string
): Promise<BputApiResponse<BputStudentDetails | null>> {
  const res = await fetchWithRetry('/api/bput/student-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNo: rollNo.trim() }),
  });

  return await parseApiResponse<BputApiResponse<BputStudentDetails | null>>(
    res,
    'Failed to fetch student details from BPUT gateway'
  );
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

  return await parseApiResponse<{ success: boolean; total: number; session: string; results: any[] }>(
    res,
    'Failed to process bulk batch results from BPUT gateway'
  );
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

  return await parseApiResponse<{ success: boolean; data: any }>(
    res,
    'Failed to fetch student result summary from BPUT gateway'
  );
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

  return await parseApiResponse<BputApiResponse<BputMarksData>>(
    res,
    'Failed to fetch marks and grades from BPUT gateway'
  );
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

  return await parseApiResponse<{
    success: boolean;
    rollNo: string;
    studentDetails?: BputStudentDetails;
    totalSessionsFound: number;
    allPublished: Array<{
      session: string;
      items: BputResultListItem[];
      marks?: BputMarksData;
    }>;
  }>(
    res,
    'Failed to scan all sessions from BPUT gateway'
  );
}
