import { HStack, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import { adwaitaColors } from '@/lib/themeTokens';
import type { ReactNode, RefObject } from 'react';

export interface TitleBarButtonProps {
  ariaLabel: string;
  iconSource: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  /** Announces a popup menu/dialog to assistive tech. */
  hasPopup?: 'menu' | 'dialog' | 'listbox' | 'true';
  /** Visual variant — window controls get a denser, hover-red destructive hint. */
  variant?: 'default' | 'window-control';
  /** Distinguishes the window-close control so it can have its own hover style. */
  controlKind?: 'minimize' | 'maximize' | 'close';
  /** When true the button paints itself with the destructive accent on
   *  hover. Used for the leading exit-settings affordance in settings mode. */
  destructive?: boolean;
  /** Tab-order override, mostly used to skip the sidebar toggle while it
   *  is being animated out of view. */
  tabIndex?: number;
}

export type TitleBarMode = 'workspace' | 'settings';

export interface TitleBarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenMenu: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  isMaximized: boolean;
  productName: string;
  /** Optional leading slot (e.g. sidebar collapse icon stays inline with title). */
  leading?: ReactNode;
  /** Ref forwarded to the application-menu trigger button so the popover can
   *  anchor to it. */
  menuButtonRef?: RefObject<HTMLButtonElement | null>;
  /** Marks the menu trigger as the active toggle when the menu is open. */
  isMenuOpen?: boolean;
  /**
   * 'workspace' (default) renders the standard chat title bar.
   * 'settings' swaps the leading cluster to exit-settings + application menu
   * + search affordance and renders "Settings" (in white) centred in place
   * of `productName`.
   */
  mode?: TitleBarMode;
  /** Called when the leading cluster's first button is pressed in settings
   *  mode – effectively "exit settings". Ignored in workspace mode. */
  onExitSettings?: () => void;
  /** Toggles the in-settings search affordance. Rendered as a button when
   *  `mode === 'settings'` and `searchActive === false`; rendered as an
   *  exit-search button when `searchActive === true`. */
  onSearchClick?: () => void;
  searchActive?: boolean;
}

/**
 * In-app custom titlebar. Replaces the OS native titlebar (the BrowserWindow
 * is created with `Frame = false`) and is the single source of truth for the
 * app's window chrome. Two visual modes:
 *
 *  • **workspace** – sidebar-toggle (collapse/expand), application menu,
 *    centred `productName`, window controls. Mirrors a normal GNOME app.
 *
 *  • **settings** – leading cluster becomes exit-settings + application menu
 *    + search affordance (visually clipped to the settings sidebar width).
 *    The centred label swaps to "Settings" in white; the active category is
 *    surfaced via the highlighted sidebar item, not duplicated here.
 */
