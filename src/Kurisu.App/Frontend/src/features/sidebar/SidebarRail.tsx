import { IconButton, VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Code2, MessageCircle, PanelLeftOpen, Plus, Puzzle, Search, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SIDEBAR_HOVER = { bg: 'transparent', color: 'white' };
const SIDEBAR_COLLAPSED_WIDTH = 54;
const APP_BACKGROUND = '#1f1f23';

export interface SidebarRailAction {
  key: string;
  label: string;
  icon: React.ReactElement;
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

  const railActions: SidebarRailAction[] = [
    { key: 'new-chat', label: t('sidebar.newChat'), icon: <Plus size={17} />, onClick: onNewChat },
    { key: 'search', label: t('sidebar.search'), icon: <Search size={17} />, onClick: onOpenSearch },
    {
      key: 'toggle-mode',
      label: mode === 'projects' ? t('top.chats') : t('top.coder'),
      icon: mode === 'projects' ? <MessageCircle size={17} /> : <Code2 size={17} />,
      onClick: onToggleMode,
    },
    { key: 'skills', label: t('top.skills'), icon: <Puzzle size={17} />, onClick: onOpenSkills },
    { key: 'settings', label: t('top.settings'), icon: <Settings size={17} />, onClick: onOpenSettings },
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
      <VStack h="100%" spacing={2} align="center" px={1} pt={3} pb={3}>
        <IconButton
          aria-label={t('sidebar.expandSidebar')}
          icon={<PanelLeftOpen size={16} />}
          variant="ghost"
          size="md"
          w="40px"
          h="40px"
          borderRadius="14px"
          color="gray.400"
          onClick={onExpand}
          _hover={SIDEBAR_HOVER}
          _active={{ bg: 'transparent', color: 'white' }}
        />
        {railActions.map((action) => (
          <IconButton
            key={action.key}
            aria-label={action.label}
            icon={action.icon}
            variant="ghost"
            size="md"
            w="40px"
            h="40px"
            borderRadius="14px"
            color="gray.400"
            onClick={action.onClick}
            _hover={SIDEBAR_HOVER}
            _active={{ bg: 'transparent', color: 'white' }}
          />
        ))}
      </VStack>
    </motion.div>
  );
}

export { SIDEBAR_COLLAPSED_WIDTH, APP_BACKGROUND };
