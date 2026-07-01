// components/files/AuthedWorkLogImage.tsx
// Renders a work-log image thumbnail using auth-fetched blob URLs so
// the browser can display images from endpoints that require Bearer.
// Uses a module-level cache keyed by SHA-256 hash — same content = same
// blob URL across all instances in the session.
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

async function getBlobUrl(hash: string, filename: string): Promise<string> {
  const hit = cache.get(hash);
  if (hit) return hit;
  const pending = inflight.get(hash);
  if (pending) return pending;
  const p = api.workLogs.images
    .fetchBlobUrl(hash, filename)
    .then((url) => {
      cache.set(hash, url);
      inflight.delete(hash);
      return url;
    })
    .catch((err) => {
      inflight.delete(hash);
      throw err;
    });
  inflight.set(hash, p);
  return p;
}

interface Props {
  hash: string;
  filename: string;
  className?: string;
  alt?: string;
  loading?: 'lazy' | 'eager';
  onError?: () => void;
}

export const AuthedWorkLogImage: React.FC<Props> = ({
  hash,
  filename,
  className,
  alt,
  loading = 'lazy',
  onError,
}) => {
  const [url, setUrl] = useState<string>(cache.get(hash) || '');
  const [errored, setErrored] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (cache.has(hash)) {
      setUrl(cache.get(hash)!);
      setErrored(false);
      return;
    }
    setUrl('');
    setErrored(false);
    getBlobUrl(hash, filename)
      .then((u) => {
        if (mounted.current) setUrl(u);
      })
      .catch(() => {
        if (mounted.current) {
          setErrored(true);
          onError?.();
        }
      });
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, filename]);

  if (errored) {
    return (
      <div
        className={`${className || ''} bg-red-50 text-red-400 flex items-center justify-center text-xs`}
        title={filename}
      >
        圖片載入失敗
      </div>
    );
  }
  if (!url) {
    return (
      <div
        className={`${className || ''} bg-slate-100 animate-pulse`}
        aria-label={alt || filename}
      />
    );
  }
  return (
    <img
      src={url}
      alt={alt || filename}
      className={className}
      loading={loading}
      onError={() => {
        setErrored(true);
        onError?.();
      }}
    />
  );
};
