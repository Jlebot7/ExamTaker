import type { ViolationEventType } from '../types';

export interface DetectionPrediction {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

export interface ProctoringTrackerState {
  consecutivePhoneHits: number;
  consecutiveAbsenceHits: number;
  consecutiveMultipleHits: number;
  lastViolationTimes: Record<string, number>;
}

export interface ProctoringFrameResult {
  phoneDetected: boolean;
  personCount: number;
  nextState: ProctoringTrackerState;
  violationToEmit?: {
    type: ViolationEventType;
    details: string;
  };
}

export const PHONE_SCORE_THRESHOLD = 0.52;
export const PERSON_SCORE_THRESHOLD = 0.45;
export const PHONE_CONSECUTIVE_REQUIRED = 2;
export const ABSENCE_CONSECUTIVE_REQUIRED = 5;
export const MULTIPLE_PERSONS_CONSECUTIVE_REQUIRED = 2;
export const VIOLATION_COOLDOWN_MS = 6000;

export function createInitialTrackerState(): ProctoringTrackerState {
  return {
    consecutivePhoneHits: 0,
    consecutiveAbsenceHits: 0,
    consecutiveMultipleHits: 0,
    lastViolationTimes: {},
  };
}

/**
 * Pure evaluator for vision predictions per frame.
 * Checks for:
 * 1. Cell phone holding/photography attempts (debounced 2 consecutive frames).
 * 2. Complete absence of examinee (debounced 5 consecutive frames).
 * 3. Multiple persons present in the camera frame (debounced 2 consecutive frames).
 * Applies a strict cooldown between identical violation events.
 */
export function evaluateDetectionFrame(
  predictions: DetectionPrediction[],
  currentState: ProctoringTrackerState,
  currentTimeMs: number = Date.now()
): ProctoringFrameResult {
  const nextState: ProctoringTrackerState = {
    ...currentState,
    lastViolationTimes: { ...currentState.lastViolationTimes },
  };

  let violationToEmit: { type: ViolationEventType; details: string } | undefined;

  const canEmitViolation = (type: ViolationEventType): boolean => {
    const last = nextState.lastViolationTimes[type];
    if (last === undefined || currentTimeMs - last >= VIOLATION_COOLDOWN_MS) {
      nextState.lastViolationTimes[type] = currentTimeMs;
      return true;
    }
    return false;
  };

  // 1. Phone / External Screen Detection
  const phoneDetections = predictions.filter(
    p => p.class === 'cell phone' && p.score >= PHONE_SCORE_THRESHOLD
  );

  const phoneDetected = phoneDetections.length > 0;
  if (phoneDetected) {
    nextState.consecutivePhoneHits += 1;
    if (nextState.consecutivePhoneHits >= PHONE_CONSECUTIVE_REQUIRED) {
      const bestConfidence = Math.round(Math.max(...phoneDetections.map(p => p.score)) * 100);
      if (canEmitViolation('camera_phone_detected')) {
        violationToEmit = {
          type: 'camera_phone_detected',
          details: `Dispositivo móvil o celular detectado frente a la pantalla/cámara (confianza: ${bestConfidence}%). Posible intento de fotografía o consulta externa.`,
        };
      }
    }
  } else {
    nextState.consecutivePhoneHits = 0;
  }

  // 2. Person Count / Presence Detection
  const personDetections = predictions.filter(
    p => p.class === 'person' && p.score >= PERSON_SCORE_THRESHOLD
  );
  const personCount = personDetections.length;

  if (personCount === 0) {
    nextState.consecutiveAbsenceHits += 1;
    if (nextState.consecutiveAbsenceHits >= ABSENCE_CONSECUTIVE_REQUIRED) {
      if (!violationToEmit && canEmitViolation('camera_absence')) {
        violationToEmit = {
          type: 'camera_absence',
          details: 'El estudiante está ausente del encuadre de la cámara de seguridad.',
        };
      }
    }
  } else {
    nextState.consecutiveAbsenceHits = 0;
  }

  if (personCount > 1) {
    nextState.consecutiveMultipleHits += 1;
    if (nextState.consecutiveMultipleHits >= MULTIPLE_PERSONS_CONSECUTIVE_REQUIRED) {
      if (!violationToEmit && canEmitViolation('camera_multiple_persons')) {
        violationToEmit = {
          type: 'camera_multiple_persons',
          details: `Se detectaron ${personCount} personas en el encuadre de la evaluación.`,
        };
      }
    }
  } else {
    nextState.consecutiveMultipleHits = 0;
  }

  return {
    phoneDetected,
    personCount,
    nextState,
    violationToEmit,
  };
}
