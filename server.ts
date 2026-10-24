import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

interface StudentInfo {
  id: string;
  fullName: string;
  studentClass: string;
  nik: string;
  registeredAt: string;
  photoSnapshot?: string;
}

interface StudentSubmission {
  id: string;
  student: StudentInfo;
  startedAt: string;
  submittedAt?: string;
  status: 'taking' | 'submitted' | 'blocked' | 'disqualified';
  answers: { [key: string]: string };
  scores: {
    pgTotal: number;
    essayTotal: number;
    grandTotal: number;
    essayScores: { [partKey: string]: number };
    essayFeedbacks: { [partKey: string]: string };
  };
  violations: Array<{
    id: string;
    timestamp: string;
    type: string;
    description: string;
    snapshotUrl?: string;
  }>;
  strikeCount: number;
  secondsRemaining?: number;
  lastHeartbeat?: string;
  deviceInfo?: {
    userAgent: string;
    screenResolution: string;
  };
}

// In-memory data store for live real-time sync across localhost clients
let quizConfig = {
  title: 'Pendidikan Agama Islam (Ekonomi & Asuransi Syariah OBE)',
  courseCode: 'WNW12001',
  prodi: 'S-1 Aktuaria',
  faculty: 'Sekolah Tinggi Manajemen Asuransi Trisakti Jakarta',
  academicYear: 'Semester Ganjil 2026/2027',
  startTime: '2026-10-27T08:30:00',
  endTime: '2026-10-27T10:00:00',
  durationMinutes: 90,
  isOpen: true,
  maxStrikesBeforeBlock: 3,
};

// Initialized clean and empty for fresh student exams
let submissions: StudentSubmission[] = [];

let suspiciousAlerts: Array<{
  studentName: string;
  nik: string;
  type: string;
  description: string;
  snapshotUrl?: string;
  strikeCount: number;
  timestamp: string;
}> = [];

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  // API Routes
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Config
  app.get('/api/quiz-config', (_req: Request, res: Response) => {
    res.json(quizConfig);
  });

  app.post('/api/quiz-config', (req: Request, res: Response) => {
    quizConfig = { ...quizConfig, ...req.body };
    res.json({ success: true, config: quizConfig });
  });

  // Submissions
  app.get('/api/submissions', (_req: Request, res: Response) => {
    res.json(submissions);
  });

  app.post('/api/submissions', (req: Request, res: Response) => {
    const sub = req.body as StudentSubmission;
    if (!sub || !sub.student) {
      res.status(400).json({ error: 'Data submission tidak lengkap' });
      return;
    }
    const idx = submissions.findIndex(
      (s) => s.id === sub.id || (s.student && s.student.nik === sub.student.nik)
    );
    if (idx >= 0) {
      submissions[idx] = { ...submissions[idx], ...sub };
    } else {
      submissions.unshift(sub);
    }
    res.json({ success: true, submission: sub });
  });

  // Live Student Heartbeat (Real-time live synchronization)
  app.post('/api/students/heartbeat', (req: Request, res: Response) => {
    const { student, answers, strikeCount, secondsRemaining, status, violations, snapshotUrl } = req.body;
    if (!student || !student.nik) {
      res.status(400).json({ error: 'Missing student data' });
      return;
    }

    const idx = submissions.findIndex((s) => s.student.nik === student.nik);
    const now = new Date().toISOString();

    if (idx >= 0) {
      submissions[idx].answers = answers || submissions[idx].answers;
      submissions[idx].strikeCount = strikeCount ?? submissions[idx].strikeCount;
      submissions[idx].secondsRemaining = secondsRemaining ?? submissions[idx].secondsRemaining;
      submissions[idx].status = status || submissions[idx].status;
      submissions[idx].lastHeartbeat = now;
      if (violations && violations.length > 0) {
        submissions[idx].violations = violations;
      }
      if (snapshotUrl) {
        submissions[idx].student.photoSnapshot = snapshotUrl;
      }
    } else {
      submissions.unshift({
        id: `sub-${student.nik}-${Date.now()}`,
        student,
        startedAt: now,
        status: status || 'taking',
        answers: answers || {},
        scores: {
          pgTotal: 0,
          essayTotal: 0,
          grandTotal: 0,
          essayScores: {},
          essayFeedbacks: {},
        },
        violations: violations || [],
        strikeCount: strikeCount || 0,
        secondsRemaining: secondsRemaining || 5400,
        lastHeartbeat: now,
      });
    }

    res.json({ success: true, serverTime: now });
  });

  // Re-grade submission from Admin
  app.post('/api/submissions/:id/grade', (req: Request, res: Response) => {
    const { id } = req.params;
    const { essayScores, grandTotal, essayTotal } = req.body;
    const sub = submissions.find((s) => s.id === id);
    if (!sub) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    sub.scores.essayScores = essayScores || sub.scores.essayScores;
    sub.scores.essayTotal = essayTotal ?? sub.scores.essayTotal;
    sub.scores.grandTotal = grandTotal ?? sub.scores.grandTotal;
    res.json({ success: true, submission: sub });
  });

  // Update student status (Unblock / Disqualify)
  app.post('/api/submissions/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, resetStrikes } = req.body;
    const sub = submissions.find((s) => s.id === id);
    if (!sub) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    sub.status = status;
    if (resetStrikes) {
      sub.strikeCount = 0;
    }
    res.json({ success: true, submission: sub });
  });

  // Reset all exam data endpoint
  app.post('/api/reset-data', (_req: Request, res: Response) => {
    submissions = [];
    suspiciousAlerts = [];
    res.json({ success: true, message: 'Seluruh data kuis dan pelanggaran berhasil di-reset.' });
  });

  // Suspicious Alerts
  app.get('/api/alerts', (_req: Request, res: Response) => {
    res.json(suspiciousAlerts);
  });

  app.post('/api/alerts', (req: Request, res: Response) => {
    const alert = req.body;
    if (alert) {
      suspiciousAlerts.unshift(alert);
      if (suspiciousAlerts.length > 50) {
        suspiciousAlerts.pop();
      }
    }
    res.json({ success: true });
  });

  // Mount Vite Middleware for client frontend
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false, // Disables WebSocket connection attempt to prevent websocket connection errors
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
