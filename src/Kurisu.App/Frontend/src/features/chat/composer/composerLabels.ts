import type { TFunction } from 'i18next';
import { basename } from '@/lib/paths';

export function getProjectDisplayName(workingDirectory: string, t: TFunction): string {
  if (!workingDirectory) {
    return t('chat.projectPicker.noProject');
  }

  return basename(workingDirectory) || workingDirectory;
}

export function getProjectPickerSearchPlaceholder(t: TFunction): string {
  return t('chat.projectPicker.searchPlaceholder');
}

export function getAddProjectLabel(t: TFunction): string {
  return t('chat.projectPicker.addProject');
}

export function getNoProjectsLabel(t: TFunction): string {
  return t('chat.projectPicker.noProjectsFound');
}
