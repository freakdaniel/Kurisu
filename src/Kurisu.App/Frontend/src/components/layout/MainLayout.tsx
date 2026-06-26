import { Box, HStack } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBootstrap } from '@/hooks/useBootstrap';
import { Sidebar } from '@/features/sidebar';
import ChatArea from '@/features/chat/ChatArea';
import { adwaitaColors } from '@/lib/themeTokens';
import {
  isProjectlessSession,
  type SessionNavigationMode,
} from './sessionNavigation';
import { SearchModal } from './SearchModal';
import { TitleBar } from './TitleBar';

export default function MainLayout() {
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<SessionNavigationMode>('projects');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [lastSelectedProjectSessionId, setLastSelectedProjectSessionId] = useState('');
  const [lastSelectedChatSessionId, setLastSelectedChatSessionId] = useState('');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const { bootstrap, activeTurnSessions, setBootstrap, setSessionCache } = useBootstrap();
  const sessions = bootstrap?.recentSessions ?? [];
  const sessionScopeOptions = useMemo(
    () => ({
      runtimeBaseDirectory: bootstrap?.kurisuRuntime?.runtimeBaseDirectory ?? '',
      workspaceRoot: bootstrap?.workspaceRoot ?? '',
    }),
    [bootstrap?.kurisuRuntime?.runtimeBaseDirectory, bootstrap?.workspaceRoot],
  );

  const openSearch = () => setSearchModalOpen(true);
  const closeSearch = () => setSearchModalOpen(false);

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
    if (!selectedSession) setSelectedSessionId('');
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (
      lastSelectedProjectSessionId &&
      !sessions.some((session) => session.sessionId === lastSelectedProjectSessionId)
    ) {
      setLastSelectedProjectSessionId('');
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
        onOpenSearch={openSearch}
        onOpenMenu={() => console.log('Open menu')}
        productName={t('titlebar.appName')}
      />
      <HStack h="calc(100% - 40px)" w="100%" spacing={0} align="stretch">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen((current) => !current)}
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
          onOpenSkills={() => console.log('Skills & Integrations')}
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
      </HStack>

      <SearchModal
        open={searchModalOpen}
        onClose={closeSearch}
        onSelect={handleSelectSession}
        sessions={sessions}
        mode={sidebarMode}
        scopeOptions={sessionScopeOptions}
      />
    </Box>
  );
}
