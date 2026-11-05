import { describe, it, expect } from 'vitest';
import {
  evaluateDetectionFrame,
  createInitialTrackerState,
  type DetectionPrediction,
} from './cameraProctoringUtils';

describe('cameraProctoringUtils', () => {
  it('initial tracker state has zero hits and empty violation timestamps', () => {
    const initial = createInitialTrackerState();
    expect(initial.consecutivePhoneHits).toBe(0);
    expect(initial.consecutiveAbsenceHits).toBe(0);
    expect(initial.consecutiveMultipleHits).toBe(0);
    expect(initial.lastViolationTimes).toEqual({});
  });

  describe('Phone Detection & Debouncing', () => {
    it('ignores cell phone detections below the confidence threshold (0.52)', () => {
      const state = createInitialTrackerState();
      const predictions: DetectionPrediction[] = [
        { bbox: [0, 0, 10, 10], class: 'person', score: 0.9 },
        { bbox: [10, 10, 20, 20], class: 'cell phone', score: 0.45 }, // Below 0.52
      ];

      const result = evaluateDetectionFrame(predictions, state);
      expect(result.phoneDetected).toBe(false);
      expect(result.nextState.consecutivePhoneHits).toBe(0);
      expect(result.violationToEmit).toBeUndefined();
    });

    it('requires 2 consecutive positive frames before emitting phone violation', () => {
      let state = createInitialTrackerState();
      const predictions: DetectionPrediction[] = [
        { bbox: [0, 0, 10, 10], class: 'person', score: 0.9 },
        { bbox: [10, 10, 20, 20], class: 'cell phone', score: 0.85 },
      ];

      // Frame 1: Detected, but consecutive count is 1 (< 2 required)
      const res1 = evaluateDetectionFrame(predictions, state, 1000);
      expect(res1.phoneDetected).toBe(true);
      expect(res1.nextState.consecutivePhoneHits).toBe(1);
      expect(res1.violationToEmit).toBeUndefined();

      state = res1.nextState;

      // Frame 2: Detected, consecutive count reaches 2 -> violation emitted!
      const res2 = evaluateDetectionFrame(predictions, state, 2000);
      expect(res2.phoneDetected).toBe(true);
      expect(res2.nextState.consecutivePhoneHits).toBe(2);
      expect(res2.violationToEmit).toBeDefined();
      expect(res2.violationToEmit?.type).toBe('camera_phone_detected');
      expect(res2.violationToEmit?.details).toContain('85%');
    });

    it('resets consecutive phone counter if phone is removed on the next frame', () => {
      let state = createInitialTrackerState();
      const phoneFrame: DetectionPrediction[] = [
        { bbox: [0, 0, 10, 10], class: 'person', score: 0.9 },
        { bbox: [10, 10, 20, 20], class: 'cell phone', score: 0.8 },
      ];
      const clearFrame: DetectionPrediction[] = [
        { bbox: [0, 0, 10, 10], class: 'person', score: 0.9 },
      ];

      // Frame 1: Hit
      const res1 = evaluateDetectionFrame(phoneFrame, state, 1000);
      expect(res1.nextState.consecutivePhoneHits).toBe(1);

      // Frame 2: Clear
      const res2 = evaluateDetectionFrame(clearFrame, res1.nextState, 2000);
      expect(res2.phoneDetected).toBe(false);
      expect(res2.nextState.consecutivePhoneHits).toBe(0);
    });

    it('enforces cooldown period between identical violations', () => {
      let state = createInitialTrackerState();
      const phoneFrame: DetectionPrediction[] = [
        { bbox: [0, 0, 10, 10], class: 'person', score: 0.9 },
        { bbox: [10, 10, 20, 20], class: 'cell phone', score: 0.9 },
      ];

      // 1st hit
      const r1 = evaluateDetectionFrame(phoneFrame, state, 1000);
      // 2nd hit: emits violation at t = 2000ms
      const r2 = evaluateDetectionFrame(phoneFrame, r1.nextState, 2000);
      expect(r2.violationToEmit).toBeDefined();

      state = r2.nextState;

      // 3rd hit at t = 3000ms (within 6000ms cooldown) -> NO duplicate violation
      const r3 = evaluateDetectionFrame(phoneFrame, state, 3000);
      expect(r3.violationToEmit).toBeUndefined();

      // 4th hit after cooldown expires (t = 8500ms > 2000 + 6000) -> violation emitted again
      const r4 = evaluateDetectionFrame(phoneFrame, r3.nextState, 8500);
      expect(r4.violationToEmit).toBeDefined();
      expect(r4.violationToEmit?.type).toBe('camera_phone_detected');
    });
  });

  describe('Person Presence & Multiple Persons', () => {
    it('detects single person correctly without violations', () => {
      const state = createInitialTrackerState();
      const normalFrame: DetectionPrediction[] = [
        { bbox: [0, 0, 10, 10], class: 'person', score: 0.88 },
      ];

      const res = evaluateDetectionFrame(normalFrame, state, 1000);
      expect(res.personCount).toBe(1);
      expect(res.violationToEmit).toBeUndefined();
      expect(res.nextState.consecutiveAbsenceHits).toBe(0);
      expect(res.nextState.consecutiveMultipleHits).toBe(0);
    });

    it('requires 5 consecutive frames of absence before emitting camera_absence violation', () => {
      let state = createInitialTrackerState();
      const emptyFrame: DetectionPrediction[] = [];

      for (let i = 1; i <= 4; i++) {
        const res = evaluateDetectionFrame(emptyFrame, state, i * 1000);
        expect(res.personCount).toBe(0);
        expect(res.nextState.consecutiveAbsenceHits).toBe(i);
        expect(res.violationToEmit).toBeUndefined();
        state = res.nextState;
      }

      // 5th frame -> triggers absence violation
      const res5 = evaluateDetectionFrame(emptyFrame, state, 5000);
      expect(res5.nextState.consecutiveAbsenceHits).toBe(5);
      expect(res5.violationToEmit).toBeDefined();
      expect(res5.violationToEmit?.type).toBe('camera_absence');
    });

    it('requires 2 consecutive frames of multiple persons before emitting camera_multiple_persons', () => {
      let state = createInitialTrackerState();
      const multipleFrame: DetectionPrediction[] = [
        { bbox: [0, 0, 10, 10], class: 'person', score: 0.8 },
        { bbox: [20, 20, 30, 30], class: 'person', score: 0.75 },
      ];

      const res1 = evaluateDetectionFrame(multipleFrame, state, 1000);
      expect(res1.personCount).toBe(2);
      expect(res1.nextState.consecutiveMultipleHits).toBe(1);
      expect(res1.violationToEmit).toBeUndefined();

      const res2 = evaluateDetectionFrame(multipleFrame, res1.nextState, 2000);
      expect(res2.personCount).toBe(2);
      expect(res2.nextState.consecutiveMultipleHits).toBe(2);
      expect(res2.violationToEmit).toBeDefined();
      expect(res2.violationToEmit?.type).toBe('camera_multiple_persons');
      expect(res2.violationToEmit?.details).toContain('2 personas');
    });
  });
});
