import { forwardRef, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import {
  Box,
  Button,
  HStack,
  IconButton,
  Textarea as ChakraTextarea,
  Text,
} from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AGENT_MODES, type AgentMode } from '@/types/ui';
import { ModeMenu, MODE_ICON_BY_VALUE } from '@/features/chat/composer/ModeMenu';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import { adwaitaColors } from '@/lib/themeTokens';

const ACCENT = adwaitaColors.accent;
const ACCENT_HOVER = adwaitaColors.accentHover;

const ButtonUnstyled = forwardRef<HTMLButtonElement, { onClick: () => void; children: React.ReactNode }>(
  function ButtonUnstyled({ onClick, children }, ref) {
    return (
      <Button
        ref={ref}
        variant="unstyled"
        h="34px"
        px={0}
        color={adwaitaColors.fgSecondary}
        minW={0}
        transition="color 0.2s ease"
        _hover={{ color: adwaitaColors.fg }}
        _active={{ color: adwaitaColors.fg }}
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
      <circle cx="14" cy="14" r="10" fill="none" stroke={adwaitaColors.fgMuted} strokeWidth="2.5" />
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
        borderRadius="24px"
        overflow="visible"
        border="1px solid"
        borderColor={adwaitaColors.border}
        bg={adwaitaColors.composerBg}
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
            color={adwaitaColors.fg}
            _placeholder={{ color: adwaitaColors.fgMuted }}
            _focusVisible={{ boxShadow: 'none' }}
            sx={{ '&::-webkit-scrollbar': { display: 'none' } }}
          />
        </Box>

        <HStack justify="space-between" px={4} py={3} gap={3}>
          <HStack gap={3}>
            <IconButton
              aria-label={t('chat.message.attachFile')}
              icon={<AdwaitaIcon source={adwaitaIconSources.tabNew} size={15} />}
              variant="ghost"
              size="sm"
              w="30px"
              h="30px"
              minW="30px"
              borderRadius="8px"
              color={adwaitaColors.fgSecondary}
              bg="transparent"
              _hover={{ bg: 'rgba(255,255,255,0.06)', color: adwaitaColors.fg }}
              _active={{ bg: 'rgba(255,255,255,0.08)', color: adwaitaColors.fg }}
            />
            <Box position="relative">
              <ButtonUnstyled
                ref={modeBtnRef}
                onClick={() => setModeDropdownOpen((current) => !current)}
              >
                <Box h="32px" display="flex" alignItems="center" overflow="hidden">
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
                      <AdwaitaIcon source={MODE_ICON_BY_VALUE[props.mode]} size={14} />
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
                      bg={adwaitaColors.popoverBg}
                      border="1px solid"
                      borderColor={adwaitaColors.borderStrong}
                      borderRadius="lg"
                      px={3}
                      py={2}
                      shadow="lg"
                    >
                      <Text fontSize="xs" color={adwaitaColors.fg} fontWeight="medium" wordBreak="break-word">
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
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <AdwaitaIcon
                      source={props.isStopHighlighted ? adwaitaIconSources.stop : adwaitaIconSources.send}
                      size={props.isStopHighlighted ? 13 : 15}
                    />
                  </motion.span>
                </AnimatePresence>
              )}
              bg={props.isStopHighlighted ? adwaitaColors.destructive : ACCENT}
              color="white"
              _hover={{ bg: props.isStopHighlighted ? adwaitaColors.destructiveHover : ACCENT_HOVER }}
              isDisabled={props.isStopHighlighted ? false : !props.canSubmit}
              onClick={props.isStopHighlighted ? props.onStop : props.onSubmit}
              borderRadius="full"
              w="34px"
              h="34px"
              minW="34px"
              transition="background-color 0.18s ease, transform 0.18s ease"
            />
          </HStack>
        </HStack>
      </Box>
    </Box>
  );
}
