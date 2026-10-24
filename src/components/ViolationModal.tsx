import React, { useEffect, useState } from 'react';
import { AlertOctagon, ShieldAlert, ArrowRight } from 'lucide-react';
import { playAlertSound } from '../utils/proctoring';

interface ViolationModalProps {
  strikeCount: number;
  maxStrikes: number;
  evidenceSnapshot?: string;
  onDismiss: () => void;
}

export const ViolationModal: React.FC<ViolationModalProps> = ({
  strikeCount,
  maxStrikes,
  evidenceSnapshot,
  onDismiss,
}) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    playAlertSound('warning');
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isLastWarning = strikeCount === maxStrikes - 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-red-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 text-red-600 mb-4 pb-3 border-b border-red-100">
          <div className="p-2.5 bg-red-100 rounded-xl">
            <AlertOctagon className="w-8 h-8 text-red-600 animate-bounce" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-700">PERINGATAN PELANGGARAN!</h2>
            <p className="text-xs text-red-600">Terdeteksi Aktivitas di Luar Jendela Ujian</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-800">
                Tingkat Peringatan
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-red-600 text-white rounded-md">
                Strike {strikeCount} / {maxStrikes}
              </span>
            </div>
            <p className="text-sm text-red-950 font-medium">
              Anda terdeteksi berpindah tab browser, meminimalkan aplikasi, atau membuka jendela lain selama ujian berlangsung.
            </p>
          </div>

          {evidenceSnapshot && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center gap-3">
              <img
                src={evidenceSnapshot}
                alt="Bukti Pengawasan"
                className="w-20 h-16 object-cover rounded-lg border border-slate-300"
              />
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Bukti Kamera Direkam Otomatis</p>
                <p className="text-[11px] text-slate-500">
                  Foto snapshot wajah Anda pada saat berpindah tab telah dikirimkan ke Dashboard Dosen Pengawas.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5 text-xs text-amber-900 bg-amber-50 border border-amber-200 p-3 rounded-xl">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              {isLastWarning ? (
                <strong className="text-red-700">
                  PERINGATAN TERAKHIR! Satu pelanggaran lagi akan mengakibatkan akses Anda langsung DIBLOKIR OTOMATIS dan lembar jawaban dibekukan.
                </strong>
              ) : (
                <span>
                  Batas toleransi maksimal adalah <strong>{maxStrikes} kali</strong>. Tetap fokus pada layar kuis dan jangan berpindah ke aplikasi lain.
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            disabled={countdown > 0}
            onClick={onDismiss}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              countdown > 0
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md'
            }`}
          >
            <span>
              {countdown > 0 ? `Menunggu verifikasi (${countdown}s)...` : 'Saya Mengerti, Kembali Mengerjakan'}
            </span>
            {countdown === 0 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
