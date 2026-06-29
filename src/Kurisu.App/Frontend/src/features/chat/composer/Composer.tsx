import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
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
const COMPOSER_LINE_HEIGHT_PX = 22;
const COMPOSER_MIN_LINES = 3;
const COMPOSER_MAX_LINES = 5;
const COMPOSER_MIN_HEIGHT = COMPOSER_LINE_HEIGHT_PX * COMPOSER_MIN_LINES;
const COMPOSER_MAX_HEIGHT = COMPOSER_LINE_HEIGHT_PX * COMPOSER_MAX_LINES;

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
  /** Title of the token-usage popover (e.g. "Token usage" / "Использование токенов"). */
  contextTitleLabel: string;
  /** The "used / total" count line that sits under the title. */
  usedTokensLabel: string;
  compressionLabel: string;
  isStopHighlighted: boolean;
  contextColor: string;
  /** Notified when the textarea gains or loses focus (used to pause the
   *  rotating placeholder when the user is actively typing). */
  onFocusChange?: (focused: boolean) => void;
  placeholder: string;
  /** Optional animated placeholder that fades in/out (e.g. rotating prompts). */
  rotatingPlaceholder?: string | null;
}

export function Composer(props: ComposerProps) {
  const { t } = useTranslation();
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [isAtMax, setIsAtMax] = useState(false);
  // Tracks focus locally so the placeholder can fade independently of the
  // rotating-prompt lifecycle owned by the parent.
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  const recomputeHeight = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    const element = node;
    // Auto-grow pattern:
    //   1) set height = auto so scrollHeight reflects the full content
    //   2) read scrollHeight, clamp between min/max
    //   3) set height = clamped
    // Both DOM mutations happen inside one synchronous task, so the browser
    // never paints the intermediate `auto` value. The CSS `transition: height`
    // rule then smoothly animates from the previous height to the new one.
    element.style.height = 'auto';
    const desired = element.scrollHeight;
    const clamped = Math.max(COMPOSER_MIN_HEIGHT, Math.min(desired, COMPOSER_MAX_HEIGHT));
    element.style.height = `${clamped}px`;
    element.style.overflowY = desired > COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden';
    setIsAtMax(desired > COMPOSER_MAX_HEIGHT);
  }, []);

  useLayoutEffect(() => {
    recomputeHeight();
  }, [props.prompt, recomputeHeight]);

  useEffect(() => {
    const handler = () => recomputeHeight();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [recomputeHeight]);

  // Always render our own placeholder overlay so we can fade it in and out
  // smoothly. The rotating variant takes precedence over the static one
  // when both are supplied. We never set the native textarea placeholder
  // – the overlay is the only thing the user sees.
  const overlayText = props.rotatingPlaceholder ?? props.placeholder ?? '';
  const shouldRenderOverlay = !!overlayText && !props.prompt;
  // Fade out as soon as the textarea gains focus or contains text, and
  // fade back in once both are cleared.
  const overlayOpacity = shouldRenderOverlay && !isFocused ? 1 : 0;

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
        <Box px={5} pt={4} position="relative">
          <ChakraTextarea
            ref={textareaRef}
            value={props.prompt}
            onChange={(e) => props.onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              props.onFocusChange?.(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              props.onFocusChange?.(false);
            }}
            placeholder=""
            rows={1}
            minH={`${COMPOSER_MIN_HEIGHT}px`}
            maxH={`${COMPOSER_MAX_HEIGHT}px`}
            resize="none"
            overflow="hidden"
            border="none"
            bg="transparent"
            p={0}
            fontSize="sm"
            lineHeight={`${COMPOSER_LINE_HEIGHT_PX}px`}
            color={adwaitaColors.fg}
            _placeholder={{ color: adwaitaColors.fgMuted }}
            _focusVisible={{ boxShadow: 'none' }}
            sx={{
              transition: 'height 0.18s ease-out',
              '&::-webkit-scrollbar': isAtMax ? { width: '6px' } : { display: 'none' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { background: '#5b5b67', borderRadius: '3px' },
            }}
          />
          {shouldRenderOverlay && (
            <motion.div
              // Align with the textarea's first text baseline. The parent
              // applies `pt={4}` (16px) above the textarea so the controls
              // row has breathing room; the overlay sits at the same offset
              // so swapping between the rotating and native placeholder
              // does not cause a vertical jump.
              animate={{ opacity: overlayOpacity }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: `${4 * 4}px`,
                left: `${5 * 4}px`,
                right: `${5 * 4}px`,
                pointerEvents: 'none',
                color: adwaitaColors.fgMuted,
                fontSize: 'sm',
                lineHeight: `${COMPOSER_LINE_HEIGHT_PX}px`,
                // Suppress the enter animation on the very first render so
                // the welcome state doesn't flash in on mount.
                opacity: 0,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={overlayText}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  style={{ display: 'inline-block' }}
                >
                  {overlayText}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          )}
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
                      borderRadius="24px"
                      px={5}
                      py={2}
                      shadow="lg"
                      overflow="hidden"
                    >
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        color={adwaitaColors.fg}
                        noOfLines={1}
                      >
                        {props.contextTitleLabel}
                      </Text>
                      <Text
                        fontSize="xs"
                        color={adwaitaColors.fg}
                        fontWeight="medium"
                        mt="2px"
                        wordBreak="break-word"
                      >
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
