import {
  Box,
  HStack,
  Text,
  Heading,
  Button,
  useToast,
} from '@chakra-ui/react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plug,
  Rocket,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import kurisuLogo from '@/assets/logo.png';
import { useBootstrap } from '@/features/bootstrap';
import {
  envVarFor,
  TOTAL_WELCOME_STEPS,
  type WelcomeState,
  type ApiKeyMode,
} from './welcomeState';
import { Step1Landing } from './steps/Step1Landing';
import { Step2Configure } from './steps/Step2Configure';
import { Step3Review } from './steps/Step3Review';

const initialState = (presets: { id: string }[]): WelcomeState => {
  const openai = presets.find((p) => p.id === 'openai');
  return {
    step: 0,
    presetId: openai?.id ?? presets[0]?.id ?? 'custom',
    apiKey: '',
    apiKeyMode: 'idle',
    lastConfirmedKey: '',
    baseUrl: '',
    model: '',
    availableModels: [],
    isLoadingModels: false,
    modelError: '',
    isSubmitting: false,
  };
};

const stepContainerVariants: Variants = {
  enter: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
  center: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
  exit: {
    transition: { staggerChildren: 0.04, staggerDirection: -1, when: 'afterChildren' },
  },
};

const stepItemVariants: Variants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

const stepItemTransition = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as const,
};

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { bootstrap, setBootstrap } = useBootstrap();
  const presets = useMemo(
    () => bootstrap?.kurisuProviderPresets ?? [],
    [bootstrap]
  );
  const toast = useToast();

  const [state, setState] = useState<WelcomeState>(() => initialState(presets));

  const preset = useMemo(
    () => presets.find((p) => p.id === state.presetId),
    [presets, state.presetId]
  );
  const isCustom = state.presetId === 'custom';
  const envKey = envVarFor(preset);

  useEffect(() => {
    if (!preset) return;
    setState((s) => ({
      ...s,
      baseUrl: isCustom ? s.baseUrl : (preset.defaultBaseUrl ?? ''),
      apiKey: '',
      apiKeyMode: 'idle',
      lastConfirmedKey: '',
      availableModels: [],
      model: isCustom ? s.model : '',
      modelError: '',
      isLoadingModels: false,
    }));
  }, [preset, isCustom]);

  const setApiKey = useCallback((value: string) => {
    setState((s) => {
      if (s.apiKeyMode === 'confirming' || s.apiKeyMode === 'confirmed') return s;
      const nextMode: ApiKeyMode = value.length > 0 ? 'editing' : 'idle';
      return { ...s, apiKey: value, apiKeyMode: nextMode, modelError: '' };
    });
  }, []);

  const fetchModels = useCallback(
    async (apiKey: string): Promise<void> => {
      if (!preset || isCustom || !window.kurisuDesktop?.listProviderModels) return;
      setState((s) => ({ ...s, isLoadingModels: true, modelError: '' }));
      try {
        const result = await window.kurisuDesktop!.listProviderModels({
          presetId: preset.id,
          apiKey: apiKey.trim(),
          forceRefresh: true,
        });
        setState((s) => {
          const models = result.models ?? [];
          const error = result.error ?? '';
          return {
            ...s,
            availableModels: models,
            modelError: error,
            model: !error && models.length > 0 ? models[0] : '',
          };
        });
      } catch (err) {
        setState((s) => ({ ...s, modelError: String(err) }));
      } finally {
        setState((s) => ({ ...s, isLoadingModels: false }));
      }
    },
    [preset, isCustom]
  );

  const handleConfirmApiKey = useCallback(async () => {
    if (isCustom) return;
    const key = state.apiKey.trim();
    if (!key) return;
    setState((s) => ({
      ...s,
      apiKeyMode: 'confirming',
      lastConfirmedKey: key,
    }));
    await fetchModels(key);
    setState((s) => ({ ...s, apiKeyMode: 'confirmed' }));
  }, [fetchModels, isCustom, state.apiKey]);

  const handleCancelEdit = useCallback(() => {
    setState((s) => {
      if (s.apiKeyMode !== 'editing') return s;
      const last = s.lastConfirmedKey;
      const nextMode = last.length > 0 ? 'confirmed' : 'idle';
      return { ...s, apiKey: last, apiKeyMode: nextMode, modelError: '' };
    });
  }, []);

  const handleStartEdit = useCallback(() => {
    setState((s) => ({ ...s, apiKeyMode: 'editing' }));
  }, []);

  const canGoNext = useMemo(() => {
    if (state.step === 0) return true;
    if (state.step === 1) {
      if (!preset) return false;
      if (!state.apiKey.trim()) return false;
      if (!state.model.trim()) return false;
      if (state.apiKeyMode === 'confirming' || state.apiKeyMode === 'editing') return false;
      return true;
    }
    return true;
  }, [state.step, preset, state.apiKey, state.model, state.apiKeyMode]);

  const handleConnect = useCallback(async () => {
    if (state.isSubmitting || !window.kurisuDesktop) return;
    setState((s) => ({ ...s, isSubmitting: true }));
    try {
      await window.kurisuDesktop.configureOpenAiCompatibleAuth({
        scope: '',
        authType: preset?.id ?? 'openai',
        presetId: state.presetId,
        model: state.model.trim(),
        baseUrl: state.baseUrl.trim(),
        apiKey: state.apiKey.trim(),
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
      setState((s) => ({ ...s, isSubmitting: false }));
    }
  }, [
    envKey,
    preset,
    setBootstrap,
    state.apiKey,
    state.baseUrl,
    state.isSubmitting,
    state.model,
    state.presetId,
    t,
    toast,
  ]);

  const headerTitle = state.step === 1
    ? t('welcome.configureTitle')
    : state.step === 2
      ? t('welcome.reviewTitle')
      : '';
  const headerSubtitle = state.step === 1
    ? t('welcome.configureSubtitle')
    : state.step === 2
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

        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          bg="gray.950"
          overflowY="auto"
        >
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
                key={state.step}
                variants={stepContainerVariants}
                initial="enter"
                animate="center"
                exit="exit"
                style={{ width: '100%' }}
              >
                {state.step > 0 && (
                  <motion.div variants={stepItemVariants} transition={stepItemTransition}>
                    <Box mb={6} textAlign="center">
                      <Heading size="md" color="white" mb={1.5}>{headerTitle}</Heading>
                      {headerSubtitle && (
                        <Text color="gray.400" fontSize="sm">{headerSubtitle}</Text>
                      )}
                    </Box>
                  </motion.div>
                )}

                {state.step === 0 && (
                  <motion.div variants={stepItemVariants} transition={stepItemTransition}>
                    <Step1Landing onNext={() => setState((s) => ({ ...s, step: 1 }))} />
                  </motion.div>
                )}
                {state.step === 1 && (
                  <motion.div variants={stepItemVariants} transition={stepItemTransition}>
                    <Step2Configure
                      presets={presets}
                      presetId={state.presetId}
                      onPresetChange={(presetId) => setState((s) => ({ ...s, presetId }))}
                      apiKey={state.apiKey}
                      onApiKeyChange={setApiKey}
                      apiKeyMode={state.apiKeyMode}
                      lastConfirmedKey={state.lastConfirmedKey}
                      onConfirmApiKey={() => { void handleConfirmApiKey(); }}
                      onStartEdit={handleStartEdit}
                      onCancelEdit={handleCancelEdit}
                      baseUrl={state.baseUrl}
                      onBaseUrlChange={(baseUrl) => setState((s) => ({ ...s, baseUrl }))}
                      model={state.model}
                      onModelChange={(model) => setState((s) => ({ ...s, model }))}
                      modelError={state.modelError}
                      isSubmitting={state.isSubmitting}
                    />
                  </motion.div>
                )}
                {state.step === 2 && (
                  <motion.div variants={stepItemVariants} transition={stepItemTransition}>
                    <Step3Review presets={presets} state={state} />
                  </motion.div>
                )}

                {state.step > 0 && (
                  <motion.div variants={stepItemVariants} transition={stepItemTransition}>
                    <HStack mt={8} justify="space-between">
                      <Button
                        variant="ghost"
                        color="gray.400"
                        leftIcon={<ArrowLeft size={16} />}
                        onClick={() => setState((s) => ({ ...s, step: Math.max(0, s.step - 1) }))}
                        isDisabled={state.isSubmitting}
                        p={0}
                        _hover={{ color: 'white', bg: 'transparent' }}
                      >
                        {t('welcome.back')}
                      </Button>

                      {state.step < TOTAL_WELCOME_STEPS - 1 ? (
                        <Button
                          rightIcon={<ArrowRight size={16} />}
                          bg="brand.500"
                          color="white"
                          _hover={{ bg: 'brand.600' }}
                          _active={{ bg: 'brand.700' }}
                          onClick={() => canGoNext && setState((s) => ({ ...s, step: s.step + 1 }))}
                          isDisabled={!canGoNext}
                          borderRadius="full"
                          h="40px"
                          px={6}
                        >
                          {t('welcome.next')}
                        </Button>
                      ) : (
                        <Button
                          rightIcon={state.isSubmitting ? undefined : <Rocket size={16} />}
                          bg="brand.500"
                          color="white"
                          _hover={{ bg: 'brand.600' }}
                          _active={{ bg: 'brand.700' }}
                          onClick={handleConnect}
                          isDisabled={state.isSubmitting || !state.model.trim() || !state.apiKey.trim()}
                          h="40px"
                          px={6}
                        >
                          {state.isSubmitting ? (
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
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
}