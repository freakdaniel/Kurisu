import {
  Box,
  VStack,
  Text,
  Button,
} from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionPreview } from '@/types/desktop';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { ModeSwitch } from '@/components/ui/ModeSwitch';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import { adwaitaColors } from '@/lib/themeTokens';
import {
  filterSessionsByNavigationMode,
  groupProjectSessions,
  type SessionNavigationMode,
} from '@/components/layout/sessionNavigation';
import { SessionRow, sessionItemVariants } from './SessionRow';
import { SessionContextMenu, useSessionMenu } from './SessionContextMenu';
import { SidebarRail } from './SidebarRail';
import { useSidebarSections } from './useSidebarSections';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionPreview[];
  activeTurnSessions: Record<string, true>;
  selectedSessionId?: string;
  mode: SessionNavigationMode;
  runtimeBaseDirectory?: string;
  workspaceRoot?: string;
  onNewChat?: () => void;
  onSelectSession?: (sessionId: string) => void;
  onToggleMode?: () => void;
  onOpenSettings?: () => void;
  onOpenSearch?: () => void;
  onOpenSkills?: () => void;
  onRenameSession?: (session: SessionPreview) => void;
  onDeleteSession?: (session: SessionPreview) => void;
}

const SIDEBAR_EXPANDED_WIDTH = 292;
const SIDEBAR_COLLAPSED_WIDTH = 54;
const APP_BACKGROUND = adwaitaColors.windowBg;
const SIDEBAR_BACKGROUND = adwaitaColors.sidebarBg;
const SIDEBAR_ITEM_HOVER = { bg: 'rgba(255,255,255,0.06)', color: adwaitaColors.fg };
const SIDEBAR_ITEM_ACTIVE = { bg: 'rgba(255,255,255,0.08)', color: adwaitaColors.fg };

const sessionsListVariants = {
  hidden: {
    opacity: 0,
    height: 0,
    transition: {
      height: { duration: 0.2, ease: 'easeInOut' },
      opacity: { duration: 0.15, ease: 'easeInOut' },
    },
  },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: {
      height: { duration: 0.25, ease: 'easeInOut' },
      opacity: { duration: 0.2, ease: 'easeInOut', delay: 0.05 },
    },
  },
};

