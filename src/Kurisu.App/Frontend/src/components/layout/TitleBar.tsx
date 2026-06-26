import { HStack, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import { adwaitaColors } from '@/lib/themeTokens';
import type { ReactNode } from 'react';

export interface TitleBarButtonProps {
  ariaLabel: string;
  iconSource: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

export interface TitleBarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
  productName: string;
  /** Optional leading slot (e.g. sidebar collapse icon stays inline with title). */
  leading?: ReactNode;
}

/**
 * In-app custom titlebar. Sits above the sidebar + chat area and surfaces
 * the product name alongside icon buttons for sidebar toggle, search and
 * the global application menu. The OS window chrome remains the source of
 * truth for window controls (min/max/close); this bar complements it.
 */
export function TitleBar({
  isSidebarOpen,
  onToggleSidebar,
  onOpenSearch,
  onOpenMenu,
  productName,
  leading,
}: TitleBarProps) {
  const { t } = useTranslation();

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
      // Allow the user to drag the OS window by the titlebar strip on
      // platforms where Electron exposes a frameless chrome.
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
          ariaLabel={t('sidebar.search')}
          iconSource={adwaitaIconSources.search}
          onClick={onOpenSearch}
        />
        <TitleBarButton
          ariaLabel={t('titlebar.menu')}
          iconSource={adwaitaIconSources.openMenu}
          onClick={onOpenMenu}
        />
      </HStack>

      <HStack spacing={2} align="center" px={2} flexShrink={0}>
        {leading}
      </HStack>

      <HStack flex={1} justify="center" spacing={2} align="center" pointerEvents="none">
        <Text
          fontSize="13px"
          fontWeight={600}
          color={adwaitaColors.fgSecondary}
          letterSpacing="0.02em"
          lineHeight={1}
          whiteSpace="nowrap"
        >
          {productName}
        </Text>
      </HStack>

      {/* Trailing spacer mirrors the leading cluster so the centred title
          stays visually balanced regardless of how many actions live in the
          header. */}
      <HStack spacing={1} align="center" sx={{ WebkitAppRegion: 'no-drag', visibility: 'hidden' }}>
        <TitleBarButton
          ariaLabel=""
          iconSource={adwaitaIconSources.sidebarCollapse}
          onClick={() => {}}
        />
        <TitleBarButton
          ariaLabel=""
          iconSource={adwaitaIconSources.search}
          onClick={() => {}}
        />
        <TitleBarButton
          ariaLabel=""
          iconSource={adwaitaIconSources.openMenu}
          onClick={() => {}}
        />
      </HStack>
    </HStack>
  );
}

function TitleBarButton({ ariaLabel, iconSource, onClick, active, disabled }: TitleBarButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '8px',
        border: 'none',
        background: active ? adwaitaColors.cardBg : 'transparent',
        color: active ? adwaitaColors.fg : adwaitaColors.fgSecondary,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.18s ease, color 0.18s ease',
      }}
      onMouseEnter={(event) => {
        if (disabled) return;
        event.currentTarget.style.background = active ? adwaitaColors.cardBg : 'rgba(255,255,255,0.06)';
        event.currentTarget.style.color = adwaitaColors.fg;
      }}
      onMouseLeave={(event) => {
        if (disabled) return;
        event.currentTarget.style.background = active ? adwaitaColors.cardBg : 'transparent';
        event.currentTarget.style.color = active ? adwaitaColors.fg : adwaitaColors.fgSecondary;
      }}
    >
      <AdwaitaIcon source={iconSource} size={15} />
    </button>
  );
}