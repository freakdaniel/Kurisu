import { HStack } from '@chakra-ui/react';
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
  /** Optional leading slot (e.g. sidebar collapse icon stays inline with title). */
  leading?: ReactNode;
  /** Ref forwarded to the application-menu trigger button so the popover can
   *  anchor to it. */
  menuButtonRef?: RefObject<HTMLButtonElement | null>;
  /** Marks the menu trigger as the active toggle when the menu is open. */
  isMenuOpen?: boolean;
  mode?: TitleBarMode;
}

/**
 * In-app custom titlebar. Replaces the OS native titlebar
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
}: TitleBarProps) {
  const { t } = useTranslation();

  return (
    <HStack
      as="header"
      role="banner"
      h="40px"
      minH="40px"
      flexShrink={0}
      pl={2}
      pr={0}
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
      </HStack>

      <HStack spacing={2} align="center" px={2} flexShrink={0}>
        {leading}
      </HStack>

      <HStack spacing={0} ml="auto" align="center" sx={{ WebkitAppRegion: 'no-drag' }} role="group" aria-label={t('titlebar.windowControls')}>
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
