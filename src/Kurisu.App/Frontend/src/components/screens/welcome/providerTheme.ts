export const providerAccent: Record<string, string> = {
  openai: '#10A37F',
  anthropic: '#D97757',
  openrouter: '#6366F1',
  deepseek: '#4D6BFE',
  xai: '#1F1F1F',
  groq: '#F55036',
  zai: '#3B82F6',
  mistral: '#FF7000',
  together: '#0E62A0',
  moonshot: '#1A1A2E',
  fireworks: '#FF6B35',
  huggingface: '#FFD21E',
  vercel: '#FFFFFF',
  litellm: '#7C3AED',
  requesty: '#06B6D4',
  ollama: '#FFFFFF',
  custom: '#FFFFFF',
};

export const darkIconIds = new Set<string>([
  'openai',
  'openrouter',
  'xai',
  'grok',
  'vercel',
  'ollama',
  'groq',
  'fireworks',
  'deepseek',
  'litellm',
  'requesty',
  'custom'
]);

export const needsLightTile = (id: string) => darkIconIds.has(id);