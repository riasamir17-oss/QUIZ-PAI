# Pendidikan Agama Islam QUIZ — Interactive Exam & Online Proctoring System

A modern, institutional-grade examination platform for **Pendidikan Agama Islam (WNW12001 - S-1 Aktuaria)** featuring verified questions and rubric keys from STMA Trisakti, active webcam proctoring, browser visibility anti-cheat tracking, instant automated grading, and a secure instructor control center.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following operational parameters are established based on academic exam standards and the provided questionnaire responses:

- **Confirmed Anti-Cheat Policy**: A 3-strike violation policy is enforced. Leaving the exam tab, opening a new window, or losing window focus logs an infraction, captures a webcam evidence snapshot, and displays an urgent alert. At strike 3, the student's exam is automatically locked, requiring proctor/admin intervention to unblock or submit.
- **Confirmed Scoring & Rubric Model**: Multiple Choice questions (15 questions @ 2% = 30%) are evaluated instantly against official answer keys. Essay questions (5 questions = 70%) receive instant provisional evaluation based on the official rubric keywords (dalil, kaidah fikih, and legal principles), allowing students to see their score breakdown immediately upon submission while granting instructors full authority to override scores in the admin dashboard.
- **Confirmed Schedule & Timer**: Includes an active 90-minute countdown clock with auto-submit protection, synchronized with the quiz window (start and end times configured by the instructor).

---

## 1. Overview & Core Concept

- **Student Portal**:
  1. **Pre-Exam Identity Verification**: Mandatory entry of Full Name (*Nama Lengkap*), Class (*Kelas*), and ID/Registration Number (*NIK / NIM*).
  2. **Device & Camera Pre-flight**: Grants camera permissions, displays a live webcam preview, and informs the student of proctoring rules before entering the exam chamber.
  3. **Interactive Exam Chamber**:
     - 15 Multiple Choice Questions (Sub-CPMK 1 to 3) with full options A–E.
     - 5 Comprehensive Case-Study Essay Questions with sub-questions (a & b).
     - Full question navigator with completion indicators (all questions must be completed before submission).
     - Live proctoring status bar: active webcam PIP, countdown timer, and violation counter badge.
  4. **Post-Submission Scorecard**: Immediate score calculation, performance breakdown (PG score, essay evaluation, total percentage), and official integrity certificate.

- **Admin & Proctor Portal (`admin127` / `sagi127`)**:
  1. **Live Examination Monitor**: Real-time overview of active examinees, completed submissions, and blocked sessions.
  2. **Security & Incident Feed**: Instant alerts for blur/tab-switch incidents with timestamped camera snapshots and violation history.
  3. **Candidate Detail & Answer Inspector**: View student answers side-by-side with official keys and scoring rubrics; instructors can adjust essay marks with instant recalculation.
  4. **Exam Governance**: Toggle quiz access (open/closed), configure start and end dates/times, and manage student blocks/unblocks.
  5. **Data Export**: One-click download of the complete student grading roster in formatted Excel (CSV) and printable, publication-ready PDF reports.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme
- **Aesthetic Direction**: Scholarly, modern institutional academic aesthetic tailored for Islamic Economics & Actuarial Science.
- **Palette**:
  - Dominant Canvas: Clean ivory/slate neutral (`#F8FAFC` in light mode, `#0F172A` in dark mode).
  - Primary Accent: Deep Islamic Emerald / Teal (`#0F766E` / `#047857`) for trust, academic prestige, and clear focus.
  - Caution / Proctor Alerts: Rich Amber (`#D97706`) for warnings; Crimson (`#DC2626`) for locks and security violations.
- **Typography**: `Plus Jakarta Sans` for clean, professional display and body text; `IBM Plex Mono` / `tabular-nums` for timers, NIK, scores, and infraction counters.
- **Design Discipline**: Adheres to zero-pill metadata rules (unboxed metadata separated by bullets), single-elevation flat cards with hairline borders, and responsive split-zone layouts.

### Key Screens & Transitions
```
┌────────────────────────────────────────────────────────────────────────┐
│ [STMA Trisakti / PAI]          Pendidikan Agama Islam QUIZ             │
├────────────────────┬───────────────────────────────────────────────────┤
│ Student Flow:      │ 1. Registration & Camera Check (NIK, Nama, Kelas) │
│                    │ 2. Guided Instructions & Honor Pledge             │
│                    │ 3. Question Workspace (Split: Questions & Nav)    │
│                    │ 4. Result Scorecard & Performance Analytics       │
├────────────────────┼───────────────────────────────────────────────────┤
│ Admin Flow:        │ 1. Secure Authentication (`admin127` / `sagi127`)  │
│                    │ 2. Real-Time Monitor & Suspicious Activity Alerts │
│                    │ 3. Answer Sheet Reviewer & Manual Essay Grader    │
│                    │ 4. Schedule & Access Control (Start/End Time)     │
│                    │ 5. Gradebook Export (Excel & Printable PDF)       │
└────────────────────┴───────────────────────────────────────────────────┘
```

