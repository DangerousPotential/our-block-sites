'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import type { GetaiVoiceSample } from '@/lib/game/party-games';

type Status =
  | 'requesting'
  | 'live'
  | 'activate'
  | 'denied'
  | 'unavailable'
  | 'off';
export default function GetaiMicrophone({
  pitStop,
  onSample,
}: {
  pitStop: number;
  onSample: (sample: GetaiVoiceSample) => void;
}) {
  const [status, setStatus] = useState<Status>('requesting');
  const [attempt, setAttempt] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [level, setLevel] = useState(0);
  const context = useRef<AudioContext | null>(null);
  const report = useEffectEvent(onSample);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let stream: MediaStream | undefined;
    let audio: AudioContext | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        audio = new AudioContext();
        context.current = audio;
        const input = audio.createMediaStreamSource(stream);
        const analyser = audio.createAnalyser();
        analyser.fftSize = 1024;
        input.connect(analyser);
        const values = new Float32Array(analyser.fftSize);
        // Analyse locally. The microphone is never connected to speakers or recorded.
        const measure = () => {
          if (disposed) return;
          const active =
            audio?.state === 'running' &&
            stream
              ?.getAudioTracks()
              .some((track) => track.readyState === 'live') === true;
          analyser.getFloatTimeDomainData(values);
          let energy = 0;
          for (const value of values) energy += value * value;
          const volume = active
            ? Math.min(1, Math.sqrt(energy / values.length) * 8)
            : 0;
          setLevel(volume);
          report({ pitStop, level: volume, active });
        };
        audio.onstatechange = () => {
          if (!disposed)
            setStatus(audio?.state === 'running' ? 'live' : 'activate');
        };
        stream.getAudioTracks().forEach((track) => {
          track.onended = () => {
            if (!disposed) {
              report({ pitStop, level: 0, active: false });
              setStatus('unavailable');
            }
          };
        });
        setStatus(audio.state === 'running' ? 'live' : 'activate');
        void audio.resume().catch(() => {
          if (!disposed) setStatus('activate');
        });
        measure();
        timer = setInterval(measure, 80);
      } catch (error) {
        stream?.getTracks().forEach((track) => track.stop());
        if (!disposed)
          setStatus(
            error instanceof DOMException &&
              ['NotAllowedError', 'PermissionDeniedError'].includes(error.name)
              ? 'denied'
              : 'unavailable',
          );
      }
    };
    void start();
    return () => {
      disposed = true;
      clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (audio) {
        audio.onstatechange = null;
        void audio.close().catch(() => {});
      }
      context.current = null;
      report({ pitStop, level: 0, active: false });
    };
  }, [pitStop, attempt, enabled]);
  function retry() {
    if (status === 'activate' && context.current) {
      void context.current
        .resume()
        .then(() => setStatus('live'))
        .catch(() => setStatus('unavailable'));
    } else {
      setStatus('requesting');
      setEnabled(true);
      setAttempt((value) => value + 1);
    }
  }
  return (
    <section className="getai-microphone" aria-label="Singalong microphone">
      <div className="getai-mic-status">
        {status === 'live' ? <Mic size={20} /> : <MicOff size={20} />}
        <output>
          {
            {
              requesting: 'Allow microphone access',
              live: 'Mic on',
              activate: 'Tap to enable mic',
              denied: 'Microphone blocked',
              unavailable: 'Microphone unavailable',
              off: 'Mic off',
            }[status]
          }
        </output>
        {status === 'live' ? (
          <button
            onClick={() => {
              setEnabled(false);
              setStatus('off');
              setLevel(0);
            }}
          >
            Turn off
          </button>
        ) : status !== 'requesting' ? (
          <button onClick={retry}>
            {status === 'off' || status === 'activate'
              ? 'Enable mic'
              : 'Try again'}
          </button>
        ) : null}
      </div>
      <meter
        min={0}
        max={1}
        value={status === 'live' ? level : 0}
        aria-label="Microphone input level"
      />
      {status === 'denied' && (
        <p>Allow the microphone in your browser’s site settings.</p>
      )}
    </section>
  );
}
