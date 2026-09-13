'use client';
import { useRef, useState } from 'react';
import { Download, Check } from 'lucide-react';
import { assetBytes, downloadAssets, type DownloadProgress } from '@/lib/storage/download-assets';
import './asset-download.css';

export default function AssetDownload({ onReady, ready = false }: { onReady: () => void; ready?: boolean }) {
  const running = useRef(false);
  const [downloadStatus, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState<DownloadProgress>({ completed: 0, total: assetBytes, failed: 0 });
  const status = ready ? 'ready' : downloadStatus;
  const [error, setError] = useState('');
  const percent = Math.floor(progress.completed / progress.total * 100);
  return <div className="asset-download">
    <button className="secondary" disabled={status === 'loading' || status === 'ready'} onClick={async () => {
      if (running.current) return;
      running.current = true;
      setStatus('loading'); setError('');
      try {
        await downloadAssets(setProgress);
        setStatus('ready'); onReady();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Download failed. Please retry.');
        setStatus('error');
      } finally { running.current = false; }
    }}>
      {status === 'ready' ? <Check size={16} /> : <Download size={16} />}
      {status === 'ready' ? 'Assets ready' : status === 'loading' ? `Downloading… ${percent}%` : status === 'error' ? 'Retry download' : `Download all assets · ${Math.ceil(assetBytes / 1048576)} MB`}
    </button>
    {status === 'loading' && <progress aria-label="Asset download" max={progress.total} value={progress.completed} />}
    <output>{error || (status === 'ready' ? 'Ready for God mode' : status === 'idle' ? 'Download before entering God mode' : '')}</output>
  </div>;
}
