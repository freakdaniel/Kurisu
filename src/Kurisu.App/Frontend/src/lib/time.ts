import type { TFunction } from 'i18next';

export function formatRelativeTime(dateStr: string, t: TFunction): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return t('sidebar.now');
  if (diffMs < 60_000) return t('sidebar.now');
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}${t('sidebar.minutesAgo')}`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}${t('sidebar.hoursAgo')}`;
  if (diffMs < 604_800_000) return `${Math.floor(diffMs / 86_400_000)}${t('sidebar.daysAgo')}`;
  return `${Math.floor(diffMs / 604_800_000)}${t('sidebar.weeksAgo')}`;
}
