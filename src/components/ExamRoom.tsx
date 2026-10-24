import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  StudentInfo,
  StudentSubmission,
  QuizScheduleConfig,
  ViolationRecord,
} from '../types/quiz';
import { MULTIPLE_CHOICE_QUESTIONS, ESSAY_QUESTIONS } from '../data/quizData';
import { WebcamProctor } from './WebcamProctor';
import { ViolationModal } from './ViolationModal';
import { ExamTimer } from './ExamTimer';
import { captureVideoSnapshot } from '../utils/proctoring';
import { evaluateSubmission } from '../utils/scoring';
import { saveSubmission, logSuspiciousAlert, syncStudentHeartbeat } from '../utils/storage';

interface ExamRoomProps {
  student: StudentInfo;
  mediaStream: MediaStream | null;
  config: QuizScheduleConfig;
  onSubmitExam: (submission: StudentSubmission) => void;
  onBlockExam: (submission: StudentSubmission) => void;
}

export const ExamRoom: React.FC<ExamRoomProps> = ({
  student,
  mediaStream,
  config,
  onSubmitExam,
  onBlockExam,
}) => {
  // Answers state: e.g. "pg-1": "C", "essay-1-a": "Text..."
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  
  // Navigation state: current section ('pg' or 'essay') and question index
  const [activeSection, setActiveSection] = useState<'pg' | 'essay'>('pg');
  const [activePgIndex, setActivePgIndex] = useState<number>(0);
  const [activeEssayIndex, setActiveEssayIndex] = useState<number>(0);

  // Anti-cheat strikes state
  const [strikes, setStrikes] = useState<number>(0);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [showViolationModal, setShowViolationModal] = useState<boolean>(false);
  const [latestViolationSnapshot, setLatestViolationSnapshot] = useState<string | undefined>(undefined);

  // Validation warning state when submitting with unanswered items
  const [unansweredWarning, setUnansweredWarning] = useState<string | null>(null);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());
  const currentSecondsRef = useRef<number>(config.durationMinutes * 60);

  // Real-time synchronization heartbeat to localhost server / Admin Dashboard
  const triggerHeartbeatSync = useCallback((customAnswers?: { [key: string]: string }, currentStrike?: number) => {
    const snap = captureVideoSnapshot(videoElementRef.current);
    syncStudentHeartbeat({
      student,
      answers: customAnswers || answers,
      strikeCount: currentStrike ?? strikes,
      secondsRemaining: currentSecondsRef.current,
      status: 'taking',
      violations,
      snapshotUrl: snap,
    });
  }, [answers, student, strikes, violations]);

  // Initial heartbeat sync on mount
  useEffect(() => {
    triggerHeartbeatSync();
  }, [triggerHeartbeatSync]);

  // Handle final submission (manual or auto-submit from timer)
  const performFinalSubmit = useCallback(
    (reason: 'normal' | 'timeout' | 'blocked') => {
      const grading = evaluateSubmission(answers);
      const submission: StudentSubmission = {
        id: `sub-${student.nik}-${Date.now()}`,
        student,
        startedAt: startTimeRef.current,
        submittedAt: new Date().toISOString(),
        status: reason === 'blocked' ? 'blocked' : 'submitted',
        answers,
        scores: {
          pgTotal: grading.pgTotal,
          essayTotal: grading.essayTotal,
          grandTotal: grading.grandTotal,
          essayScores: grading.essayScores,
          essayFeedbacks: grading.essayFeedbacks,
        },
        violations,
        strikeCount: strikes,
        deviceInfo: {
          userAgent: navigator.userAgent,
          screenResolution: `${window.innerWidth}x${window.innerHeight}`,
        },
      };

      saveSubmission(submission);

      if (reason === 'blocked') {
        onBlockExam(submission);
      } else {
        onSubmitExam(submission);
      }
    },
    [answers, student, violations, strikes, onBlockExam, onSubmitExam]
  );

  // Anti-Cheat & Window Blur / Tab Switch Detection
  const handleDetectedViolation = useCallback(
    (type: 'tab_switch' | 'window_blur', description: string) => {
      const now = new Date().toISOString();
      const snapshot = captureVideoSnapshot(videoElementRef.current);
      setLatestViolationSnapshot(snapshot);

      setStrikes((prevStrikes) => {
        const nextStrike = prevStrikes + 1;
        const newRecord: ViolationRecord = {
          id: `viol-${Date.now()}`,
          timestamp: now,
          type,
          description: `${description} (Pelanggaran ke-${nextStrike})`,
          snapshotUrl: snapshot,
        };

        setViolations((prevList) => [...prevList, newRecord]);

        // Push real-time alert to server & admin
        logSuspiciousAlert({
          studentName: student.fullName,
          nik: student.nik,
          type,
          description: newRecord.description,
          snapshotUrl: snapshot,
          strikeCount: nextStrike,
          timestamp: now,
        });

        // Sync heartbeat with updated strike
        triggerHeartbeatSync(answers, nextStrike);

        if (nextStrike >= config.maxStrikesBeforeBlock) {
          setShowViolationModal(false);
          const blockedGrading = evaluateSubmission(answers);
          const blockedSub: StudentSubmission = {
            id: `sub-${student.nik}-${Date.now()}`,
            student,
            startedAt: startTimeRef.current,
            submittedAt: new Date().toISOString(),
            status: 'blocked',
            answers,
            scores: {
              pgTotal: blockedGrading.pgTotal,
              essayTotal: blockedGrading.essayTotal,
              grandTotal: blockedGrading.grandTotal,
              essayScores: blockedGrading.essayScores,
              essayFeedbacks: blockedGrading.essayFeedbacks,
            },
            violations: [...violations, newRecord],
            strikeCount: nextStrike,
            deviceInfo: {
              userAgent: navigator.userAgent,
              screenResolution: `${window.innerWidth}x${window.innerHeight}`,
            },
          };
          saveSubmission(blockedSub);
          onBlockExam(blockedSub);
        } else {
          setShowViolationModal(true);
        }

        return nextStrike;
      });
    },
    [answers, config.maxStrikesBeforeBlock, onBlockExam, student, triggerHeartbeatSync, violations]
  );

  useEffect(() => {
    let lastViolationTime = 0;

    const onVisibilityChange = () => {
      if (document.hidden) {
        const now = Date.now();
        if (now - lastViolationTime > 1500) {
          lastViolationTime = now;
          handleDetectedViolation('tab_switch', 'Beralih ke tab browser lain');
        }
      }
    };

    const onWindowBlur = () => {
      const now = Date.now();
      if (now - lastViolationTime > 1500) {
        lastViolationTime = now;
        handleDetectedViolation('window_blur', 'Jendela ujian kehilangan fokus');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [handleDetectedViolation]);

  // Update answer and sync to server
  const handleUpdateAnswer = (key: string, value: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [key]: value };
      // Debounce or sync to server
      syncStudentHeartbeat({
        student,
        answers: updated,
        strikeCount: strikes,
        secondsRemaining: currentSecondsRef.current,
        status: 'taking',
      });
      return updated;
    });
  };

  // Check unanswered questions
  const getMissingQuestions = () => {
    const missingPG: number[] = [];
    MULTIPLE_CHOICE_QUESTIONS.forEach((q) => {
      if (!answers[q.id]) missingPG.push(q.number);
    });

    const missingEssay: string[] = [];
    ESSAY_QUESTIONS.forEach((eq) => {
      eq.parts.forEach((p) => {
        const key = `${eq.id}-${p.part}`;
        const val = (answers[key] || '').trim();
        if (!val || val.length < 5) {
          missingEssay.push(`Essay ${eq.number}${p.part.toUpperCase()}`);
        }
      });
    });

    return { missingPG, missingEssay };
  };

  const handleValidateAndPromptSubmit = () => {
    const { missingPG, missingEssay } = getMissingQuestions();
    if (missingPG.length > 0 || missingEssay.length > 0) {
      let warningText = 'Sesuai petunjuk ujian, seluruh nomor WAJIB diisi dan dijawab. Nomor yang masih kosong:\n';
      if (missingPG.length > 0) {
        warningText += `• Pilihan Ganda: Nomor ${missingPG.join(', ')}\n`;
      }
      if (missingEssay.length > 0) {
        warningText += `• Essay: ${missingEssay.join(', ')}\n`;
      }
      setUnansweredWarning(warningText);
      return;
    }

    setUnansweredWarning(null);
    setIsConfirmSubmitOpen(true);
  };

  const currentPg = MULTIPLE_CHOICE_QUESTIONS[activePgIndex];
  const currentEssay = ESSAY_QUESTIONS[activeEssayIndex];

  // Helper count answered
  const answeredPgCount = MULTIPLE_CHOICE_QUESTIONS.filter((q) => !!answers[q.id]).length;
  let answeredEssayPartCount = 0;
  ESSAY_QUESTIONS.forEach((eq) => {
    eq.parts.forEach((p) => {
      if ((answers[`${eq.id}-${p.part}`] || '').trim().length >= 5) {
        answeredEssayPartCount++;
      }
    });
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Fixed Control Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800 text-white rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {config.title}
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                {student.fullName} ({student.studentClass}) · {student.nik}
              </p>
            </div>
          </div>

          {/* Center Timer with Strict Auto-Submit on Timeout */}
          <div className="flex items-center gap-4">
            <ExamTimer
              initialDurationMinutes={config.durationMinutes}
              onTimeExpired={() => performFinalSubmit('timeout')}
              onTick={(secs) => {
                currentSecondsRef.current = secs;
              }}
            />

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <span>Terjawab:</span>
              <span className="font-semibold text-emerald-700 font-mono">
                {answeredPgCount + answeredEssayPartCount} / {MULTIPLE_CHOICE_QUESTIONS.length + 10}
              </span>
            </div>
          </div>

          {/* Right Action: Submit Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleValidateAndPromptSubmit}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Jawaban (Selesai)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Examination Workspace Split */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Question Area */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Section Switcher Tabs */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveSection('pg')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'pg'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Bagian I: Pilihan Ganda (15 Soal · Bobot 30%)
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('essay')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'essay'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Bagian II: Essay / Studi Kasus (5 Soal · Bobot 70%)
              </button>
            </div>
          </div>

          {/* Unanswered Warning Box */}
          {unansweredWarning && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="whitespace-pre-line leading-relaxed">
                <span className="font-bold text-red-950 block mb-1">
                  Peringatan Kelengkapan Jawaban:
                </span>
                {unansweredWarning}
              </div>
            </div>
          )}

          {/* Active Question Content Area */}
          {activeSection === 'pg' && currentPg && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex-1 flex flex-col justify-between">
              <div>
                {/* Question Metadata Header */}
                <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-800 text-sm">
                      Soal Pilihan Ganda Nomor {currentPg.number} dari {MULTIPLE_CHOICE_QUESTIONS.length}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 font-mono">{currentPg.subCPMK}</span>
                  </div>
                  <span className="font-mono text-emerald-700 font-medium">Bobot: {currentPg.weight}%</span>
                </div>

                {/* Question Statement */}
                <p className="text-slate-900 font-medium text-base leading-relaxed mb-6">
                  {currentPg.question}
                </p>

                {/* Options List */}
                <div className="space-y-3">
                  {currentPg.options.map((opt) => {
                    const isSelected = answers[currentPg.id] === opt.key;
                    return (
                      <label
                        key={opt.key}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-600 text-slate-900 ring-1 ring-emerald-600'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`pg-${currentPg.id}`}
                          value={opt.key}
                          checked={isSelected}
                          onChange={() => handleUpdateAnswer(currentPg.id, opt.key)}
                          className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                        />
                        <div className="flex-1 text-sm leading-relaxed">
                          <strong className="font-semibold text-slate-900 mr-1.5">{opt.key}.</strong>
                          <span>{opt.text}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Pagination Controls */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  disabled={activePgIndex === 0}
                  onClick={() => setActivePgIndex((prev) => prev - 1)}
                  className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <span className="text-xs text-slate-500 font-mono">
                  {activePgIndex + 1} / {MULTIPLE_CHOICE_QUESTIONS.length}
                </span>

                {activePgIndex < MULTIPLE_CHOICE_QUESTIONS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActivePgIndex((prev) => prev + 1)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('essay');
                      setActiveEssayIndex(0);
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Lanjut ke Soal Essay</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active Essay Content Area */}
          {activeSection === 'essay' && currentEssay && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex-1 flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-800 text-sm">
                      Soal Essay Nomor {currentEssay.number} dari {ESSAY_QUESTIONS.length}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 font-mono">{currentEssay.subCPMK}</span>
                  </div>
                  <span className="font-mono text-emerald-700 font-medium">Bobot Total: {currentEssay.weight}%</span>
                </div>

                <h2 className="text-base font-bold text-slate-900 mb-4">{currentEssay.title}</h2>

                {/* Essay Parts */}
                <div className="space-y-6">
                  {currentEssay.parts.map((part) => {
                    const partKey = `${currentEssay.id}-${part.part}`;
                    const currentAnswer = answers[partKey] || '';
                    return (
                      <div key={part.part} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs uppercase tracking-wider text-emerald-900">
                            Sub-Pertanyaan {part.part.toUpperCase()} (Bobot {part.weight}%)
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {currentAnswer.length} karakter
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 mb-3 leading-relaxed">
                          {part.prompt}
                        </p>
                        <textarea
                          rows={6}
                          value={currentAnswer}
                          onChange={(e) => handleUpdateAnswer(partKey, e.target.value)}
                          placeholder="Tuliskan uraian analisis komprehensif Anda berdasarkan dalil syariah, kaidah fikih muamalah, dan regulasi yang relevan..."
                          className="w-full p-3.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-all leading-relaxed"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  disabled={activeEssayIndex === 0}
                  onClick={() => setActiveEssayIndex((prev) => prev - 1)}
                  className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <span className="text-xs text-slate-500 font-mono">
                  Essay {activeEssayIndex + 1} / {ESSAY_QUESTIONS.length}
                </span>

                {activeEssayIndex < ESSAY_QUESTIONS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveEssayIndex((prev) => prev + 1)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleValidateAndPromptSubmit}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Periksa & Kirim Jawaban</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Navigator & Proctor Feed */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Active Proctoring Video PIP */}
          <WebcamProctor
            student={student}
            mediaStream={mediaStream}
            strikeCount={strikes}
            maxStrikes={config.maxStrikesBeforeBlock}
            videoElementRef={videoElementRef}
          />

          {/* Question Grid Navigator */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center justify-between">
              <span>Navigasi Lembar Jawaban</span>
              <span className="text-[11px] text-slate-500 font-normal">Wajib diisi semua</span>
            </h2>

            {/* PG Grid */}
            <div className="mb-4">
              <span className="text-[11px] font-semibold text-slate-600 block mb-2">
                Pilihan Ganda (1–15)
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {MULTIPLE_CHOICE_QUESTIONS.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = activeSection === 'pg' && activePgIndex === idx;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setActiveSection('pg');
                        setActivePgIndex(idx);
                      }}
                      className={`h-8 rounded-md font-mono text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'ring-2 ring-emerald-600 font-bold bg-emerald-100 text-emerald-900'
                          : isAnswered
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {q.number}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Essay Grid */}
            <div>
              <span className="text-[11px] font-semibold text-slate-600 block mb-2">
                Essay Uraian (1–5)
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {ESSAY_QUESTIONS.map((eq, idx) => {
                  const isPartA = (answers[`${eq.id}-a`] || '').trim().length >= 5;
                  const isPartB = (answers[`${eq.id}-b`] || '').trim().length >= 5;
                  const isAllAnswered = isPartA && isPartB;
                  const isPartial = (isPartA && !isPartB) || (!isPartA && isPartB);
                  const isCurrent = activeSection === 'essay' && activeEssayIndex === idx;

                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => {
                        setActiveSection('essay');
                        setActiveEssayIndex(idx);
                      }}
                      className={`h-8 rounded-md font-mono text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'ring-2 ring-emerald-600 font-bold bg-emerald-100 text-emerald-900'
                          : isAllAnswered
                          ? 'bg-emerald-600 text-white'
                          : isPartial
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      E{eq.number}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block"></span>
                <span>Terjawab</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 inline-block"></span>
                <span>Belum</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs ring-2 ring-emerald-600 bg-emerald-100 inline-block"></span>
                <span>Aktif</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Violation Popup Modal */}
      {showViolationModal && (
        <ViolationModal
          strikeCount={strikes}
          maxStrikes={config.maxStrikesBeforeBlock}
          evidenceSnapshot={latestViolationSnapshot}
          onDismiss={() => setShowViolationModal(false)}
        />
      )}

      {/* Confirmation Submit Modal */}
      {isConfirmSubmitOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Kirim Lembar Jawaban Kuis?</h2>
              <p className="text-xs text-slate-600 mt-1">
                Seluruh 15 Soal Pilihan Ganda dan 5 Soal Essay telah Anda lengkapi. Skor akhir kuis akan langsung ditampilkan setelah pengiriman.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 mb-5 space-y-1">
              <div className="flex justify-between">
                <span>Total Soal PG Dijawab:</span>
                <span className="font-semibold text-emerald-700">15 / 15 Soal</span>
              </div>
              <div className="flex justify-between">
                <span>Total Bagian Essay:</span>
                <span className="font-semibold text-emerald-700">10 / 10 Sub-bagian</span>
              </div>
              <div className="flex justify-between">
                <span>Catatan Pelanggaran:</span>
                <span className={strikes > 0 ? 'font-semibold text-amber-700' : 'text-slate-600'}>
                  {strikes} Pelanggaran
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="flex-1 py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cek Kembali
              </button>
              <button
                type="button"
                onClick={() => performFinalSubmit('normal')}
                className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Ya, Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
