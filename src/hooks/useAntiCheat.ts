import { useState, useEffect, useRef } from 'react';
import { studentService } from '../services/studentService';
import type { ViolationEventType } from '../types';

interface UseAntiCheatProps {
  examId: string;
  studentUid: string;
  maxViolations: number;
  initialViolations?: number;
  isActive: boolean;
  onDisqualified: () => void;
}

export interface AntiCheatWarning {
  violationNumber: number;
  maxViolations: number;
  eventType: ViolationEventType;
  message: string;
}

export const useAntiCheat = ({
  examId,
  studentUid,
  maxViolations,
  initialViolations = 0,
  isActive,
  onDisqualified,
}: UseAntiCheatProps) => {
  const [violationCount, setViolationCount] = useState<number>(initialViolations);
  const [activeWarning, setActiveWarning] = useState<AntiCheatWarning | null>(null);

  const lastTriggerTimeRef = useRef<number>(0);
  const violationCountRef = useRef<number>(initialViolations);
  violationCountRef.current = violationCount;

  const onDisqualifiedRef = useRef(onDisqualified);
  onDisqualifiedRef.current = onDisqualified;

  // Trigger violation with throttling to prevent dual-events (blur + visibilitychange)
  const triggerViolation = async (eventType: ViolationEventType, details: string) => {
    if (!isActive) return;

    const now = Date.now();
    // 1500ms cooldown between events
    if (now - lastTriggerTimeRef.current < 1500) {
      return;
    }
    lastTriggerTimeRef.current = now;

    const currentCount = violationCountRef.current;
    const nextCount = currentCount + 1;
    setViolationCount(nextCount);

    // Save to Firebase Realtime Database
    try {
      await studentService.logViolation(
        examId,
        studentUid,
        eventType,
        details,
        currentCount
      );
    } catch (err) {
      console.error('Error al registrar log de sospecha:', err);
    }

    if (nextCount >= maxViolations) {
      // Disqualification reached
      onDisqualifiedRef.current();
    } else {
      // Progressive warning
      let message = '';
      if (nextCount === 1) {
        message = `Infracción 1 de ${maxViolations}: Has cambiado de pestaña o minimizado la ventana. Toda actividad fuera del examen queda registrada.`;
      } else {
        message = `Infracción ${nextCount} de ${maxViolations}: Nueva infracción detectada. Estás cerca del límite permitido (${maxViolations}). Si incurres en otra infracción, tu examen será anulado de inmediato.`;
      }

      setActiveWarning({
        violationNumber: nextCount,
        maxViolations,
        eventType,
        message,
      });
    }
  };

  useEffect(() => {
    if (!isActive) return;

    // 1. Visibility change listener (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation(
          'visibility_hidden',
          'El estudiante cambió de pestaña o minimizó la ventana del navegador.'
        );
      }
    };

    // 2. Window Blur listener (clicking outside window, second screen, alt-tab)
    const handleWindowBlur = () => {
      triggerViolation(
        'tab_blur',
        'La ventana del examen perdió el foco activo del usuario.'
      );
    };

    // 3. Prevent Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation(
        'contextmenu',
        'Intento de click derecho / menú contextual para inspeccionar o buscar respuestas.'
      );
    };

    // 4. Prevent Keyboard inspection and copy/paste shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 or Ctrl+Shift+I or Ctrl+Shift+J (Devtools)
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault();
        triggerViolation(
          'devtools_opened',
          'Intento de abrir las herramientas de desarrollador o ver el código fuente.'
        );
      }

      // Copy or Paste attempt
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        triggerViolation(
          'paste_attempt',
          'Intento de copiar o pegar texto usando atajos de teclado.'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, examId, studentUid, maxViolations]);

  const dismissWarning = () => {
    setActiveWarning(null);
  };

  return {
    violationCount,
    activeWarning,
    dismissWarning,
  };
};
