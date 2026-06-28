/**
 * Settings navigation categories.
 *
 * Shared between `SettingsDialog` (renders the category list and the matching
 * content section) and `MainLayout` (renders the category label inside the
 * title bar when settings is open). Co-locating the list here avoids
 * duplicating the icon/label mapping in two places.
 */

import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';

export type SettingsCategoryKey =
  | 'general'
  | 'providers'
  | 'voice'
  | 'models'
  | 'privacy'
  | 'storage'
  | 'about';

export interface SettingsCategoryDescriptor {
  key: SettingsCategoryKey;
  labelKey: string;
  iconSource: string;
}

export const SETTINGS_CATEGORIES: SettingsCategoryDescriptor[] = [
  { key: 'general', labelKey: 'settings.categories.general', iconSource: adwaitaIconSources.appearance },
  { key: 'providers', labelKey: 'settings.categories.providers', iconSource: adwaitaIconSources.network },
  { key: 'voice', labelKey: 'settings.categories.voice', iconSource: adwaitaIconSources.microphone },
  { key: 'models', labelKey: 'settings.categories.models', iconSource: adwaitaIconSources.sparkles },
  { key: 'privacy', labelKey: 'settings.categories.privacy', iconSource: adwaitaIconSources.privacy },
  { key: 'storage', labelKey: 'settings.categories.storage', iconSource: adwaitaIconSources.folderDocuments },
  { key: 'about', labelKey: 'settings.categories.about', iconSource: adwaitaIconSources.helpAbout },
];
