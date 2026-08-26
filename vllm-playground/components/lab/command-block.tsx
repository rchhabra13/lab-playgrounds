'use client';
import { useEffect, useState } from 'react';
import { Copy, Check, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  command: string;
  title?: string;
  onRun?: () => void;
  runDisabled?: boolean;
  busy?: boolean;
  onCancel?: () => void;
  runLabel?: string;
  compact?: boolean;
};
export function CommandBlock({
  command,
  title = 'Command',
  onRun,
  runDisabled,
  busy,
  onCancel,
  runLabel = 'Run command',
  compact,
}: Props) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    setCopied(false);
    setError('');
  }, [command]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setError('');
    } catch {
      setError(
        'Clipboard unavailable. Select the command below and copy it manually.',
      );
    }
  }
  return (
    <div className={'dynamic-command ' + (compact ? 'compact-command' : '')}>
      <div className="command-toolbar">
        <span>{title}</span>
        <div>
          <Button className="quiet-btn" disabled={!command} onClick={copy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}{' '}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          {onRun &&
            (busy && onCancel ? (
              <Button className="secondary-btn" onClick={onCancel}>
                <Square size={13} />
                Cancel
              </Button>
            ) : (
              <Button
                className="secondary-btn"
                disabled={runDisabled || !command || busy}
                onClick={onRun}
              >
                <Play size={13} />
                {runLabel}
              </Button>
            ))}
        </div>
      </div>
      <pre className="command-code">
        {command || 'Command available when the controller connects.'}
      </pre>
      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
