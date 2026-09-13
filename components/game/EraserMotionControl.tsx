'use client';
import { useEffect, useRef, useState } from 'react';
import { Smartphone } from 'lucide-react';
import {
  createFlickDetector,
  motionCalibration,
  calibratedFlick,
  type MotionCalibration,
  detectFlick,
  hasMotionReading,
  type Flick,
} from '@/lib/game/eraser-motion';

export default function EraserMotionControl({
  active,
  onFlick,
}: {
  active: boolean;
  onFlick: (flick: Flick) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [calibrationEpoch, setCalibrationEpoch] = useState(0);
  const [calibrated, setCalibrated] = useState(false);
  const [message, setMessage] = useState(
    'Swipe on the desk, or enable phone swings.',
  );
  const live = useRef({ active, onFlick });
  const mounted = useRef(true);
  useEffect(() => {
    live.current = { active, onFlick };
  }, [active, onFlick]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let detector = createFlickDetector();
    let received = false;
    let right: Flick | null = null;
    let calibration: MotionCalibration | null = null;
    let candidate: MotionCalibration | null = null;
    let step = 0;
    const reset = () => {
      detector = createFlickDetector();
    };
    const read = (event: DeviceMotionEvent) => {
      if (document.hidden || !document.hasFocus()) {
        reset();
        return;
      }
      if (!hasMotionReading(event)) return;
      if (!received) {
        received = true;
        setMessage(
          'Hold the phone flat, screen up, top edge away from you. Move RIGHT →, then stop. Calibration uses no turns.',
        );
      }
      if (calibration && !live.current.active) {
        reset();
        return;
      }
      const angle =
        screen.orientation?.angle ??
        // Legacy iOS exposes the screen angle here.
        // oxlint-disable-next-line typescript/no-deprecated
        (window as Window & { orientation?: number }).orientation ??
        0;
      const flick = detectFlick(detector, event, performance.now(), angle);
      if (!flick) return;
      if (!calibration) {
        if (step === 0) {
          right = flick;
          step = 1;
          setMessage('1/4 Right captured. Hold still, then move FRONT ↑, away from you.');
        } else if (step === 1) {
          candidate = motionCalibration(right!, flick);
          if (candidate) {
            step = 2;
            setMessage('2/4 Front captured. Hold still, then move LEFT ←.');
          } else {
            setMessage('Move FRONT ↑ away from you, perpendicular to your right movement.');
          }
        } else {
          const mapped = calibratedFlick(flick, candidate!);
          const correct = step === 2 ? mapped.x < -0.75 : mapped.y > 0.75;
          if (!correct) {
            setMessage(step === 2
              ? 'Direction did not match. Hold still, then move LEFT ← again, or restart calibration.'
              : 'Direction did not match. Hold still, then move BACK ↓ toward you again, or restart calibration.');
          } else if (step === 2) {
            step = 3;
            setMessage('3/4 Left confirmed. Hold still, then move BACK ↓ toward you.');
          } else {
            calibration = candidate;
            setCalibrated(true);
            setMessage('4/4 Calibrated. Keep the phone flat: front = ↑, back = ↓, left = ←, right = →.');
          }
        }
        reset();
        return;
      }
      live.current.onFlick(calibratedFlick(flick, calibration));
    };
    const timeout = setTimeout(() => {
      if (!received)
        setMessage('No sensor readings yet. Swipe or use Aim & flick below.');
    }, 3500);
    const rotated = () => {
      right = null;
      candidate = null;
      step = 0;
      calibration = null;
      reset();
      setCalibrated(false);
      setMessage(
        'Phone rotated. Hold still, then swing RIGHT → to recalibrate.',
      );
    };
    window.addEventListener('devicemotion', read);
    window.addEventListener('blur', reset);
    window.addEventListener('orientationchange', rotated);
    document.addEventListener('visibilitychange', reset);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('devicemotion', read);
      window.removeEventListener('blur', reset);
      window.removeEventListener('orientationchange', rotated);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [enabled, calibrationEpoch]);
  async function toggle() {
    if (enabled) {
      setEnabled(false);
      setCalibrated(false);
      setMessage('Phone swings are off. Swipe or use Aim & flick.');
      return;
    }
    if (!window.isSecureContext || !('DeviceMotionEvent' in window)) {
      setMessage(
        'Phone swings need HTTPS and a supported phone. Swipe or use Aim & flick here.',
      );
      return;
    }
    setPending(true);
    try {
      const sensor = DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<string>;
      };
      const result = sensor.requestPermission
        ? await sensor.requestPermission()
        : 'granted';
      if (!mounted.current) return;
      if (result !== 'granted') {
        setMessage(
          'Motion permission declined. Swipe or use Aim & flick instead.',
        );
        return;
      }
      setCalibrated(false);
      setEnabled(true);
      setMessage('Waiting for sensor readings. Hold your phone still briefly.');
    } catch {
      if (mounted.current)
        setMessage('Motion is unavailable. Swipe or use Aim & flick instead.');
    } finally {
      if (mounted.current) setPending(false);
    }
  }
  return (
    <div className="eraser-motion">
      <button
        type="button"
        className="eraser-secondary"
        disabled={pending}
        aria-pressed={enabled}
        onClick={() => void toggle()}
      >
        <Smartphone size={18} />{' '}
        {pending
          ? 'Enabling…'
          : enabled
            ? 'Turn off phone swings'
            : 'Calibrate phone directions'}
      </button>
      <div className="eraser-motion-guidance">
        <output aria-live="polite">{message}</output>
        {enabled && (
          <button
            type="button"
            className="eraser-recalibrate"
            onClick={() => {
              setCalibrated(false);
              setMessage('Hold still, then swing RIGHT → to recalibrate.');
              setCalibrationEpoch((n) => n + 1);
            }}
          >
            {calibrated ? 'Recalibrate directions' : 'Restart calibration'}
          </button>
        )}
      </div>
    </div>
  );
}
