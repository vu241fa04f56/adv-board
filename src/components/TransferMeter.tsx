import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Loader2, Wifi } from 'lucide-react';

export interface TransferMeterProps {
  mode?: 'upload' | 'download' | 'local';
  label: string;
  done: number;
  total: number;
  speed?: number;
  etaSeconds?: number | null;
  compact?: boolean;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatEta(seconds?: number | null) {
  if (!seconds || !Number.isFinite(seconds)) return 'calculating…';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

export function TransferMeter({
  mode = 'upload',
  label,
  done,
  total,
  speed = 0,
  etaSeconds = null,
  compact = false,
}: TransferMeterProps) {
  const safeTotal = Math.max(total || 0, 1);
  const percent = Math.min(100, Math.max(0, (done / safeTotal) * 100));
  const remaining = Math.max(0, total - done);
  const Icon = mode === 'download' ? ArrowDownToLine : mode === 'local' ? Wifi : ArrowUpFromLine;

  return (
    <div className={`transfer-meter ${compact ? 'transfer-meter-compact' : ''}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="transfer-meter-icon"><Icon className="w-3.5 h-3.5" /></span>
          <span className="font-semibold truncate">{label}</span>
          {percent >= 100 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          {percent < 100 && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300 shrink-0" />}
        </div>
        <span className="font-mono font-bold text-purple-200 shrink-0">{percent.toFixed(0)}%</span>
      </div>

      <div className="transfer-meter-track" aria-label={`${percent.toFixed(0)} percent complete`}>
        <div className="transfer-meter-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-2 text-[10px] font-mono text-slate-400">
        <span><strong className="text-slate-200">{formatBytes(done)}</strong> / {formatBytes(total)}</span>
        <span>Left: <strong className="text-slate-200">{formatBytes(remaining)}</strong></span>
        <span>Speed: <strong className="text-emerald-300">{speed > 0 ? `${formatBytes(speed)}/s` : '—'}</strong></span>
        <span>ETA: <strong className="text-amber-300">{formatEta(etaSeconds)}</strong></span>
      </div>
    </div>
  );
}
