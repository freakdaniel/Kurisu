import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionPreview } from '@/types/desktop';

export interface ChatSection {
  key: string;
  label: string;
  sessions: SessionPreview[];
}

export function useSidebarSections(
  mode: 'projects' | 'chats',
  orderedSessions: SessionPreview[],
): ChatSection[] {
  const { t, i18n } = useTranslation();

  return useMemo(() => {
    if (mode !== 'chats') {
      return [];
    }

    const language = i18n.language || 'en-US';
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const recentCutoff = new Date(now);
    recentCutoff.setDate(recentCutoff.getDate() - 30);

    const sections = new Map<string, ChatSection>();

    const resolveSection = (session: SessionPreview): ChatSection => {
      const activityDate = new Date(session.lastActivity);
      const startOfActivityDay = new Date(
        activityDate.getFullYear(),
        activityDate.getMonth(),
        activityDate.getDate(),
      );
      const dayDifference = Math.floor(
        (startOfToday.getTime() - startOfActivityDay.getTime()) / 86_400_000,
      );

      if (dayDifference <= 0) {
        return { key: 'today', label: t('sidebar.today'), sessions: [] };
      }
      if (dayDifference === 1) {
        return { key: 'yesterday', label: t('sidebar.yesterday'), sessions: [] };
      }
      if (dayDifference === 2) {
        return { key: 'day-before-yesterday', label: t('sidebar.dayBeforeYesterday'), sessions: [] };
      }
      if (dayDifference <= 7) {
        return { key: 'previous-week', label: t('sidebar.previousWeek'), sessions: [] };
      }
      if (activityDate >= recentCutoff) {
        return { key: 'recent-30-days', label: t('sidebar.previousThirtyDays'), sessions: [] };
      }

      const monthLabel = new Intl.DateTimeFormat(language, { month: 'long' }).format(activityDate);
      const monthKey = `${activityDate.getFullYear()}-${activityDate.getMonth()}`;
      return { key: monthKey, label: monthLabel, sessions: [] };
    };

    for (const session of orderedSessions) {
      const section = resolveSection(session);
      const existing = sections.get(section.key) ?? section;
      existing.sessions.push(session);
      sections.set(section.key, existing);
    }

    return Array.from(sections.values());
  }, [i18n.language, mode, orderedSessions, t]);
}
