import { useEffect, type RefObject } from 'react';
import { Box, Button, Text, VStack } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AGENT_MODES, type AgentMode } from '@/types/ui';
import { MODE_ICONS } from '@/features/chat/messages';

const ACCENT = '#615CED';

export interface ModeMenuProps {
  mode: AgentMode;
  isOpen: boolean;
  onSelect: (mode: AgentMode) => void;
  onClose: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function ModeMenu({ mode, isOpen, onSelect, onClose, containerRef }: ModeMenuProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, containerRef, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Box
          position="absolute"
          bottom="calc(100% + 8px)"
          left={0}
          zIndex={9999}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <Box
              ref={containerRef}
              minW="300px"
              border="1px solid"
              borderColor="gray.700"
              bg="gray.800"
              borderRadius="20px"
              shadow="lg"
              p={1.5}
            >
              {AGENT_MODES.map((m) => {
                const isSelected = mode === m.value;
                return (
                  <Button
                    key={m.value}
                    variant="ghost"
                    w="full"
                    justifyContent="flex-start"
                    alignItems="center"
                    h="52px"
                    px={3}
                    borderRadius="16px"
                    onClick={() => { onSelect(m.value); }}
                    bg="transparent"
                    _hover={{ bg: 'rgba(255,255,255,0.05)' }}
                    color="white"
                    gap={3}
                    fontWeight="normal"
                  >
                    <Box w={5} h={5} display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                      {isSelected ? (
                        <Check size={16} color={ACCENT} strokeWidth={2.5} />
                      ) : (
                        <Box color="gray.500">
                          {MODE_ICONS[m.value]}
                        </Box>
                      )}
                    </Box>
                    <VStack align="start" spacing={0.5} flex={1}>
                      <Text fontSize="sm" fontWeight="normal" textAlign="left" whiteSpace="nowrap">{t(m.labelKey)}</Text>
                      <Text fontSize="xs" color="gray.500" whiteSpace="normal" textAlign="left">{t(m.descriptionKey)}</Text>
                    </VStack>
                  </Button>
                );
              })}
            </Box>
          </motion.div>
        </Box>
      )}
    </AnimatePresence>
  );
}
