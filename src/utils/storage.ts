import { StudentSubmission, QuizScheduleConfig, StudentInfo } from '../types/quiz';
import { DEFAULT_QUIZ_CONFIG } from '../data/quizData';

const SUBMISSIONS_KEY = 'pai_quiz_submissions_v1';
const CONFIG_KEY = 'pai_quiz_config_v1';
const RECENT_ALERTS_KEY = 'pai_quiz_recent_alerts_v1';

// BroadcastChannel for instant cross-tab sync on localhost
const broadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('pai_quiz_realtime_sync')
  : null;

export function listenToRealtimeSync(callback: (type: string, payload?: unknown) => void) {
  if (!broadcast) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type) {
      callback(event.data.type, event.data.payload);
    }
  };
  broadcast.addEventListener('message', handler);
  return () => broadcast.removeEventListener('message', handler);
}

function broadcastEvent(type: string, payload?: unknown) {
  try {
    if (broadcast) {
      broadcast.postMessage({ type, payload });
    }
  } catch {
    // ignore
  }
}

/**
 * Fetch and save config from server with local fallback
 */
export async function fetchServerConfig(): Promise<QuizScheduleConfig> {
  try {
    const res = await fetch('/api/quiz-config');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(CONFIG_KEY, JSON.stringify(data));
      return data;
    }
  } catch {
    // fallback
  }
  return getStoredConfig();
}

export function getStoredConfig(): QuizScheduleConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_QUIZ_CONFIG;
}

export async function saveStoredConfig(config: QuizScheduleConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    await fetch('/api/quiz-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    broadcastEvent('CONFIG_UPDATED', config);
  } catch {
    // ignore
  }
}

/**
 * Fetch all submissions from localhost server API with local fallback
 */
export async function fetchServerSubmissions(): Promise<StudentSubmission[]> {
  try {
    const res = await fetch('/api/submissions');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    // fallback to local
  }
  return getStoredSubmissions();
}

export function getStoredSubmissions(): StudentSubmission[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Save final or interim submission to server & local storage
 */
export async function saveSubmission(submission: StudentSubmission) {
  try {
    const subs = getStoredSubmissions();
    const idx = subs.findIndex((s) => s.id === submission.id || s.student.nik === submission.student.nik);
    if (idx >= 0) {
      subs[idx] = submission;
    } else {
      subs.unshift(submission);
    }
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(subs));

    // Send to server
    await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });

    broadcastEvent('SUBMISSION_SAVED', submission);
  } catch {
    // ignore
  }
}

/**
 * Real-time Student Heartbeat: syncs what the student is typing, selecting, their strike count & camera snapshot
 */
export async function syncStudentHeartbeat(payload: {
  student: StudentInfo;
  answers: { [key: string]: string };
  strikeCount: number;
  secondsRemaining: number;
  status?: string;
  violations?: unknown[];
  snapshotUrl?: string;
}) {
  try {
    await fetch('/api/students/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    broadcastEvent('STUDENT_HEARTBEAT', payload);
  } catch {
    // ignore
  }
}

/**
 * Suspicious Alerts sync
 */
export async function logSuspiciousAlert(event: {
  studentName: string;
  nik: string;
  type: string;
  description: string;
  snapshotUrl?: string;
  strikeCount: number;
  timestamp: string;
}) {
  try {
    const raw = localStorage.getItem(RECENT_ALERTS_KEY);
    const alerts = raw ? JSON.parse(raw) : [];
    alerts.unshift(event);
    localStorage.setItem(RECENT_ALERTS_KEY, JSON.stringify(alerts.slice(0, 50)));

    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    broadcastEvent('NEW_ALERT', event);
  } catch {
    // ignore
  }
}

export async function fetchServerAlerts(): Promise<Array<{
  studentName: string;
  nik: string;
  type: string;
  description: string;
  snapshotUrl?: string;
  strikeCount: number;
  timestamp: string;
}>> {
  try {
    const res = await fetch('/api/alerts');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(RECENT_ALERTS_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    // fallback
  }
  return getRecentAlerts();
}

export function getRecentAlerts(): Array<{
  studentName: string;
  nik: string;
  type: string;
  description: string;
  snapshotUrl?: string;
  strikeCount: number;
  timestamp: string;
}> {
  try {
    const raw = localStorage.getItem(RECENT_ALERTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

/**
 * Reset all submissions and alerts to a clean empty state
 */
export async function resetAllExamData() {
  try {
    localStorage.removeItem(SUBMISSIONS_KEY);
    localStorage.removeItem(RECENT_ALERTS_KEY);
    await fetch('/api/reset-data', { method: 'POST' });
    broadcastEvent('DATA_RESET');
  } catch {
    // ignore
  }
}
