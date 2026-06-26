import { useEffect, useRef, useState } from 'react';
import { Box, Button, Portal } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { SessionPreview } from '@/types/desktop';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import { adwaitaColors } from '@/lib/themeTokens';

export interface SessionMenuState {
  session: SessionPreview;
  x: number;
  y: number;
}

interface SessionContextMenuProps {
  state: SessionMenuState | null;
  onClose: () => void;
  onRename: (session: SessionPreview) => void;
  onDelete: (session: SessionPreview) => void;
}

const MENU_WIDTH = 184;
const MENU_HEIGHT = 84;

export function SessionContextMenu({
  state,
  onClose,
  onRename,
  onDelete,
}: SessionContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;

    const closeOnPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      if ((event.target as Element | null)?.closest?.('.session-actions')) return;
      onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', closeOnPointerDown);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('mousedown', closeOnPointerDown);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [state, onClose]);

  const x = state
    ? Math.min(window.innerWidth - MENU_WIDTH - 8, Math.max(8, state.x))
    : 0;
  const y = state
    ? Math.min(window.innerHeight - MENU_HEIGHT - 8, Math.max(8, state.y))
    : 0;

  return (
    <Portal>
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ position: 'fixed', left: `${x}px`, top: `${y}px`, zIndex: 3000 }}
          >
            <Box
              ref={menuRef}
              w="184px"
              p={1}
              bg={adwaitaColors.popoverBg}
              border="1px solid"
              borderColor={adwaitaColors.borderStrong}
              borderRadius="lg"
              shadow="xl"
            >
              <Button
                variant="ghost"
                w="full"
                h="34px"
                px={2}
                justifyContent="flex-start"
                leftIcon={<AdwaitaIcon source={adwaitaIconSources.edit} size={14} />}
                color={adwaitaColors.fg}
                fontSize="sm"
                fontWeight="normal"
                borderRadius="md"
                _hover={{ bg: adwaitaColors.cardBg, color: adwaitaColors.fg }}
                onClick={() => {
                  const session = state.session;
                  onClose();
                  onRename(session);
                }}
              >
                {t('sidebar.renameChat')}
              </Button>
              <Button
                variant="ghost"
                w="full"
                h="34px"
                px={2}
                justifyContent="flex-start"
                leftIcon={<AdwaitaIcon source={adwaitaIconSources.trash} size={14} />}
                color={adwaitaColors.destructive}
                fontSize="sm"
                fontWeight="normal"
                borderRadius="md"
                _hover={{ bg: 'rgba(192,28,40,0.14)', color: '#fca5a5' }}
                onClick={() => {
                  const session = state.session;
                  onClose();
                  onDelete(session);
                }}
              >
                {t('sidebar.deleteChat')}
              </Button>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function useSessionMenu() {
  const [state, setState] = useState<SessionMenuState | null>(null);
  const toggle = (session: SessionPreview, x: number, y: number) => {
    setState((current) =>
      current?.session.sessionId === session.sessionId ? null : { session, x, y },
    );
  };
  return { state, toggle, setState, clear: () => setState(null) };
}
