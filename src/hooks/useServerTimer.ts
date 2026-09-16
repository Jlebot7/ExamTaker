import { useState, useEffect, useRef } from 'react';
import { getEstimatedServerTime } from '../services/studentService';

interface UseServerTimerProps {
  startedAt: number;
  durationMinutes: number;
  onTimeExpired: () => void;
}

export const useServerTimer = ({
  startedAt,
  durationMinutes,
  onTimeExpired,
}: UseServerTimerProps) => {
  const totalDurationMs = durationMinutes * 60 * 1000;
  const targetEndTime = startedAt + totalDurationMs;

  const [remainingMs, setRemainingMs] = useState<number>(() => {
    const now = getEstimatedServerTime();
    return Math.max(0, targetEndTime - now);
  });

  const expiredRef = useRef(false);
  const onTimeExpiredRef = useRef(onTimeExpired);
  onTimeExpiredRef.current = onTimeExpired;

  useEffect(() => {
    expiredRef.current = false;

    const interval = setInterval(() => {
      const now = getEstimatedServerTime();
      const left = Math.max(0, targetEndTime - now);
      setRemainingMs(left);

      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        onTimeExpiredRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetEndTime]);

  // Format MM:SS or HH:MM:SS
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isLowTime = remainingMs < 5 * 60 * 1000; // less than 5 minutes
  const isCriticalTime = remainingMs < 60 * 1000; // less than 1 minute

  const percentage = Math.max(0, Math.min(100, (remainingMs / totalDurationMs) * 100));

  return {
    remainingMs,
    formattedTime,
    isLowTime,
    isCriticalTime,
    percentage,
    isExpired: remainingMs <= 0,
  };
};
