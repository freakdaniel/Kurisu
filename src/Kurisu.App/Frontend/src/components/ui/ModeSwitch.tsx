import { HStack, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { adwaitaColors } from '@/lib/themeTokens';

export interface ModeSwitchOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  ariaLabel?: string;
}

export interface ModeSwitchProps<T extends string> {
  options: ModeSwitchOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  size?: 'sm' | 'md';
  /**
   * When true the control expands to fill its container width and grows
   * the segments to match the surrounding primary actions (used by the
   * sidebar so the switch visually matches the "New chat" button).
   */
  fullWidth?: boolean;
}

/**
 * Libadwaita-style segmented control (similar to GNOME Settings / Claude's
 * Chat / Cowork / Code switch). The active segment is highlighted with a
 * raised card background and the underlying track is rendered as a single
 * rounded surface so the control reads as one piece of hardware.
 */
export function ModeSwitch<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  fullWidth = false,
}: ModeSwitchProps<T>) {
  const baseId = useId();
  const containerPadding = size === 'sm' ? '3px' : fullWidth ? '4px' : '4px';
  const segmentPadding = size === 'sm' ? '4px 10px' : fullWidth ? '8px 14px' : '6px 14px';
  const fontSize = size === 'sm' ? '11px' : fullWidth ? '13px' : '12.5px';
  const minHeight = size === 'sm' ? '24px' : fullWidth ? '34px' : '30px';

  return (
    <HStack
      role="tablist"
      aria-label={ariaLabel}
      spacing={0}
      bg={adwaitaColors.headerbarBg}
      borderRadius="999px"
      padding={containerPadding}
      border="1px solid"
      borderColor={adwaitaColors.border}
      width={fullWidth ? '100%' : 'fit-content'}
      sx={{ position: 'relative' }}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <motion.button
            key={option.value}
            type="button"
            role="tab"
            id={`${baseId}-${option.value}`}
            aria-selected={isActive}
            aria-controls={`${baseId}-${option.value}-panel`}
            aria-label={option.ariaLabel ?? option.label}
            onClick={() => {
              if (!isActive) onChange(option.value);
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: segmentPadding,
              minHeight,
              flex: fullWidth ? 1 : '0 1 auto',
              borderRadius: '999px',
              border: 'none',
              cursor: isActive ? 'default' : 'pointer',
              background: 'transparent',
              color: isActive ? adwaitaColors.fg : adwaitaColors.fgSecondary,
              font: 'inherit',
              fontSize,
              fontWeight: isActive ? 600 : 500,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              transition: 'color 0.18s ease',
            }}
          >
            {isActive && (
              <motion.span
                layoutId={`mode-switch-thumb-${baseId}`}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '999px',
                  background: adwaitaColors.cardBg,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.04)',
                  zIndex: 0,
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {option.icon}
              <Text as="span" fontSize={fontSize} fontWeight="inherit" lineHeight="1">
                {option.label}
              </Text>
            </span>
          </motion.button>
        );
      })}
    </HStack>
  );
}