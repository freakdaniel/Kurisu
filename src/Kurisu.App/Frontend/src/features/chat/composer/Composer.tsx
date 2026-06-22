import { forwardRef, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import {
  Box,
  Button,
  HStack,
  IconButton,
  Textarea as ChakraTextarea,
  Text,
} from '@chakra-ui/react';
import { ArrowUp, Paperclip, Square } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AGENT_MODES, type AgentMode } from '@/types/ui';
import { MODE_ICONS } from '@/features/chat/messages';
import { ModeMenu } from '@/features/chat/composer/ModeMenu';

const ACCENT = '#615CED';
const ACCENT_HOVER = '#4e49d9';

const ButtonUnstyled = forwardRef<HTMLButtonElement, { onClick: () => void; children: React.ReactNode }>(
  function ButtonUnstyled({ onClick, children }, ref) {
    return (
      <Button
        ref={ref}
        variant="unstyled"
        h="34px"
        px={0}
        color="gray.400"
        minW={0}
        transition="color 0.2s ease"
        _hover={{ color: 'white' }}
        _active={{ color: 'white' }}
        onClick={onClick}
        fontWeight="normal"
        sx={{
          '& *': {
            transition: 'color 0.2s ease',
          },
        }}
      >
        {children}
      </Button>
    );
  },
);

function ContextRing({ percent, accentColor }: { percent: number; accentColor: string }) {
  const circumference = 2 * Math.PI * 10;
  const dashOffset = circumference - (percent / 100) * circumference;
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="14" cy="14" r="10" fill="none" stroke="#5b5b67" strokeWidth="2.5" />
      <circle
        cx="14" cy="14" r="10" fill="none"
        stroke={percent > 0 ? accentColor : 'transparent'}
        strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
      />
    </svg>
  );
}

export interface ComposerProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  onSubmit: () => void;
  onStop: () => void;
  isComposerBusy: boolean;
  canSubmit: boolean;
  contextPercent: number;
  contextTooltipVisible: boolean;
  onContextTooltipEnter: () => void;
  onContextTooltipLeave: () => void;
  usedTokensLabel: string;
  compressionLabel: string;
  isStopHighlighted: boolean;
  contextColor: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  placeholder: string;
}

export function Composer(props: ComposerProps) {
  const { t } = useTranslation();
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const modeBtnRef = useRef<HTMLButtonElement | null>(null);
  const modeMenuRef = useRef<HTMLDivElement | null>(null);

  const currentModeOption = AGENT_MODES.find((m) => m.value === props.mode) ?? AGENT_MODES[0];

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (!props.isComposerBusy && props.prompt.trim()) {
        props.onSubmit();
      }
    }
  };

  return (
    <Box>
      <Box
        borderRadius="30px"
        overflow="visible"
        border="1px solid"
        borderColor="rgba(255,255,255,0.06)"
        bg="#26262c"
        boxShadow="0 22px 70px -48px rgba(0,0,0,0.95)"
      >
        <Box px={5} pt={4}>
          <ChakraTextarea
            ref={props.textareaRef}
            value={props.prompt}
            onChange={(e) => props.onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={props.placeholder}
            rows={1}
            minH="74px"
            resize="none"
            overflow="hidden"
            border="none"
            bg="transparent"
            p={0}
            fontSize="sm"
            lineHeight="relaxed"
            color="white"
            _placeholder={{ color: '#8f8f9b' }}
            _focusVisible={{ boxShadow: 'none' }}
            sx={{ '&::-webkit-scrollbar': { display: 'none' } }}
          />
        </Box>

        <HStack justify="space-between" px={4} py={3} gap={3}>
          <HStack gap={3}>
            <IconButton
              aria-label={t('chat.message.attachFile')}
              icon={<Paperclip size={14} />}
              variant="ghost"
              size="sm"
              w="36px"
              h="36px"
              borderRadius="full"
              color="gray.400"
              bg="rgba(255,255,255,0.03)"
              _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'white' }}
            />
            <Box position="relative">
              <ButtonUnstyled
                ref={modeBtnRef}
                onClick={() => setModeDropdownOpen((current) => !current)}
              >
                <Box h="34px" display="flex" alignItems="center" overflow="hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={props.mode}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {MODE_ICONS[props.mode]}
                      <Text fontSize="xs" fontWeight="normal">{t(currentModeOption.labelKey)}</Text>
                    </motion.div>
                  </AnimatePresence>
                </Box>
              </ButtonUnstyled>

              <ModeMenu
                mode={props.mode}
                isOpen={modeDropdownOpen}
                onSelect={(m) => { props.onModeChange(m); setModeDropdownOpen(false); }}
                onClose={() => setModeDropdownOpen(false)}
                containerRef={modeMenuRef}
              />
            </Box>
          </HStack>

          <HStack gap={2}>
            <Box
              position="relative"
              display="flex"
              alignItems="center"
              justifyContent="center"
              onMouseEnter={props.onContextTooltipEnter}
              onMouseLeave={props.onContextTooltipLeave}
            >
              <AnimatePresence>
                {props.contextTooltipVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 8px)',
                      right: 0,
                      width: '240px',
                      zIndex: 9999,
                      pointerEvents: 'none',
                    }}
                  >
                    <Box
                      bg="gray.800"
                      border="1px solid"
                      borderColor="gray.700"
                      borderRadius="lg"
                      px={3}
                      py={2}
                      shadow="lg"
                    >
                      <Text fontSize="xs" color="gray.300" fontWeight="medium" wordBreak="break-word">
                        {props.usedTokensLabel}
                      </Text>
                      <Text fontSize="xs" color={props.contextColor} mt={1}>
                        {props.compressionLabel}
                      </Text>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
              <ContextRing percent={props.contextPercent} accentColor={ACCENT} />
            </Box>

            <IconButton
              aria-label={props.isStopHighlighted ? 'Stop' : 'Send'}
              icon={(
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={props.isStopHighlighted ? 'stop' : 'send'}
                    initial={{ opacity: 0, scale: 0.72, rotate: props.isStopHighlighted ? -18 : 18 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.72, rotate: props.isStopHighlighted ? 18 : -18 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    style={{ display: 'flex' }}
                  >
                    {props.isStopHighlighted ? <Square size={13} fill="currentColor" /> : <ArrowUp size={16} />}
                  </motion.span>
                </AnimatePresence>
              )}
              bg={props.isStopHighlighted ? 'rgba(239,68,68,0.92)' : ACCENT}
              color="white"
              _hover={{ bg: props.isStopHighlighted ? 'rgba(220,38,38,0.98)' : ACCENT_HOVER }}
              isDisabled={props.isStopHighlighted ? false : !props.canSubmit}
              onClick={props.isStopHighlighted ? props.onStop : props.onSubmit}
              borderRadius="full"
              w="36px"
              h="36px"
              minW="36px"
              transition="background-color 0.18s ease, transform 0.18s ease"
            />
          </HStack>
        </HStack>
      </Box>
    </Box>
  );
}
