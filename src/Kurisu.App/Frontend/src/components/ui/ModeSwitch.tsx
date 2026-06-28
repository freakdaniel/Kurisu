import { HStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useId } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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
  const containerPadding = size === 'sm' ? '3px' : '3px';
  const segmentPadding = size === 'sm' ? '4px 10px' : fullWidth ? '6px 12px' : '6px 12px';
  const fontSize = size === 'sm' ? '11px' : '13px';
  const minHeight = size === 'sm' ? '24px' : '30px';
  const segmentRadius = '999px';
  const segmentStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: segmentPadding,
    minHeight,
    flex: fullWidth ? 1 : '0 1 auto',
    borderRadius: segmentRadius,
    border: 'none',
    cursor: 'pointer',
    background: 'transparent',
    color: adwaitaColors.fgSecondary,
    font: 'inherit',
    fontSize,
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    transition: 'color 0.18s ease',
  };
  const contentStyle: CSSProperties = {
    position: 'relative',
    zIndex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    lineHeight: 1,
  };

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
              ...segmentStyle,
              cursor: isActive ? 'default' : 'pointer',
              color: isActive ? adwaitaColors.fg : adwaitaColors.fgSecondary,
              fontWeight: isActive ? 600 : 500,
            }}
          >
            {isActive && (
              <motion.span
                layoutId={`mode-switch-thumb-${baseId}`}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: segmentRadius,
                  background: adwaitaColors.cardBg,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.04)',
                  zIndex: 0,
                }}
              />
            )}
            <span style={contentStyle}>
              {option.icon}
              <span style={{ lineHeight: 1 }}>{option.label}</span>
            </span>
          </motion.button>
        );
      })}
    </HStack>
  );
}