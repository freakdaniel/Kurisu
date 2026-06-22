import {
  Box,
  HStack,
  VStack,
  Text,
  Heading,
  Button,
  Input,
  FormControl,
  FormLabel,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plug,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import kurisuLogo from '../../assets/logo.png';
import { useBootstrap } from '../../hooks/useBootstrap';
import type { ProviderPresetSnapshot } from '@/types/ipc.generated';
import ProviderSelect from './welcome/ProviderSelect';
import { ProviderIcon } from './welcome/ProviderIcons';
import { providerAccent } from './welcome/providerTheme';
import katsumiHello from '../../assets/stickers/katsumi_hello.png';

const TOTAL_STEPS = 3;

const envVarFor = (preset: ProviderPresetSnapshot | undefined) => {
  if (!preset) return '';
  if (preset.id === 'openai') return 'OPENAI_API_KEY';
  return preset.id.toUpperCase() + '_API_KEY';
};

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { bootstrap, setBootstrap } = useBootstrap();
  const presets = useMemo<ProviderPresetSnapshot[]>(
    () => bootstrap?.kurisuProviderPresets ?? [],
    [bootstrap]
  );
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [presetId, setPresetId] = useState<string>(() => {
    const openai = presets.find((p) => p.id === 'openai');
    return openai?.id ?? presets[0]?.id ?? 'custom';
  });
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preset = useMemo(() => presets.find((p) => p.id === presetId), [presets, presetId]);
  const isCustom = presetId === 'custom';
  const envKey = envVarFor(preset);

  useEffect(() => {
    if (!preset) return;
    setBaseUrl(preset.defaultBaseUrl ?? '');
    if (preset.defaultModelId) setModel(preset.defaultModelId);
    setAvailableModels([]);
    setModelError('');
  }, [preset]);

  useEffect(() => {
    if (!preset || isCustom) return;
    if (!apiKey) {
      setAvailableModels([]);
      setModelError('');
      return;
    }
    if (!window.kurisuDesktop?.listProviderModels) return;
    let cancelled = false;
    setIsLoadingModels(true);
    setModelError('');
    (async () => {
      try {
        const result = await window.kurisuDesktop!.listProviderModels({
          presetId: preset.id,
          apiKey: apiKey.trim(),
          forceRefresh: false,
        });
        if (cancelled) return;
        setAvailableModels(result.models ?? []);
        if (result.error) setModelError(result.error);
        if (!model && result.models && result.models.length > 0) {
          setModel(result.models[0]);
        }
      } catch (err) {
        if (!cancelled) setModelError(String(err));
      } finally {
        if (!cancelled) setIsLoadingModels(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId, apiKey, isCustom]);

  const refreshModels = useCallback(async () => {
    if (!preset || isCustom || !window.kurisuDesktop?.listProviderModels) return;
    setIsLoadingModels(true);
    setModelError('');
    try {
      const result = await window.kurisuDesktop.listProviderModels({
        presetId: preset.id,
        apiKey: apiKey.trim(),
        forceRefresh: true,
      });
      setAvailableModels(result.models ?? []);
      if (result.error) setModelError(result.error);
    } catch (err) {
      setModelError(String(err));
    } finally {
      setIsLoadingModels(false);
    }
  }, [preset, isCustom, apiKey]);

  const canGoNext = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) {
      if (!preset) return false;
      if (!apiKey.trim()) return false;
      if (!model.trim()) return false;
      return true;
    }
    return true;
  }, [step, preset, apiKey, model]);

  const handleConnect = useCallback(async () => {
    if (isSubmitting || !window.kurisuDesktop) return;
    setIsSubmitting(true);
    try {
      await window.kurisuDesktop.configureOpenAiCompatibleAuth({
        scope: '',
        authType: preset?.id ?? 'openai',
        presetId,
        model: model.trim(),
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        apiKeyEnvironmentVariable: envKey.trim(),
      });
      const payload = await window.kurisuDesktop.bootstrap();
      setBootstrap(payload);
    } catch (err) {
      toast({
        title: t('auth.connectErrorTitle'),
        description: String(err),
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      setIsSubmitting(false);
    }
  }, [apiKey, baseUrl, envKey, isSubmitting, model, preset, presetId, setBootstrap, t, toast]);

  const renderStep = () => {
    if (step === 0) {
      return (
        <VStack spacing={6} align="center" py={6}>
          <Box
            w="180px"
            h="180px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            filter="drop-shadow(0 8px 24px rgba(0, 0, 0, 0.45))"
          >
            <img
              src={katsumiHello}
              alt="Katsumi"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </Box>

          <Heading
            as="h1"
            size="xl"
            color="white"
            fontWeight="semibold"
            letterSpacing="-0.01em"
            textAlign="center"
          >
            {t('welcome.greeting')}
          </Heading>

          <Text
            color="gray.400"
            fontSize="md"
            fontStyle="regular"
            textAlign="center"
            maxW="440px"
            lineHeight="1.6"
          >
            {t('welcome.intro')}
          </Text>

          <Button
            size="lg"
            rightIcon={<ArrowRight size={18} />}
            bg="brand.500"
            color="white"
            _hover={{ bg: 'brand.600' }}
            _active={{ bg: 'brand.700' }}
            h="52px"
            px={10}
            fontSize="md"
            mt={2}
            borderRadius="full"
            onClick={() => setStep(1)}
          >
            {t('welcome.getStarted')}
          </Button>
        </VStack>
      );
    }

    if (step === 1) {
      return (
        <VStack spacing={5} align="stretch">
          <FormControl>
            <FormLabel color="gray.300" fontSize="sm" mb={1.5}>
              {t('welcome.providerLabel')}
            </FormLabel>
            <ProviderSelect
              presets={presets}
              value={presetId}
              onChange={setPresetId}
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
                onChange={(e) => setBaseUrl(e.target.value)}
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
              onChange={(e) => setApiKey(e.target.value)}
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
                  onClick={refreshModels}
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
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setModel(e.target.value)}
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
                onChange={(e) => setModel(e.target.value)}
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

    // step 2: confirmation
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
              <Text fontSize="xs" color="white" fontFamily="mono" noOfLines={1} maxW="60%">{model || '—'}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="gray.500">{t('welcome.baseUrlLabel')}</Text>
              <Text fontSize="xs" color="white" fontFamily="mono" noOfLines={1} maxW="60%">{baseUrl || '—'}</Text>
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
  };

  const headerTitle = step === 1
    ? t('welcome.configureTitle')
    : step === 2
      ? t('welcome.reviewTitle')
      : '';
  const headerSubtitle = step === 1
    ? t('welcome.configureSubtitle')
    : step === 2
      ? t('welcome.reviewSubtitle')
      : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Box
        position="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        display="flex"
        flexDirection="row"
        alignItems="stretch"
        bg="gray.950"
        overflow="hidden"
      >
        {/* Drag region */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="36px"
          sx={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          zIndex={10}
          pointerEvents="none"
        />

        {/* Right content panel */}
        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          bg="gray.950"
          overflowY="auto"
        >
          {/* Mobile header (visible only on small screens) */}
          <HStack
            display={{ base: 'flex', lg: 'none' }}
            spacing={2.5}
            p={6}
            pb={0}
            pt="46px"
          >
            <Box w="28px" h="28px" borderRadius="md" bg="gray.800" display="flex" alignItems="center" justifyContent="center">
              <img src={kurisuLogo} alt="Kurisu" style={{ width: '18px', height: '18px' }} />
            </Box>
            <Text color="white" fontWeight="semibold">Kurisu</Text>
          </HStack>

          <Box
            flex={1}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            px={{ base: 6, md: 12, lg: 16 }}
            py={{ base: 8, md: 12 }}
            maxW="560px"
            mx="auto"
            w="100%"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                {step > 0 && (
                  <Box mb={6} textAlign='center'>
                    <Heading size="md" color="white" mb={1.5}>{headerTitle}</Heading>
                    {headerSubtitle && (
                      <Text color="gray.400" fontSize="sm">{headerSubtitle}</Text>
                    )}
                  </Box>
                )}

                {renderStep()}

                {/* Navigation */}
                {step > 0 && (
                  <HStack mt={8} justify="space-between">
                    <Button
                      variant="ghost"
                      color="gray.400"
                      leftIcon={<ArrowLeft size={16} />}
                      onClick={() => setStep((s) => Math.max(0, s - 1))}
                      isDisabled={isSubmitting}
                      p={0}
                      _hover={{ color: 'white', bg: 'transparent' }}
                    >
                      {t('welcome.back')}
                    </Button>

                    {step < TOTAL_STEPS - 1 ? (
                      <Button
                        rightIcon={<ArrowRight size={16} />}
                        bg="brand.500"
                        color="white"
                        _hover={{ bg: 'brand.600' }}
                        _active={{ bg: 'brand.700' }}
                        onClick={() => canGoNext && setStep((s) => s + 1)}
                        isDisabled={!canGoNext}
                        borderRadius="full"
                        h="40px"
                        px={6}
                      >
                        {t('welcome.next')}
                      </Button>
                    ) : (
                      <Button
                        rightIcon={isSubmitting ? undefined : <Rocket size={16} />}
                        bg="brand.500"
                        color="white"
                        _hover={{ bg: 'brand.600' }}
                        _active={{ bg: 'brand.700' }}
                        onClick={handleConnect}
                        isDisabled={isSubmitting || !model.trim() || !apiKey.trim()}
                        h="40px"
                        px={6}
                      >
                        {isSubmitting ? (
                          <HStack spacing={2}>
                            <Loader2 size={16} className="animate-spin" />
                            <Text>{t('auth.connecting')}</Text>
                          </HStack>
                        ) : (
                          <HStack spacing={2}>
                            <Plug size={16} />
                            <Text>{t('welcome.connect')}</Text>
                          </HStack>
                        )}
                      </Button>
                    )}
                  </HStack>
                )}
              </motion.div>
            </AnimatePresence>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
}