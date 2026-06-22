import { Box, Button, HStack, Skeleton, Text } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/lib/time';
import type { SessionPreview } from '@/types/desktop';

interface SessionRowProps {
  session: SessionPreview;
  isSelected: boolean;
  isRunning: boolean;
  mode: 'projects' | 'chats';
  onSelect: (sessionId: string) => void;
  onContextMenu: (session: SessionPreview, x: number, y: number) => void;
  onActionsClick: (session: SessionPreview, x: number, y: number) => void;
}

const SESSION_HOVER_BACKGROUND = 'rgba(255,255,255,0.045)';
const sessionItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { opacity: { duration: 0.15 }, x: { duration: 0.2 }, delay: i * 0.03 },
  }),
  exit: { opacity: 0, x: -4, transition: { duration: 0.1 } },
};

export function SessionRow({
  session,
  isSelected,
  isRunning,
  mode,
  onSelect,
  onContextMenu,
  onActionsClick,
}: SessionRowProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const showSessionActions = hovered;

  return (
    <Button
      variant="ghost"
      colorScheme="gray"
      onClick={() => onSelect(session.sessionId)}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(session, event.clientX, event.clientY);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered((current) => (current ? false : current))}
      className="session-row"
      h="38px"
      px={3}
      py={0}
      alignItems="center"
      justifyContent="space-between"
      w="full"
      minW={0}
      position="relative"
      bg={isSelected ? '#3a3a42' : 'transparent'}
      color={isSelected ? 'white' : 'gray.200'}
      _hover={{ bg: isSelected ? '#3a3a42' : SESSION_HOVER_BACKGROUND, color: 'white' }}
      _active={{ bg: isSelected ? '#3a3a42' : SESSION_HOVER_BACKGROUND, color: 'white' }}
      borderRadius="full"
      fontSize="13px"
      fontWeight="normal"
      lineHeight="normal"
      overflow="visible"
      boxShadow={isSelected ? '0 0 0 1px rgba(255,255,255,0.04) inset' : 'none'}
    >
      <Box flex={1} minW={0} h="22px" pr={showSessionActions ? 9 : 2} display="flex" alignItems="center" position="relative" zIndex={1}>
        {session.title === null ? (
          <Skeleton
            h="14px"
            w="120px"
            borderRadius="sm"
            startColor="gray.700"
            endColor="gray.600"
            flexShrink={0}
          />
        ) : (
          <Text
            color="inherit"
            display="block"
            fontWeight="normal"
            fontSize="13px"
            minW={0}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            textAlign="left"
            lineHeight="22px"
          >
            {session.title}
          </Text>
        )}
      </Box>
      {mode !== 'chats' && (
        <HStack spacing={2} ml={3} flexShrink={0}>
          <Text fontSize="xs" color={isSelected ? 'gray.300' : 'gray.500'}>
            {formatRelativeTime(session.lastActivity, t)}
          </Text>
          <Box
            boxSize="6px"
            borderRadius="full"
            bg={isRunning ? 'green.400' : 'transparent'}
            transition="background-color 0.2s ease"
          />
        </HStack>
      )}
      {mode === 'chats' && isRunning && (
        <Box
          boxSize="6px"
          borderRadius="full"
          bg="green.400"
          flexShrink={0}
          transition="background-color 0.2s ease"
          position="relative"
          zIndex={1}
        />
      )}
      <AnimatePresence initial={false}>
        {showSessionActions && (
          <>
            <motion.div
              key={`${session.sessionId}-mask`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '76px',
                borderRadius: '999px',
                pointerEvents: 'none',
                background: isSelected
                  ? 'linear-gradient(to right, rgba(58,58,66,0), rgba(58,58,66,0.82) 32%, rgba(58,58,66,1) 72%)'
                  : 'linear-gradient(to right, rgba(29,29,33,0), rgba(29,29,33,0.42) 30%, rgba(31,31,35,0.92) 72%)',
              }}
            />
            <Box
              position="absolute"
              right="6px"
              top="50%"
              transform="translateY(-50%)"
              zIndex={2}
            >
              <motion.div
                key={`${session.sessionId}-actions`}
                initial={{ opacity: 0, x: 6, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 6, scale: 0.94 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                <Box
                  className="session-actions"
                  w="24px"
                  h="24px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="full"
                  color={isSelected ? 'gray.200' : 'gray.400'}
                  bg="transparent"
                  transition="color 0.14s ease"
                  role="button"
                  tabIndex={0}
                  aria-label={t('sidebar.sessionActions')}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onActionsClick(session, event.clientX, event.clientY);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    event.stopPropagation();
                    const rect = event.currentTarget.getBoundingClientRect();
                    onActionsClick(session, rect.right, rect.bottom);
                  }}
                  _hover={{ color: 'white', bg: 'transparent' }}
                >
                  <MoreHorizontal size={15} style={{ transform: 'rotate(90deg)' }} />
                </Box>
              </motion.div>
            </Box>
          </>
        )}
      </AnimatePresence>
    </Button>
  );
}

export { sessionItemVariants };
