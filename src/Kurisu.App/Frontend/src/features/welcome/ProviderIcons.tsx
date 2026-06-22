import type { CSSProperties, ImgHTMLAttributes } from 'react';

import openaiUrl from '@/assets/brands/openai-icon.svg';
import anthropicUrl from '@/assets/brands/claude-ai-icon.svg';
import openrouterUrl from '@/assets/brands/openrouter-icon.svg';
import deepseekUrl from '@/assets/brands/deepseek-logo-icon.svg';
import mistralUrl from '@/assets/brands/mistral-ai-icon.svg';
import togetherUrl from '@/assets/brands/together-ai-icon.svg';
import moonshotUrl from '@/assets/brands/kimi-ai-icon.svg';
import fireworksUrl from '@/assets/brands/fireworks-ai-icon.svg';
import huggingfaceUrl from '@/assets/brands/huggingface-icon.svg';
import vercelUrl from '@/assets/brands/vercel-icon.svg';
import ollamaUrl from '@/assets/brands/ollama-icon.svg';
import groqUrl from '@/assets/brands/groq-icon.svg';
import xaiUrl from '@/assets/brands/grok-ai-icon.svg';
import zaiUrl from '@/assets/brands/z-ai-icon.svg';
import customUrl from '@/assets/brands/minimax-icon.svg';
import requestyUrl from '@/assets/brands/requesty-logo.svg';
import litellmUrl from '@/assets/brands/litellm.png';

import { needsLightTile } from './providerTheme';

type ImgProps = ImgHTMLAttributes<HTMLImageElement>;

const brandIcons: Record<string, string> = {
  openai: openaiUrl,
  anthropic: anthropicUrl,
  openrouter: openrouterUrl,
  deepseek: deepseekUrl,
  mistral: mistralUrl,
  together: togetherUrl,
  moonshot: moonshotUrl,
  fireworks: fireworksUrl,
  huggingface: huggingfaceUrl,
  vercel: vercelUrl,
  ollama: ollamaUrl,
  groq: groqUrl,
  xai: xaiUrl,
  zai: zaiUrl,
  requesty: requestyUrl,
  litellm: litellmUrl,
  custom: customUrl,
};


const lightTileStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#FFFFFF',
  borderRadius: 6,
  padding: 2,
  flexShrink: 0,
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
};

export function ProviderIcon({ id, style, ...props }: ImgProps & { id: string }) {
  const url = brandIcons[id];
  const tile = needsLightTile(id);

  if (url) {
    const img = <img src={url} alt={id} {...props} />;
    if (!tile) return img;
    return (
      <span style={{ ...lightTileStyle, ...style }}>
        <img src={url} alt={id} {...props} />
      </span>
    );
  }
  const letter = '?';
  return (
    <span
      {...(props as Record<string, unknown>)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.7rem',
        color: 'currentColor',
        background: tile ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 6,
        width: props.width ?? 18,
        height: props.height ?? 18,
        flexShrink: 0,
        ...style,
      } as CSSProperties}
    >
      {letter}
    </span>
  );
}
