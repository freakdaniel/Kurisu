import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ProviderSelect from '../ProviderSelect';
import type { ProviderPresetSnapshot } from '@/types/ipc.generated';
import type { ApiKeyMode } from '../welcomeState';

interface Step2ConfigureProps {
  presets: ProviderPresetSnapshot[];
  presetId: string;
  onPresetChange: (id: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  apiKeyMode: ApiKeyMode;
  baseUrl: string;
  onBaseUrlChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
  modelError: string;
  isSubmitting: boolean;
  isValidating: boolean;
}

const collapseTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function Step2Configure({
  presets,
  presetId,
  onPresetChange,
  apiKey,
  onApiKeyChange,
  apiKeyMode,
  baseUrl,
  onBaseUrlChange,
  model,
  onModelChange,
  modelError,
  isSubmitting,
  isValidating,
}: Step2ConfigureProps) {
  const { t } = useTranslation();
  const isCustom = presetId === 'custom';
  const inputRef = useRef<HTMLInputElement | null>(null);

  const inputType =
    isCustom || apiKeyMode === 'editing' || apiKeyMode === 'confirming' || isValidating
      ? 'text'
      : 'password';
  const inputIsDisabled = isSubmitting;

  useEffect(() => {
    if (apiKeyMode === 'editing' && !isCustom && !isValidating) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 16);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [apiKeyMode, isCustom, isValidating]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && apiKeyMode === 'editing') {
      e.preventDefault();
      onApiKeyChange('');
    }
  };

  return (
    <VStack spacing={5} align="stretch">
      <FormControl>
        <FormLabel color="gray.300" fontSize="sm" mb={1.5}>
          {t('welcome.providerLabel')}
        </FormLabel>
        <ProviderSelect
          presets={presets}
          value={presetId}
          onChange={onPresetChange}
          isDisabled={isSubmitting}
        />
      </FormControl>

      <FormControl>
        <FormLabel color="gray.300" fontSize="sm" mb={1.5}>
          {t('welcome.apiKeyLabel')}
        </FormLabel>
        <Box position="relative">
          <Input
            ref={inputRef}
            type={inputType}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('auth.apiKeyPlaceholder')}
            isDisabled={inputIsDisabled}
            bg="gray.800"
            border="1px solid"
            borderColor={apiKeyMode === 'editing' || isValidating ? 'brand.500' : 'gray.700'}
            color="white"
            fontFamily={apiKeyMode === 'confirmed' ? 'mono' : undefined}
            _placeholder={{ color: 'gray.500' }}
            _hover={{ borderColor: 'gray.600' }}
            _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
            _focusVisible={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
            transition="border-color 0.18s ease, box-shadow 0.18s ease"
            h="40px"
          />
        </Box>
      </FormControl>

      <AnimatePresence initial={false}>
        {isCustom && (
          <motion.div
            key="custom-fields"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={collapseTransition}
            style={{ overflow: 'hidden' }}
          >
            <VStack spacing={5} align="stretch">
              <FormControl pb="3px">
                <FormLabel color="gray.300" fontSize="sm" mb={1.5}>
                  {t('welcome.baseUrlLabel')}
                </FormLabel>
                <Input
                  value={baseUrl}
                  onChange={(e) => onBaseUrlChange(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                  _hover={{ borderColor: 'gray.600' }}
                  _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                  isDisabled={isSubmitting}
                  h="40px"
                />
              </FormControl>

              <FormControl pb="3px">
                <FormLabel color="gray.300" fontSize="sm" mb={1.5}>
                  {t('welcome.modelLabel')}
                </FormLabel>
                <Input
                  value={model}
                  onChange={(e) => onModelChange(e.target.value)}
                  placeholder={t('welcome.typeModelName')}
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                  _hover={{ borderColor: 'gray.600' }}
                  _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                  isDisabled={isSubmitting}
                  h="40px"
                />
              </FormControl>
            </VStack>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {!isCustom && modelError && (
          <motion.div
            key="model-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={collapseTransition}
            style={{ overflow: 'hidden' }}
          >
            <Text fontSize="xs" color="orange.300" pt={1}>
              {modelError}
            </Text>
          </motion.div>
        )}
      </AnimatePresence>
    </VStack>
  );
}