---

## 3. Key Product Decisions & Trade-Offs

- **Official Exam Data Grounding**: All 15 Multiple Choice and 5 Essay questions are transcribed directly from `Soal_Quiz_Pendidikan_Agama_Islam_Ekonomi_dan_Asuransi_Syariah_OBE-v2_47ba8ce5.pdf`, including question weights (30% PG, 70% Essay) and detailed answer keys.
- **Resilient Proctoring via Browser APIs**:
  - `document.visibilityState` + `window.onblur` + `window.onfocus` track whenever a student leaves the window or switches tabs.
  - HTML5 `navigator.mediaDevices.getUserMedia` streams the student's live video feed, with canvas snapshots recorded at key intervals and whenever an infraction triggers.
- **Full Offline-Tolerant Local Storage + Server Synchronization**:
  - Answers and violation records persist in browser storage (`localStorage`) so network hiccups do not lose work.
  - Shared state between student sessions and admin monitoring is synchronized through an Express REST API backend and reactive client state.
- **Export Options**: Generates Excel-compatible CSV with UTF-8 BOM (opens seamlessly in Microsoft Excel with formatted columns) and native browser-print optimized PDF layout with university header.

---

## 4. Technical Architecture & System Flow

```
┌───────────────────────────────────────────────────────────────────────┐
│                          APPLICATION ARCHITECTURE                     │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [Student View]                      [Proctor / Admin Console]         │
│  - Webcam Feed & Canvas Snapshot     - Live Roster & Cheat Alerts     │
│  - Anti-Cheat Blur Detection         - Score & Answer Reviewer        │
│  - PG & Essay Form Inputs            - Quiz Window & Timer Controls   │
│  - Instant Result Summary            - Export Engine (Excel / PDF)    │
│         │                                        │                    │
│         ▼                                        ▼                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                     Client-Side State Store                     │  │
│  │ (Active Session, Exam State, Infraction Logs, Evidence Photos)  │  │
│  └─────────────────────────────────┬───────────────────────────────┘  │
│                                    │                                  │
│                                    ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                  Express API Server (/api/*)                    │  │
│  │ - /api/quiz-config (Schedule, Duration, Status)                │  │
│  │ - /api/submissions (Save, Fetch all, Update grade)             │  │
│  │ - /api/events (Real-time telemetry, violations, snapshots)     │  │
│  │ - /api/auth (Admin session token validation)                   │  │
│  └─────────────────────────────────┬───────────────────────────────┘  │
│                                    │                                  │
│                                    ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                 Verified Course Examination Data                │  │
│  │ - 15 Multiple Choice items with explanations & key options     │  │
│  │ - 5 Essay multi-part questions with official rubric keywords    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Steps & Verification

1. **Phase 1: Course Data & Domain Types**:
   - Transcribe all 15 PG items and 5 Essay questions from the PDF into a typed data source (`src/data/quizData.ts`).
   - Define types for Student, Submission, ViolationEvent, and QuizSettings.
2. **Phase 2: Express Server & API Routes**:
   - Create `server.ts` with Vite middleware mounting for seamless dev mode.
   - Implement persistent endpoints for quiz schedule, submissions, live activity logs, and admin auth.
3. **Phase 3: Student Experience & Proctoring Core**:
   - Build identity check modal (Nama, Kelas, NIK).
   - Implement webcam proctoring widget with live video and canvas snapshot capture.
   - Implement tab-switch and blur detection engine with warning sounds, countdowns, and 3-strike auto-blocking.
   - Create responsive question navigation with required completion validation.
   - Build immediate scoring breakdown component.
4. **Phase 4: Instructor Command Dashboard**:
   - Secure login screen for `admin127` / `sagi127`.
   - Real-time participation statistics (active, completed, blocked).
   - Live suspicious activity feed with timestamped photos.
   - Student answer inspector with manual essay grading tool.
   - Quiz schedule scheduler (start/end date-time, active toggle).
   - Excel export (CSV) and printable PDF gradebook report.
5. **Phase 5: Verification & Quality Assurance**:
   - Test tab-switching detection and auto-block triggers.
   - Verify webcam permission handling and graceful camera fallbacks.
   - Test answer persistence and all-required question enforcement.
   - Verify calculation of PG (30%) + Essay (70%) scores and Excel/PDF export fidelity.
   - Run `compile_applet` and lint verification.
