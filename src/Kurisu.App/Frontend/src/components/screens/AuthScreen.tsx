import { Box, VStack, Heading, Text, Button, FormControl, FormLabel, Input, Select, useToast, Spinner } from '@chakra-ui/react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import kurisuLogo from '../../assets/logo.png';
import { useTranslation } from 'react-i18next';
import { useBootstrap } from '../../hooks/useBootstrap';
import type { ProviderPresetSnapshot } from '../../types/ipc.generated';

export default function AuthScreen() {
  const { t } = useTranslation();
  const { bootstrap, setBootstrap } = useBootstrap();
  const presets = useMemo<ProviderPresetSnapshot[]>(
    () => bootstrap?.kurisuProviderPresets ?? [],
    [bootstrap]
  );

  const [presetId, setPresetId] = useState<string>(() => {
    const openai = presets.find((p) => p.id === 'openai');
    return openai?.id ?? presets[0]?.id ?? 'custom';
  });
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [envKey, setEnvKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelError, setModelError] = useState<string>('');
  const toast = useToast();

  const preset = useMemo(
    () => presets.find((p) => p.id === presetId),
    [presets, presetId]
  );
  const isCustom = presetId === 'custom';

  // When the preset changes, autofill baseUrl + envKey + default model.
  useEffect(() => {
    if (!preset) return;
    if (preset.defaultBaseUrl) {
      setBaseUrl(preset.defaultBaseUrl);
    } else {
      setBaseUrl('');
    }
    if (preset.defaultModelId) {
      setModel(preset.defaultModelId);
    }
    setEnvKey(preset.id === 'openai' ? 'OPENAI_API_KEY' : (preset.id.toUpperCase() + '_API_KEY'));
  }, [preset]);

  // Fetch the live model list whenever the preset, baseUrl, or apiKey changes.
  useEffect(() => {
    if (!preset) return;
    if (isCustom) {
      setAvailableModels([]);
      setModelError('');
      return;
    }
    if (!apiKey) {
      setAvailableModels([]);
      setModelError('');
      return;
    }
    if (!window.kurisuDesktop?.listProviderModels) return;
    setIsLoadingModels(true);
    setModelError('');
    let cancelled = false;
    (async () => {
      try {
        const result = await window.kurisuDesktop!.listProviderModels({
          presetId: preset.id,
          apiKey: apiKey.trim(),
          forceRefresh: false,
        });
        if (cancelled) return;
        setAvailableModels(result.models ?? []);
        if (result.error) {
          setModelError(result.error);
        }
        if (!model && result.models && result.models.length > 0) {
          setModel(result.models[0]);
        }
      } catch (err) {
        if (!cancelled) setModelError(String(err));
      } finally {
        if (!cancelled) setIsLoadingModels(false);
      }
    })();
    return () => { cancelled = true; };
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !window.kurisuDesktop) return;
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your API key',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setIsLoading(true);
    try {
      await window.kurisuDesktop.configureOpenAiCompatibleAuth({
        scope: '',
        authType: preset?.id ?? 'openai',
        presetId: presetId,
        model: model.trim(),
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        apiKeyEnvironmentVariable: envKey.trim(),
      });
      // Refresh bootstrap to reflect new state.
      const payload = await window.kurisuDesktop.bootstrap();
      setBootstrap(payload);
    } catch (err) {
      toast({
        title: 'Authentication Failed',
        description: String(err),
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isLoading, model, baseUrl, envKey, preset, presetId, toast, setBootstrap]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Box
        minH="100vh"
        bg="gray.900"
        display="flex"
        flexDirection="column"
        overflow="hidden"
        position="relative"
      >
        {/* Drag region (title bar area) */}
        <Box
          h="36px"
          sx={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          flexShrink={0}
        />

        {/* Main content - centered */}
        <Box
          flex="1"
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="100%"
          p={4}
        >
          <Box maxW="md" width="100%" bg="transparent" p={8}>
            <VStack spacing={6} align="stretch">
              {/* Logo + Title */}
              <VStack spacing={2} align="center">
                <Box
                  boxSize="64px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <img src={kurisuLogo} alt="Kurisu" style={{ width: '64px', height: '64px' }} />
                </Box>
                <Heading size="lg" color="white">{t('auth.welcomeTitle')}</Heading>
                <Text color="gray.400" textAlign="center">
                  {t('auth.welcomeSubtitle')}
                </Text>
              </VStack>

              <form onSubmit={handleSubmit}>
                <VStack spacing={4} align="stretch">
                  {/* Provider preset */}
                  <FormControl>
                    <FormLabel color="gray.300" fontSize="sm">Provider</FormLabel>
                    <Select
                      value={presetId}
                      onChange={(e) => setPresetId(e.target.value)}
                      bg="gray.700"
                      borderColor="gray.600"
                      color="white"
                      _hover={{ borderColor: 'gray.500' }}
                      _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px var(--chakra-colors-brand-500)` }}
                      isDisabled={isLoading}
                    >
                      {presets.map((p) => (
                        <option key={p.id} value={p.id} style={{ background: '#2D3748' }}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                    {preset?.description && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {preset.description}
                      </Text>
                    )}
                  </FormControl>

                  {/* Base URL (only for custom) */}
                  {isCustom && (
                    <FormControl>
                      <FormLabel color="gray.300" fontSize="sm">Base URL</FormLabel>
                      <Input
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.example.com/v1"
                        bg="gray.700"
                        borderColor="gray.600"
                        color="white"
                        _placeholder={{ color: 'gray.400' }}
                        _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px var(--chakra-colors-brand-500)` }}
                        isDisabled={isLoading}
                      />
                    </FormControl>
                  )}

                  {/* API Key */}
                  <FormControl>
                    <FormLabel color="gray.300" fontSize="sm">API Key</FormLabel>
                    <Input
                      type="password"
                      placeholder={t('auth.apiKeyPlaceholder')}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      bg="gray.700"
                      borderColor="gray.600"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px var(--chakra-colors-brand-500)` }}
                      isDisabled={isLoading}
                    />
                  </FormControl>

                  {/* Model picker */}
                  <FormControl>
                    <FormLabel color="gray.300" fontSize="sm" display="flex" alignItems="center" gap={2}>
                      <Box flex="1">Model</Box>
                      {!isCustom && (
                        <Button
                          size="xs"
                          variant="ghost"
                          color="gray.400"
                          leftIcon={isLoadingModels ? <Spinner size="xs" /> : <RefreshCw size={12} />}
                          onClick={refreshModels}
                          isDisabled={isLoading || !apiKey || isLoadingModels}
                          _hover={{ color: 'gray.200' }}
                        >
                          Refresh
                        </Button>
                      )}
                    </FormLabel>
                    {!isCustom && availableModels.length > 0 ? (
                      <Select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        bg="gray.700"
                        borderColor="gray.600"
                        color="white"
                        _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px var(--chakra-colors-brand-500)` }}
                        isDisabled={isLoading}
                      >
                        <option value="" style={{ background: '#2D3748' }}>(select a model)</option>
                        {availableModels.map((m) => (
                          <option key={m} value={m} style={{ background: '#2D3748' }}>
                            {m}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={isCustom
                          ? 'e.g. gpt-4o-mini'
                          : (isLoadingModels ? 'Loading models...' : 'Type model name')}
                        bg="gray.700"
                        borderColor="gray.600"
                        color="white"
                        _placeholder={{ color: 'gray.400' }}
                        _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px var(--chakra-colors-brand-500)` }}
                        isDisabled={isLoading}
                      />
                    )}
                    {modelError && (
                      <Text fontSize="xs" color="orange.300" mt={1}>
                        {modelError}
                      </Text>
                    )}
                  </FormControl>

                  {/* Submit */}
                  <Button
                    type="submit"
                    size="lg"
                    width="100%"
                    bg="brand.500"
                    color="white"
                    _hover={{ bg: 'brand.600' }}
                    height="48px"
                    fontSize="md"
                    isDisabled={isLoading || !apiKey.trim() || (!isCustom && !model.trim())}
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="spinner"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <Loader2 size={18} className="animate-spin" />
                          <Text>{t('auth.connecting')}</Text>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <Text>Connect</Text>
                          <ArrowRight size={18} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </VStack>
              </form>

              {/* Env var hint */}
              {envKey && (
                <Text fontSize="xs" color="gray.500" textAlign="center">
                  The API key will be stored as environment variable <b>{envKey}</b>.
                </Text>
              )}
            </VStack>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
}
