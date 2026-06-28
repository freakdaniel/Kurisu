import { Box } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBootstrap } from '@/hooks/useBootstrap';
import { Sidebar } from '@/features/sidebar';
import ChatArea from '@/features/chat/ChatArea';
import { adwaitaColors } from '@/lib/themeTokens';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import {
  isProjectlessSession,
  type SessionNavigationMode,
} from './sessionNavigation';
import { SearchModal } from './SearchModal';
import { TitleBar } from './TitleBar';
import { AboutDialog } from './AboutDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import {
  SETTINGS_CATEGORIES,
  type SettingsCategoryKey,
} from '@/components/settings/settingsCategories';
import {
  ApplicationMenu,
  type ApplicationMenuAction,
} from './ApplicationMenu';

const APP_VERSION = '0.1.0';
const APP_DESCRIPTION =
  'A native desktop shell for AI with a fully local .NET runtime and React-based workspace.';

export default function MainLayout() {
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<SessionNavigationMode>('projects');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [lastSelectedProjectSessionId, setLastSelectedProjectSessionId] = useState('');
  const [lastSelectedChatSessionId, setLastSelectedChatSessionId] = useState('');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsActiveCategory, setSettingsActiveCategory] = useState<SettingsCategoryKey>('general');
  const [settingsSearchActive, setSettingsSearchActive] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const { bootstrap, activeTurnSessions, setBootstrap, setSessionCache } = useBootstrap();
  const sessions = useMemo(
    () => bootstrap?.recentSessions ?? [],
    [bootstrap?.recentSessions],
  );
  const sessionScopeOptions = useMemo(
    () => ({
      runtimeBaseDirectory: bootstrap?.kurisuRuntime?.runtimeBaseDirectory ?? '',
      workspaceRoot: bootstrap?.workspaceRoot ?? '',
    }),
    [bootstrap?.kurisuRuntime?.runtimeBaseDirectory, bootstrap?.workspaceRoot],
  );

  const activeCategoryDescriptor = useMemo(
    () => SETTINGS_CATEGORIES.find((cat) => cat.key === settingsActiveCategory) ?? SETTINGS_CATEGORIES[0],
    [settingsActiveCategory],
  );
  void activeCategoryDescriptor;

  const openSearch = useCallback(() => setSearchModalOpen(true), []);
  const closeSearch = useCallback(() => setSearchModalOpen(false), []);
  const closeAppMenu = useCallback(() => setAppMenuOpen(false), []);
  const toggleAppMenu = useCallback(() => setAppMenuOpen((current) => !current), []);
  const openAbout = useCallback(() => setAboutOpen(true), []);
  const closeAbout = useCallback(() => setAboutOpen(false), []);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setSettingsActiveCategory('general');
    setSettingsSearchActive(false);
  }, []);

  const toggleSettingsSearch = useCallback(() => {
    setSettingsSearchActive((current) => !current);
  }, []);

  const exitSettingsSearch = useCallback(() => {
    setSettingsSearchActive(false);
  }, []);
  const openSkills = useCallback(() => {
    console.log('Skills & Integrations opened');
  }, []);

  const handleMinimize = useCallback(() => {
    void window.kurisuDesktop?.minimizeWindow?.();
  }, []);
  const handleToggleMaximize = useCallback(() => {
    void window.kurisuDesktop?.toggleMaximizeWindow?.();
  }, []);
  const handleClose = useCallback(() => {
    window.kurisuDesktop?.closeWindow?.();
  }, []);

  useEffect(() => {
    const unsubscribe = window.kurisuDesktop?.subscribeWindowState?.(({ isMaximised }) => {
      setIsMaximized(isMaximised);
    });
    return unsubscribe;
  }, []);

  const menuSections = useMemo<(ApplicationMenuAction[] | null)[]>(() => [
    [
      {
        key: 'settings',
        labelKey: 'top.settings',
        iconSource: adwaitaIconSources.settings,
        onSelect: openSettings,
      },
      {
        key: 'skills',
        labelKey: 'top.skills',
        iconSource: adwaitaIconSources.extensions,
        onSelect: openSkills,
      },
    ],
    null,
    [
      {
        key: 'about',
        labelKey: 'menu.about',
        iconSource: adwaitaIconSources.help,
        onSelect: openAbout,
      },
    ],
  ], [openSettings, openSkills, openAbout]);

  const resolveRememberedSessionId = (
    nextMode: SessionNavigationMode,
    rememberedSessionId: string,
  ) => {
    if (!rememberedSessionId) return '';
    const rememberedSession = sessions.find((session) => session.sessionId === rememberedSessionId);
    if (!rememberedSession) return '';
    const rememberedMode = isProjectlessSession(rememberedSession, sessionScopeOptions) ? 'chats' : 'projects';
    return rememberedMode === nextMode ? rememberedSessionId : '';
  };

  const handleSelectSession = (sessionId: string) => {
    const nextSession = sessions.find((session) => session.sessionId === sessionId);
    if (nextSession) {
      const nextMode = isProjectlessSession(nextSession, sessionScopeOptions) ? 'chats' : 'projects';
      setSidebarMode(nextMode);
      if (nextMode === 'chats') {
        setLastSelectedChatSessionId(sessionId);
      } else {
        setLastSelectedProjectSessionId(sessionId);
      }
    }

    setSelectedSessionId(sessionId);
    closeSearch();
  };

  const handleNewChat = () => setSelectedSessionId('');

  const handleRenameSession = async (sessionId: string) => {
    const session = sessions.find((item) => item.sessionId === sessionId);
    if (!session || !window.kurisuDesktop?.renameSession) return;

    const nextTitle = window.prompt('Rename chat', session.title ?? '');
    if (nextTitle === null) return;

    const trimmedTitle = nextTitle.trim();
    if (!trimmedTitle || trimmedTitle === (session.title ?? '').trim()) return;

    const result = await window.kurisuDesktop.renameSession({ sessionId, title: trimmedTitle });
    setBootstrap((current) => ({
      ...current,
      recentSessions: current.recentSessions.map((item) =>
        item.sessionId === sessionId ? { ...item, title: result.title || trimmedTitle } : item,
      ),
    }));
    setSessionCache((current) => {
      const detail = current[sessionId];
      if (!detail) return current;
      return {
        ...current,
        [sessionId]: { ...detail, session: { ...detail.session, title: trimmedTitle } },
      };
    });
  };

  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find((item) => item.sessionId === sessionId);
    if (!session || !window.kurisuDesktop?.removeSession) return;

    if (!window.confirm(`Delete chat "${session.title ?? session.sessionId}"?`)) return;

    await window.kurisuDesktop.removeSession({ sessionId });
    setBootstrap((current) => ({
      ...current,
      recentSessions: current.recentSessions.filter((item) => item.sessionId !== sessionId),
    }));
    setSessionCache((current) => {
      const next = { ...current };
      delete next[sessionId];
      return next;
    });

    if (selectedSessionId === sessionId) setSelectedSessionId('');
    if (lastSelectedChatSessionId === sessionId) setLastSelectedChatSessionId('');
    if (lastSelectedProjectSessionId === sessionId) setLastSelectedProjectSessionId('');
  };

  const handleToggleMode = () => {
    const nextMode = sidebarMode === 'projects' ? 'chats' : 'projects';
    const nextSelectedSessionId = nextMode === 'chats'
      ? resolveRememberedSessionId(nextMode, lastSelectedChatSessionId)
      : resolveRememberedSessionId(nextMode, lastSelectedProjectSessionId);

    setSidebarMode(nextMode);
    setSelectedSessionId(nextSelectedSessionId);
    closeSearch();
  };

  useEffect(() => {
    if (!selectedSessionId) return;
    const selectedSession = sessions.find((session) => session.sessionId === selectedSessionId);
    if (!selectedSession) setSelectedSessionId(''); // eslint-disable-line react-hooks/set-state-in-effect
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (
      lastSelectedProjectSessionId &&
      !sessions.some((session) => session.sessionId === lastSelectedProjectSessionId)
    ) {
      setLastSelectedProjectSessionId(''); // eslint-disable-line react-hooks/set-state-in-effect
    }
    if (
      lastSelectedChatSessionId &&
      !sessions.some((session) => session.sessionId === lastSelectedChatSessionId)
    ) {
      setLastSelectedChatSessionId('');
    }
  }, [lastSelectedChatSessionId, lastSelectedProjectSessionId, sessions]);

  return (
    <Box h="100vh" w="100vw" overflow="hidden" bg={adwaitaColors.windowBg} position="relative">
      <TitleBar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
        onOpenMenu={toggleAppMenu}
        onMinimize={handleMinimize}
        onToggleMaximize={handleToggleMaximize}
        onClose={handleClose}
        isMaximized={isMaximized}
        productName={t('titlebar.appName')}
        menuButtonRef={menuButtonRef}
        isMenuOpen={appMenuOpen}
        mode={settingsOpen ? 'settings' : 'workspace'}
        onExitSettings={settingsSearchActive ? exitSettingsSearch : closeSettings}
        onSearchClick={toggleSettingsSearch}
        searchActive={settingsSearchActive}
      />
      <Box h="calc(100% - 40px)" w="100%" position="relative" overflow="hidden">
        {/* Chat workspace */}
        <Box position="absolute" inset={0} display="flex" zIndex={0}>
          <Sidebar
            isOpen={isSidebarOpen}
            sessions={sessions}
            activeTurnSessions={activeTurnSessions}
            selectedSessionId={selectedSessionId}
            mode={sidebarMode}
            runtimeBaseDirectory={sessionScopeOptions.runtimeBaseDirectory}
            workspaceRoot={sessionScopeOptions.workspaceRoot}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
              onToggleMode={handleToggleMode}
              onOpenSearch={openSearch}
              onRenameSession={(session) => void handleRenameSession(session.sessionId)}
              onDeleteSession={(session) => void handleDeleteSession(session.sessionId)}
            />
            <Box flex={1} minW={0} h="100%" overflow="hidden">
              <ChatArea
                selectedSessionId={selectedSessionId}
                sidebarMode={sidebarMode}
                onSelectSession={handleSelectSession}
              />
          </Box>
        </Box>
      </Box>

      <SearchModal
        open={searchModalOpen}
        onClose={closeSearch}
        onSelect={handleSelectSession}
        sessions={sessions}
        mode={sidebarMode}
        scopeOptions={sessionScopeOptions}
      />

      <ApplicationMenu
        isOpen={appMenuOpen}
        triggerRef={menuButtonRef}
        onClose={closeAppMenu}
        sections={menuSections}
      />

      <AboutDialog
        open={aboutOpen}
        onClose={closeAbout}
        productName={t('titlebar.appName')}
        version={APP_VERSION}
        description={APP_DESCRIPTION}
      />

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            key="settings-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.32, 0, 0.16, 1] }}
            style={{
              position: 'fixed',
              top: `${40}px`,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1500,
            }}
          >
            <SettingsDialog
              active={settingsActiveCategory}
              onActiveChange={setSettingsActiveCategory}
              onClose={closeSettings}
              searchActive={settingsSearchActive}
              onExitSearch={exitSettingsSearch}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