export function TitleBar({
  isSidebarOpen,
  onToggleSidebar,
  onOpenMenu,
  onMinimize,
  onToggleMaximize,
  onClose,
  isMaximized,
  leading,
  menuButtonRef,
  isMenuOpen,
  mode = 'workspace',
  onExitSettings,
  onSearchClick,
  searchActive = false,
}: TitleBarProps) {
  const { t } = useTranslation();
  const isSettings = mode === 'settings';

  return (
    <HStack
      as="header"
      role="banner"
      h="40px"
      minH="40px"
      flexShrink={0}
      px={2}
      spacing={1}
      align="center"
      bg={adwaitaColors.windowBg}
      borderBottom="1px solid"
      borderColor={adwaitaColors.border}
      sx={{ WebkitAppRegion: 'drag' }}
    >
      <HStack
        spacing={1}
        align="center"
        sx={{ WebkitAppRegion: 'no-drag' }}
      >
        {isSettings ? (
          <>
            <TitleBarButton
              ariaLabel={t('settings.back')}
              iconSource={adwaitaIconSources.arrowLeft}
              onClick={() => onExitSettings?.()}
              destructive
            />
            <TitleBarButton
              ariaLabel={t('titlebar.menu')}
              iconSource={adwaitaIconSources.openMenu}
              onClick={onOpenMenu}
              active={isMenuOpen}
              buttonRef={menuButtonRef}
              hasPopup="menu"
            />
            <TitleBarButton
              ariaLabel={searchActive ? t('settings.exitSearch') : t('settings.search')}
              iconSource={searchActive ? adwaitaIconSources.focusTopBar : adwaitaIconSources.search}
              onClick={() => onSearchClick?.()}
              active={searchActive}
            />
          </>
        ) : (
          <>
            <TitleBarButton
              ariaLabel={isSidebarOpen ? t('sidebar.collapseSidebar') : t('sidebar.expandSidebar')}
              iconSource={isSidebarOpen ? adwaitaIconSources.sidebarCollapse : adwaitaIconSources.sidebarExpand}
              onClick={onToggleSidebar}
              active={isSidebarOpen}
            />
            <TitleBarButton
              ariaLabel={t('titlebar.menu')}
              iconSource={adwaitaIconSources.openMenu}
              onClick={onOpenMenu}
              active={isMenuOpen}
              buttonRef={menuButtonRef}
              hasPopup="menu"
            />
          </>
        )}
      </HStack>

      <HStack spacing={2} align="center" px={2} flexShrink={0}>
        {leading}
      </HStack>

      <HStack flex={1} justify="center" spacing={2} align="center" pointerEvents="none">
        <Text
          fontSize="13px"
          fontWeight={600}
          color={isSettings ? adwaitaColors.fg : adwaitaColors.fgSecondary}
          letterSpacing="0.02em"
          lineHeight={1}
          whiteSpace="nowrap"
        >
          {isSettings ? t('settings.title') : ""}
        </Text>
      </HStack>

      <HStack spacing={1} align="center" sx={{ WebkitAppRegion: 'no-drag', visibility: 'hidden' }} aria-hidden>
        <TitleBarButton
          ariaLabel=""
          iconSource={isSettings ? adwaitaIconSources.arrowLeft : adwaitaIconSources.sidebarCollapse}
          onClick={() => {}}
        />
        <TitleBarButton ariaLabel="" iconSource={adwaitaIconSources.openMenu} onClick={() => {}} />
        {isSettings && <TitleBarButton ariaLabel="" iconSource={adwaitaIconSources.search} onClick={() => {}} />}
      </HStack>

      <HStack spacing={0} align="center" sx={{ WebkitAppRegion: 'no-drag' }} role="group" aria-label={t('titlebar.windowControls')}>
        <TitleBarButton
          ariaLabel={t('titlebar.minimize')}
          iconSource={adwaitaIconSources.windowMinimize}
          onClick={onMinimize}
          variant="window-control"
          controlKind="minimize"
        />
        <TitleBarButton
          ariaLabel={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
          iconSource={isMaximized ? adwaitaIconSources.windowRestore : adwaitaIconSources.windowMaximize}
          onClick={onToggleMaximize}
          variant="window-control"
          controlKind="maximize"
        />
        <TitleBarButton
          ariaLabel={t('titlebar.close')}
          iconSource={adwaitaIconSources.windowClose}
          onClick={onClose}
          variant="window-control"
          controlKind="close"
        />
      </HStack>
    </HStack>
  );
}

const WINDOW_CONTROL_HOVER = adwaitaColors.destructive;

function TitleBarButton({
  ariaLabel,
  iconSource,
  onClick,
  active,
  disabled,
  buttonRef,
  hasPopup,
  variant = 'default',
  controlKind,
  destructive = false,
  tabIndex,
}: TitleBarButtonProps) {
  const isWindowControl = variant === 'window-control';
  const isCloseControl = isWindowControl && controlKind === 'close';
  // Hover styles live in a scoped <style> block below – using CSS instead of
  // imperative event handlers guarantees the new button's hover state is
  // derived purely from the cursor position and never inherits a stale
  // background colour from the previous (now-unmounted) button at the same
  // spot (e.g. settings-exit → sidebar-toggle).
  const hoverClass = isCloseControl || destructive
    ? 'kurisu-titlebar-btn--destructive-hover'
    : isWindowControl
      ? 'kurisu-titlebar-btn--window-control-hover'
      : 'kurisu-titlebar-btn--default-hover';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-pressed={active}
        aria-haspopup={hasPopup}
        disabled={disabled}
        tabIndex={tabIndex}
        onClick={onClick}
        className={hoverClass}
        data-active={active ? 'true' : undefined}
        style={{
          width: isWindowControl ? '38px' : '30px',
          height: isWindowControl ? '40px' : '30px',
          borderRadius: isWindowControl ? '0' : '8px',
          border: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          outline: 'none',
          transition: 'background-color 0.18s ease, color 0.18s ease',
        }}
      >
        <AdwaitaIcon source={iconSource} size={isWindowControl ? 14 : 15} />
      </button>
      <TitleBarButtonHoverStyles />
    </>
  );
}

/**
 * Scoped CSS rules for the title bar buttons. Kept in a single `<style>`
 * element so the rules mount once and apply to every rendered button.
 *
 * The reason we use CSS instead of inline `onMouseEnter` handlers is that the
 * imperative approach mutates `element.style.background` directly, and that
 * mutation outlives the React unmount when a button at the same screen
 * position is replaced (e.g. settings-exit → sidebar-toggle). CSS hover
 * state is recomputed from scratch on every element swap, so the bug where
 * the new button inherited the old red background can't happen.
 */
function TitleBarButtonHoverStyles() {
  const css = `
    .kurisu-titlebar-btn--default-hover {
      background: transparent;
      color: ${adwaitaColors.fgSecondary};
    }
    .kurisu-titlebar-btn--default-hover[data-active='true'] {
      background: ${adwaitaColors.cardBg};
      color: ${adwaitaColors.fg};
    }
    .kurisu-titlebar-btn--default-hover:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.06);
      color: ${adwaitaColors.fg};
    }

    .kurisu-titlebar-btn--window-control-hover {
      background: transparent;
      color: ${adwaitaColors.fgSecondary};
    }
    .kurisu-titlebar-btn--window-control-hover:hover:not(:disabled) {
      color: ${adwaitaColors.fg};
    }

    .kurisu-titlebar-btn--destructive-hover {
      background: transparent;
      color: ${adwaitaColors.fgSecondary};
    }
    .kurisu-titlebar-btn--destructive-hover:hover:not(:disabled) {
      background: ${WINDOW_CONTROL_HOVER};
      color: white;
    }
  `;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
