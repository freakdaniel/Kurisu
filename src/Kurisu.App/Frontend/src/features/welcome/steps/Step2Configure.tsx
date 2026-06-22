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
import { Check, Loader2, Pencil, X } from 'lucide-react';
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
  lastConfirmedKey: string;
  onConfirmApiKey: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  baseUrl: string;
  onBaseUrlChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
  modelError: string;
  isSubmitting: boolean;
}

const collapseTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

const buttonTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

function ApiKeyActionButton({
  mode,
  showButton,
  onConfirm,
  onStartEdit,
}: {
  mode: ApiKeyMode;
  showButton: boolean;
  onConfirm: () => void;
  onStartEdit: () => void;
}) {
  const { t } = useTranslation();

  const variant = mode === 'confirming' ? 'fetching' : mode === 'confirmed' ? 'edit' : 'confirm';

  const content = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={variant}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14 }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        {variant === 'fetching' && (
          <>
            <Loader2 size={12} className="animate-spin" />
            <span>{t('welcome.apiKeyFetching')}</span>
          </>
        )}
        {variant === 'edit' && (
          <>
            <Pencil size={12} />
            <span>{t('welcome.apiKeyEdit')}</span>
          </>
        )}
        {variant === 'confirm' && (
          <>
            <Check size={12} />
            <span>{t('welcome.apiKeyConfirm')}</span>
          </>
        )}
      </motion.span>
    </AnimatePresence>
  );

  return (
    <AnimatePresence initial={false}>
      {showButton && (
        <motion.div
          key="api-key-action-wrap"
          initial={{ opacity: 0, scale: 0.7, transformOrigin: 'right center' }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={buttonTransition}
          style={{ display: 'inline-flex' }}
        >
          <motion.button
            layout
            type="button"
            transition={{ layout: buttonTransition, opacity: { duration: 0.14 } }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (mode === 'confirming') return;
              if (mode === 'confirmed') onStartEdit();
              else onConfirm();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '30px',
              padding: '0 10px',
              borderRadius: '6px',
              background: 'var(--chakra-colors-brand-500)',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              cursor: mode === 'confirming' ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              overflow: 'hidden',
              minWidth: '34px',
            }}
          >
            {content}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ClearLastConfirmedButton({ visible, onClear }: { visible: boolean; onClear: () => void }) {
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.button
          key="api-key-clear"
          type="button"
          aria-label="clear"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={buttonTransition}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClear();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '6px',
            background: 'transparent',
            color: '#a1a1aa',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <X size={14} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function Step2Configure({
  presets,
  presetId,
  onPresetChange,
  apiKey,
  onApiKeyChange,
  apiKeyMode,
  lastConfirmedKey,
  onConfirmApiKey,
  onStartEdit,
  onCancelEdit,
  baseUrl,
  onBaseUrlChange,
  model,
  onModelChange,
  modelError,
  isSubmitting,
}: Step2ConfigureProps) {
  const { t } = useTranslation();
  const isCustom = presetId === 'custom';
  const inputRef = useRef<HTMLInputElement | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);

  const showApiKeyAction = !isCustom && apiKeyMode !== 'idle';
  const inputType =
    isCustom || apiKeyMode === 'editing' || apiKeyMode === 'confirming'
      ? 'text'
      : 'password';
  const inputIsReadOnly = !isCustom && apiKeyMode === 'confirmed';
  const inputIsDisabled = apiKeyMode === 'confirming' || isSubmitting;

  useEffect(() => {
    if (apiKeyMode === 'editing' && !isCustom) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 16);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [apiKeyMode, isCustom]);

  useEffect(() => {
    if (!showApiKeyAction) return undefined;
    if (apiKeyMode !== 'editing') return undefined;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (inputRef.current?.contains(target)) return;
      if (actionRef.current?.contains(target)) return;
      onCancelEdit();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [apiKeyMode, showApiKeyAction, onCancelEdit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isCustom && apiKeyMode === 'editing' && apiKey.trim()) {
      e.preventDefault();
      onConfirmApiKey();
    } else if (e.key === 'Escape' && apiKeyMode === 'editing') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  const handleClearLastConfirmed = () => {
    onApiKeyChange('');
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

      <AnimatePresence initial={false}>
        {isCustom && (
          <motion.div
            key="base-url"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{
              opacity: [1, 0, 0],
              height: ['auto', 'auto', 0],
              transition: {
                duration: 0.32,
                times: [0, 0.45, 1],
                ease: [0.22, 1, 0.36, 1],
              },
            }}
            transition={collapseTransition}
            style={{ overflow: 'hidden' }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>

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
            readOnly={inputIsReadOnly}
            isDisabled={inputIsDisabled}
            pr={showApiKeyAction ? '128px' : 3}
            bg="gray.800"
            border="1px solid"
            borderColor={apiKeyMode === 'editing' ? 'brand.500' : 'gray.700'}
            color="white"
            fontFamily={apiKeyMode === 'confirmed' ? 'mono' : undefined}
            _placeholder={{ color: 'gray.500' }}
            _hover={{ borderColor: 'gray.600' }}
            _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
            _focusVisible={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
            _readOnly={{ cursor: 'default' }}
            transition="border-color 0.18s ease, box-shadow 0.18s ease"
            h="40px"
          />
          <Box
            ref={actionRef}
            position="absolute"
            right={1.5}
            top="50%"
            transform="translateY(-50%)"
            display="flex"
            alignItems="center"
            gap={1.5}
            pointerEvents={showApiKeyAction ? 'auto' : 'none'}
          >
            <ClearLastConfirmedButton
              visible={!isCustom && apiKeyMode === 'editing' && lastConfirmedKey.length > 0}
              onClear={handleClearLastConfirmed}
            />
            <ApiKeyActionButton
              mode={apiKeyMode}
              showButton={showApiKeyAction}
              onConfirm={onConfirmApiKey}
              onStartEdit={onStartEdit}
            />
          </Box>
        </Box>
      </FormControl>

      <AnimatePresence initial={false}>
        {isCustom && (
          <motion.div
            key="model-field"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{
              opacity: [1, 0, 0],
              height: ['auto', 'auto', 0],
              transition: {
                duration: 0.32,
                times: [0, 0.45, 1],
                ease: [0.22, 1, 0.36, 1],
              },
            }}
            transition={collapseTransition}
            style={{ overflow: 'hidden' }}
          >
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