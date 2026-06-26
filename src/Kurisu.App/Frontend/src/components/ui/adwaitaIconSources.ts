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
} from '@gjsify/adwaita-icons/actions';
import {
  preferencesSystemSymbolic,
  applicationsEngineeringSymbolic,
  applicationsUtilitiesSymbolic,
  emojiSymbolsSymbolic,
  emojiActivitiesSymbolic,
} from '@gjsify/adwaita-icons/categories';
import { folderSymbolic, userHomeSymbolic, userTrashSymbolic } from '@gjsify/adwaita-icons/places';
import {
  panEndSymbolic,
  panStartSymbolic,
  windowCloseSymbolic,
} from '@gjsify/adwaita-icons/ui';
import {
  accessoriesTextEditorSymbolic,
  helpFaqSymbolic,
} from '@gjsify/adwaita-icons/legacy';
import {
  securityMediumSymbolic,
  changesPreventSymbolic,
  changesAllowSymbolic,
} from '@gjsify/adwaita-icons/status';

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
  /** Sidebar collapse (left panel close). */
  sidebarCollapse: panStartSymbolic,
  /** Sidebar expand (left panel open). */
  sidebarExpand: panEndSymbolic,
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
  /** Open menu (hamburger). */
  openMenu: openMenuSymbolic,
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