export default function Sidebar({
  isOpen,
  onClose,
  sessions,
  activeTurnSessions,
  selectedSessionId = '',
  mode,
  runtimeBaseDirectory = '',
  workspaceRoot = '',
  onNewChat = () => console.log('New chat'),
  onSelectSession = (id: string) => console.log(`Selected conversation ${id}`),
  onToggleMode = () => console.log('Sidebar mode toggled'),
  onOpenSettings = () => console.log('Settings clicked'),
  onOpenSearch = () => console.log('Search opened'),
  onOpenSkills = () => console.log('Skills clicked'),
  onRenameSession = (session) => console.log(`Rename conversation ${session.sessionId}`),
  onDeleteSession = (session) => console.log(`Delete conversation ${session.sessionId}`),
}: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { t } = useTranslation();
  const sessionMenu = useSessionMenu();

  const visibleSessions = useMemo(
    () => filterSessionsByNavigationMode(sessions, mode, { runtimeBaseDirectory, workspaceRoot }),
    [mode, runtimeBaseDirectory, sessions, workspaceRoot],
  );

  const groupedConversations = useMemo(
    () => groupProjectSessions(visibleSessions, t('sidebar.otherProjects')),
    [t, visibleSessions],
  );

  const orderedChatSessions = useMemo(
    () =>
      [...visibleSessions].sort(
        (left, right) => new Date(right.lastActivity).getTime() - new Date(left.lastActivity).getTime(),
      ),
    [visibleSessions],
  );

  const chatSections = useSidebarSections(mode, orderedChatSessions);

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [name]: !(prev[name] !== false),
    }));
  };

  return (
    <motion.div
      initial={false}
      animate={{
        width: isOpen ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
        backgroundColor: isOpen ? SIDEBAR_BACKGROUND : APP_BACKGROUND,
      }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{ height: '100%', overflow: 'hidden', flexShrink: 0, position: 'relative' }}
    >
      <VStack
        h="100%"
        spacing={0}
        align="stretch"
        bg="transparent"
        borderRight="1px solid"
        borderColor={adwaitaColors.border}
      >
        <AnimatePresence initial={false} mode="wait">
          {isOpen ? (
            <motion.div
              key="expanded-sidebar"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ width: SIDEBAR_EXPANDED_WIDTH, height: '100%', overflow: 'hidden' }}
            >
              <VStack h="100%" spacing={0} align="stretch">
                <Box px={3} pt={4} pb={3}>
                  <ModeSwitch<SessionNavigationMode>
                    fullWidth
                    ariaLabel={t('top.modeSwitch')}
                    value={mode}
                    onChange={(next) => {
                      if (next !== mode) onToggleMode();
                    }}
                    options={[
                      {
                        value: 'chats',
                        label: t('top.chats'),
                        ariaLabel: t('top.chats'),
                        icon: <AdwaitaIcon source={adwaitaIconSources.chat} size={14} />,
                      },
                      {
                        value: 'projects',
                        label: t('top.coding'),
                        ariaLabel: t('top.coding'),
                        icon: <AdwaitaIcon source={adwaitaIconSources.code} size={14} />,
                      },
                    ]}
                  />
                </Box>

                <Box px={2} pb={3}>
                  <VStack spacing={1} align="stretch">
                    <Button
                      leftIcon={<AdwaitaIcon source={adwaitaIconSources.plus} size={15} />}
                      variant="ghost"
                      size="sm"
                      width="100%"
                      h="34px"
                      borderRadius="8px"
                      justifyContent="flex-start"
                      fontWeight={500}
                      fontSize="13px"
                      color={adwaitaColors.fg}
                      onClick={onNewChat}
                      _hover={SIDEBAR_ITEM_HOVER}
                      _active={SIDEBAR_ITEM_HOVER}
                    >
                      {t('sidebar.newChat')}
                    </Button>
                    <Button
                      leftIcon={<AdwaitaIcon source={adwaitaIconSources.search} size={14} />}
                      variant="ghost"
                      size="sm"
                      width="100%"
                      h="30px"
                      borderRadius="8px"
                      justifyContent="flex-start"
                      fontWeight="normal"
                      fontSize="13px"
                      color={adwaitaColors.fgSecondary}
                      onClick={onOpenSearch}
                      _hover={SIDEBAR_ITEM_HOVER}
                      _active={SIDEBAR_ITEM_ACTIVE}
                    >
                      {t('sidebar.search')}
                    </Button>
                    <Button
                      leftIcon={<AdwaitaIcon source={adwaitaIconSources.extensions} size={14} />}
                      variant="ghost"
                      size="sm"
                      width="100%"
                      h="30px"
                      borderRadius="8px"
                      justifyContent="flex-start"
                      fontWeight="normal"
                      fontSize="13px"
                      color={adwaitaColors.fgSecondary}
                      onClick={onOpenSkills}
                      _hover={SIDEBAR_ITEM_HOVER}
                      _active={SIDEBAR_ITEM_ACTIVE}
                    >
                      {t('top.skills')}
                    </Button>
                    <Button
                      leftIcon={<AdwaitaIcon source={adwaitaIconSources.settings} size={14} />}
                      variant="ghost"
                      size="sm"
                      width="100%"
                      h="30px"
                      borderRadius="8px"
                      justifyContent="flex-start"
                      fontWeight="normal"
                      fontSize="13px"
                      color={adwaitaColors.fgSecondary}
                      onClick={onOpenSettings}
                      _hover={SIDEBAR_ITEM_HOVER}
                      _active={SIDEBAR_ITEM_ACTIVE}
                    >
                      {t('top.settings')}
                    </Button>
                  </VStack>
                </Box>

                <Box
                  flex={1}
                  overflowY="auto"
                  overflowX="hidden"
                  py={1}
                  px={2}
                  sx={{
                    scrollbarGutter: 'stable',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '&::-webkit-scrollbar': { width: '0px', height: '0px', display: 'none' },
                  }}
                >
                  <VStack spacing={0.5} align="stretch">
                    {mode === 'projects' ? groupedConversations.map((group) => {
                      const isGroupOpen = openGroups[group.name] !== false;
                      return (
                        <Box key={group.name}>
                          <Button
                            variant="ghost"
                            w="full"
                            h="24px"
                            px={2}
                            justifyContent="flex-start"
                            color={adwaitaColors.fgMuted}
                            fontSize="11px"
                            fontWeight={600}
                            letterSpacing="0.02em"
                            borderRadius="6px"
                            _hover={{ bg: 'transparent', color: adwaitaColors.fgSecondary }}
                            _active={{ bg: 'transparent', color: adwaitaColors.fg }}
                            transition="color 0.2s ease"
                            onClick={() => toggleGroup(group.name)}
                            leftIcon={
                              <motion.span
                                animate={{ rotate: isGroupOpen ? 90 : 0 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                style={{ display: 'inline-flex' }}
                              >
                                <AdwaitaIcon source={adwaitaIconSources.arrowRight} size={11} />
                              </motion.span>
                            }
                          >
                            <span style={{ marginRight: '4px', display: 'inline-flex' }}>
                              <AdwaitaIcon source={adwaitaIconSources.folder} size={11} />
                            </span>
                            {group.name}
                          </Button>

                          <AnimatePresence initial={false}>
                            {isGroupOpen && (
                              <motion.div
                                variants={sessionsListVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                style={{ overflow: 'hidden', width: '100%' }}
                              >
                                <VStack spacing={0.5} align="stretch" pt={0.5}>
                                  {group.sessions.map((conv, idx) => (
                                    <motion.div
                                      key={conv.sessionId}
                                      variants={sessionItemVariants}
                                      initial="hidden"
                                      animate="visible"
                                      exit="exit"
                                      custom={idx}
                                      style={{ width: '100%' }}
                                    >
                                      <SessionRow
                                        session={conv}
                                        isSelected={conv.sessionId === selectedSessionId}
                                        isRunning={conv.sessionId in activeTurnSessions}
                                        mode={mode}
                                        onSelect={onSelectSession}
                                        onContextMenu={sessionMenu.toggle}
                                        onActionsClick={sessionMenu.toggle}
                                      />
                                    </motion.div>
                                  ))}
                                </VStack>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Box>
                      );
                    }) : chatSections.map((section) => (
                      <Box key={section.key}>
                        <Text
                          px={2}
                          pt={2}
                          pb={1}
                          fontSize="11px"
                          fontWeight={600}
                          letterSpacing="0.02em"
                          color={adwaitaColors.fgMuted}
                          textTransform="none"
                        >
                          {section.label}
                        </Text>
                        <VStack spacing={0.5} align="stretch">
                          {section.sessions.map((conv, idx) => (
                            <motion.div
                              key={conv.sessionId}
                              variants={sessionItemVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              custom={idx}
                              style={{ width: '100%' }}
                            >
                              <SessionRow
                                session={conv}
                                isSelected={conv.sessionId === selectedSessionId}
                                isRunning={conv.sessionId in activeTurnSessions}
                                mode={mode}
                                onSelect={onSelectSession}
                                onContextMenu={sessionMenu.toggle}
                                onActionsClick={sessionMenu.toggle}
                              />
                            </motion.div>
                          ))}
                        </VStack>
                      </Box>
                    ))}
                    {visibleSessions.length === 0 && ("")}
                  </VStack>
                </Box>
              </VStack>
            </motion.div>
          ) : (
            <SidebarRail
              onExpand={onClose}
              onNewChat={onNewChat}
              onOpenSearch={onOpenSearch}
              onToggleMode={onToggleMode}
              onOpenSkills={onOpenSkills}
              onOpenSettings={onOpenSettings}
              mode={mode}
            />
          )}
        </AnimatePresence>
      </VStack>
      <SessionContextMenu
        state={sessionMenu.state}
        onClose={sessionMenu.clear}
        onRename={onRenameSession}
        onDelete={onDeleteSession}
      />
    </motion.div>
  );
}
