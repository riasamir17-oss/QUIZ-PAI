import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShieldAlert, CheckCircle2, AlertTriangle, UserCheck, Video } from 'lucide-react';
import { StudentInfo, QuizScheduleConfig } from '../types/quiz';
import { captureVideoSnapshot } from '../utils/proctoring';

interface StudentRegisterProps {
  config: QuizScheduleConfig;
  onStartExam: (student: StudentInfo, mediaStream: MediaStream | null) => void;
  onOpenAdmin: () => void;
}

export const StudentRegister: React.FC<StudentRegisterProps> = ({ config, onStartExam, onOpenAdmin }) => {
  const [fullName, setFullName] = useState('');
  const [studentClass, setStudentClass] = useState('S-1 Aktuaria');
  const [nik, setNik] = useState('');
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      // Don't kill stream immediately if passed to parent, parent handles stream lifecycle
    };
  }, []);

  const requestCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraPermission('granted');

      // Automatically capture initial snapshot after short delay
      setTimeout(() => {
        if (videoRef.current) {
          const snap = captureVideoSnapshot(videoRef.current);
          if (snap) setCapturedPhoto(snap);
        }
      }, 1000);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraPermission('denied');
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Mohon aktifkan izin webcam pada browser.');
    }
  };

  const handleManualCapture = () => {
    if (videoRef.current) {
      const snap = captureVideoSnapshot(videoRef.current);
      if (snap) {
        setCapturedPhoto(snap);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !studentClass.trim() || !nik.trim()) {
      alert('Mohon lengkapi Nama Lengkap, Kelas, dan NIK/NIM Anda.');
      return;
    }
    if (!agreed) {
      alert('Anda wajib menyetujui pakta integritas dan ketentuan pengawasan kamera.');
      return;
    }

    const student: StudentInfo = {
      id: `stud-${Date.now()}`,
      fullName: fullName.trim(),
      studentClass: studentClass.trim(),
      nik: nik.trim(),
      registeredAt: new Date().toISOString(),
      photoSnapshot: capturedPhoto || undefined,
    };

    onStartExam(student, streamRef.current);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Info Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 tracking-wide uppercase mb-1">
              <span>{config.faculty}</span>
              <span aria-hidden="true">·</span>
              <span>{config.prodi}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
            <p className="text-sm text-slate-600 mt-1">
              Kode Mata Kuliah: <span className="font-mono font-medium text-slate-800">{config.courseCode}</span> · Durasi:{' '}
              <span className="font-mono font-medium text-slate-800">{config.durationMinutes} Menit</span> · Sifat:{' '}
              <span className="font-medium text-slate-800">Closed Book (15 PG & 5 Essay)</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAdmin}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 transition-colors shrink-0"
            >
              Masuk Dashboard Dosen / Admin
            </button>
          </div>
        </div>

        {/* Security / Proctoring Protocol Notice */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-4 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-amber-900 mb-1">Ketentuan Ujian Online dengan Pengawasan (Online Proctoring)</h2>
              <ul className="text-xs text-amber-900/90 space-y-1 list-disc list-inside">
                <li>
                  Mahasiswa <strong>wajib mengaktifkan kamera (webcam)</strong> selama pengerjaan kuis berlangsung.
                </li>
                <li>
                  Dilarang <strong>beralih tab (tab switch)</strong> atau <strong>membuka jendela lain</strong> di komputer.
                </li>
                <li>
                  Sistem menerapkan <strong>toleransi maksimal {config.maxStrikesBeforeBlock} kali pelanggaran</strong>. Jika terdeteksi keluar dari aplikasi sebanyak 3 kali, akun akan <strong>diblokir otomatis</strong> dan ujian terkunci.
                </li>
                <li>
                  Seluruh <strong>15 Soal Pilihan Ganda dan 5 Soal Essay wajib diisi dan dijawab</strong> sebelum mengirimkan ujian.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Main Registration & Device Setup Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Identity Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <UserCheck className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-semibold text-slate-900">1. Data Identitas Peserta Ujian</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap (Sesuai Presensi Akademik) <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Muhammad Fauzi"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="studentClass" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kelas / Rombel <span className="text-red-500">*</span>
                </label>
                <input
                  id="studentClass"
                  type="text"
                  required
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  placeholder="Contoh: Aktuaria 1A"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label htmlFor="nik" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  NIK / NIM Mahasiswa <span className="text-red-500">*</span>
                </label>
                <input
                  id="nik"
                  type="text"
                  required
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  placeholder="Contoh: 3171012304990001 / 20261001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Honor Pledge */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 rounded-sm focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  Saya menyatakan dengan sungguh-sungguh berpegang teguh pada prinsip <strong>Muraqabah</strong> dan{' '}
                  <strong>Itqan</strong>, mengerjakan kuis secara jujur tanpa membuka referensi lain atau beralih tab, serta bersedia menerima sanksi pemblokiran jika melanggar.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!fullName.trim() || !nik.trim() || !agreed}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
                fullName.trim() && nik.trim() && agreed
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Mulai Pengerjaan QUIZ Interaktif</span>
            </button>
          </form>
        </div>

        {/* Right: Camera Pre-flight */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Video className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-semibold text-slate-900">2. Kalibrasi Webcam Pengawas</h2>
            </div>

            <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-4/3 flex items-center justify-center border border-slate-800 mb-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraPermission === 'granted' ? 'block' : 'hidden'}`}
              />

              {cameraPermission !== 'granted' && (
                <div className="text-center p-6 text-slate-300">
                  <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 mb-3">
                    Kamera webcam diperlukan untuk validasi kehadiran & online proctoring.
                  </p>
                  <button
                    type="button"
                    onClick={requestCamera}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Izinkan & Nyalakan Kamera</span>
                  </button>
                </div>
              )}

              {/* Status pill overlay */}
              {cameraPermission === 'granted' && (
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Kamera Aktif & Terpantau</span>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg mb-3">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{cameraError}</span>
              </div>
            )}

            {capturedPhoto && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 mb-2">
                <img src={capturedPhoto} alt="Snapshot Preview" className="w-12 h-12 object-cover rounded-md border border-emerald-300" />
                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Snapshot Terverifikasi</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">Wajah terdeteksi siap untuk pengawasan online.</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            {cameraPermission === 'granted' && (
              <button
                type="button"
                onClick={handleManualCapture}
                className="w-full text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 py-1.5 rounded-lg transition-colors"
              >
                Ambil Ulang Foto Verifikasi
              </button>
            )}
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Sistem akan mengambil foto acak berkala saat ujian berlangsung untuk audit dosen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
