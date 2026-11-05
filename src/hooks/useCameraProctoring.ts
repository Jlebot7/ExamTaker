import { useEffect, useRef, useState, useCallback } from 'react';
import type { ViolationEventType } from '../types';

interface UseCameraProctoringProps {
  isActive: boolean;
  onViolation: (eventType: ViolationEventType, details: string) => void;
}

export type CameraPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported' | 'error';

interface DetectionItem {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

interface CocoSsdModel {
  detect: (img: HTMLVideoElement | HTMLCanvasElement) => Promise<DetectionItem[]>;
}

export const useCameraProctoring = ({
  isActive,
  onViolation,
}: UseCameraProctoringProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<CocoSsdModel | null>(null);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [permissionState, setPermissionState] = useState<CameraPermissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [personCount, setPersonCount] = useState<number>(1);

  // Consecutive detection counters for debouncing false positives
  const consecutivePhoneHitsRef = useRef(0);
  const consecutiveAbsenceHitsRef = useRef(0);
  const consecutiveMultipleHitsRef = useRef(0);
  const lastViolationTimeRef = useRef<Record<string, number>>({});

  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  // Trigger violation with cooldown per event type
  const triggerDebouncedViolation = useCallback((eventType: ViolationEventType, details: string, cooldownMs = 6000) => {
    const now = Date.now();
    const lastTime = lastViolationTimeRef.current[eventType] || 0;
    if (now - lastTime < cooldownMs) return;

    lastViolationTimeRef.current[eventType] = now;
    onViolationRef.current(eventType, details);
  }, []);

  // 1. Initialize camera stream
  const requestCameraAccess = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unsupported');
      setErrorMessage('Tu navegador o dispositivo no soporta acceso a la cámara web.');
      return false;
    }

    setPermissionState('requesting');
    setErrorMessage(null);

    try {
      // Request front camera (selfie/user facing) with mobile & desktop compatibility
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }

      setPermissionState('granted');

      // Listen for unexpected track closures (e.g. user toggles device switch or pulls plug)
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          setPermissionState('error');
          setErrorMessage('La cámara fue desconectada o deshabilitada durante la evaluación.');
          triggerDebouncedViolation(
            'camera_blocked',
            'La cámara fue desconectada o interrumpida durante la prueba.'
          );
        };
      });

      return true;
    } catch (err: unknown) {
      console.warn('Error al solicitar acceso a la cámara:', err);
      const isDenied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      if (isDenied) {
        setPermissionState('denied');
        setErrorMessage('Permiso de cámara denegado. Para rendir esta prueba con supervisión, debes permitir el acceso.');
        triggerDebouncedViolation(
          'camera_blocked',
          'El estudiante denegó o bloqueó el permiso de la cámara de seguridad.'
        );
      } else {
        setPermissionState('error');
        setErrorMessage('No se pudo acceder a la cámara. Verifica que ningún otro programa la esté usando.');
      }
      return false;
    }
  }, [triggerDebouncedViolation]);

  // 2. Load COCO-SSD lightweight model dynamically
  useEffect(() => {
    if (!isActive) return;

    let isCancelled = false;

    const loadVisionModel = async () => {
      if (modelRef.current) {
        setIsModelReady(true);
        return;
      }

      setIsModelLoading(true);
      try {
        // Dynamic imports so non-camera views or offline cold starts don't block
        await import('@tensorflow/tfjs');
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        
        if (isCancelled) return;

        // Use 'lite_mobilenet_v2': extremely fast, under ~2MB, highly accurate for cell phones & persons
        const loaded = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (!isCancelled) {
          modelRef.current = loaded;
          setIsModelReady(true);
        }
      } catch (loadErr) {
        console.warn('No se pudo cargar el modelo de visión COCO-SSD (operando en modo cámara estándar):', loadErr);
      } finally {
        if (!isCancelled) setIsModelLoading(false);
      }
    };

    loadVisionModel();

    return () => {
      isCancelled = true;
    };
  }, [isActive]);

  // 3. Computer Vision Detection Loop
  useEffect(() => {
    if (!isActive || permissionState !== 'granted' || !isModelReady) {
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
      return;
    }

    let isMounted = true;

    const runDetectionCycle = async () => {
      const video = videoRef.current;
      const model = modelRef.current;

      if (!video || !model || video.readyState < 2) {
        // Video not ready yet, re-schedule in 600ms
        if (isMounted) {
          loopTimerRef.current = setTimeout(runDetectionCycle, 600);
        }
        return;
      }

      try {
        const predictions = await model.detect(video);
        if (!isMounted) return;

        // A. Cellphone / Camera detection (looking for mobile phones held up or taking pictures)
        const phoneDetections = predictions.filter(
          p => p.class === 'cell phone' && p.score >= 0.52
        );

        if (phoneDetections.length > 0) {
          consecutivePhoneHitsRef.current += 1;
          const bestScore = Math.round(Math.max(...phoneDetections.map(p => p.score)) * 100);

          setPhoneDetected(true);

          // Require 2 consecutive hits (~1.8 seconds) to prevent false positives
          if (consecutivePhoneHitsRef.current >= 2) {
            triggerDebouncedViolation(
              'camera_phone_detected',
              `Dispositivo móvil o celular detectado frente a la pantalla/cámara (confianza: ${bestScore}%). Posible intento de fotografía o consulta externa.`
            );
          }
        } else {
          consecutivePhoneHitsRef.current = 0;
          setPhoneDetected(false);
        }

        // B. Person presence detection
        const persons = predictions.filter(
          p => p.class === 'person' && p.score >= 0.45
        );
        setPersonCount(persons.length);

        if (persons.length === 0) {
          consecutiveAbsenceHitsRef.current += 1;
          // ~6 seconds absent (5 consecutive cycles of 1200ms)
          if (consecutiveAbsenceHitsRef.current >= 5) {
            triggerDebouncedViolation(
              'camera_absence',
              'El estudiante está ausente del encuadre de la cámara de seguridad.'
            );
          }
        } else {
          consecutiveAbsenceHitsRef.current = 0;
        }

        if (persons.length > 1) {
          consecutiveMultipleHitsRef.current += 1;
          if (consecutiveMultipleHitsRef.current >= 2) {
            triggerDebouncedViolation(
              'camera_multiple_persons',
              `Se detectaron ${persons.length} personas en el encuadre de la evaluación.`
            );
          }
        } else {
          consecutiveMultipleHitsRef.current = 0;
        }
      } catch (inferErr) {
        console.warn('Error en ciclo de inferencia visual:', inferErr);
      }

      // Schedule next inference frame (every ~1100ms: responsive without overheating client device)
      if (isMounted) {
        loopTimerRef.current = setTimeout(runDetectionCycle, 1100);
      }
    };

    runDetectionCycle();

    return () => {
      isMounted = false;
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    };
  }, [isActive, permissionState, isModelReady, triggerDebouncedViolation]);

  // Teardown camera stream when deactivated or unmounted
  useEffect(() => {
    return () => {
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    permissionState,
    errorMessage,
    isModelLoading,
    isModelReady,
    phoneDetected,
    personCount,
    requestCameraAccess,
  };
};
