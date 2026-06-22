import { Box, Button, HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
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
              bg="gray.800"
              border="1px solid"
              borderColor="gray.700"
              borderRadius="2xl"
              shadow="2xl"
            >
              <HStack px={4} py={3}>
                <Search size={16} color="#9494a2" />
                <Input
                  ref={inputRef}
                  placeholder={t('search.placeholder')}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  bg="transparent"
                  border="none"
                  color="white"
                  fontSize="sm"
                  p={0}
                  _placeholder={{ color: 'gray.500' }}
                  _focusVisible={{ boxShadow: 'none' }}
                  flex={1}
                />
                <IconButton
                  aria-label={t('search.close')}
                  icon={<X size={16} />}
                  size="xs"
                  variant="ghost"
                  colorScheme="gray"
                  color="gray.500"
                  minW="24px"
                  w="24px"
                  h="24px"
                  borderRadius="md"
                  onClick={close}
                  _hover={{ bg: 'gray.700', color: 'white' }}
                />
              </HStack>

              <Box borderTop="1px solid" borderColor="gray.700" />

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
                            <Text fontSize="xs" color="gray.500" fontWeight="medium" px={1} mb={1}>
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
                                  _hover={{ bg: 'gray.700' }}
                                  borderRadius="md"
                                  whiteSpace="nowrap"
                                  fontSize="sm"
                                  color="gray.200"
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
                            _hover={{ bg: 'gray.700' }}
                            borderRadius="md"
                            whiteSpace="nowrap"
                            fontSize="sm"
                            color="gray.200"
                          >
                            <Text overflow="hidden" textOverflow="ellipsis" flex={1} textAlign="left">
                              {conv.title ?? getProjectNameFromWorkingDirectory(conv.workingDirectory, t('sidebar.otherProjects'))}
                            </Text>
                          </Button>
                        ))}
                      </VStack>
                    )
                  ) : (
                    <Text textAlign="center" color="gray.500" fontSize="sm" py={4}>
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
