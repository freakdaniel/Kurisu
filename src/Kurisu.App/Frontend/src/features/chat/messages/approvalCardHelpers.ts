/**
 * Translation helpers and small utilities for the approval card. Lives in
 * its own module so `PendingApprovalCard.tsx` only exports React components
 * and stays Fast-Refresh friendly.
 */
import type { TFunction } from 'i18next';

export function getApprovalCardTitle(t: TFunction): string {
  return t('chat.approval.title');
}

export function getApprovalAllowOnceLabel(t: TFunction): string {
  return t('chat.approval.allowOnce');
}

export function getApprovalAlwaysAllowLabel(t: TFunction): string {
  return t('chat.approval.alwaysAllow');
}

export function getApprovalFeedbackLabel(t: TFunction): string {
  return t('chat.approval.feedbackLabel');
}

export function getApprovalFeedbackPlaceholder(t: TFunction): string {
  return t('chat.approval.feedbackPlaceholder');
}

export function formatMessageDetails(locale: string, t: TFunction, timestamp?: string): string {
  if (!timestamp) {
    return t('chat.message.timeUnavailable');
  }

  try {
    return new Date(timestamp).toLocaleString(locale || undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}
