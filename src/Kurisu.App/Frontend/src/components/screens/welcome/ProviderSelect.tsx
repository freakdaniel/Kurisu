import { Box, HStack, Text, Input } from '@chakra-ui/react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

export default function ProviderSelect({ presets, value, onChange, isDisabled }: ProviderSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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

  const triggerLabel = selected?.name ?? 'Select provider';

  return (
    <Box ref={containerRef} position="relative" w="100%">
      <Box
        as="button"
        type="button"
        w="100%"
        onClick={() => {
          if (isDisabled) return;
          if (!open) setActiveIndex(0);
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
        transition="border-color 0.15s ease, box-shadow 0.15s ease"
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
            style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
          />
        </HStack>
      </Box>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 50,
            }}
          >
            <Box
              bg="gray.800"
              border="1px solid"
              borderColor="gray.700"
              borderRadius="xl"
              boxShadow="0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)"
              overflow="hidden"
            >
              <Box px={3} py={2}>
                <HStack spacing={2}>
                  <Search size={14} color="#a1a1aa" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search providers..."
                    variant="unstyled"
                    fontSize="sm"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                    h="20px"
                  />
                </HStack>
              </Box>
              <Box maxH="280px" overflowY="auto" py={1}>
                {filtered.length === 0 ? (
                  <Box px={3} py={6} textAlign="center">
                    <Text fontSize="sm" color="gray.500">No providers match &quot;{query}&quot;</Text>
                  </Box>
                ) : (
                  filtered.map((p, idx) => {
                    const isActive = idx === safeActiveIndex;
                    const isSelected = p.id === value;
                    return (
                      <Box
                        key={p.id}
                        as="button"
                        type="button"
                        onClick={() => {
                          onChange(p.id);
                          setOpen(false);
                          setQuery('');
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                        w="100%"
                        px={3}
                        py={2}
                        bg={isActive ? 'gray.700' : 'transparent'}
                        transition="background 0.1s"
                        textAlign="left"
                        aria-selected={isSelected}
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
                          <Text fontSize="sm" fontWeight="medium" color="white" flex={1} noOfLines={1}>
                            {p.name}
                          </Text>
                          {isSelected && <Check size={14} color="#615CED" />}
                        </HStack>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}