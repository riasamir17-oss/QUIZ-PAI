import React, { useEffect } from 'react';
import { ShieldX, AlertTriangle, KeyRound, Clock, Camera } from 'lucide-react';
import { StudentSubmission } from '../types/quiz';
import { playAlertSound } from '../utils/proctoring';

interface BlockedScreenProps {
  submission: StudentSubmission;
  onOpenAdmin: () => void;
  onResetSession: () => void;
}

export const BlockedScreen: React.FC<BlockedScreenProps> = ({
  submission,
  onOpenAdmin,
  onResetSession,
}) => {
  useEffect(() => {
    playAlertSound('lockout');
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900 border-2 border-red-600 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Top Warning Glow Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600"></div>

        <div className="text-center mb-6">
          <div className="inline-flex p-4 bg-red-950/80 border border-red-800 rounded-full text-red-500 mb-4 animate-pulse">
            <ShieldX className="w-12 h-12" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            AKUN DIBLOKIR OTOMATIS
          </h1>
          <p className="text-sm text-red-400 mt-2 font-medium">
            Sistem Online Proctoring Mengidentifikasi Pelanggaran Berulang (Batas Toleransi Terlampaui)
          </p>
        </div>

        {/* Student Data Box */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 mb-6 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block uppercase font-mono">Nama Mahasiswa</span>
              <span className="font-semibold text-slate-200">{submission.student.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-mono">NIK / NIM</span>
              <span className="font-semibold text-slate-200 font-mono">{submission.student.nik}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-mono">Kelas / Prodi</span>
              <span className="font-semibold text-slate-200">{submission.student.studentClass}</span>
            </div>
          </div>
        </div>

        {/* Infraction Evidence Timeline */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>Riwayat Pelanggaran Tercatat ({submission.violations.length} Kejadian)</span>
          </h2>
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {submission.violations.map((v, idx) => (
              <div
                key={v.id || idx}
                className="bg-red-950/30 border border-red-900/60 rounded-lg p-3 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-red-900/80 text-red-300 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-red-200">{v.description}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(v.timestamp).toLocaleTimeString('id-ID')}
                    </p>
                  </div>
                </div>
                {v.snapshotUrl && (
                  <img
                    src={v.snapshotUrl}
                    alt="Bukti foto"
                    className="w-14 h-11 object-cover rounded-md border border-red-800 shrink-0"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onOpenAdmin}
            className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Buka Blokir Melalui Akun Dosen (admin127)</span>
          </button>
          <button
            type="button"
            onClick={onResetSession}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer"
          >
            Kembali ke Halaman Awal
          </button>
        </div>
      </div>
    </div>
  );
};
