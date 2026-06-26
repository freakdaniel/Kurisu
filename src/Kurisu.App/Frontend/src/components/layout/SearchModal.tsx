import { Box, Button, HStack, Input, Text, VStack } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  filterSessionsByNavigationMode,
  getProjectNameFromWorkingDirectory,
  groupProjectSessions,
  type SessionNavigationMode,
  type SessionScopeOptions,
} from '@/components/layout/sessionNavigation';
import type { SessionPreview } from '@/types/desktop';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import { adwaitaColors } from '@/lib/themeTokens';

export interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sessionId: string) => void;
  sessions: SessionPreview[];
  mode: SessionNavigationMode;
  scopeOptions: SessionScopeOptions;
}

export function SearchModal({ open, onClose, onSelect, sessions, mode, scopeOptions }: SearchModalProps) {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const filtered = useMemo(
    () => sessions.filter((conv) => (conv.title ?? '').toLowerCase().includes(term.toLowerCase())),
    [sessions, term],
  );
  const visible = useMemo(
    () => filterSessionsByNavigationMode(filtered, mode, scopeOptions),
    [filtered, mode, scopeOptions],
  );
  const grouped = useMemo(
    () => groupProjectSessions(visible, t('sidebar.otherProjects')),
    [t, visible],
  );
  const ordered = useMemo(
    () =>
      [...visible].sort(
        (left, right) => new Date(right.lastActivity).getTime() - new Date(left.lastActivity).getTime(),
      ),
    [visible],
  );

  const close = () => {
    setTerm('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            position="absolute"
            inset={0}
            bg="rgba(0, 0, 0, 0.5)"
            onClick={close}
          />
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{
              duration: 0.15,
              ease: 'easeOut',
              layout: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
            }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <Box
              w="520px"
              maxW="90vw"
              bg={adwaitaColors.popoverBg}
              border="1px solid"
              borderColor={adwaitaColors.borderStrong}
              borderRadius="2xl"
              shadow="2xl"
            >
              <HStack px={4} py={3}>
                <AdwaitaIcon source={adwaitaIconSources.search} size={16} />
                <Input
                  ref={inputRef}
                  placeholder={t('search.placeholder')}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  bg="transparent"
                  border="none"
                  color={adwaitaColors.fg}
                  fontSize="sm"
                  p={0}
                  _placeholder={{ color: adwaitaColors.fgMuted }}
                  _focusVisible={{ boxShadow: 'none' }}
                  flex={1}
                />
                <button
                  type="button"
                  aria-label={t('search.close')}
                  onClick={close}
                  style={{
                    minWidth: '24px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: adwaitaColors.fgMuted,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = adwaitaColors.fg;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = adwaitaColors.fgMuted;
                  }}
                >
                  <AdwaitaIcon source={adwaitaIconSources.windowClose} size={14} />
                </button>
              </HStack>

              <Box borderTop="1px solid" borderColor={adwaitaColors.border} />

              <motion.div
                layout
                transition={{ layout: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }}
              >
                <Box
                  maxH="300px"
                  overflowY="auto"
                  p={3}
                  sx={{
                    scrollbarGutter: 'stable',
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: '#5b5b67', borderRadius: '3px' },
                  }}
                >
                  {visible.length > 0 ? (
                    mode === 'projects' ? (
                      <VStack spacing={1} align="stretch">
                        {grouped.map((group) => (
                          <Box key={group.name}>
                            <Text fontSize="11px" color={adwaitaColors.fgMuted} fontWeight={600} letterSpacing="0.02em" px={1} mb={1}>
                              {group.name}
                            </Text>
                            <VStack spacing={0} align="stretch">
                              {group.sessions.map((conv) => (
                                <Button
                                  key={conv.sessionId}
                                  variant="ghost"
                                  colorScheme="gray"
                                  onClick={() => onSelect(conv.sessionId)}
                                  h="32px"
                                  px={2}
                                  justifyContent="flex-start"
                                  bg="transparent"
                                  _hover={{ bg: adwaitaColors.cardBg }}
                                  borderRadius="md"
                                  whiteSpace="nowrap"
                                  fontSize="sm"
                                  color={adwaitaColors.fg}
                                >
                                  <Text overflow="hidden" textOverflow="ellipsis" flex={1} textAlign="left">
                                    {conv.title ?? ''}
                                  </Text>
                                </Button>
                              ))}
                            </VStack>
                          </Box>
                        ))}
                      </VStack>
                    ) : (
                      <VStack spacing={0} align="stretch">
                        {ordered.map((conv) => (
                          <Button
                            key={conv.sessionId}
                            variant="ghost"
                            colorScheme="gray"
                            onClick={() => onSelect(conv.sessionId)}
                            h="32px"
                            px={2}
                            justifyContent="space-between"
                            bg="transparent"
                            _hover={{ bg: adwaitaColors.cardBg }}
                            borderRadius="md"
                            whiteSpace="nowrap"
                            fontSize="sm"
                            color={adwaitaColors.fg}
                          >
                            <Text overflow="hidden" textOverflow="ellipsis" flex={1} textAlign="left">
                              {conv.title ?? getProjectNameFromWorkingDirectory(conv.workingDirectory, t('sidebar.otherProjects'))}
                            </Text>
                          </Button>
                        ))}
                      </VStack>
                    )
                  ) : (
                    <Text textAlign="center" color={adwaitaColors.fgMuted} fontSize="sm" py={4}>
                      {term ? t('search.noResults') : t('search.startTyping')}
                    </Text>
                  )}
                </Box>
              </motion.div>
            </Box>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
