import { useEffect, useRef, useState } from 'react';
import { Box, Button, Portal } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SessionPreview } from '@/types/desktop';

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
              bg="gray.800"
              border="1px solid"
              borderColor="gray.700"
              borderRadius="lg"
              shadow="xl"
            >
              <Button
                variant="ghost"
                w="full"
                h="34px"
                px={2}
                justifyContent="flex-start"
                leftIcon={<Pencil size={14} />}
                color="gray.200"
                fontSize="sm"
                fontWeight="normal"
                borderRadius="md"
                _hover={{ bg: 'gray.700', color: 'white' }}
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
                leftIcon={<Trash2 size={14} />}
                color="red.300"
                fontSize="sm"
                fontWeight="normal"
                borderRadius="md"
                _hover={{ bg: 'rgba(248,113,113,0.12)', color: 'red.200' }}
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
