import React, { useState } from 'react';
import { 
  Camera, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Minimize2, 
  Maximize2, 
  RefreshCw, 
  Smartphone,
  Eye
} from 'lucide-react';
import type { CameraPermissionState } from '../../hooks/useCameraProctoring';

interface CameraMonitorWidgetProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  permissionState: CameraPermissionState;
  errorMessage: string | null;
  isModelLoading: boolean;
  isModelReady: boolean;
  phoneDetected: boolean;
  personCount: number;
  onRequestCamera: () => void;
}

export const CameraMonitorWidget: React.FC<CameraMonitorWidgetProps> = ({
  videoRef,
  permissionState,
  errorMessage,
  isModelLoading,
  isModelReady,
  phoneDetected,
  personCount,
  onRequestCamera,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // If permission is not granted yet, show authorization card
  if (permissionState !== 'granted') {
    return (
      <div className="surface-card p-4 rounded-2xl border border-white/10 text-center animate-fadeIn">
        <div className="w-10 h-10 rounded-md surface-deep border border-amber-500/30 text-amber-300 flex items-center justify-center mx-auto mb-2.5">
          <Camera className="w-5 h-5" />
        </div>
        <h3 className="text-xs font-medium text-white uppercase tracking-wider mb-1">
          Supervisión por Cámara Requerida
        </h3>
        <p className="text-[11px] text-[#bbc7c6] leading-relaxed mb-3">
          Esta evaluación exige supervisión de cámara activa para verificar la integridad del examen.
        </p>

        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-md surface-deep border border-rose-500/40 text-[11px] text-rose-300 text-left">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={onRequestCamera}
          className="btn-aurora w-full py-2 px-3 text-xs font-medium flex items-center justify-center gap-2 rounded-md"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Activar Cámara</span>
        </button>
      </div>
    );
  }

  // Minimized state: sleek compact pill
  if (isMinimized) {
    return (
      <div className="surface-card p-2 rounded-xl border border-white/10 flex items-center justify-between gap-3 animate-fadeIn">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${phoneDetected ? 'bg-rose-500 animate-ping' : 'bg-[#cbfffc] animate-pulse'}`}></span>
          <span className="text-[11px] font-mono text-[#edfffe] uppercase tracking-wider">
            {phoneDetected ? '⚠️ Alerta de Cámara' : 'Cámara Activa (IA Watchdog)'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          title="Expandir vista de cámara"
          className="p-1 rounded surface-deep text-[#bbc7c6] hover:text-white border border-white/10 transition"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`surface-card rounded-2xl border transition-all duration-300 overflow-hidden relative ${
        phoneDetected 
          ? 'border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
          : 'border-white/10'
      }`}
    >
      {/* Video Header Strip */}
      <div className="px-3 py-2 bg-[#003734] border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${phoneDetected ? 'bg-rose-400 animate-ping' : 'bg-[#cbfffc] animate-pulse'}`}></span>
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] font-medium text-white truncate max-w-[170px] xs:max-w-none">
            {phoneDetected ? 'Dispositivo Detectado' : 'Supervisión en Vivo'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isModelLoading && (
            <span title="Cargando modelo de visión..." className="text-[#bbc7c6] flex items-center gap-1 text-[10px] font-mono">
              <RefreshCw className="w-3 h-3 animate-spin text-[#00827c]" />
              <span className="hidden sm:inline">IA</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            title="Minimizar cámara"
            className="p-1 rounded bg-[#011d1c] text-[#bbc7c6] hover:text-white border border-white/10 transition"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Video Container (Mirrored for natural webcam experience) */}
      <div className="relative aspect-video w-full bg-[#011d1c] overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />

        {/* Real-time Phone Detection Flashing Overlay */}
        {phoneDetected && (
          <div className="absolute inset-0 bg-rose-500/20 border-2 border-rose-500 flex flex-col items-center justify-center p-2 text-center animate-pulse">
            <Smartphone className="w-6 h-6 text-rose-300 mb-1" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white bg-rose-600/90 px-2 py-0.5 rounded font-mono">
              ¡Celular en Pantalla!
            </span>
            <span className="text-[9px] text-white/90 mt-0.5">
              Guarda el dispositivo de inmediato
            </span>
          </div>
        )}

        {/* Warning if no person is in view */}
        {personCount === 0 && !phoneDetected && (
          <div className="absolute top-2 left-2 right-2 bg-amber-500/90 text-[#012624] text-[10px] font-medium py-1 px-2 rounded flex items-center justify-center gap-1 font-mono">
            <Eye className="w-3 h-3" />
            <span>Rostro fuera de encuadre</span>
          </div>
        )}
      </div>

      {/* Footer Status Metadata */}
      <div className="p-2.5 bg-[#011d1c]/90 text-[10px] text-[#bbc7c6] flex items-center justify-between font-mono">
        <span className="flex items-center gap-1">
          {isModelReady ? (
            <span className="text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#00827c]" />
              <span>Watchdog IA Activo</span>
            </span>
          ) : (
            <span className="text-[#bbc7c6]">
              {isModelLoading ? 'Cargando IA...' : 'Cámara Activa'}
            </span>
          )}
        </span>

        <span className="text-[9px] text-[#707777]">
          Zero-Biometric Leak
        </span>
      </div>
    </div>
  );
};
