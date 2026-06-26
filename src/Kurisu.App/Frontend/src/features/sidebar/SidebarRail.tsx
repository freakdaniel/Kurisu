import { VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import { adwaitaColors } from '@/lib/themeTokens';

const SIDEBAR_COLLAPSED_WIDTH = 54;
const APP_BACKGROUND = adwaitaColors.windowBg;

export interface SidebarRailAction {
  key: string;
  label: string;
  iconSource: string;
  onClick: () => void;
}

interface SidebarRailProps {
  onExpand: () => void;
  onNewChat: () => void;
  onOpenSearch: () => void;
  onToggleMode: () => void;
  onOpenSkills: () => void;
  onOpenSettings: () => void;
  mode: 'projects' | 'chats';
}

export function SidebarRail({
  onExpand,
  onNewChat,
  onOpenSearch,
  onToggleMode,
  onOpenSkills,
  onOpenSettings,
  mode,
}: SidebarRailProps) {
  const { t } = useTranslation();

  // Order matters: the expand handle sits on top, then a primary "new chat"
  // action, followed by secondary navigation. The rail is short enough that
  // distributing the items with `justify="space-between"` would create
  // awkward gaps, so we centre the cluster vertically instead.
  const railActions: SidebarRailAction[] = [
    { key: 'new-chat', label: t('sidebar.newChat'), iconSource: adwaitaIconSources.plus, onClick: onNewChat },
    { key: 'search', label: t('sidebar.search'), iconSource: adwaitaIconSources.search, onClick: onOpenSearch },
    {
      key: 'toggle-mode',
      label: mode === 'projects' ? t('top.chats') : t('top.coding'),
      iconSource: mode === 'projects' ? adwaitaIconSources.chat : adwaitaIconSources.code,
      onClick: onToggleMode,
    },
    { key: 'skills', label: t('top.skills'), iconSource: adwaitaIconSources.extensions, onClick: onOpenSkills },
    { key: 'settings', label: t('top.settings'), iconSource: adwaitaIconSources.settings, onClick: onOpenSettings },
  ];

  return (
    <motion.div
      key="collapsed-sidebar"
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{ width: SIDEBAR_COLLAPSED_WIDTH, height: '100%', overflow: 'hidden' }}
    >
      <VStack h="100%" spacing={2} align="center" justify="center" px={1} py={3}>
        <RailIconButton
          ariaLabel={t('sidebar.expandSidebar')}
          iconSource={adwaitaIconSources.sidebarExpand}
          onClick={onExpand}
        />
        {railActions.map((action) => (
          <RailIconButton
            key={action.key}
            ariaLabel={action.label}
            iconSource={action.iconSource}
            onClick={action.onClick}
          />
        ))}
      </VStack>
    </motion.div>
  );
}

function RailIconButton({
  ariaLabel,
  iconSource,
  onClick,
}: {
  ariaLabel: string;
  iconSource: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        width: '36px',
        height: '36px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: adwaitaColors.fgSecondary,
        cursor: 'pointer',
        transition: 'color 0.18s ease, background-color 0.18s ease',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.color = adwaitaColors.fg;
        event.currentTarget.style.background = 'rgba(255,255,255,0.06)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.color = adwaitaColors.fgSecondary;
        event.currentTarget.style.background = 'transparent';
      }}
    >
      <AdwaitaIcon source={iconSource} size={16} />
    </button>
  );
}

export { SIDEBAR_COLLAPSED_WIDTH, APP_BACKGROUND };