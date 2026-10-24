import React, { useState, useEffect } from 'react';
import {
  Users,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Calendar,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  LogOut,
  Search,
  Filter,
  Save,
  Unlock,
  Ban,
  ArrowUpDown,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import {
  StudentSubmission,
  QuizScheduleConfig,
  ExamStatus,
} from '../types/quiz';
import { MULTIPLE_CHOICE_QUESTIONS, ESSAY_QUESTIONS } from '../data/quizData';
import {
  fetchServerSubmissions,
  saveSubmission,
  fetchServerConfig,
  saveStoredConfig,
  fetchServerAlerts,
  listenToRealtimeSync,
  getStoredConfig,
  getRecentAlerts,
  resetAllExamData,
} from '../utils/storage';
import { exportToExcelCSV, printGradebookPDF } from '../utils/exportReport';
import { recalculateWithOverrides } from '../utils/scoring';

interface SuspiciousAlertItem {
  studentName: string;
  nik: string;
  type: string;
  description: string;
  snapshotUrl?: string;
  strikeCount: number;
  timestamp: string;
}

interface AdminDashboardProps {
  onLogout: () => void;
  onGoToExam: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onGoToExam }) => {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [config, setConfig] = useState<QuizScheduleConfig>(getStoredConfig());
  const [recentAlerts, setRecentAlerts] = useState<SuspiciousAlertItem[]>(getRecentAlerts());

  // Active view tab in admin: 'monitoring' | 'submissions' | 'alerts' | 'schedule'
  const [activeTab, setActiveTab] = useState<'monitoring' | 'submissions' | 'alerts' | 'schedule'>('monitoring');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected student for answer inspector modal
  const [inspectingSubmission, setInspectingSubmission] = useState<StudentSubmission | null>(null);

  // Manual essay grading temporary edits for inspecting student
  const [editedEssayScores, setEditedEssayScores] = useState<{ [partKey: string]: number }>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    title: config.title,
    courseCode: config.courseCode,
    prodi: config.prodi,
    durationMinutes: config.durationMinutes,
    startTime: config.startTime,
    endTime: config.endTime,
    isOpen: config.isOpen,
    maxStrikesBeforeBlock: config.maxStrikesBeforeBlock,
  });
  const [configSavedToast, setConfigSavedToast] = useState(false);

  // Load submissions and alerts from localhost server
  const loadData = async () => {
    try {
      const [subs, alerts, storedCfg] = await Promise.all([
        fetchServerSubmissions(),
        fetchServerAlerts(),
        fetchServerConfig(),
      ]);
      setSubmissions([...subs]);
      setRecentAlerts([...alerts]);
      setConfig(storedCfg);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadData();
    // Instant cross-tab real-time sync listener
    const unsubscribe = listenToRealtimeSync(() => {
      loadData();
    });
    // Poll every 2.5 seconds to sync live exam progress from server
    const interval = setInterval(loadData, 2500);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  // Filtered submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.student.nik.includes(searchQuery) ||
      sub.student.studentClass.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Participation statistics
  const totalStudents = submissions.length;
  const takingCount = submissions.filter((s) => s.status === 'taking').length;
  const submittedCount = submissions.filter((s) => s.status === 'submitted').length;
  const blockedCount = submissions.filter((s) => s.status === 'blocked').length;

  const averageScore =
    submittedCount > 0
      ? Math.round(
          (submissions
            .filter((s) => s.status === 'submitted')
            .reduce((acc, curr) => acc + (curr.scores?.grandTotal || 0), 0) /
            submittedCount) *
            10
        ) / 10
      : 0;

  // Actions on student: Unblock / Disqualify
  const handleToggleBlock = (submission: StudentSubmission, newStatus: ExamStatus) => {
    const updated: StudentSubmission = {
      ...submission,
      status: newStatus,
      strikeCount: newStatus === 'taking' || newStatus === 'submitted' ? 0 : submission.strikeCount,
    };
    saveSubmission(updated);
    loadData();
    if (inspectingSubmission && inspectingSubmission.id === submission.id) {
      setInspectingSubmission(updated);
    }
  };

  // Open inspector
  const openInspector = (sub: StudentSubmission) => {
    setInspectingSubmission(sub);
    setEditedEssayScores({ ...(sub.scores?.essayScores || {}) });
    setSaveSuccessMsg(false);
  };

  // Save manual essay score adjustments
  const handleSaveEssayScores = () => {
    if (!inspectingSubmission) return;
    const updated = recalculateWithOverrides(inspectingSubmission, editedEssayScores);
    saveSubmission(updated);
    setInspectingSubmission(updated);
    loadData();
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  // Reset all exam data
  const handleResetData = async () => {
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin mereset seluruh data ujian? Semua daftar peserta, jawaban, nilai, dan log kecurangan akan dikosongkan untuk memulai ujian baru.'
    );
    if (confirmed) {
      await resetAllExamData();
      await loadData();
    }
  };

  // Save schedule configuration
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: QuizScheduleConfig = {
      ...config,
      title: scheduleForm.title,
      courseCode: scheduleForm.courseCode,
      prodi: scheduleForm.prodi,
      durationMinutes: Number(scheduleForm.durationMinutes),
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      isOpen: scheduleForm.isOpen,
      maxStrikesBeforeBlock: Number(scheduleForm.maxStrikesBeforeBlock),
    };
    saveStoredConfig(newConfig);
    setConfig(newConfig);
    setConfigSavedToast(true);
    setTimeout(() => setConfigSavedToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900">
      {/* Top Header */}
      <header className="bg-slate-900 text-white px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">Dashboard Pengawas Kuis</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Dosen: admin127
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {config.title} · {config.courseCode} · {config.prodi}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGoToExam}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Buka Tampilan Mahasiswa</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-700/50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2">
          <button
            type="button"
            onClick={() => setActiveTab('monitoring')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'monitoring'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pemantauan & Roster ({totalStudents})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'alerts'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Aktivitas Mencurigakan ({recentAlerts.length})</span>
            {recentAlerts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'schedule'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Jadwal & Pengaturan Kuis</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto p-6 flex-1 flex flex-col gap-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Mahasiswa
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{totalStudents}</span>
              <span className="text-xs text-slate-500">terdaftar</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Sedang Mengerjakan
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-700">{takingCount}</span>
              <span className="text-xs text-emerald-600">aktif live</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
              Selesai Mengirim
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-blue-700">{submittedCount}</span>
              <span className="text-xs text-blue-600">terkumpul</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-red-800 uppercase tracking-wider block">
              Diblokir (Curang)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-red-600">{blockedCount}</span>
              <span className="text-xs text-red-500">terkunci</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs col-span-2 lg:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Rata-Rata Nilai
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-800">{averageScore}</span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
          </div>
        </div>

        {/* TAB 1: MONITORING & STUDENT ROSTER */}
        {activeTab === 'monitoring' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
            {/* Toolbar: Search, Filters, and Export Buttons */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari Nama, NIK, atau Kelas..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden"
                  >
                    <option value="all">Semua Status</option>
                    <option value="taking">Sedang Mengerjakan</option>
                    <option value="submitted">Selesai</option>
                    <option value="blocked">Diblokir</option>
                  </select>
                </div>
              </div>

              {/* Download / Export Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportToExcelCSV(submissions, config)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Unduh Rekap Nilai (Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={printGradebookPDF}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Laporan (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetData}
                  className="px-3 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Kosongkan seluruh data untuk memulai sesi kuis baru"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Data</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Mahasiswa</th>
                    <th className="py-3 px-3">Kelas</th>
                    <th className="py-3 px-3">Status Kuis</th>
                    <th className="py-3 px-3 text-right">Skor PG (30%)</th>
                    <th className="py-3 px-3 text-right">Skor Essay (70%)</th>
                    <th className="py-3 px-3 text-right">Nilai Akhir (100%)</th>
                    <th className="py-3 px-3 text-center">Pelanggaran</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tidak ada mahasiswa yang sesuai dengan pencarian atau filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => {
                      const isBlocked = sub.status === 'blocked';
                      const isSubmitted = sub.status === 'submitted';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {sub.student.photoSnapshot ? (
                                <img
                                  src={sub.student.photoSnapshot}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  {sub.student.fullName.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-900">{sub.student.fullName}</p>
                                <p className="text-[11px] text-slate-500 font-mono">{sub.student.nik}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-700">{sub.student.studentClass}</td>
                          <td className="py-3 px-3">
                            {isSubmitted ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Selesai</span>
                              </span>
                            ) : isBlocked ? (
                              <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                                <Ban className="w-3.5 h-3.5" />
                                <span>Diblokir (Curang)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                <span>Mengerjakan ({Object.keys(sub.answers || {}).length}/25 dijawab)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                            {sub.scores?.pgTotal ?? 0}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                            {sub.scores?.essayTotal ?? 0}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-sm text-emerald-800">
                            {sub.scores?.grandTotal ?? 0}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`font-mono font-semibold px-2 py-0.5 rounded-sm ${
                                sub.violations.length === 0
                                  ? 'text-slate-500 bg-slate-100'
                                  : sub.violations.length >= config.maxStrikesBeforeBlock
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {sub.violations.length}x
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openInspector(sub)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                              >
                                Detail Jawaban
                              </button>

                              {isBlocked ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlock(sub, 'taking')}
                                  title="Buka kembali akses ujian mahasiswa ini"
                                  className="px-2 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Unlock className="w-3 h-3" />
                                  <span>Buka Blokir</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlock(sub, 'blocked')}
                                  title="Blokir akses mahasiswa karena indikasi kecurangan"
                                  className="px-2 py-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
                                >
                                  <Ban className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SUSPICIOUS ACTIVITY FEED */}
        {activeTab === 'alerts' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <span>Log Notifikasi Aktivitas Mencurigakan & Pelanggaran</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rekaman tangkapan kamera webcam dan indikasi tab switch / keluar jendela secara real-time.
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                Total Kejadian: {recentAlerts.length}
              </span>
            </div>

            {recentAlerts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-medium text-slate-700">Belum ada aktivitas mencurigakan terdeteksi.</p>
                <p className="text-xs text-slate-400">Seluruh mahasiswa mematuhi protokol online proctoring.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-red-200 bg-red-50/50 flex items-start gap-4 text-xs"
                  >
                    {alert.snapshotUrl ? (
                      <img
                        src={alert.snapshotUrl}
                        alt="Bukti"
                        className="w-24 h-20 object-cover rounded-lg border border-red-300 shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-20 rounded-lg bg-red-200/60 flex items-center justify-center text-red-700 font-mono text-[10px] shrink-0">
                        No Snapshot
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{alert.studentName}</span>
                        <span className="font-mono text-red-700 font-bold bg-red-100 px-1.5 py-0.5 rounded text-[11px]">
                          Peringatan #{alert.strikeCount}
                        </span>
                      </div>
                      <p className="text-slate-500 font-mono">{alert.nik}</p>
                      <p className="text-red-950 font-medium">{alert.description}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono pt-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(alert.timestamp).toLocaleTimeString('id-ID')} WIB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: QUIZ SCHEDULE & GOVERNANCE */}
        {activeTab === 'schedule' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-3xl">
            <div className="pb-4 mb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-700" />
                <span>Pengaturan Waktu Mulai & Berakhir Kuis</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Atur jadwal kuis, durasi pengerjaan, dan batas toleransi kecurangan.
              </p>
            </div>

            {configSavedToast && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan kuis berhasil disimpan! Mahasiswa akan mengikuti jadwal baru.</span>
              </div>
            )}

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Judul Ujian / Kuis
                </label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Kode Mata Kuliah
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.courseCode}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, courseCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Program Studi
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.prodi}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, prodi: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Waktu Mulai Kuis
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Waktu Berakhir Kuis
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Durasi Pengerjaan (Menit)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={scheduleForm.durationMinutes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Batas Maksimal Pelanggaran Tab Switch Sebelum Blokir
                  </label>
                  <select
                    value={scheduleForm.maxStrikesBeforeBlock}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, maxStrikesBeforeBlock: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value={2}>2 Kali Peringatan (Ketat)</option>
                    <option value={3}>3 Kali Peringatan (Standar Rekomendasi)</option>
                    <option value={5}>5 Kali Peringatan (Toleran)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status Akses Kuis
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleForm.isOpen}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, isOpen: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded-sm"
                    />
                    <span className="text-slate-800 font-medium">
                      {scheduleForm.isOpen ? 'Kuis DIBUKA untuk Mahasiswa' : 'Kuis DITUTUP (Terkunci)'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Jadwal Kuis</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* INSPECTOR MODAL: VIEW ALL ANSWERS & MANUAL ESSAY RE-GRADING */}
      {inspectingSubmission && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold">
                  Lembar Jawaban & Nilai: {inspectingSubmission.student.fullName}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {inspectingSubmission.student.studentClass} · {inspectingSubmission.student.nik} · Status:{' '}
                  {inspectingSubmission.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSubmission(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {/* Score Recap Strip */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-emerald-800 block">
                    Total Nilai Akhir
                  </span>
                  <span className="text-3xl font-extrabold font-mono text-emerald-900">
                    {inspectingSubmission.scores?.grandTotal ?? 0}{' '}
                    <span className="text-xs text-slate-400 font-normal">/ 100</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-center">
                    <span className="text-[10px] text-slate-500 block">PG (30%)</span>
                    <span className="font-mono font-bold text-slate-800">
                      {inspectingSubmission.scores?.pgTotal ?? 0}
                    </span>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-center">
                    <span className="text-[10px] text-slate-500 block">Essay (70%)</span>
                    <span className="font-mono font-bold text-slate-800">
                      {inspectingSubmission.scores?.essayTotal ?? 0}
                    </span>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-center">
                    <span className="text-[10px] text-slate-500 block">Pelanggaran</span>
                    <span className="font-mono font-bold text-red-600">
                      {inspectingSubmission.violations?.length ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Nilai essay berhasil diperbarui dan total skor telah dihitung ulang!</span>
                </div>
              )}

              {/* Section 1: Multiple Choice Answers */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  <span>Jawaban Pilihan Ganda (15 Soal)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {MULTIPLE_CHOICE_QUESTIONS.map((q) => {
                    const ans = inspectingSubmission.answers[q.id];
                    const isCorrect = ans === q.correctAnswer;
                    return (
                      <div
                        key={q.id}
                        className={`p-2.5 rounded-lg border ${
                          isCorrect ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-medium">
                          <span>Soal #{q.number}</span>
                          <span className={`font-mono font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                            {ans || '-'} {isCorrect ? '✓' : `(Kunci: ${q.correctAnswer})`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Essay Answers & Manual Grading */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Uraian Jawaban Essay & Penilaian Manual Dosen</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleSaveEssayScores}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan Nilai</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {ESSAY_QUESTIONS.map((eq) => (
                    <div key={eq.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div className="font-bold text-slate-900 mb-2">
                        Essay {eq.number}: {eq.title} (Bobot Total: {eq.weight}%)
                      </div>

                      <div className="space-y-3">
                        {eq.parts.map((p) => {
                          const partKey = `${eq.id}-${p.part}`;
                          const text = inspectingSubmission.answers[partKey] || '';
                          const currentScore =
                            editedEssayScores[partKey] ??
                            inspectingSubmission.scores?.essayScores?.[partKey] ??
                            0;

                          return (
                            <div key={p.part} className="bg-white p-3 rounded-lg border border-slate-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-slate-800">
                                  Sub-Pertanyaan {p.part.toUpperCase()} (Maksimal: {p.weight}%)
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500">Nilai Dosen:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={p.weight}
                                    step={0.5}
                                    value={currentScore}
                                    onChange={(e) =>
                                      setEditedEssayScores({
                                        ...editedEssayScores,
                                        [partKey]: Number(e.target.value),
                                      })
                                    }
                                    className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-emerald-800 text-center"
                                  />
                                </div>
                              </div>
                              <p className="text-slate-600 mb-2 italic">{p.prompt}</p>
                              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 whitespace-pre-wrap leading-relaxed text-slate-900">
                                {text || '(Kosong / Tidak dijawab)'}
                              </div>
                              <div className="mt-2 text-[11px] text-slate-500">
                                <strong>Kunci Pokok Rubrik:</strong> {p.keyRubricPoints.join(' ')}
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

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectingSubmission(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSaveEssayScores}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Nilai & Perbarui</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
