import type { ProviderPresetSnapshot } from '@/types/ipc.generated';

export interface WelcomeState {
  step: number;
  presetId: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  availableModels: string[];
  isLoadingModels: boolean;
  modelError: string;
  isSubmitting: boolean;
}

export const envVarFor = (preset: ProviderPresetSnapshot | undefined) => {
  if (!preset) return '';
  if (preset.id === 'openai') return 'OPENAI_API_KEY';
  return preset.id.toUpperCase() + '_API_KEY';
};

export const TOTAL_WELCOME_STEPS = 3;
