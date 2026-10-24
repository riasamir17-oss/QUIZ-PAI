import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle, Hourglass } from 'lucide-react';
import { playAlertSound } from '../utils/proctoring';

interface ExamTimerProps {
  initialDurationMinutes: number;
  onTimeExpired: () => void;
  onTick?: (secondsRemaining: number) => void;
}

export const ExamTimer: React.FC<ExamTimerProps> = ({
  initialDurationMinutes,
  onTimeExpired,
  onTick,
}) => {
  const totalSeconds = initialDurationMinutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const [hasWarned15Min, setHasWarned15Min] = useState(false);
  const [hasWarned5Min, setHasWarned5Min] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);
  
  // Guard against multiple expired calls
  const expiredHandledRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!expiredHandledRef.current) {
            expiredHandledRef.current = true;
            setHasExpired(true);
            playAlertSound('lockout');
            // Trigger auto-submit callback
            onTimeExpired();
          }
          return 0;
        }

        const next = prev - 1;
        if (onTick && next % 5 === 0) {
          onTick(next);
        }

        // 15-minute warning sound
        if (next === 900 && !hasWarned15Min) {
          playAlertSound('warning');
          setHasWarned15Min(true);
        }

        // 5-minute warning sound
        if (next === 300 && !hasWarned5Min) {
          playAlertSound('warning');
          setHasWarned5Min(true);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasWarned15Min, hasWarned5Min, onTimeExpired, onTick]);

  const formatTimeParts = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const progressPercent = Math.max(0, Math.min(100, ((totalSeconds - secondsRemaining) / totalSeconds) * 100));

  // Determine urgency theme
  const isCritical = secondsRemaining <= 300; // < 5 mins
  const isWarning = secondsRemaining <= 900 && secondsRemaining > 300; // < 15 mins

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border transition-all ${
          isCritical
            ? 'bg-red-50 border-red-300 text-red-700 ring-2 ring-red-400 animate-pulse'
            : isWarning
            ? 'bg-amber-50 border-amber-300 text-amber-800'
            : 'bg-slate-100 border-slate-200 text-slate-800'
        }`}
      >
        {isCritical ? (
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
        ) : (
          <Clock className={`w-4 h-4 ${isWarning ? 'text-amber-600' : 'text-emerald-700'} shrink-0`} />
        )}

        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-[11px] font-medium uppercase tracking-wider hidden sm:inline">
            Sisa Waktu:
          </span>
          <span className="text-base font-extrabold tracking-tight">
            {formatTimeParts(secondsRemaining)}
          </span>
        </div>
      </div>

      {/* Visual Elapsed Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isCritical ? 'bg-red-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-600'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Critical Modal if timer reached 0 */}
      {hasExpired && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Hourglass className="w-7 h-7 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Waktu Ujian Berakhir!</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Batas waktu <strong>{initialDurationMinutes} menit</strong> telah habis. Sistem secara otomatis menyimpan dan mengirimkan seluruh jawaban Anda ke server.
            </p>
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold">
              Mengalihkan ke Lembar Hasil Nilai...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
