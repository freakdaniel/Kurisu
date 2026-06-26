import { Box, Button, HStack, Skeleton, Text } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/lib/time';
import type { SessionPreview } from '@/types/desktop';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import { adwaitaColors } from '@/lib/themeTokens';

interface SessionRowProps {
  session: SessionPreview;
  isSelected: boolean;
  isRunning: boolean;
  mode: 'projects' | 'chats';
  onSelect: (sessionId: string) => void;
  onContextMenu: (session: SessionPreview, x: number, y: number) => void;
  onActionsClick: (session: SessionPreview, x: number, y: number) => void;
}

const SESSION_HOVER_BACKGROUND = 'rgba(255,255,255,0.06)';
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
      h="30px"
      px={3}
      py={0}
      alignItems="center"
      justifyContent="space-between"
      w="full"
      minW={0}
      position="relative"
      bg={isSelected ? adwaitaColors.sidebarSelectedBg : 'transparent'}
      color={isSelected ? adwaitaColors.fg : adwaitaColors.fgSecondary}
      _hover={{ bg: isSelected ? adwaitaColors.sidebarSelectedBg : SESSION_HOVER_BACKGROUND, color: adwaitaColors.fg }}
      _active={{ bg: isSelected ? adwaitaColors.sidebarSelectedBg : SESSION_HOVER_BACKGROUND, color: adwaitaColors.fg }}
      borderRadius="8px"
      fontSize="13px"
      fontWeight="normal"
      lineHeight="normal"
      overflow="visible"
      boxShadow={isSelected ? '0 0 0 1px rgba(255,255,255,0.04) inset' : 'none'}
    >
      <Box flex={1} minW={0} h="20px" pr={showSessionActions ? 9 : 2} display="flex" alignItems="center" position="relative" zIndex={1}>
        {session.title === null ? (
          <Skeleton
            h="12px"
            w="120px"
            borderRadius="sm"
            startColor={adwaitaColors.cardBg}
            endColor={adwaitaColors.headerbarBg}
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
            lineHeight="20px"
          >
            {session.title}
          </Text>
        )}
      </Box>
      {mode !== 'chats' && (
        <HStack spacing={2} ml={3} flexShrink={0}>
          <Text fontSize="11px" color={isSelected ? adwaitaColors.fgSecondary : adwaitaColors.fgMuted}>
            {formatRelativeTime(session.lastActivity, t)}
          </Text>
          <Box
            boxSize="6px"
            borderRadius="full"
            bg={isRunning ? adwaitaColors.success : 'transparent'}
            transition="background-color 0.2s ease"
          />
        </HStack>
      )}
      {mode === 'chats' && isRunning && (
        <Box
          boxSize="6px"
          borderRadius="full"
          bg={adwaitaColors.success}
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
                borderRadius: '8px',
                pointerEvents: 'none',
                background: isSelected
                  ? `linear-gradient(to right, ${adwaitaColors.sidebarSelectedBg}00, ${adwaitaColors.sidebarSelectedBg}d0 32%, ${adwaitaColors.sidebarSelectedBg} 72%)`
                  : `linear-gradient(to right, transparent, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.18) 72%)`,
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
                  w="22px"
                  h="22px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="full"
                  color={isSelected ? adwaitaColors.fg : adwaitaColors.fgSecondary}
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
                  _hover={{ color: adwaitaColors.fg, bg: 'transparent' }}
                >
                  <AdwaitaIcon source={adwaitaIconSources.more} size={15} />
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
