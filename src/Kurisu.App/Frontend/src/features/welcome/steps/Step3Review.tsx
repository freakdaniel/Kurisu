import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { ProviderIcon } from '../ProviderIcons';
import { providerAccent } from '../providerTheme';
import { envVarFor, type WelcomeState } from '../welcomeState';
import type { ProviderPresetSnapshot } from '@/types/ipc.generated';

interface Step3ReviewProps {
  presets: ProviderPresetSnapshot[];
  state: WelcomeState;
}

export function Step3Review({ presets, state }: Step3ReviewProps) {
  const { t } = useTranslation();
  const preset = presets.find((p) => p.id === state.presetId);
  const envKey = envVarFor(preset);

  return (
    <VStack spacing={5} align="stretch">
      <Box bg="gray.800" border="1px solid" borderColor="gray.700" borderRadius="xl" p={4}>
        <HStack spacing={3} mb={3}>
          <Box
            w="40px"
            h="40px"
            borderRadius="lg"
            color={providerAccent[preset?.id ?? 'custom'] ?? 'gray.300'}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <ProviderIcon id={preset?.id ?? 'custom'} width={28} height={28} />
          </Box>
          <Box flex={1} minW={0}>
            <Text color="white" fontWeight="semibold">{preset?.name}</Text>
          </Box>
        </HStack>
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.500">{t('welcome.modelLabel')}</Text>
            <Text fontSize="xs" color="white" fontFamily="mono" noOfLines={1} maxW="60%">{state.model || '—'}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.500">{t('welcome.baseUrlLabel')}</Text>
            <Text fontSize="xs" color="white" fontFamily="mono" noOfLines={1} maxW="60%">{state.baseUrl || '—'}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.500">{t('welcome.apiKeyLabel')}</Text>
            <Text fontSize="xs" color="white" fontFamily="mono">{'••••••••'}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.500">{t('welcome.envVarLabel')}</Text>
            <Text fontSize="xs" color="white" fontFamily="mono">{envKey || '—'}</Text>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  );
}
