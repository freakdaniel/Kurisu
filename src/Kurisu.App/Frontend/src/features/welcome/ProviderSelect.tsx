import { Box, HStack, Text, Input } from '@chakra-ui/react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ProviderIcon } from './ProviderIcons';
import { providerAccent } from './providerTheme';
import type { ProviderPresetSnapshot } from '@/types/ipc.generated';

interface ProviderSelectProps {
  presets: ProviderPresetSnapshot[];
  value: string;
  onChange: (presetId: string) => void;
  isDisabled?: boolean;
}

function sortPresets(presets: ProviderPresetSnapshot[]): ProviderPresetSnapshot[] {
  return [...presets].sort((a, b) => b.popularity - a.popularity);
}

const dropdownTransition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1] as const,
};

const itemTransition = {
  duration: 0.14,
  ease: [0.22, 1, 0.36, 1] as const,
};

const LIST_MAX_HEIGHT = 280;

export default function ProviderSelect({ presets, value, onChange, isDisabled }: ProviderSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownRect, setDropdownRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const sorted = useMemo(() => sortPresets(presets), [presets]);
  const selected = useMemo(() => presets.find((p) => p.id === value) ?? null, [presets, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [sorted, query]);

  const safeActiveIndex = filtered.length === 0 ? 0 : Math.min(activeIndex, filtered.length - 1);

  const measureTrigger = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDropdownRect({
      left: rect.left,
      top: rect.bottom + 6,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measureTrigger();
  }, [open, measureTrigger]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => measureTrigger();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, measureTrigger]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(`[data-index="${safeActiveIndex}"]`);
    if (node) {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [safeActiveIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const next = filtered[safeActiveIndex];
      if (next) {
        onChange(next.id);
        setOpen(false);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const triggerLabel = selected?.name ?? t('welcome.providerLabel');

  const isHoveredOrActive = (id: string) =>
    hoveredId === id || (!hoveredId && id === filtered[safeActiveIndex]?.id);

  const isHighlighted = (id: string) => id === value || isHoveredOrActive(id);

  const shouldShowAccentBar = (id: string, isSelected: boolean) =>
    !isSelected && isHoveredOrActive(id);

  return (
    <Box ref={containerRef} position="relative" w="100%">
      <Box
        ref={triggerRef}
        as="button"
        type="button"
        w="100%"
        onClick={() => {
          if (isDisabled) return;
          if (!open) {
            setActiveIndex(0);
            setHoveredId(null);
            setQuery('');
          }
          setOpen((o) => !o);
        }}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        bg="gray.800"
        border="1px solid"
        borderColor={open ? 'brand.500' : 'gray.700'}
        borderRadius="lg"
        px={3}
        py={2.5}
        textAlign="left"
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        opacity={isDisabled ? 0.6 : 1}
        transition="border-color 0.18s ease, box-shadow 0.18s ease"
        _hover={!isDisabled ? { borderColor: 'gray.600' } : undefined}
        _focus={{ outline: 'none', borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <HStack spacing={3} align="center">
          {selected ? (
            <Box
              w="36px"
              h="36px"
              borderRadius="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color={providerAccent[selected.id] ?? 'gray.300'}
              flexShrink={0}
            >
              <ProviderIcon id={selected.id} width={24} height={24} />
            </Box>
          ) : (
            <Box w="36px" h="36px" flexShrink={0} />
          )}
          <Text fontSize="sm" fontWeight="medium" color="white" flex={1} noOfLines={1}>
            {triggerLabel}
          </Text>
          <ChevronDown
            size={16}
            color="#a1a1aa"
            style={{ transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
          />
        </HStack>
      </Box>

      {open && dropdownRect && createPortal(
        <AnimatePresence>
          <motion.div
            key="provider-dropdown"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={dropdownTransition}
            style={{
              position: 'fixed',
              left: dropdownRect.left,
              top: dropdownRect.top,
              width: dropdownRect.width,
              zIndex: 1000,
              transformOrigin: 'top center',
            }}
          >
            <Box
              bg="#24242b"
              border="1px solid"
              borderColor="whiteAlpha.100"
              borderRadius="xl"
              boxShadow="0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)"
              overflow="hidden"
              style={{ willChange: 'transform' }}
            >
              <Box px={3} py={2}>
                <HStack spacing={2}>
                  <Search size={14} color="#a1a1aa" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('welcome.providerSearchPlaceholder')}
                    variant="unstyled"
                    fontSize="sm"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                    h="20px"
                  />
                </HStack>
              </Box>
              <Box
                ref={listRef}
                maxH={`${LIST_MAX_HEIGHT}px`}
                overflowY="auto"
                py={1}
                pr="6px"
                sx={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'transparent transparent',
                  '&:hover': { scrollbarColor: '#3f3f46 transparent' },
                  '&::-webkit-scrollbar': { width: '4px', height: '4px' },
                  '&::-webkit-scrollbar-track': { background: 'transparent' },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'transparent',
                    borderRadius: '999px',
                    minHeight: '24px',
                    transition: 'background 0.2s ease',
                  },
                  '&:hover::-webkit-scrollbar-thumb': { background: '#3f3f46' },
                  '&::-webkit-scrollbar-thumb:hover': { background: '#52525b' },
                }}
              >
                {filtered.length === 0 ? (
                  <Box px={3} py={6} textAlign="center">
                    <Text fontSize="sm" color="gray.500">
                      {t('welcome.providerNoMatch', { query })}
                    </Text>
                  </Box>
                ) : (
                  filtered.map((p, idx) => {
                    const isSelected = p.id === value;
                    const highlighted = isHighlighted(p.id);
                    const showAccentBar = shouldShowAccentBar(p.id, isSelected);
                    return (
                      <Box
                        as="button"
                        key={p.id}
                        type="button"
                        data-index={idx}
                        onClick={() => {
                          onChange(p.id);
                          setOpen(false);
                          setQuery('');
                        }}
                        onMouseEnter={() => {
                          setActiveIndex(idx);
                          setHoveredId(p.id);
                        }}
                        onMouseLeave={() => setHoveredId((id) => (id === p.id ? null : id))}
                        w="100%"
                        px={3}
                        py={2}
                        bg="transparent"
                        textAlign="left"
                        aria-selected={isSelected}
                        position="relative"
                        opacity={highlighted ? 1 : 0.55}
                        filter={highlighted ? 'none' : 'saturate(0.85)'}
                        transition={`opacity ${itemTransition.duration}s ${itemTransition.ease}, filter ${itemTransition.duration}s ${itemTransition.ease}`}
                        _hover={{ opacity: 1, filter: 'none' }}
                        _focusVisible={{ outline: 'none', bg: 'whiteAlpha.50', opacity: 1, filter: 'none' }}
                        style={{ willChange: 'opacity' }}
                      >
                        <HStack spacing={3} align="center">
                          <Box
                            w="32px"
                            h="32px"
                            borderRadius="md"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            color={providerAccent[p.id] ?? 'gray.300'}
                            flexShrink={0}
                          >
                            <ProviderIcon id={p.id} width={22} height={22} />
                          </Box>
                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                            color={highlighted ? 'white' : 'gray.400'}
                            flex={1}
                            noOfLines={1}
                            transition="color 0.14s ease"
                          >
                            {p.name}
                          </Text>
                          {isSelected && (
                            <Box display="inline-flex">
                              <Check size={14} color="#615CED" />
                            </Box>
                          )}
                        </HStack>
                        {showAccentBar && (
                          <Box
                            position="absolute"
                            left={0}
                            top="22%"
                            bottom="22%"
                            w="2px"
                            bg="brand.500"
                            borderRadius="full"
                          />
                        )}
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </Box>
  );
}