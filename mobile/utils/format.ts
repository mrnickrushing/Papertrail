import { formatDistanceToNow, format } from 'date-fns';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRelativeDate(value: number | string): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'just now';
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatDate(value: number | string): string {
  return format(new Date(value), 'MMM d, yyyy');
}
