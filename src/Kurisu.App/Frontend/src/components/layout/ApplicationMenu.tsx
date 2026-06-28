import { useEffect, useState, type RefObject } from 'react';
import { Box, Button, Portal, Text, VStack } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaColors } from '@/lib/themeTokens';

export interface ApplicationMenuAction {
  /** Stable key for React reconciliation. */
  key: string;
  /** i18n key for the visible label. */
  labelKey: string;
  /** Iconic glyph rendered on the leading edge. */
  iconSource: string;
  /** Click handler invoked after the menu closes. */
  onSelect: () => void;
  /** Renders the entry with the destructive accent. */
  destructive?: boolean;
}

export interface ApplicationMenuProps {
  /** Whether the popover is currently open. */
  isOpen: boolean;
  /** Ref to the trigger element (e.g. the titlebar menu button). Outside clicks
   *  that hit the trigger are ignored so the button can re-open the menu on a
   *  second tap. */
  triggerRef: RefObject<HTMLElement | null>;
  /** Closes the popover. */
  onClose: () => void;
  /** Sections of menu items rendered top-to-bottom. A `null` entry inside an
   *  array renders a thin separator. */
  sections: (ApplicationMenuAction[] | null)[];
}

const POPOVER_VERTICAL_OFFSET = 6;
const POPOVER_MIN_WIDTH = 220;
const POPOVER_EDGE_PADDING = 8;

/**
 * Popover menu anchored to the titlebar's hamburger button. Replaces the
 * sidebar's "Settings" / "Skills" entry points and exposes the About dialog.
 *
 * Renders inside a Chakra Portal so it escapes the titlebar's
 * `WebkitAppRegion: 'drag'` ancestor (which swallows pointer events) and any
 * stacking-context boundaries introduced by the surrounding layout. Position
 * is derived from the trigger's bounding rect so the popover tracks window
 * resizes and never clips off-screen.
 */
export function ApplicationMenu({
  isOpen,
  triggerRef,
  onClose,
  sections,
}: ApplicationMenuProps) {
  const { t } = useTranslation();
  const [position, setPosition] = useState<{ left: number; top: number; minWidth: number } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const recompute = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const desiredLeft = rect.left;
      const clampedLeft = Math.max(
        POPOVER_EDGE_PADDING,
        Math.min(desiredLeft, window.innerWidth - POPOVER_MIN_WIDTH - POPOVER_EDGE_PADDING),
      );
      setPosition({
        left: clampedLeft,
        top: rect.bottom + POPOVER_VERTICAL_OFFSET,
        minWidth: Math.max(POPOVER_MIN_WIDTH, rect.width),
      });
    };

    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, triggerRef]);

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && position && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: position.left,
              top: position.top,
              minWidth: position.minWidth,
              zIndex: 4000,
              transformOrigin: 'top left',
            }}
          >
            <Box
              p={1}
              bg={adwaitaColors.popoverBg}
              border="1px solid"
              borderColor={adwaitaColors.borderStrong}
              borderRadius="14px"
              shadow="xl"
              role="menu"
            >
              <VStack spacing={0} align="stretch">
                {sections.map((section, sectionIdx) => (
                  <ApplicationMenuSection
                    key={`section-${sectionIdx}`}
                    actions={section}
                    onClose={onClose}
                    renderLabel={t}
                  />
                ))}
              </VStack>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

interface ApplicationMenuSectionProps {
  actions: ApplicationMenuAction[] | null;
  onClose: () => void;
  renderLabel: (key: string) => string;
}

function ApplicationMenuSection({ actions, onClose, renderLabel }: ApplicationMenuSectionProps) {
  if (actions === null) {
    return (
      <Box
        role="separator"
        my={1}
        mx={1}
        h="1px"
        bg={adwaitaColors.border}
      />
    );
  }

  return (
    <VStack spacing={0} align="stretch">
      {actions.map((action) => (
        <Button
          key={action.key}
          variant="ghost"
          role="menuitem"
          w="full"
          h="34px"
          px={2.5}
          justifyContent="flex-start"
          alignItems="center"
          gap={2.5}
          borderRadius="8px"
          fontSize="13px"
          fontWeight="normal"
          color={action.destructive ? adwaitaColors.destructive : adwaitaColors.fg}
          _hover={{
            bg: action.destructive ? 'rgba(192,28,40,0.14)' : adwaitaColors.cardBg,
            color: action.destructive ? '#fca5a5' : adwaitaColors.fg,
          }}
          leftIcon={<AdwaitaIcon source={action.iconSource} size={14} />}
          onClick={() => {
            onClose();
            action.onSelect();
          }}
        >
          <Text as="span">{renderLabel(action.labelKey)}</Text>
        </Button>
      ))}
    </VStack>
  );
}