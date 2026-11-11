import express from 'express';
import type { Request, Response, Express } from 'express';
import https from 'node:https';
import http from 'node:http';
import { classifyBacklogGrade, type BacklogSubjectInfo, type BulkStudentResult } from '../types/bput.ts';

const BPUT_BASE_URL = 'https://results.bput.ac.in';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Firefox/127.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0'
];

let uaIndex = 0;
function getNextUserAgent(): string {
  const ua = USER_AGENTS[uaIndex % USER_AGENTS.length];
  uaIndex++;
  return ua;
}

// Detect if running inside a serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

// Persistent HTTPS Agent only for long-running stateful servers (AI Studio / local dev)
// On Serverless, we use fresh sockets to prevent dead socket reuse upon lambda thaw
const persistentHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 32,
  maxFreeSockets: 16,
  timeout: 10000,
  keepAliveMsecs: 15000,
});

class SimpleSemaphore {
  private active = 0;
  private queue: (() => void)[] = [];
  private maxConcurrency: number;

  constructor(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
  }

  async acquire(): Promise<void> {
    if (this.active < this.maxConcurrency) {
      this.active++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    if (this.queue.length > 0 && this.active < this.maxConcurrency) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

// Concurrency control to respect Cloudflare rate limits
const bputSemaphore = new SimpleSemaphore(8);

// Fast In-Memory Cache
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const studentDetailsCache = new Map<string, CacheEntry<any>>();
const studentMarksCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const item = map.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    map.delete(key);
    return null;
  }
  return item.data;
}

function setCached<T>(map: Map<string, CacheEntry<T>>, key: string, data: T): void {
  if (map.size > 2000) {
    const firstKey = map.keys().next().value;
    if (firstKey) map.delete(firstKey);
  }
  map.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Single HTTP attempt to BPUT with hardened Cloudflare and TLS headers
function executeSingleBputRequest(
  urlStr: string,
  method = 'POST',
  timeoutMs = 9000,
  useFreshSocket = false
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const isHttps = parsedUrl.protocol === 'https:';

      const headers: Record<string, string> = {
        'User-Agent': getNextUserAgent(),
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://results.bput.ac.in/',
        'Origin': 'https://results.bput.ac.in',
        'Host': 'results.bput.ac.in',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': '0',
        'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        // In serverless, always close connection to prevent frozen socket issues
        'Connection': isServerless || useFreshSocket ? 'close' : 'keep-alive',
      };

      const options: https.RequestOptions = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
        timeout: timeoutMs,
        agent: isServerless || useFreshSocket ? false : (isHttps ? persistentHttpsAgent : undefined),
        rejectUnauthorized: false, // Prevents certificate chain verification dropouts on Lambda runtimes
        family: 4, // Force IPv4 to prevent IPv6 routing latency/drops on cloud hosts
      };

      let timer: NodeJS.Timeout | null = null;

      const req = (isHttps ? https : http).request(options, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (timer) clearTimeout(timer);
          resolve({ status: res.statusCode || 200, text: body });
        });
      });

      timer = setTimeout(() => {
        req.destroy();
        reject(new Error(`BPUT request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      req.on('error', (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      });

      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Resilient request engine with exponential backoff and socket rejuvenation
async function fastBputRequest(
  urlStr: string,
  method = 'POST',
  timeoutMs = 9000,
  maxRetries = 2
): Promise<{ status: number; text: string }> {
  await bputSemaphore.acquire();
  try {
    let lastError: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const useFresh = isServerless || attempt > 0;
        const result = await executeSingleBputRequest(
          urlStr,
          method,
          timeoutMs + attempt * 1000,
          useFresh
        );

        // If Cloudflare or BPUT returned 5xx, retry with brief backoff
        if (result.status >= 500 && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
          continue;
        }

        return result;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1) + Math.random() * 100));
        }
      }
    }
    throw lastError || new Error('BPUT gateway communication failure after retries');
  } finally {
    bputSemaphore.release();
  }
}

// Check if raw response is Cloudflare challenge or HTML maintenance page
function isHtmlPage(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.includes('<body');
}

// Complete student result processor with caching and graceful fallbacks
export async function processStudentComplete(cleanRoll: string, session: string): Promise<BulkStudentResult> {
  const listUrl = `${BPUT_BASE_URL}/student-results-list?rollNo=${cleanRoll}&dob=2001-01-01&session=${encodeURIComponent(session)}`;
  const detailsUrl = `${BPUT_BASE_URL}/student-detsils-results?rollNo=${cleanRoll}`;

  const cachedDetails = getCached(studentDetailsCache, cleanRoll);

  const detailsPromise = cachedDetails
    ? Promise.resolve({ status: 200, text: JSON.stringify(cachedDetails) })
    : fastBputRequest(detailsUrl, 'POST', 7000, 2).catch(() => ({ status: 500, text: '' }));

  const listPromise = fastBputRequest(listUrl, 'POST', 8000, 2).catch(() => ({ status: 500, text: '' }));

  const [listRes, detRes] = await Promise.all([listPromise, detailsPromise]);

  let listData: any[] = [];
  try {
    if (!isHtmlPage(listRes.text)) {
      listData = JSON.parse(listRes.text);
    }
  } catch {
    listData = [];
  }

  let studentName = 'N/A';
  let collegeName = 'N/A';
  let branchName = 'N/A';

  try {
    if (!isHtmlPage(detRes.text)) {
      const detData = JSON.parse(detRes.text);
      if (detData && detData.studentName) {
        studentName = detData.studentName;
        collegeName = detData.collegeName || collegeName;
        branchName = detData.branchName || branchName;
        setCached(studentDetailsCache, cleanRoll, detData);
      }
    }
  } catch {}

  // If listData is empty, attempt a quick second check
  if (!Array.isArray(listData) || listData.length === 0) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const retryRes = await fastBputRequest(listUrl, 'POST', 8000, 1);
      if (!isHtmlPage(retryRes.text)) {
        listData = JSON.parse(retryRes.text);
      }
    } catch {}
  }

  if (!Array.isArray(listData) || listData.length === 0) {
    return {
      rollNo: cleanRoll,
      studentName: studentName !== 'N/A' ? studentName : 'Record Not Found',
      collegeName,
      branchName,
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
      backlogDetails: [],
      status: 'NOT_FOUND',
      grades: []
    };
  }

  const firstItem = listData[0];
  const targetSemId = firstItem.semId;
  branchName = firstItem.branchName || branchName;
  if (studentName === 'N/A' && firstItem.course) {
    studentName = `Student (${cleanRoll})`;
  }

  // Fetch marks
  let marksData: any = null;
  const marksCacheKey = `${cleanRoll}_${targetSemId}_${session}`;
  const cachedMarks = getCached(studentMarksCache, marksCacheKey);

  if (cachedMarks) {
    marksData = cachedMarks;
  } else {
    try {
      const marksUrl = `${BPUT_BASE_URL}/student-results-subjects-list?semid=${targetSemId}&rollNo=${cleanRoll}&session=${encodeURIComponent(session)}`;
      const mrkRes = await fastBputRequest(marksUrl, 'POST', 8000, 2);
      if (!isHtmlPage(mrkRes.text)) {
        marksData = JSON.parse(mrkRes.text);
        if (marksData && marksData.grades) {
          setCached(studentMarksCache, marksCacheKey, marksData);
        }
      }
    } catch {}
  }

  // If studentName is still missing, retry details once
  if (studentName.startsWith('Student (') || studentName === 'N/A') {
    try {
      const detRes2 = await fastBputRequest(detailsUrl, 'POST', 6000, 1);
      if (!isHtmlPage(detRes2.text)) {
        const detData2 = JSON.parse(detRes2.text);
        if (detData2 && detData2.studentName) {
          studentName = detData2.studentName;
          collegeName = detData2.collegeName || collegeName;
          branchName = detData2.branchName || branchName;
          setCached(studentDetailsCache, cleanRoll, detData2);
        }
      }
    } catch {}
  }

  let grades: any[] = [];
  let sgpa = 0;
  let credits = 0;
  let backlogsCount = 0;
  let externalBacklogsCount = 0;
  let internalBacklogsCount = 0;
  let otherBacklogsCount = 0;
  const backlogSubjects: string[] = [];
  const backlogDetails: BacklogSubjectInfo[] = [];

  if (marksData && Array.isArray(marksData.grades)) {
    grades = marksData.grades.map((g: any) => ({
      ...g,
      recheck: g.recheck === 1 ? 1 : 0
    }));
    sgpa = parseFloat(String(marksData.sgpadetails?.sgpa || 0)) || 0;
    credits = parseFloat(String(marksData.sgpadetails?.cretits || marksData.sgpadetails?.credits || 0)) || 0;

    grades.forEach((g: any) => {
      const code = String(g.subjectCODE || '').trim();
      const name = String(g.subjectName || '').trim();
      const tp = String(g.subjectTP || '').trim().toUpperCase();
      const subCredits = g.subjectCredits ?? '';

      const classification = classifyBacklogGrade(g.grade, tp);

      if (classification.isBacklog) {
        backlogsCount++;
        if (classification.isExternal) externalBacklogsCount++;
        if (classification.isInternal) internalBacklogsCount++;
        if (!classification.isExternal && !classification.isInternal) otherBacklogsCount++;

        const formattedStr = name
          ? `${code} - ${name} (${classification.displayGrade})`
          : `${code} (${classification.displayGrade})`;

        backlogSubjects.push(formattedStr);
        backlogDetails.push({
          subjectCode: code,
          subjectName: name,
          grade: classification.displayGrade,
          backlogType: classification.backlogType,
          subjectTP: tp,
          credits: subCredits,
          recheck: g.recheck === 1 ? 1 : 0
        });
      }
    });
  }

  return {
    rollNo: cleanRoll,
    studentName,
    collegeName,
    branchName,
    semester: firstItem.semester || `Sem ${targetSemId}`,
    semId: targetSemId,
    sgpa,
    credits,
    totalSubjects: grades.length,
    passedSubjects: Math.max(0, grades.length - backlogsCount),
    backlogsCount,
    externalBacklogsCount,
    internalBacklogsCount,
    otherBacklogsCount,
    backlogSubjects,
    backlogDetails,
    status: backlogsCount > 0 ? 'BACKLOG' : 'PASSED',
    grades
  };
}

const ALL_SESSIONS_LIST = [
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
  "Even-(2021-22)",
  "Odd-(2021-22)",
  "Supplementary 2020-21",
  "Even-(2020-21)",
  "Odd-(2020-21)"
];

/**
 * Filter sessions intelligently based on student's roll number prefix.
 * e.g., Roll number starting with '21' joined in 2021 -> query 2021-22 through 2025-26.
 * This avoids querying old irrelevant sessions and cuts request time by up to 70%!
 */
function getTargetSessionsForRoll(cleanRoll: string, preferredSession?: string): string[] {
  let filtered = [...ALL_SESSIONS_LIST];

  if (cleanRoll.length >= 2) {
    const prefix = cleanRoll.slice(0, 2);
    const joinYearNum = parseInt(prefix, 10);
    if (!isNaN(joinYearNum) && joinYearNum >= 15 && joinYearNum <= 30) {
      // Admitted in 20YY. A 4-year degree (or 5-year B.Arch) spans 20YY to 20(YY+6)
      const startYear = 2000 + joinYearNum;
      filtered = ALL_SESSIONS_LIST.filter((sess) => {
        const match = sess.match(/20(\d{2})/);
        if (!match) return true;
        const sessYear = parseInt('20' + match[1], 10);
        return sessYear >= startYear;
      });
    }
  }

  // Ensure preferred session is first if provided
  if (preferredSession && preferredSession !== 'default_option') {
    const idx = filtered.indexOf(preferredSession);
    if (idx > -1) {
      filtered.splice(idx, 1);
    }
    filtered.unshift(preferredSession);
  }

  return filtered;
}

/**
 * Attaches all BPUT API routes to an Express app.
 * Supports both '/api/bput/...' and '/bput/...' so Vercel rewrites work seamlessly.
 */
export function setupBputRoutes(app: Express): void {
  // Global CORS Middleware for both Vercel and local Express
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // 1. Health check & BPUT live connectivity ping
  const healthHandler = async (_req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const result = await fastBputRequest(`${BPUT_BASE_URL}/`, 'GET', 4000);
      const latency = Date.now() - startTime;
      res.json({
        status: result.status === 200 ? 'online' : 'degraded',
        statusCode: result.status,
        latencyMs: latency,
        bputUrl: BPUT_BASE_URL,
        environment: isServerless ? 'vercel-serverless' : 'express-node',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.json({
        status: 'offline',
        error: error?.message || 'BPUT server unreachable',
        latencyMs: Date.now() - startTime,
        bputUrl: BPUT_BASE_URL,
        environment: isServerless ? 'vercel-serverless' : 'express-node',
        timestamp: new Date().toISOString()
      });
    }
  };

  app.get(['/api/health', '/health'], healthHandler);

  // 2. Query Student Results List
  const studentResultsListHandler = async (req: Request, res: Response) => {
    const { rollNo, session } = req.body;
    const dob = req.body.dob || '2001-01-01';

    if (!rollNo || !session) {
      return res.status(400).json({ error: 'Missing rollNo or session parameter' });
    }

    const queryParams = new URLSearchParams({
      rollNo: String(rollNo).trim(),
      dob: String(dob).trim(),
      session: String(session).trim()
    });

    const targetUrl = `${BPUT_BASE_URL}/student-results-list?${queryParams.toString()}`;
    const startTime = Date.now();

    try {
      const bputRes = await fastBputRequest(targetUrl, 'POST', 8500);
      const durationMs = Date.now() - startTime;

      if (isHtmlPage(bputRes.text)) {
        return res.status(503).json({
          success: false,
          error: 'BPUT official result server is currently undergoing Cloudflare security verification or maintenance. Please retry in a moment.',
          status: 503,
          details: 'HTML challenge received from upstream gateway'
        });
      }

      let parsedData: any = null;
      try {
        parsedData = JSON.parse(bputRes.text);
      } catch {
        parsedData = null;
      }

      if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
        return res.json({
          success: true,
          isLive: true,
          data: parsedData,
          debug: { url: targetUrl, status: bputRes.status, durationMs }
        });
      }

      return res.json({
        success: true,
        isLive: true,
        data: parsedData || [],
        message: (parsedData && parsedData.length === 0)
          ? 'No published results found for this Registration Number and Session in official BPUT records.'
          : 'Empty result dataset returned from BPUT server.',
        debug: { url: targetUrl, status: bputRes.status, durationMs }
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      return res.status(502).json({
        success: false,
        error: 'Failed to contact official BPUT result server (results.bput.ac.in)',
        details: err?.message,
        debug: { url: targetUrl, durationMs }
      });
    }
  };

  app.post(['/api/bput/student-results-list', '/bput/student-results-list'], studentResultsListHandler);

  // 3. Query Student Details
  const studentDetailsHandler = async (req: Request, res: Response) => {
    const { rollNo } = req.body;
    if (!rollNo) {
      return res.status(400).json({ error: 'Missing rollNo parameter' });
    }

    const cleanRoll = String(rollNo).trim();
    const cached = getCached(studentDetailsCache, cleanRoll);
    if (cached) {
      return res.json({
        success: true,
        isLive: true,
        isCached: true,
        data: cached,
        debug: { url: 'cache-hit', durationMs: 0 }
      });
    }

    const targetUrl = `${BPUT_BASE_URL}/student-detsils-results?rollNo=${encodeURIComponent(cleanRoll)}`;
    const startTime = Date.now();

    try {
      const bputRes = await fastBputRequest(targetUrl, 'POST', 8500);
      const durationMs = Date.now() - startTime;

      if (isHtmlPage(bputRes.text)) {
        return res.status(503).json({
          success: false,
          error: 'BPUT student database temporarily undergoing Cloudflare protection verification. Please retry.',
          status: 503
        });
      }

      let parsedData: any = null;
      try {
        parsedData = JSON.parse(bputRes.text);
      } catch {
        parsedData = null;
      }

      if (parsedData && parsedData.rollNo) {
        setCached(studentDetailsCache, cleanRoll, parsedData);
        return res.json({
          success: true,
          isLive: true,
          data: parsedData,
          debug: { url: targetUrl, status: bputRes.status, durationMs }
        });
      }

      return res.json({
        success: false,
        data: null,
        message: 'Student details not found or invalid registration number in BPUT system',
        debug: { url: targetUrl, durationMs }
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      return res.status(502).json({
        success: false,
        error: 'BPUT student details gateway request failed',
        details: err?.message,
        debug: { url: targetUrl, durationMs }
      });
    }
  };

  app.post(['/api/bput/student-details', '/bput/student-details'], studentDetailsHandler);

  // 4. Query Subjects and Grades
  const subjectsListHandler = async (req: Request, res: Response) => {
    const { rollNo, semid, session } = req.body;
    if (!rollNo || !semid || !session) {
      return res.status(400).json({ error: 'Missing rollNo, semid, or session' });
    }

    const cacheKey = `${String(rollNo).trim()}_${String(semid).trim()}_${String(session).trim()}`;
    const cached = getCached(studentMarksCache, cacheKey);
    if (cached) {
      return res.json({
        success: true,
        isLive: true,
        isCached: true,
        data: cached,
        debug: { url: 'cache-hit', durationMs: 0 }
      });
    }

    const queryParams = new URLSearchParams({
      semid: String(semid).trim(),
      rollNo: String(rollNo).trim(),
      session: String(session).trim()
    });

    const targetUrl = `${BPUT_BASE_URL}/student-results-subjects-list?${queryParams.toString()}`;
    const startTime = Date.now();

    try {
      const bputRes = await fastBputRequest(targetUrl, 'POST', 8500);
      const durationMs = Date.now() - startTime;

      if (isHtmlPage(bputRes.text)) {
        return res.status(503).json({
          success: false,
          error: 'BPUT marksheet service is busy or undergoing Cloudflare verification. Please retry.',
          status: 503
        });
      }

      let parsedData: any = null;
      try {
        parsedData = JSON.parse(bputRes.text);
      } catch {
        parsedData = null;
      }

      if (parsedData && parsedData.grades && parsedData.grades.length > 0) {
        setCached(studentMarksCache, cacheKey, parsedData);
        return res.json({
          success: true,
          isLive: true,
          data: parsedData,
          debug: { url: targetUrl, status: bputRes.status, durationMs }
        });
      }

      return res.json({
        success: true,
        isLive: true,
        data: parsedData || { grades: [], sgpadetails: { cretits: 0, sgpa: '0' } },
        message: 'No grade details returned for this semester',
        debug: { url: targetUrl, durationMs }
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      return res.status(502).json({
        success: false,
        error: 'BPUT marks request failed',
        details: err?.message,
        debug: { url: targetUrl, durationMs }
      });
    }
  };

  app.post(['/api/bput/subjects-list', '/bput/subjects-list'], subjectsListHandler);

  // 5. Individual Student Summary
  const studentSummaryHandler = async (req: Request, res: Response) => {
    const { rollNo, session } = req.body;
    if (!rollNo || !session) {
      return res.status(400).json({ error: 'Missing rollNo or session' });
    }

    const cleanRoll = String(rollNo).trim().replace(/\D/g, '');
    if (cleanRoll.length !== 10) {
      return res.status(400).json({ error: 'Registration number must be 10 digits' });
    }

    try {
      const studentData = await processStudentComplete(cleanRoll, String(session).trim());
      return res.json({
        success: true,
        data: studentData
      });
    } catch (err: any) {
      return res.status(502).json({
        success: false,
        error: err?.message || 'Failed to query student result'
      });
    }
  };

  app.post(['/api/bput/student-summary', '/bput/student-summary'], studentSummaryHandler);

  // 6. Bulk / Batch Result Checker with strict timeout protection
  const batchCheckHandler = async (req: Request, res: Response) => {
    const { rollNumbers, session } = req.body;
    if (!rollNumbers || !Array.isArray(rollNumbers) || rollNumbers.length === 0 || !session) {
      return res.status(400).json({ error: 'Missing rollNumbers array or session parameter' });
    }

    // Limit to 80 rolls per batch to prevent serverless function timeout
    const sanitizedRolls = Array.from(
      new Set(
        rollNumbers
          .map((r: any) => String(r || '').trim().replace(/\D/g, ''))
          .filter((r: string) => r.length === 10)
      )
    ).slice(0, 80);

    if (sanitizedRolls.length === 0) {
      return res.status(400).json({ error: 'No valid 10-digit registration numbers provided' });
    }

    const sessionClean = String(session).trim();
    const results: BulkStudentResult[] = [];
    const CONCURRENCY = 6;

    for (let i = 0; i < sanitizedRolls.length; i += CONCURRENCY) {
      const chunk = sanitizedRolls.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map((roll) =>
          processStudentComplete(roll, sessionClean).catch(() => ({
            rollNo: roll,
            studentName: 'Gateway Timeout',
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
            status: 'NOT_FOUND' as const,
            grades: []
          }))
        )
      );
      results.push(...chunkResults);
    }

    return res.json({
      success: true,
      total: results.length,
      session: sessionClean,
      results
    });
  };

  app.post(['/api/bput/batch-check', '/bput/batch-check'], batchCheckHandler);

  // 7. Multi-Session Results Scanner: Tenure-aware & Optimized
  const studentAllSessionsHandler = async (req: Request, res: Response) => {
    const { rollNo, session: preferredSession } = req.body;
    if (!rollNo) {
      return res.status(400).json({ error: 'Missing rollNo parameter' });
    }

    const cleanRoll = String(rollNo).trim().replace(/\D/g, '');
    if (cleanRoll.length !== 10) {
      return res.status(400).json({ error: 'Registration number must be 10 digits' });
    }

    try {
      // 1. Fetch student details (cached if available)
      let studentDetails = getCached(studentDetailsCache, cleanRoll);
      if (!studentDetails) {
        try {
          const detRes = await fastBputRequest(`${BPUT_BASE_URL}/student-detsils-results?rollNo=${cleanRoll}`, 'POST', 7000, 2);
          if (!isHtmlPage(detRes.text)) {
            studentDetails = JSON.parse(detRes.text);
            if (studentDetails?.studentName) {
              setCached(studentDetailsCache, cleanRoll, studentDetails);
            }
          }
        } catch {}
      }

      // 2. Select only relevant sessions based on candidate's admission year
      const targetSessions = getTargetSessionsForRoll(cleanRoll, preferredSession).slice(0, 8);

      const allPublished: Array<{
        session: string;
        items: any[];
        marks?: any;
      }> = [];

      // Query in concurrency chunks of 3 to prevent Cloudflare rate-limiting
      const CHUNK_SIZE = 3;
      for (let i = 0; i < targetSessions.length; i += CHUNK_SIZE) {
        const sessionChunk = targetSessions.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.all(
          sessionChunk.map(async (sess) => {
            try {
              const listUrl = `${BPUT_BASE_URL}/student-results-list?rollNo=${cleanRoll}&dob=2001-01-01&session=${encodeURIComponent(sess)}`;
              const listRes = await fastBputRequest(listUrl, 'POST', 6500, 1);
              if (isHtmlPage(listRes.text)) return null;

              let items: any[] = [];
              try {
                items = JSON.parse(listRes.text);
              } catch {
                items = [];
              }
              if (Array.isArray(items) && items.length > 0) {
                const targetSemId = items[0].semId;
                const marksCacheKey = `${cleanRoll}_${targetSemId}_${sess}`;
                let marksData = getCached(studentMarksCache, marksCacheKey);
                if (!marksData) {
                  try {
                    const marksUrl = `${BPUT_BASE_URL}/student-results-subjects-list?semid=${targetSemId}&rollNo=${cleanRoll}&session=${encodeURIComponent(sess)}`;
                    const mrkRes = await fastBputRequest(marksUrl, 'POST', 6500, 1);
                    if (!isHtmlPage(mrkRes.text)) {
                      marksData = JSON.parse(mrkRes.text);
                      if (marksData && marksData.grades) {
                        setCached(studentMarksCache, marksCacheKey, marksData);
                      }
                    }
                  } catch {}
                }
                return { session: sess, items, marks: marksData };
              }
            } catch {}
            return null;
          })
        );

        chunkResults.forEach((r) => {
          if (r && r.items && r.items.length > 0) {
            allPublished.push(r);
          }
        });
      }

      // If studentDetails is missing, create fallback from first published record
      if (!studentDetails && allPublished.length > 0 && allPublished[0].items.length > 0) {
        const f = allPublished[0].items[0];
        studentDetails = {
          rollNo: cleanRoll,
          studentName: `Student (${cleanRoll})`,
          collegeName: 'BPUT Affiliated Institution',
          branchName: f.branchName || 'Degree Course',
          courseName: f.course || 'Degree',
          batch: '',
          branchId: '',
          collegeCode: '',
          semId: f.semId
        };
      }

      return res.json({
        success: true,
        rollNo: cleanRoll,
        studentDetails,
        totalSessionsFound: allPublished.length,
        allPublished
      });
    } catch (err: any) {
      return res.status(502).json({
        success: false,
        error: err?.message || 'Failed to scan all sessions'
      });
    }
  };

  app.post(['/api/bput/student-all-sessions', '/bput/student-all-sessions'], studentAllSessionsHandler);
}
