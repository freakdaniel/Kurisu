import { useEffect, type RefObject } from 'react';
 
import { Box, Button, Center, HStack, Input, Text, VStack, Portal } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { normalizePathKey } from '@/lib/paths';
import type { ProjectOption } from '@/features/chat/types';
import {
  getAddProjectLabel,
  getNoProjectsLabel,
  getProjectPickerSearchPlaceholder,
} from '@/features/chat/composer/composerLabels';
import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaIconSources } from '@/components/ui/adwaitaIconSources';
import { adwaitaColors } from '@/lib/themeTokens';

export interface ProjectPickerPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export interface ProjectPickerProps {
  isOpen: boolean;
  position: ProjectPickerPosition;
  query: string;
  selectedProjectPath: string;
  selectedProjectMode: 'project' | 'no-project';
  filteredProjectOptions: ProjectOption[];
  projectListHeight: number;
  containerRef: RefObject<HTMLDivElement | null>;
  onQueryChange: (value: string) => void;
  onSelectProject: (project: ProjectOption) => void;
  onAddProject: () => void;
  onClose: () => void;
}

export function ProjectPicker({
  isOpen,
  position,
  query,
  selectedProjectPath,
  selectedProjectMode,
  filteredProjectOptions,
  projectListHeight,
  containerRef,
  onQueryChange,
  onSelectProject,
  onAddProject,
  onClose,
}: ProjectPickerProps) {
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
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              zIndex: 2000,
            }}
          >
            <Box
              ref={containerRef}
              display="flex"
              flexDirection="column"
              maxH={`${position.maxHeight}px`}
              bg={adwaitaColors.popoverBg}
              border="1px solid"
              borderColor={adwaitaColors.borderStrong}
              borderRadius="2xl"
              shadow="2xl"
              overflow="hidden"
            >
              <HStack px={3} py={1.5} spacing={3} minH="38px">
                <AdwaitaIcon source={adwaitaIconSources.search} size={13} />
                <Input
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder={getProjectPickerSearchPlaceholder(t)}
                  bg="transparent"
                  border="none"
                  color={adwaitaColors.fg}
                  fontSize="sm"
                  fontWeight="normal"
                  h="20px"
                  minH="20px"
                  p={0}
                  _placeholder={{ color: adwaitaColors.fgMuted }}
                  _focusVisible={{ boxShadow: 'none' }}
                />
              </HStack>

              <Box borderTop="1px solid" borderColor={adwaitaColors.border} />

              <Box
                h={`${projectListHeight}px`}
                overflowY="auto"
                px={2}
                py={2}
                sx={{
                  '&::-webkit-scrollbar': { width: '8px' },
                  '&::-webkit-scrollbar-track': { background: 'rgba(255,255,255,0.04)' },
                  '&::-webkit-scrollbar-thumb': { background: '#5b5b67', borderRadius: '999px' },
                  '&::-webkit-scrollbar-thumb:hover': { background: '#72727f' },
                }}
              >
                <VStack spacing={1} align="stretch">
                  {filteredProjectOptions.length > 0 ? (
                    filteredProjectOptions.map((project) => (
                      <Button
                        key={project.path}
                        variant="ghost"
                        justifyContent="space-between"
                        h="40px"
                        px={3}
                        borderRadius="xl"
                        color={adwaitaColors.fg}
                        fontWeight="normal"
                        _hover={{ bg: adwaitaColors.cardBg }}
                        onClick={() => onSelectProject(project)}
                      >
                        <HStack spacing={3} minW={0}>
                          <AdwaitaIcon source={adwaitaIconSources.folder} size={14} />
                          <Text fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                            {project.name}
                          </Text>
                        </HStack>
                        {selectedProjectMode === 'project' && normalizePathKey(project.path) === normalizePathKey(selectedProjectPath) && (
                          <AdwaitaIcon source={adwaitaIconSources.bookmark} size={14} />
                        )}
                      </Button>
                    ))
                  ) : (
                    <Center py={4}>
                      <Text fontSize="sm" color={adwaitaColors.fgMuted}>
                        {getNoProjectsLabel(t)}
                      </Text>
                    </Center>
                  )}
                </VStack>
              </Box>

              <Box borderTop="1px solid" borderColor={adwaitaColors.border} />

              <VStack spacing={1} align="stretch" px={2} py={2}>
                <Button
                  variant="ghost"
                  justifyContent="space-between"
                  h="40px"
                  px={3}
                  borderRadius="xl"
                  color={adwaitaColors.fg}
                  fontWeight="normal"
                  _hover={{ bg: adwaitaColors.cardBg }}
                  onClick={onAddProject}
                >
                  <HStack spacing={3} minW={0}>
                    <AdwaitaIcon source={adwaitaIconSources.tabNew} size={14} />
                    <Text fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                      {getAddProjectLabel(t)}
                    </Text>
                  </HStack>
                  <Box boxSize="16px" flexShrink={0} />
                </Button>
              </VStack>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

