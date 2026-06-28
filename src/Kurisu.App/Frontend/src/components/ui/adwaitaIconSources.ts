/**
 * Centralised registry of Adwaita symbolic icons used throughout the app.
 *
 * Each entry is a raw SVG string imported from `@gjsify/adwaita-icons`. The
 * upstream package mirrors the official GNOME Adwaita icon theme, so the
 * iconography matches the rest of the desktop.
 *
 * Use these via the `<AdwaitaIcon>` component so colour and size can be
 * controlled by the consumer.
 */
import {
  listAddSymbolic,
  editFindSymbolic,
  tabNewSymbolic,
  viewMoreSymbolic,
  goPreviousSymbolic,
  goNextSymbolic,
  viewRefreshSymbolic,
  mediaPlaybackStopSymbolic,
  mailSendSymbolic,
  goUpSymbolic,
  documentSendSymbolic,
  formatJustifyFillSymbolic,
  bookmarkNewSymbolic,
  openMenuSymbolic,
  editClearSymbolic,
  sidebarShowSymbolic,
  sidebarShowSymbolicRtl,
} from '@gjsify/adwaita-icons/actions';
import {
  preferencesSystemSymbolic,
  applicationsEngineeringSymbolic,
  applicationsUtilitiesSymbolic,
  emojiSymbolsSymbolic,
  emojiActivitiesSymbolic,
  systemHelpSymbolic,
} from '@gjsify/adwaita-icons/categories';
import {
  folderSymbolic,
  folderDocumentsSymbolic,
  userHomeSymbolic,
  userTrashSymbolic,
} from '@gjsify/adwaita-icons/places';
import {
  windowCloseSymbolic,
  windowMaximizeSymbolic,
  windowMinimizeSymbolic,
  windowRestoreSymbolic,
  focusTopBarSymbolic,
} from '@gjsify/adwaita-icons/ui';
import {
  accessoriesTextEditorSymbolic,
  helpFaqSymbolic,
  preferencesDesktopAppearanceSymbolic,
  preferencesSystemPrivacySymbolic,
  preferencesSystemNetworkSymbolic,
  preferencesDesktopLocaleSymbolic,
  preferencesSystemNotificationsSymbolic,
} from '@gjsify/adwaita-icons/legacy';
import {
  audioVolumeHighSymbolic,
  microphoneSensitivityMediumSymbolic,
  securityMediumSymbolic,
  changesPreventSymbolic,
  changesAllowSymbolic,
} from '@gjsify/adwaita-icons/status';
import { audioInputMicrophoneSymbolic } from '@gjsify/adwaita-icons/devices';

export const adwaitaIconSources = {
  /** `+` glyph – new chat / new tab. */
  plus: listAddSymbolic,
  /** Magnifying glass – search / find. */
  search: editFindSymbolic,
  /** Tab with `+` – new tab (sidebar collapse alternative). */
  tabNew: tabNewSymbolic,
  /** Three vertical dots – session row actions. */
  more: viewMoreSymbolic,
  /** Left chevron – go back. */
  arrowLeft: goPreviousSymbolic,
  /** Right chevron – go forward. */
  arrowRight: goNextSymbolic,
  /** Circular arrow – refresh / retry. */
  refresh: viewRefreshSymbolic,
  /** Square – stop generation. */
  stop: mediaPlaybackStopSymbolic,
  /** Paper plane – send message. */
  send: mailSendSymbolic,
  /** Up arrow – submit / send alternate. */
  arrowUp: goUpSymbolic,
  /** Sidebar collapse (left panel close) – shows the sidebar in its
   *  expanded state; click toggles it away. */
  sidebarCollapse: sidebarShowSymbolic,
  /** Sidebar expand (left panel open) – mirrors the collapse icon so the
   *  control clearly reads as a sidebar toggle in either state. */
  sidebarExpand: sidebarShowSymbolicRtl,
  /** Folder – projects. */
  folder: folderSymbolic,
  /** House – home / chats. */
  home: userHomeSymbolic,
  /** Settings cog. */
  settings: preferencesSystemSymbolic,
  /** Engineering wrench – code mode. */
  code: applicationsEngineeringSymbolic,
  /** Utilities grid – skills & integrations. */
  extensions: applicationsUtilitiesSymbolic,
  /** Speech bubble – chat mode. */
  chat: emojiSymbolsSymbolic,
  /** Sparkles – cowork mode. */
  sparkles: emojiActivitiesSymbolic,
  /** Aligned text – write / plan. */
  document: formatJustifyFillSymbolic,
  /** Trash bin. */
  trash: userTrashSymbolic,
  /** Document with sparkles – new session. */
  documentNew: documentSendSymbolic,
  /** Bookmark – pinned. */
  bookmark: bookmarkNewSymbolic,
  /** Notepad with lines – text editor / write. */
  edit: accessoriesTextEditorSymbolic,
  /** Question-mark circle – help. */
  help: helpFaqSymbolic,
  /** Window close (×). */
  windowClose: windowCloseSymbolic,
  /** Window minimise (underscore). */
  windowMinimize: windowMinimizeSymbolic,
  /** Window maximise (square). */
  windowMaximize: windowMaximizeSymbolic,
  /** Window restore (overlapping squares). Shown when the window is maximised. */
  windowRestore: windowRestoreSymbolic,
  /** Open menu (hamburger). */
  openMenu: openMenuSymbolic,
  /** Crossed-out search — used to clear the settings search field. */
  searchClear: editClearSymbolic,
  /** "Focus top bar" — alternative close glyph used in the settings header. */
  focusTopBar: focusTopBarSymbolic,
  // Settings category icons.
  /** Appearance / theme. */
  appearance: preferencesDesktopAppearanceSymbolic,
  /** Network & integrations. */
  network: preferencesSystemNetworkSymbolic,
  /** Microphone / voice input. */
  microphone: audioInputMicrophoneSymbolic,
  /** Privacy & security. */
  privacy: preferencesSystemPrivacySymbolic,
  /** Locale / language. */
  locale: preferencesDesktopLocaleSymbolic,
  /** Notifications (reserved for future use). */
  notifications: preferencesSystemNotificationsSymbolic,
  /** Folder with document — storage / data. */
  folderDocuments: folderDocumentsSymbolic,
  /** Audio / sound. */
  audio: audioVolumeHighSymbolic,
  /** Voice sensitivity indicator. */
  voiceSensitivity: microphoneSensitivityMediumSymbolic,
  /** Help / about. */
  helpAbout: systemHelpSymbolic,
  // Agent mode icons (mapped 1:1 to the four AgentMode values).
  /** Shield/permissions – "Ask permissions" mode. */
  modeAsk: securityMediumSymbolic,
  /** Padlock – "Auto accept edits" mode. */
  modeEdit: changesAllowSymbolic,
  /** Document with mark – "Plan mode". */
  modePlan: documentSendSymbolic,
  /** Warning/no-entry – "Bypass permissions" mode. */
  modeBypass: changesPreventSymbolic,
} as const;

export type AdwaitaIconKey = keyof typeof adwaitaIconSources;