import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, HStack, Text, VStack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { buildPendingApprovalPresentations } from '@/lib/approvalRules';
import type { AgentMode } from '@/types/ui';
import { useBootstrap } from '@/hooks/useBootstrap';
import newSessionLogo from '@/assets/stickers/mayuri_thinking.png'
import { MessageList, ThinkingPanel } from '@/features/chat';
import { Composer, ProjectPicker } from '@/features/chat/composer';
import { useChatSession } from '@/features/chat/useChatSession';
import { useProjectPicker } from '@/features/chat/useProjectPicker';
import { useMessageRouting } from '@/features/chat/useMessageRouting';
import { useTurnActions } from '@/features/chat/useTurnActions';
import { useApprovalActions } from '@/features/chat/useApprovalActions';
import type { SessionNavigationMode } from '@/components/layout/sessionNavigation';

const APP_BACKGROUND = '#1f1f23';
const SIDEBAR_BORDER = 'rgba(255,255,255,0.06)';
const CHAT_MAX_WIDTH = '4xl';

export interface ChatAreaProps {
  selectedSessionId?: string;
  sidebarMode?: SessionNavigationMode;
  onSelectSession?: (sessionId: string) => void;
}

export default function ChatArea({
  selectedSessionId,
  sidebarMode = 'projects',
  onSelectSession,
}: ChatAreaProps) {
  const { t } = useTranslation();
  const {
    bootstrap,
    activeTurnSessions,
    liveSessionEvents,
    streamingSnapshots,
    latestSessionEvent,
  } = useBootstrap();
  const sessions = bootstrap?.recentSessions ?? [];
  const locale = bootstrap?.currentLocale ?? 'en';
  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId);

  const [mode, setMode] = useState<AgentMode>('default');
  const [prompt, setPrompt] = useState('');
  const [showContextTooltip, setShowContextTooltip] = useState(false);
  const [retainedStreamingSnapshot, setRetainedStreamingSnapshot] = useState({ sessionId: '', text: '' });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const animatedUserEntryIdsRef = useRef<Set<string>>(new Set());

  const { sessionDetail, isLoadingSession, usedTokens } = useChatSession(selectedSessionId);
  const picker = useProjectPicker(selectedSession, sidebarMode);

  const selectedModel = useMemo(() => {
    const models = bootstrap?.kurisuModels?.availableModels ?? [];
    return (
      models.find((model) => model.isDefaultModel) ??
      models.find((model) => model.id === bootstrap?.kurisuRuntime?.modelName) ??
      null
    );
  }, [bootstrap]);

  const totalTokens = selectedModel?.contextWindowSize ?? 131_072;
  const hasSession = !!selectedSessionId;
  const streamingSnapshot = selectedSessionId ? streamingSnapshots[selectedSessionId] ?? '' : '';
  const retainedStreamingText = retainedStreamingSnapshot.sessionId === selectedSessionId
    ? retainedStreamingSnapshot.text.trim()
    : '';
  const effectiveStreamingSnapshot = streamingSnapshot.trim() || retainedStreamingText;
  const selectedLiveSessionEvents = useMemo(
    () => (selectedSessionId ? liveSessionEvents[selectedSessionId] ?? [] : []),
    [liveSessionEvents, selectedSessionId],
  );

  const routing = useMessageRouting({
    selectedSessionId,
    sessionDetail,
    selectedSession,
    selectedLiveSessionEvents,
    effectiveStreamingSnapshot,
    retainedStreamingSnapshot,
    isSessionStreaming: !!selectedSessionId && !!activeTurnSessions[selectedSessionId],
    isComposerBusy: false,
    latestSessionEvent: latestSessionEvent
      ? { sessionId: latestSessionEvent.sessionId, timestampUtc: latestSessionEvent.timestampUtc }
      : null,
    isPendingSelectedSession: false,
  });

  const sessionProjectRoot = bootstrap?.workspaceRoot ?? routing.displaySessionDetail?.session.workingDirectory ?? '';
  const pendingApprovalPresentations = useMemo(
    () => buildPendingApprovalPresentations(routing.displaySessionDetail?.entries ?? [], sessionProjectRoot),
    [routing.displaySessionDetail?.entries, sessionProjectRoot],
  );

  const turn = useTurnActions({
    prompt,
    setPrompt,
    selectedSessionId,
    selectedSession,
    selectedProjectMode: picker.selectedProjectMode,
    selectedProjectWorkingDirectory: picker.selectedProjectWorkingDirectory,
    runtimeBaseDirectory: bootstrap?.kurisuRuntime?.runtimeBaseDirectory ?? '',
    workspaceRoot: bootstrap?.workspaceRoot ?? '',
    onSelectSession,
    onClearPicker: picker.close,
    onResetPickerQuery: () => picker.setQuery(""),
    sidebarMode,
  });

  const approval = useApprovalActions({
    selectedSessionId,
    pendingApprovalPresentations,
    onMarkTurnPending: () => {
      if (selectedSessionId) {
        // No-op; managed internally via approval flow
      }
    },
    onClearTurnPending: () => {
      if (selectedSessionId) {
        turn.clearPendingTurn(selectedSessionId);
      }
    },
  });

  const isSessionStreaming = !!selectedSessionId && !!activeTurnSessions[selectedSessionId];
  const isPendingSelectedSession = !!selectedSessionId && !!turn.pendingTurnSessionIds[selectedSessionId];
  const isComposerBusy = isPendingSelectedSession || isSessionStreaming;
  const canStopActiveTurn = !!selectedSessionId && isComposerBusy;
  const isAwaitingAssistantText = hasSession && isComposerBusy && !streamingSnapshot.trim();
  const defaultThinkingLabel = t('tools.thinking');

  useEffect(() => {
    if (!selectedSessionId || !activeTurnSessions[selectedSessionId]) {
      return;
    }

    turn.clearPendingTurn(selectedSessionId);
  }, [activeTurnSessions, selectedSessionId, turn]);

  useEffect(() => {
    if (!selectedSessionId) {
      setRetainedStreamingSnapshot({ sessionId: '', text: '' });
      return;
    }

    if (streamingSnapshot.trim()) {
      setRetainedStreamingSnapshot({ sessionId: selectedSessionId, text: streamingSnapshot });
      return;
    }

    if (isSessionStreaming) {
      return;
    }

    const lastAssistantBody = [...(sessionDetail?.entries ?? [])]
      .reverse()
      .find((entry) => entry.type === 'assistant' && !!entry.body?.trim())
      ?.body
      ?.trim() ?? '';

    if (retainedStreamingSnapshot.sessionId !== selectedSessionId || !retainedStreamingSnapshot.text.trim()) {
      return;
    }

    if (lastAssistantBody === retainedStreamingSnapshot.text.trim()) {
      setRetainedStreamingSnapshot({ sessionId: '', text: '' });
    }
  }, [isSessionStreaming, retainedStreamingSnapshot, selectedSessionId, sessionDetail, streamingSnapshot]);

  const updateStickToBottomState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceToBottom <= 72;
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    const container = scrollContainerRef.current;
    if (!container || (!force && !shouldStickToBottomRef.current)) {
      return;
    }

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const currentContainer = scrollContainerRef.current;
      if (!currentContainer) {
        scrollFrameRef.current = null;
        return;
      }

      currentContainer.scrollTop = currentContainer.scrollHeight;
      shouldStickToBottomRef.current = true;
      scrollFrameRef.current = null;
    });
  }, []);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [routing.displaySessionDetail?.entries.length, effectiveStreamingSnapshot, isAwaitingAssistantText, scrollToBottom]);

  useEffect(() => {
    shouldStickToBottomRef.current = true;
    scrollToBottom(true);
  }, [scrollToBottom, selectedSessionId]);

  const contextPercent = totalTokens > 0 ? Math.min(100, Math.round((usedTokens / totalTokens) * 100)) : 0;
  const usedTokensLabel = t('chat.contextUsed', { used: usedTokens.toLocaleString(), total: totalTokens.toLocaleString() });
  const compressionLabel = t('chat.contextCompression');

  const canSubmit = !isComposerBusy && prompt.trim().length > 0 && !!picker.selectedProjectWorkingDirectory;
  const isStopHighlighted = canStopActiveTurn;

  return (
    <HStack h="100%" spacing={0} bg={APP_BACKGROUND} align="stretch" overflow="hidden">
      <VStack flex={1} minW={0} h="100%" spacing={0} align="stretch" overflow="hidden">
        {selectedSessionId && (
          <HStack
            px={4}
            py={3}
            spacing={3}
            justify="flex-start"
            borderBottom="1px solid"
            borderColor={SIDEBAR_BORDER}
            minH="60px"
            flexShrink={0}
          >
            <Text fontWeight="semibold" color="white" fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" maxW="560px">
              {selectedSession?.title ?? t('chat.newChat')}
            </Text>
          </HStack>
        )}

        <HStack flex={1} minH={0} spacing={0} align="stretch">
          <VStack flex={1} minW={0} h="100%" spacing={0} align="stretch" overflow="hidden">
            <Box
              ref={scrollContainerRef}
              flex={1}
              overflowY="scroll"
              onScroll={updateStickToBottomState}
              sx={{
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: '#5b5b67', borderRadius: '3px' },
                '&::-webkit-scrollbar-thumb:hover': { background: '#72727f' },
              }}>
              {hasSession ? (
                <MessageList
                  displaySessionDetail={routing.displaySessionDetail}
                  isLoadingSession={isLoadingSession}
                  isAwaitingAssistantText={isAwaitingAssistantText}
                  loadingPhrase={defaultThinkingLabel}
                  plainThinkingLabel={defaultThinkingLabel}
                  liveReasoningAssistantId={routing.liveReasoningAssistantEntry?.id ?? ''}
                  latestPendingUserEntryId={routing.latestPendingUserEntryId}
                  animatedUserEntryIdsRef={animatedUserEntryIdsRef}
                  locale={locale}
                  reasoningArtifactsByAssistantId={routing.reasoningArtifactsByAssistantId}
                  liveReasoningArtifacts={routing.liveReasoningArtifacts}
                  latestLiveThinkingSnapshot={routing.latestLiveThinkingSnapshot}
                  activePendingApprovalPresentation={approval.activePresentation}
                  approvalFeedbackById={approval.feedbackById}
                  onApprovalFeedbackChange={approval.onFeedbackChange}
                  onApprovalAllowOnce={approval.onAllowOnce}
                  onApprovalAlwaysAllow={approval.onAlwaysAllow}
                  onApprovalSubmitFeedback={approval.onSubmitFeedback}
                  onOpenReasoning={routing.handleOpenReasoning}
                  onToggleLiveReasoning={routing.handleToggleLiveReasoning}
                />
              ) : (
                <Flex h="100%" direction="column" align="center" justify="center" userSelect="none">
                  <img
                    src={newSessionLogo}
                    alt="WelcomeImg"
                    style={{ height: '96px', width: '96px', opacity: 0.9, marginBottom: '16px' }}
                    draggable={false}
                  />
                  <Text fontSize="2xl" fontWeight="semibold" color="white" letterSpacing="tight">
                    {sidebarMode === 'chats' ? t('chat.chatModeWelcomeTitle') : t('chat.welcomeTitle')}
                  </Text>
                  {sidebarMode === 'projects' && (
                    <>
                      <Box mt={2} position="relative">
                        <ProjectPickerTriggerButton
                          ref={picker.buttonRef}
                          label={picker.selectedProjectLabel}
                          isOpen={picker.isOpen}
                          onClick={picker.toggle}
                        />
                      </Box>

                      <ProjectPicker
                        isOpen={picker.isOpen}
                        position={picker.position}
                        query={picker.query}
                        selectedProjectPath={picker.selectedProjectPath}
                        selectedProjectMode={picker.selectedProjectMode}
                        filteredProjectOptions={picker.filteredProjectOptions}
                        projectListHeight={picker.projectListHeight}
                        containerRef={picker.menuRef}
                        onQueryChange={picker.setQuery}
                        onSelectProject={picker.selectProject}
                        onAddProject={picker.addProject}
                        onClose={picker.close}
                      />
                    </>
                  )}
                </Flex>
              )}
            </Box>

            <Box px={4} pb={4} pt={3} position="relative" bg={APP_BACKGROUND} flexShrink={0}>
              <Box
                position="absolute"
                top="-24px"
                left={0}
                right={0}
                h="24px"
                pointerEvents="none"
                zIndex={5}
                sx={{
                  background: `linear-gradient(to bottom, transparent, ${APP_BACKGROUND})`,
                }}
              />

              <Box mx="auto" w="full" maxW={CHAT_MAX_WIDTH}>
                <Composer
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  mode={mode}
                  onModeChange={setMode}
                  onSubmit={() => { turn.handleSubmit(); }}
                  onStop={() => { turn.handleStopGeneration(); }}
                  isComposerBusy={isComposerBusy}
                  canSubmit={canSubmit}
                  contextPercent={contextPercent}
                  contextTooltipVisible={showContextTooltip}
                  onContextTooltipEnter={() => setShowContextTooltip(true)}
                  onContextTooltipLeave={() => setShowContextTooltip(false)}
                  usedTokensLabel={usedTokensLabel}
                  compressionLabel={compressionLabel}
                  isStopHighlighted={isStopHighlighted}
                  contextColor={contextPercent >= 70 ? 'orange.400' : 'gray.500'}
                  textareaRef={textareaRef}
                  placeholder={sidebarMode === 'chats' ? t('chat.chatModePromptPlaceholder') : t('chat.promptPlaceholder')}
                />
              </Box>

              <Text mx="auto" mt={2} px={2} fontSize="11px" color="gray.600" textAlign="center" maxW={CHAT_MAX_WIDTH}>
                {t('chat.disclaimer')}
              </Text>
            </Box>
          </VStack>

          <ThinkingPanel
            openAssistantId={routing.openReasoningAssistantId}
            onClose={() => routing.setOpenReasoningAssistantId(null)}
            activeReasoningAssistantEntry={routing.activeReasoningAssistantEntry}
            activeReasoningEntries={routing.activeReasoningEntries}
            isReasoningInProgress={routing.isReasoningInProgress}
          />
        </HStack>
      </VStack>
    </HStack>
  );
}

const ProjectPickerTriggerButton = forwardRef<
  HTMLButtonElement,
  { label: string; isOpen: boolean; onClick: () => void }
>(function ProjectPickerTriggerButton({ label, isOpen, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        color: '#71717a',
        fontWeight: 400,
        cursor: 'pointer',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        gap: '4px',
      }}
    >
      <span style={{ fontSize: '1.5rem', lineHeight: 1, fontWeight: 400, textAlign: 'center' }}>{label}</span>
      <span
        style={{
          height: 0,
          borderBottom: '1px dashed currentColor',
          opacity: isOpen ? 0.9 : 0.65,
        }}
      />
    </button>
  );
});
