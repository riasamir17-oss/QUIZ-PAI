import React, { useRef, useEffect } from 'react';
import { Camera, ShieldAlert, Eye } from 'lucide-react';
import { StudentInfo } from '../types/quiz';
import { captureVideoSnapshot } from '../utils/proctoring';

interface WebcamProctorProps {
  student: StudentInfo;
  mediaStream: MediaStream | null;
  strikeCount: number;
  maxStrikes: number;
  onPeriodicSnapshot?: (snapshotUrl: string) => void;
  videoElementRef?: React.MutableRefObject<HTMLVideoElement | null>;
}

export const WebcamProctor: React.FC<WebcamProctorProps> = ({
  student,
  mediaStream,
  strikeCount,
  maxStrikes,
  onPeriodicSnapshot,
  videoElementRef,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = localVideoRef.current;
    if (video && mediaStream) {
      video.srcObject = mediaStream;
      video.play().catch((err) => console.log('Autoplay blocked:', err));
    }
    if (videoElementRef) {
      videoElementRef.current = video;
    }
  }, [mediaStream, videoElementRef]);

  // Periodic capture every 90 seconds
  useEffect(() => {
    if (!onPeriodicSnapshot) return;
    const interval = setInterval(() => {
      if (localVideoRef.current) {
        const snap = captureVideoSnapshot(localVideoRef.current);
        if (snap) {
          onPeriodicSnapshot(snap);
        }
      }
    }, 90000);

    return () => clearInterval(interval);
  }, [onPeriodicSnapshot]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md text-white text-xs">
      {/* Top Header */}
      <div className="bg-slate-950/80 px-3 py-2 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <Eye className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pengawas Online Aktif</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
              strikeCount === 0
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : strikeCount === 1
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
            }`}
          >
            {strikeCount}/{maxStrikes} Pelanggaran
          </span>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative aspect-4/3 bg-black flex items-center justify-center">
        {mediaStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
        ) : (
          <div className="p-3 text-center text-slate-400">
            <Camera className="w-6 h-6 mx-auto mb-1 text-slate-600" />
            <span className="text-[10px]">Kamera Simulasi</span>
          </div>
        )}

        {/* Live Indicator overlay */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>LIVE PROCTOR</span>
        </div>
      </div>

      {/* Student Identity Footer */}
      <div className="p-2.5 bg-slate-900 border-t border-slate-800">
        <p className="font-semibold text-slate-100 truncate">{student.fullName}</p>
        <p className="text-[11px] text-slate-400 font-mono">
          {student.studentClass} · {student.nik}
        </p>
        {strikeCount > 0 && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-300">
            <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Peringatan keluar tab tercatat</span>
          </div>
        )}
      </div>
    </div>
  );
};
