import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProviderSelect from '../ProviderSelect';
import type { ProviderPresetSnapshot } from '@/types/ipc.generated';

interface Step2ConfigureProps {
  presets: ProviderPresetSnapshot[];
  presetId: string;
  onPresetChange: (id: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  baseUrl: string;
  onBaseUrlChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
  availableModels: string[];
  isLoadingModels: boolean;
  modelError: string;
  isSubmitting: boolean;
  onRefreshModels: () => void;
}

export function Step2Configure({
  presets,
  presetId,
  onPresetChange,
  apiKey,
  onApiKeyChange,
  baseUrl,
  onBaseUrlChange,
  model,
  onModelChange,
  availableModels,
  isLoadingModels,
  modelError,
  isSubmitting,
  onRefreshModels,
}: Step2ConfigureProps) {
  const { t } = useTranslation();
  const isCustom = presetId === 'custom';

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

      {isCustom && (
        <FormControl>
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
      )}

      <FormControl>
        <FormLabel color="gray.300" fontSize="sm" mb={1.5}>
          {t('welcome.apiKeyLabel')}
        </FormLabel>
        <Input
          type="password"
          placeholder={t('auth.apiKeyPlaceholder')}
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
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

      <FormControl>
        <HStack mb={1.5} justify="space-between">
          <FormLabel color="gray.300" fontSize="sm" mb={0}>
            {t('welcome.modelLabel')}
          </FormLabel>
          {!isCustom && (
            <Button
              size="xs"
              variant="ghost"
              color="gray.400"
              leftIcon={isLoadingModels ? <Spinner size="xs" /> : <RefreshCw size={12} />}
              onClick={onRefreshModels}
              isDisabled={isSubmitting || !apiKey || isLoadingModels}
              _hover={{ color: 'gray.200', bg: 'whiteAlpha.100' }}
            >
              {t('welcome.refresh')}
            </Button>
          )}
        </HStack>
        {!isCustom && availableModels.length > 0 ? (
          <Box
            as="select"
            value={model}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onModelChange(e.target.value)}
            w="100%"
            h="40px"
            px={3}
            bg="gray.800"
            border="1px solid"
            borderColor="gray.700"
            borderRadius="lg"
            color="white"
            fontSize="sm"
            cursor="pointer"
            _hover={{ borderColor: 'gray.600' }}
            _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)', outline: 'none' }}
            disabled={isSubmitting}
            sx={{
              '& option': { background: '#1f1f23' },
            }}
          >
            <option value="">({t('welcome.selectModel')})</option>
            {availableModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Box>
        ) : (
          <Input
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder={isCustom
              ? 'e.g. gpt-4o-mini'
              : (isLoadingModels ? t('welcome.loadingModels') : t('welcome.typeModelName'))}
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
        )}
        {modelError && (
          <Text fontSize="xs" color="orange.300" mt={1.5}>
            {modelError}
          </Text>
        )}
      </FormControl>
    </VStack>
  );
}
