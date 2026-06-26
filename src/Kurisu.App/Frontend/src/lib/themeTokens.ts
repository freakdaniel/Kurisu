/**
 * Adwaita design tokens
 * Reference: https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1.4/style-classes.html
 */
export const adwaitaColors = {
  /** `--window-bg-color`: outer window background. */
  windowBg: '#1e1e20',
  /** `--view-bg-color`: default content area background (scrolled views). */
  viewBg: '#1e1e20',
  /** `--card-bg-color`: surfaces that sit above the view (popovers, rows). */
  cardBg: '#2a2a2d',
  /** `--headerbar-bg-color`: titlebars, sidebar headers, segmented controls. */
  headerbarBg: '#2e2e32',
  /** `--popover-bg-color`: popovers, menus, modals. */
  popoverBg: '#36363a',
  /** `--dialog-bg-color`: blocking dialogs. */
  dialogBg: '#36363a',
  /** Sidebar/rail background – slightly distinct from windowBg. */
  sidebarBg: '#1a1a1c',
  /** Sidebar selected row background. */
  sidebarSelectedBg: '#3a3a40',
  /** Composer surface – a touch lighter than the view. */
  composerBg: '#2c2c30',
  /** Composer border. */
  border: 'rgba(255, 255, 255, 0.07)',
  /** Stronger border for popovers/cards. */
  borderStrong: 'rgba(255, 255, 255, 0.10)',
  /** Foreground for primary text. */
  fg: '#ffffff',
  /** Secondary foreground (subtitles, hints). */
  fgSecondary: '#c0bfbc',
  /** Disabled / muted foreground. */
  fgMuted: '#8a8a8e',
  /** Accent – libadwaita blue 4. */
  accent: '#3584e4',
  /** Accent hover/pressed. */
  accentHover: '#1c71d8',
  /** Destructive – libadwaita red 4. */
  destructive: '#c01c28',
  /** Destructive hover. */
  destructiveHover: '#a51d2d',
  /** Success – libadwaita green 4. */
  success: '#33d17a',
  /** Warning – libadwaita yellow 4. */
  warning: '#f6d32d',
} as const;

export type AdwaitaColorToken = keyof typeof adwaitaColors;