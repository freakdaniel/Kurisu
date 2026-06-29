import type { CSSProperties, ImgHTMLAttributes } from 'react';

import aihubmixUrl from '@/assets/brands/aihubmix-icon.svg';
import anthropicUrl from '@/assets/brands/claude-ai-icon.svg';
import asksageUrl from '@/assets/brands/asksage.png';
import bedrockUrl from '@/assets/brands/aws-amazon-bedrock-icon.svg';
import basetenUrl from '@/assets/brands/baseten-logo.svg';
import cerebrasUrl from '@/assets/brands/cerebras-icon.svg';
import deepseekUrl from '@/assets/brands/deepseek-logo-icon.svg';
import difyUrl from '@/assets/brands/dify.png';
import doubaoUrl from '@/assets/brands/doubao-icon.svg';
import fireworksUrl from '@/assets/brands/fireworks-ai-icon.svg';
import geminiUrl from '@/assets/brands/google-gemini-icon.svg';
import groqUrl from '@/assets/brands/groq-icon.svg';
import hicapUrl from '@/assets/brands/hicap-ai-icon.svg';
import huggingfaceUrl from '@/assets/brands/huggingface-icon.svg';
import huaweiUrl from '@/assets/brands/huawei-mass.png';
import kilocodeUrl from '@/assets/brands/kilo.png';
import kimiUrl from '@/assets/brands/kimi-ai-icon.svg';
import litellmUrl from '@/assets/brands/litellm.png';
import lmstudioUrl from '@/assets/brands/lm-studio.png';
import customUrl from '@/assets/brands/minimax-icon.svg';
import mistralUrl from '@/assets/brands/mistral-ai-icon.svg';
import nebiusUrl from '@/assets/brands/nebius.png';
import nousUrl from '@/assets/brands/nous.png';
import ollamaUrl from '@/assets/brands/ollama-icon.svg';
import openaiUrl from '@/assets/brands/openai-icon.svg';
import openrouterUrl from '@/assets/brands/openrouter-icon.svg';
import poolsideUrl from '@/assets/brands/poolside.png';
import qwenUrl from '@/assets/brands/qwen.png';
import requestyUrl from '@/assets/brands/requesty-logo.svg';
import sambanovaUrl from '@/assets/brands/sambanova.png';
import sapaicoreUrl from '@/assets/brands/sap-ai.png';
import togetherUrl from '@/assets/brands/together-ai-icon.svg';
import vercelUrl from '@/assets/brands/vercel-icon.svg';
import vertexUrl from '@/assets/brands/vertex-ai-icon.svg';
import wandbUrl from '@/assets/brands/weights-biases.png';
import xaiUrl from '@/assets/brands/grok-ai-icon.svg';
import xiaomiUrl from '@/assets/brands/xiaomi.png';
import zaiUrl from '@/assets/brands/z-ai-icon.svg';

import { needsLightTile } from './providerTheme';

type ImgProps = ImgHTMLAttributes<HTMLImageElement>;

/**
 * Maps a provider wire-id (matches `Kurisu.Core.Infrastructure.Constants.
 * ProviderIds` in the backend) to the bundled brand asset under
 * `@/assets/brands/`. Providers without an asset fall through to the
 * "?" letter-avatar fallback in `ProviderIcon` below.
 *
 * Aliases:
 *   • `openai-native` / `openai-codex` share the OpenAI mark.
 *   • `claude-code` shares the Anthropic mark.
 *   • `dashscope` shares the Qwen mark (DashScope is the Alibaba endpoint
 *     that serves Qwen via the OpenAI-compatible path).
 */
const brandIcons: Record<string, string> = {
  // First-party — OpenAI family
  openai: openaiUrl,
  'openai-native': openaiUrl,
  'openai-codex': openaiUrl,
  // First-party — Anthropic family
  anthropic: anthropicUrl,
  'claude-code': anthropicUrl,
  // Cloud
  bedrock: bedrockUrl,
  vertex: vertexUrl,
  gemini: geminiUrl,
  // Local
  ollama: ollamaUrl,
  lmstudio: lmstudioUrl,
  // Aggregators / gateways
  openrouter: openrouterUrl,
  'vercel-ai-gateway': vercelUrl,
  // Major vendors
  deepseek: deepseekUrl,
  xai: xaiUrl,
  groq: groqUrl,
  mistral: mistralUrl,
  together: togetherUrl,
  fireworks: fireworksUrl,
  moonshot: kimiUrl,
  huggingface: huggingfaceUrl,
  litellm: litellmUrl,
  requesty: requestyUrl,
  zai: zaiUrl,
  cerebras: cerebrasUrl,
  sambanova: sambanovaUrl,
  nebius: nebiusUrl,
  baseten: basetenUrl,
  poolside: poolsideUrl,
  hicap: hicapUrl,
  aihubmix: aihubmixUrl,
  nousResearch: nousUrl,
  wandb: wandbUrl,
  xiaomi: xiaomiUrl,
  kilocode: kilocodeUrl,
  qwen: qwenUrl,
  dashscope: qwenUrl,
  doubao: doubaoUrl,
  asksage: asksageUrl,
  dify: difyUrl,
  sapaicore: sapaicoreUrl,
  'huawei-cloud-maas': huaweiUrl,
  custom: customUrl,
  // `v0` and `oca` have no bundled asset — render the "?" letter avatar.
};

/**
 * Wrapper for a brand icon. Every render path — branded icon, white-tile
 * branded icon, letter-avatar fallback — fills the same outer `width × height`
 * box with `borderRadius: 6`. The inner <img> uses `width: 100%; height: 100%`
 * so dark icons that need a white tile are no longer smaller than colored
 * icons, matching what the user asked for.
 */
export function ProviderIcon({ id, style, ...props }: ImgProps & { id: string }) {
  const width = typeof props.width === 'number' ? props.width : 22;
  const height = typeof props.height === 'number' ? props.height : 22;
  const url = brandIcons[id];
  const onLightTile = needsLightTile(id);

  const wrapperStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${width}px`,
    height: `${height}px`,
    flexShrink: 0,
    borderRadius: 6,
    overflow: 'hidden',
    background: onLightTile ? '#FFFFFF' : 'transparent',
    ...style,
  };

  if (url) {
    return (
      <span {...(props as Record<string, unknown>)} style={wrapperStyle}>
        <img
          src={url}
          alt={id}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain',
          }}
        />
      </span>
    );
  }

  return (
    <span
      {...(props as Record<string, unknown>)}
      style={{
        ...wrapperStyle,
        fontWeight: 700,
        fontSize: Math.max(10, Math.round(width * 0.55)),
        color: onLightTile ? '#000' : 'currentColor',
        border: onLightTile ? 'none' : '1px solid rgba(255,255,255,0.12)',
        background: onLightTile ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
      }}
    >
      ?
    </span>
  );
}
