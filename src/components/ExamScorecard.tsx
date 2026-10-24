import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Printer,
  ChevronDown,
  ChevronUp,
  FileCheck,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { StudentSubmission, QuizScheduleConfig } from '../types/quiz';
import { MULTIPLE_CHOICE_QUESTIONS, ESSAY_QUESTIONS } from '../data/quizData';
import { printGradebookPDF } from '../utils/exportReport';

interface ExamScorecardProps {
  submission: StudentSubmission;
  config: QuizScheduleConfig;
  onRetake: () => void;
  onOpenAdmin: () => void;
}

export const ExamScorecard: React.FC<ExamScorecardProps> = ({
  submission,
  config,
  onRetake,
  onOpenAdmin,
}) => {
  const [showDetailedReview, setShowDetailedReview] = useState(false);

  const { scores, student } = submission;
  const grandTotal = scores.grandTotal;

  const getGradeInfo = (score: number) => {
    if (score >= 85) return { grade: 'A', label: 'Sangat Memuaskan', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (score >= 75) return { grade: 'B', label: 'Baik', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' };
    if (score >= 65) return { grade: 'C', label: 'Cukup', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    if (score >= 50) return { grade: 'D', label: 'Kurang', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' };
    return { grade: 'E', label: 'Tidak Lulus', color: 'text-red-700', bg: 'bg-red-50 border-red-200' };
  };

  const gradeInfo = getGradeInfo(grandTotal);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Printable Scorecard Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6 p-6 sm:p-8">
        {/* Certificate / Official Header */}
        <div className="border-b border-slate-200 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
              <span>{config.faculty}</span>
              <span aria-hidden="true">·</span>
              <span>{config.prodi}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              LEMBAR HASIL NILAI KUIS (OBE)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Mata Kuliah: {config.title} ({config.courseCode}) · {config.academicYear}
            </p>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={printGradebookPDF}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Hasil / PDF</span>
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="px-3.5 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Dashboard Dosen
            </button>
          </div>
        </div>

        {/* Student Credential Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Nama Lengkap</span>
              <span className="font-semibold text-slate-900 text-sm">{student.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">NIK / NIM</span>
              <span className="font-semibold font-mono text-slate-900">{student.nik}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Kelas / Rombel</span>
              <span className="font-semibold text-slate-900">{student.studentClass}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Waktu Pengiriman</span>
              <span className="font-semibold font-mono text-slate-900">
                {submission.submittedAt ? new Date(submission.submittedAt).toLocaleTimeString('id-ID') : '-'} WIB
              </span>
            </div>
          </div>
        </div>

        {/* Big Score Summary Banner */}
        <div className={`rounded-2xl border p-6 sm:p-8 mb-6 ${gradeInfo.bg} flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-xs flex items-center justify-center shrink-0 border border-slate-200/60">
              <Award className="w-9 h-9 text-emerald-700" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Skor Akhir Kuis
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {grandTotal}
                </span>
                <span className="text-lg font-bold text-slate-400 font-mono">/ 100</span>
              </div>
              <span className={`text-xs font-semibold ${gradeInfo.color} mt-1 block`}>
                Predikat: Nilai {gradeInfo.grade} ({gradeInfo.label})
              </span>
            </div>
          </div>

          {/* Sub-score Pills */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
            <div className="bg-white/90 border border-slate-200/80 px-4 py-3 rounded-xl text-center min-w-[110px]">
              <span className="text-[11px] text-slate-500 uppercase tracking-wide block">Pilihan Ganda</span>
              <span className="text-xl font-bold font-mono text-emerald-700">
                {scores.pgTotal} <span className="text-xs text-slate-400 font-normal">/ 30%</span>
              </span>
            </div>
            <div className="bg-white/90 border border-slate-200/80 px-4 py-3 rounded-xl text-center min-w-[110px]">
              <span className="text-[11px] text-slate-500 uppercase tracking-wide block">Essay Uraian</span>
              <span className="text-xl font-bold font-mono text-emerald-700">
                {scores.essayTotal} <span className="text-xs text-slate-400 font-normal">/ 70%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Proctoring Audit Record */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Integritas Ujian Terverifikasi</p>
              <p className="text-slate-500 text-[11px]">
                Kamera webcam dan status jendela dipantau oleh Online Proctoring selama kuis.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-slate-700 font-semibold block">
              {submission.violations.length} Pelanggaran Tab Switch
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">Status: Lulus Verifikasi Integritas</span>
          </div>
        </div>

        {/* Detailed Review Toggle */}
        <div className="no-print">
          <button
            type="button"
            onClick={() => setShowDetailedReview(!showDetailedReview)}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>{showDetailedReview ? 'Sembunyikan Pembahasan Soal' : 'Lihat Pembahasan & Kunci Jawaban Lengkap'}</span>
            {showDetailedReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Detailed Review Section */}
        {showDetailedReview && (
          <div className="mt-6 pt-6 border-t border-slate-200 space-y-6">
            {/* Multiple Choice Breakdown */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                <span>Pembahasan Bagian I: Pilihan Ganda (15 Soal)</span>
              </h2>

              <div className="space-y-3">
                {MULTIPLE_CHOICE_QUESTIONS.map((q) => {
                  const studentAns = submission.answers[q.id];
                  const isCorrect = studentAns === q.correctAnswer;
                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                        isCorrect
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : 'bg-red-50/60 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-bold text-slate-900">
                          Nomor {q.number}. ({q.subCPMK})
                        </span>
                        <div className="flex items-center gap-1">
                          {isCorrect ? (
                            <span className="flex items-center gap-1 font-semibold text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Benar (+{q.weight}%)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-semibold text-red-800">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              Salah (0%)
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-800 mb-2">{q.question}</p>
                      <div className="bg-white/80 p-2 rounded-md border border-slate-200/80 space-y-1">
                        <div>
                          Jawaban Anda:{' '}
                          <span className={`font-mono font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                            {studentAns || '(Tidak dijawab)'}
                          </span>
                          {!isCorrect && (
                            <span className="text-slate-600 ml-2">
                              (Kunci: <strong className="text-emerald-700 font-mono">{q.correctAnswer}</strong>)
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 text-[11px] italic">
                          Pembahasan: {q.explanation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Essay Breakdown */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                <span>Hasil Evaluasi Rubrik Bagian II: Essay (5 Soal)</span>
              </h2>

              <div className="space-y-4">
                {ESSAY_QUESTIONS.map((eq) => (
                  <div key={eq.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-slate-900">
                        Soal Essay {eq.number}: {eq.title}
                      </span>
                      <span className="text-xs font-mono text-emerald-700 font-semibold">
                        Bobot: {eq.weight}%
                      </span>
                    </div>

                    <div className="space-y-3 mt-3">
                      {eq.parts.map((part) => {
                        const partKey = `${eq.id}-${part.part}`;
                        const studentText = submission.answers[partKey] || '';
                        const partScore = submission.scores.essayScores[partKey] ?? 0;
                        const feedback = submission.scores.essayFeedbacks[partKey] || '';

                        return (
                          <div key={part.part} className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-emerald-900">
                                Sub {part.part.toUpperCase()} (Maks {part.weight}%)
                              </span>
                              <span className="font-mono font-bold text-emerald-700">
                                Nilai: {partScore} / {part.weight}
                              </span>
                            </div>
                            <p className="text-slate-700 mb-2">{part.prompt}</p>

                            <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200/80 mb-2">
                              <span className="text-[11px] text-slate-500 block mb-0.5">Jawaban Anda:</span>
                              <p className="text-slate-900 text-xs leading-relaxed whitespace-pre-wrap">
                                {studentText || '(Tidak ada jawaban)'}
                              </p>
                            </div>

                            <div className="bg-emerald-50/70 border border-emerald-200 rounded-md p-2 text-[11px] text-emerald-950">
                              <strong>Evaluasi Rubrik:</strong> {feedback}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 no-print">
          <p className="text-xs text-slate-500">
            Nilai kuis telah tersimpan di sistem basis data penilaian akademik.
          </p>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mulai Ujian dengan Mahasiswa Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
};
